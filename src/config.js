module.exports = {
  express: {
    host: process.env.EXPRESS_HOST || "0.0.0.0",
    port: Number(process.env.EXPRESS_PORT) || 3000,
    wsPath: process.env.EXPRESS_WS_PATH || "/ws",
    workerCount: Number(process.env.EXPRESS_WORKER_COUNT) || 2,
  },
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
};
