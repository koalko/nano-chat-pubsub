const channels = {
  public: "public",
  private: "private",
};

const prefix = 'Notifications';

class Notifications {
  constructor({ pubClient, subClient, logger }) {
    this.pubClient = pubClient;
    this.subClient = subClient;
    this.logger = logger;
    this.listeners = {};
  }

  async listen() {
    const channelList = Object.values(channels);
    await this.subClient.subscribe(channelList);
    this.logger.info(`${prefix}: listening on channels [${channelList.join(', ')}]`);
    this.subClient.on("message", (channel, message) => {
      // Note: this kind of logging might be too heavy for the real system
      this.logger.info(`${prefix}: message ${message} arrived on channel ${channel}`);
      if (!this.listeners[channel]) {
        this.logger.info(`${prefix}: no listener for channel ${channel}`);
        return;
      }
      try {
        this.listeners[channel](JSON.parse(message));
      } catch (error) {
        this.logger.error(`${prefix}: unable to decode/process the message`);
      }
    });
  }

  // Note: depending on the application architecture it might be beneficial to just use EventEmitter
  // instead of implementing on/emit yourself; it will also allow to add multiple subscribers per channel.
  on(channel, listener) {
    this.logger.info(`${prefix}: setting up listener for channel ${channel}`);
    this.listeners[channel] = listener;
  }

  onPublic(listener) {
    this.on(channels.public, listener);
  }

  onPrivate(listener) {
    this.on(channels.private, listener);
  }

  emit(channel, payload) {
    const message = JSON.stringify(payload);
    // Note: this kind of logging might be too heavy for the real system
    this.logger.info(`${prefix}: sending message ${message} to channel ${channel}`);
    this.pubClient.publish(channel, message);
  }

  emitPublic(payload) {
    this.emit(channels.public, payload);
  }

  emitPrivate(payload) {
    this.emit(channels.private, payload);
  }
}

module.exports = Notifications;
