const Redis = require("ioredis");

function initRedisClient({ host, port }) {
  return new Redis({
    host,
    port,
  });
}

module.exports = initRedisClient;
