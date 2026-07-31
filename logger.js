const winston = require('winston');
const primaryDb = require('./db/primary');

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
    const message = info.message;
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

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata({ fillWith: ['timestamp', 'requestId'] }),
    winston.format.json()
  ),
  transports: [
    dbTransport,
    new DBLogTransport({ level: 'info' })
  ]
});

module.exports = logger;
