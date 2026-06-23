// Agent Relay - Quest Agent Base Class
// All quest agents extend this and run as Sphere SDK identities

import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';

export class QuestAgent {
  constructor({ nametag, mnemonic, network = 'testnet', dataDir }) {
    this.nametag = nametag;
    this.mnemonic = mnemonic;
    this.network = network;
    this.dataDir = dataDir;
    this.sphere = null;
    this.handlers = new Map();
  }

  async init() {
    const providers = createNodeProviders({
      network: this.network,
      dataDir: this.dataDir,
    });

    const { sphere } = await Sphere.init({
      ...providers,
      network: this.network,
      mnemonic: this.mnemonic,
    });

    this.sphere = sphere;
    console.log(`[${this.nametag}] Agent online as ${sphere.identity?.directAddress}`);

    // Listen for incoming DMs
    sphere.communications.onDirectMessage((msg) => {
      this._handleMessage(msg);
    });

    return this;
  }

  // Register action handlers
  on(action, handler) {
    this.handlers.set(action, handler);
    return this;
  }

  async _handleMessage(msg) {
    try {
      const payload = typeof msg.content === 'string'
        ? JSON.parse(msg.content)
        : msg.content;

      const handler = this.handlers.get(payload?.action);
      if (handler) {
        const result = await handler(payload.data, msg);
        if (result) {
          await this.respond(msg.senderNametag || msg.senderPubkey, {
            type: 'quest_message',
            version: '1.0',
            questId: payload.questId,
            from: this.nametag,
            to: msg.senderNametag || msg.senderPubkey,
            payload: result,
          });
        }
      } else {
        console.warn(`[${this.nametag}] No handler for action: ${payload?.action}`);
        await this.respond(msg.senderNametag || msg.senderPubkey, {
          type: 'error',
          from: this.nametag,
          payload: { error: `Unknown action: ${payload?.action}` },
        });
      }
    } catch (err) {
      console.error(`[${this.nametag}] Error handling message:`, err);
    }
  }

  async respond(recipient, message) {
    const content = typeof message === 'string' ? message : JSON.stringify(message);
    await this.sphere.communications.sendDM(recipient, content);
  }

  async sendDM(recipient, message) {
    const content = typeof message === 'string' ? message : JSON.stringify(message);
    await this.sphere.communications.sendDM(recipient, content);
  }

  async destroy() {
    if (this.sphere) {
      await this.sphere.destroy();
    }
  }
}
