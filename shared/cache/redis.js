const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on('connect', () => {
  console.log('Connected to Redis server.');
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

module.exports = redisClient;
