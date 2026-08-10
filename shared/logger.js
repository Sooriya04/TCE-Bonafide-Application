const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const primaryDb = require('./db/primary');
const path = require('path');

const serviceName = process.env.SERVICE_NAME || 'app';

const dbTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
});

class DBLogTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const level = info.level;
    const message = `[${serviceName}] ${info.message}`;
    const meta = info.metadata || {};
    const requestId = info.requestId || null;

    primaryDb.query(
      'INSERT INTO app_logs (level, message, meta, request_id) VALUES ($1, $2, $3, $4)',
      [level, message, JSON.stringify(meta), requestId]
    ).catch(err => {
      console.error('Failed to log to PostgreSQL:', err.message);
    });

    callback();
  }
}

// Create rotating log files transports
const fileInfoTransport = new DailyRotateFile({
  filename: path.join(__dirname, '..', '..', 'logs', `${serviceName}-%DATE%.log`),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info'
});

const fileErrorTransport = new DailyRotateFile({
  filename: path.join(__dirname, '..', '..', 'logs', `${serviceName}-error-%DATE%.log`),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata({ fillWith: ['timestamp', 'requestId'] }),
    winston.format.json()
  ),
  transports: [
    dbTransport,
    new DBLogTransport({ level: 'info' }),
    fileInfoTransport,
    fileErrorTransport
  ]
});

module.exports = logger;
