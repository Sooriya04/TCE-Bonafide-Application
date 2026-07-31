require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const redisClient = require('./cache/redis');
const logger = require('./logger');

// Initialize Cron Jobs
require('./jobs/deleteOldBonafide');
const { scheduleMonthlyReportJob } = require('./jobs/monthlyReportJob');
scheduleMonthlyReportJob();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration backed by Redis
app.use(session({
  store: new RedisStore({ client: redisClient, prefix: 'tce_sess:' }),
  secret: process.env.SESSION_SECRET || 'tce_default_super_secret_session_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12, // 12 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  }
}));

// Request logger middleware binding UUIDs to requests
app.use((req, res, next) => {
  req.id = uuidv4();
  req.log = logger.child({ requestId: req.id });
  req.log.info(`${req.method} ${req.url}`);
  next();
});

// Import API routers
const authRoutes = require('./routes/authRoutes');
const bonafideRoutes = require('./routes/bonafideRoutes');
const fieldRoutes = require('./routes/fieldRoutes');
const devRoutes = require('./routes/devRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/bonafide', bonafideRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/dev', devRoutes);

app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  const reqLog = req.log || logger;
  reqLog.error(`Server Exception: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
