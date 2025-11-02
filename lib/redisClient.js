const { Redis } = require("@upstash/redis");

let redisClient = null;

const redisUrl = process.env.STORAGE_REDIS_URL;
const redisToken = process.env.STORAGE_REDIS_TOKEN;

if (redisUrl && redisToken) {
  redisClient = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else {
  console.warn(
    "[redis] STORAGE_REDIS_URL or STORAGE_REDIS_TOKEN is not configured. Falling back to in-memory cache."
  );
}

module.exports = {
  redisClient,
};
