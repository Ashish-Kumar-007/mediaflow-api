const IORedis = require('ioredis');
const { Queue, Worker } = require('bullmq');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const mediaQueue = new Queue('media-processing', { 
  connection,
  skipVersionChecker: true
});

module.exports = {
  connection,
  mediaQueue
};
