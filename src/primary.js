const cluster = require("cluster");
const logger = require("./logger");
const config = require("./config");

function initPrimary() {
  logger.info(`Primary ${process.pid} is running`);

  for (let workerIdx = 0; workerIdx < config.express.workerCount; workerIdx++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.info(
      `worker ${worker.process.pid} died with code ${code} and signal ${signal}`
    );
  });
}

module.exports = initPrimary;
