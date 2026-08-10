const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://:tce_redis_secure_password@localhost:6379');

redisClient.on('connect', () => {
  console.log('Connected to Redis server.');
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

module.exports = redisClient;
