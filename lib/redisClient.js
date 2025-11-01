const { Redis } = require("@upstash/redis");

let redisClient = null;

const redisUrl = process.env.STORAGE_REDIS_URL;

if (redisUrl && redisToken) {
  redisClient = new Redis({
    url: redisUrl,
  });
} else {
  console.warn(
    "[redis] STORAGE_REDIS_URL is not configured. Falling back to in-memory cache."
  );
}

module.exports = {
  redisClient,
};
