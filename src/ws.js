const WebSocket = require("ws");
const queryString = require("query-string");

const prefix = "WebSocket Server";
const handlers = {
  message: "message",
  connect: "connect",
  disconnect: "disconnect",
};

class WebSocketServer {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.clientMap = new Map();
    this.handlers = {};
  }

  broadcast(payload) {
    const message = JSON.stringify(payload);
    this.logger.info(`${prefix}: broadcasting message ${message}`);
    for (const wsConnection of this.clientMap.values()) {
      wsConnection.send(message);
    }
  }

  send(clientId, payload) {
    const wsConnection = this.clientMap.get(clientId);
    if (!wsConnection) return;
    const message = JSON.stringify(payload);
    this.logger.info(
      `${prefix}: sending message ${message} to client "${clientId}"`
    );
    wsConnection.send(message);
  }

  on(type, handler) {
    this.handlers[type] = handler;
  }

  onMessage(handler) {
    this.on(handlers.message, handler);
  }

  onConnect(handler) {
    this.on(handlers.connect, handler);
  }

  onDisconnect(handler) {
    this.on(handlers.disconnect, handler);
  }

  init(expressServer, workerPid) {
    const wsServer = new WebSocket.Server({
      noServer: true,
      path: this.config.wsPath,
    });

    expressServer.on("upgrade", (request, socket, head) => {
      const url = queryString.parseUrl(request.url);
      const clientId = url?.query?.id;

      if (!clientId) {
        this.logger.info(`${prefix}: unauthorized access`);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      if (this.clientMap.has(clientId)) {
        this.logger.info(`${prefix}: client "${clientId}" already connected`);
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      wsServer.handleUpgrade(request, socket, head, (wsConnection) => {
        wsServer.emit("connection", wsConnection, clientId);
      });
    });

    wsServer.on("connection", (wsConnection, clientId) => {
      this.logger.info(
        `${prefix}: new client "${clientId}" connected to worker ${workerPid}`
      );
      this.clientMap.set(clientId, wsConnection);
      if (this.handlers[handlers.connect]) {
        this.handlers[handlers.connect](clientId);
      }

      wsConnection.on("message", (message) => {
        if (this.handlers[handlers.message]) {
          this.handlers[handlers.message](clientId, JSON.parse(message));
        }
      });

      wsConnection.on("close", () => {
        this.logger.info(
          `${prefix}: client "${clientId}" closed the connection`
        );
        this.clientMap.delete(clientId);
        if (this.handlers[handlers.disconnect]) {
          this.handlers[handlers.disconnect](clientId);
        }
      });
    });
  }
}

module.exports = WebSocketServer;
