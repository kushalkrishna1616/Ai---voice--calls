const redis = require('redis');
const logger = require('./logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    await redisClient.connect();

  } catch (error) {
    logger.error('Error connecting to Redis:', error);
    // Redis is optional for basic functionality
    logger.warn('Continuing without Redis (queues and caching disabled)');
  }
};

const getRedisClient = () => {
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
