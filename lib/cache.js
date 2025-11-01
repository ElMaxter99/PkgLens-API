const { redisClient } = require("./redisClient");

const memoryCache = new Map();

const hasRedis = Boolean(redisClient);

function isExpired(entry) {
  return entry.expiresAt !== null && entry.expiresAt <= Date.now();
}

async function getCachedValue(key) {
  if (hasRedis) {
    return redisClient.get(key);
  }

  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (isExpired(entry)) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

async function setCachedValue(key, value, ttlSeconds) {
  if (hasRedis) {
    const options = ttlSeconds ? { ex: ttlSeconds } : undefined;
    await redisClient.set(key, value, options);
    return;
  }

  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  memoryCache.set(key, { value, expiresAt });
}

module.exports = {
  getCachedValue,
  setCachedValue,
  hasRedis,
};
