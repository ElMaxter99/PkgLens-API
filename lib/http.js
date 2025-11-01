let fetchFn = null;

if (typeof fetch !== "undefined") {
  fetchFn = fetch.bind(globalThis);
} else {
  fetchFn = async (...args) => {
    const { default: nodeFetch } = await import("node-fetch");
    return nodeFetch(...args);
  };
}

module.exports = {
  fetch: (...args) => fetchFn(...args),
};
