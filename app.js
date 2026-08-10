require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const redisClient = require('./cache/redis');
const logger = require('./logger');

// Global handlers to prevent silent failures and log trace details
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown', { error: err.message, stack: err.stack });
  // Graceful shutdown after logging the fatal exception
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection detected', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null
  });
});

// Enforce mandatory environment variable verification at startup
const requiredEnv = [
  'SESSION_SECRET',
  'DEV_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD_HASH',
  'DATABASE_PRIMARY_URL',
  'REDIS_URL'
];

for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(`CRITICAL: Environment variable "${envVar}" is required but missing!`);
  }
}

// Initialize Cron Jobs
require('./jobs/deleteOldBonafide');
const { scheduleMonthlyReportJob } = require('./jobs/monthlyReportJob');
scheduleMonthlyReportJob();


const app = express();

app.set('trust proxy', 1);

// ─── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://static.cloudflareinsights.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: [
        "'self'",
        "https://bonafideapp.tceapps.in",
        "https://*.tceapps.in",
        process.env.FRONTEND_URL || '',
        "http://localhost:3000",
        "http://localhost:3001",
      ].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
}));

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Same-origin requests or server-to-server calls have no Origin header — always allow
    if (!origin) return callback(null, true);

    const originIsAllowed = (
      // FIX: use endsWith to prevent evil-tceapps.in.attacker.com matching includes()
      origin.endsWith('.tceapps.in') ||
      origin === 'https://tceapps.in' ||
      origin === 'http://tceapps.in' ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('https://localhost:') ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) ||
      (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN)
    );

    if (originIsAllowed) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Session (Redis-backed) ────────────────────────────────────────────────────
app.use(session({
  store: new RedisStore({ client: redisClient, prefix: 'tce_sess:' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12, // 12 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
    sameSite: 'lax',
  }
}));

// ─── Request Logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = uuidv4();
  req.log = logger.child({ requestId: req.id });
  req.log.info(`${req.method} ${req.url}`);
  next();
});

// ─── Rate Limiters ─────────────────────────────────────────────────────────────

// OTP request: 5 attempts per 15 min per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests from this IP. Please wait 15 minutes before trying again.' },
});

// Admin login: 3 attempts per 15 min per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
});

// Dev login: 5 attempts per 15 min per IP
const devLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many developer login attempts. Please wait before trying again.' },
});

// ─── API Routes ────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const bonafideRoutes = require('./routes/bonafideRoutes');
const devRoutes = require('./routes/devRoutes');

// Apply rate limiters directly on sensitive auth routes
app.post('/api/auth/request-otp', otpLimiter);
app.post('/api/auth/admin/login', adminLoginLimiter);
app.post('/api/auth/dev/login', devLoginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/bonafide', bonafideRoutes);
app.use('/api/dev', devRoutes);

// ─── Health Check (Nginx watchdog) ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ─── Serve React SPA ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// ─── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const reqLog = req.log || logger;
  reqLog.error(`Server Exception: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
