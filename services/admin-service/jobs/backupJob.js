const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../../../shared/logger');
const redisClient = require('../../../shared/cache/redis');

const BACKUP_DIR_HOST = path.join(__dirname, '../../../backups/postgres');

// Health status helpers
const updateBackupStatus = async (status, filename, errorMsg = '') => {
  const ts = new Date().toISOString();
  await redisClient.set('backup:last_status', status);
  await redisClient.set('backup:last_timestamp', ts);
  await redisClient.set('backup:last_filename', filename || 'N/A');
  if (errorMsg) {
    await redisClient.set('backup:last_error', errorMsg);
  } else {
    await redisClient.del('backup:last_error');
  }
};

const runBackup = (type) => {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tce_backup_${type}_${timestamp}.dump`;
    const containerDestPath = `/backups/${type}/${filename}`;
    const pgUser = process.env.POSTGRES_USER || 'tce_user';
    const pgDb = process.env.POSTGRES_DB || 'tce_bonafide';

    const cmd = `docker exec tce_postgres_primary pg_dump -U ${pgUser} -F c -b -f ${containerDestPath} ${pgDb}`;
    
    logger.info(`Starting PostgreSQL ${type} backup to file: ${filename}`);

    exec(cmd, (error, stdout, stderr) => {
      const hostFilePath = path.join(BACKUP_DIR_HOST, type, filename);
      if (error) {
        logger.error(`PostgreSQL ${type} backup failed`, { error: error.message, stderr });
        updateBackupStatus('failed', filename, error.message).finally(() => {
          reject(error);
        });
        return;
      }

      // Verify that the backup file exists on the host and is non-empty
      if (!fs.existsSync(hostFilePath)) {
        const errMsg = 'Backup file not found on host after execution';
        logger.error(errMsg);
        updateBackupStatus('failed', filename, errMsg).finally(() => {
          reject(new Error(errMsg));
        });
        return;
      }

      const stats = fs.statSync(hostFilePath);
      if (stats.size === 0) {
        const errMsg = 'Generated backup file is empty (0 bytes)';
        logger.error(errMsg);
        updateBackupStatus('failed', filename, errMsg).finally(() => {
          reject(new Error(errMsg));
        });
        return;
      }

      logger.info(`PostgreSQL ${type} backup completed successfully. File size: ${(stats.size / 1024).toFixed(2)} KB`);
      updateBackupStatus('success', filename).finally(() => {
        resolve(filename);
      });
    });
  });
};

const pruneBackups = (type, maxDays) => {
  try {
    const dir = path.join(BACKUP_DIR_HOST, type);
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    const now = Date.now();
    const cutoffMs = maxDays * 24 * 60 * 60 * 1000;

    let prunedCount = 0;
    for (const file of files) {
      if (!file.endsWith('.dump')) continue;
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      const fileAgeMs = now - stat.mtimeMs;

      if (fileAgeMs > cutoffMs) {
        fs.unlinkSync(filePath);
        prunedCount++;
      }
    }
    if (prunedCount > 0) {
      logger.info(`Pruned ${prunedCount} old ${type} backup files older than ${maxDays} days.`);
    }
  } catch (err) {
    logger.error(`Error pruning ${type} backups`, { error: err.message });
  }
};

// Daily backup at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('Daily database backup scheduler triggered.');
  try {
    await runBackup('daily');
    const retentionDays = parseInt(process.env.BACKUP_DAILY_RETENTION_DAYS || '30', 10);
    pruneBackups('daily', retentionDays);
  } catch (_) {}
});

// Weekly backup on Sundays at 3:00 AM
cron.schedule('0 3 * * 0', async () => {
  logger.info('Weekly database backup scheduler triggered.');
  try {
    await runBackup('weekly');
    const retentionWeeks = parseInt(process.env.BACKUP_WEEKLY_RETENTION_WEEKS || '12', 10);
    pruneBackups('weekly', retentionWeeks * 7);
  } catch (_) {}
});

// Expose runBackup manually for tests/dev console triggers
module.exports = {
  runBackup,
  pruneBackups
};
