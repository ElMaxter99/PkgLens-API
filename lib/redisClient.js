const { Redis } = require("@upstash/redis");

let redisClient = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken) {
  redisClient = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else {
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured. Falling back to in-memory cache."
  );
}

module.exports = {
  redisClient,
};
