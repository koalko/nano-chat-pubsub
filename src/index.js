const cluster = require("cluster");
const initPrimary = require("./primary");
const initWorker = require("./worker");

if (cluster.isPrimary) {
  initPrimary();
} else {
  initWorker();
}
