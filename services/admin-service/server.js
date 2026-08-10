const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

process.env.SERVICE_NAME = 'admin-service';
const redisClient = require('../../shared/cache/redis');
const logger = require('../../shared/logger');

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection detected', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null
  });
});

const app = express();
const PORT = process.env.ADMIN_SERVICE_PORT || 3002;

app.set('trust proxy', 1);

// Allowed origins and CSP sources from environment
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
const cspConnectSrc = process.env.CSP_CONNECT_SRC ? process.env.CSP_CONNECT_SRC.split(',') : ["'self'"];

app.use(helmet({
  crossOriginResourcePolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", ...cspConnectSrc],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session (Redis-backed, matching student-service for unified auth session)
app.use(session({
  store: new RedisStore({ client: redisClient, prefix: 'tce_sess:' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Request Logger
app.use((req, res, next) => {
  req.id = uuidv4();
  req.log = logger.child({ requestId: req.id });
  next();
});

// Import Admin routes
const bonafideRoutes = require('./routes/bonafideRoutes');
app.use('/api/bonafide', bonafideRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin-service', ts: Date.now() }));

// Error Handler
app.use((err, req, res, next) => {
  const reqLog = req.log || logger;
  reqLog.error(`Server Exception: ${err.message}`, { stack: err.stack });
  return res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  logger.info(`Admin Service running on port ${PORT}`);
});
