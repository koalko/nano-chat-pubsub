const path = require("path");
const express = require("express");

const logger = require("./logger");
const initRedisClient = require("./redis");
const WebSocketServer = require("./ws");
const Notifications = require("./notifications");

const config = require("./config");

function initExpressServer({ host, port }) {
  const app = express();
  app.use(express.static(path.resolve(__dirname, "..", "public")));
  return app.listen(port, host);
}

function initWorker() {
  const notifications = new Notifications({
    // Important! pub and sub clients should be different instances
    pubClient: initRedisClient(config.redis),
    subClient: initRedisClient(config.redis),
    logger,
  });
  notifications.listen();
  const expressServer = initExpressServer(config.express);
  const wsServer = new WebSocketServer(config.express, logger);
  wsServer.init(expressServer, process.pid);

  /////////////////////////////////////////////////////////////////////////////////
  // Connect notification subsystem to WS subsystem
  // Better implement in a separate controller
  // Use constants for message types
  wsServer.onConnect((clientId) => {
    notifications.emitPublic({
      type: "ClientConnected",
      clientId,
    });
  });

  wsServer.onDisconnect((clientId) => {
    notifications.emitPublic({
      type: "ClientDisconnected",
      clientId,
    });
  });

  wsServer.onMessage((clientId, payload) => {
    if (payload.to === "*") {
      notifications.emitPublic({
        type: "PublicMessage",
        from: clientId,
        message: payload.message,
      });
    } else {
      notifications.emitPrivate({
        type: "PrivateMessage",
        from: clientId,
        to: payload.to,
        message: payload.message,
      });
    }
  });

  notifications.onPrivate(({ type, message, from, to }) => {
    wsServer.send(from, {
      type,
      from,
      to,
      message,
    });
    wsServer.send(to, {
      type,
      from,
      to,
      message,
    });
  });

  notifications.onPublic((payload) => {
    wsServer.broadcast(payload);
  });
  /////////////////////////////////////////////////////////////////////////////////

  logger.info(
    `Web-server is listening on ${config.express.host}:${config.express.port}`
  );
  logger.info(`Worker ${process.pid} started`);
}

module.exports = initWorker;
