const { getCachedValue, setCachedValue } = require("../../lib/cache");
const { fetch } = require("../../lib/http");

const REGISTRY_BASE_URL =
  process.env.NPM_REGISTRY_BASE_URL || "https://registry.npmjs.org";
const DEFAULT_PACKAGE_CACHE_TTL = 3600;

function resolveTtl(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

const PACKAGE_CACHE_TTL = resolveTtl(
  process.env.PACKAGE_CACHE_TTL,
  DEFAULT_PACKAGE_CACHE_TTL
);

function buildCacheKey(packageName) {
  return `pkg:metadata:${packageName}`;
}

function encodePackageName(packageName) {
  const segments = packageName.split("/");

  return segments
    .map((segment, index) => {
      if (index === 0 && segment.startsWith("@")) {
        return `@${encodeURIComponent(segment.slice(1))}`;
      }

      return encodeURIComponent(segment);
    })
    .join("%2F");
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { slug } = req.query;
  const packageName = Array.isArray(slug) ? slug.join("/") : slug;

  if (!packageName) {
    return res.status(400).json({ error: "Package name is required" });
  }

  const cacheKey = buildCacheKey(packageName);

  try {
    const cachedMetadata = await getCachedValue(cacheKey);
    if (cachedMetadata) {
      res.setHeader("Cache-Control", `s-maxage=${PACKAGE_CACHE_TTL}`);
      return res.status(200).json(cachedMetadata);
    }

    const encodedName = encodePackageName(packageName);
    const registryUrl = `${REGISTRY_BASE_URL}/${encodedName}`;

    const response = await fetch(registryUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      console.error(
        `[registry] Failed to fetch metadata for ${packageName}: ${response.status} ${response.statusText}`
      );
      return res
        .status(response.status)
        .send(errorPayload || "Failed to fetch package metadata");
    }

    const metadata = await response.json();

    await setCachedValue(cacheKey, metadata, PACKAGE_CACHE_TTL);

    res.setHeader("Cache-Control", `s-maxage=${PACKAGE_CACHE_TTL}`);
    return res.status(200).json(metadata);
  } catch (error) {
    console.error(`[registry] Unexpected error for ${packageName}:`, error);
    return res.status(500).json({ error: "Failed to fetch package metadata" });
  }
};
