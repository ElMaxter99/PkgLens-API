const { getCachedValue, setCachedValue } = require("../lib/cache");
const { fetch } = require("../lib/http");

const GITHUB_ADVISORIES_URL =
  process.env.GITHUB_ADVISORIES_URL || "https://api.github.com/advisories";
const DEFAULT_ADVISORY_CACHE_TTL = 900;

function resolveTtl(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

const ADVISORY_CACHE_TTL = resolveTtl(
  process.env.ADVISORY_CACHE_TTL,
  DEFAULT_ADVISORY_CACHE_TTL
);
const DEFAULT_PER_PAGE = 100;
const MAX_PER_PAGE = 100;

function normalizePerPage(value) {
  if (!value) {
    return DEFAULT_PER_PAGE;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PER_PAGE;
  }

  return Math.min(parsed, MAX_PER_PAGE);
}

function buildCacheKey(ecosystem, packageName, perPage) {
  return `pkg:advisories:${ecosystem}:${packageName}:${perPage}`;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const ecosystem = (req.query.ecosystem || "npm").toString();
  const packageName = req.query.package ? req.query.package.toString() : null;
  const perPage = normalizePerPage(req.query.per_page);

  if (!packageName) {
    return res.status(400).json({ error: "Query parameter 'package' is required" });
  }

  const cacheKey = buildCacheKey(ecosystem, packageName, perPage);

  try {
    const cachedAdvisories = await getCachedValue(cacheKey);
    if (cachedAdvisories) {
      res.setHeader("Cache-Control", `s-maxage=${ADVISORY_CACHE_TTL}`);
      return res.status(200).json(cachedAdvisories);
    }

    const searchParams = new URLSearchParams({
      ecosystem,
      package: packageName,
      per_page: String(perPage),
    });

    const requestHeaders = {
      Accept: "application/vnd.github+json",
      "User-Agent": process.env.GITHUB_USER_AGENT || "PkgLens-API",
    };

    if (process.env.GITHUB_TOKEN) {
      requestHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(`${GITHUB_ADVISORIES_URL}?${searchParams}`, {
      headers: requestHeaders,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[advisories] Failed to fetch advisories for ${packageName}: ${response.status} ${response.statusText} - ${errorBody}`
      );
      await setCachedValue(cacheKey, [], ADVISORY_CACHE_TTL);
      res.setHeader("Cache-Control", `s-maxage=${ADVISORY_CACHE_TTL}`);
      return res.status(200).json([]);
    }

    const advisories = await response.json();

    await setCachedValue(cacheKey, advisories, ADVISORY_CACHE_TTL);

    res.setHeader("Cache-Control", `s-maxage=${ADVISORY_CACHE_TTL}`);
    return res.status(200).json(advisories);
  } catch (error) {
    console.error(`[advisories] Unexpected error for ${packageName}:`, error);
    await setCachedValue(cacheKey, [], ADVISORY_CACHE_TTL);
    res.setHeader("Cache-Control", `s-maxage=${ADVISORY_CACHE_TTL}`);
    return res.status(200).json([]);
  }
};
