// Agent Relay - Quest Agent Base Class
// All quest agents extend this and run as Sphere SDK identities

import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const WALLET_API_URL = process.env.WALLET_API_URL || 'https://wallet-api.unicity.network';

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
    const apiKey = process.env.TESTNET2_API_KEY;
    const oracle = apiKey
      ? { apiKey, url: process.env.TESTNET2_GATEWAY || 'https://gateway.testnet2.unicity.network' }
      : undefined;

    // 1. Base providers: storage + transport + oracle.
    const base = createNodeProviders({
      network: this.network,
      dataDir: this.dataDir,
      oracle,
    });

    // 2. Add the v2 wallet-api rails (mailbox delivery + token storage + client).
    //    This is what gives the wallet send/receive capability. The identity is
    //    derived internally from the mnemonic passed to Sphere.init below.
    //    NOTE: the wallet-api layer requires the explicit 'testnet2' network name
    //    (its challenge is issued for testnet2 even when the base layer uses the
    //    'testnet' alias).
    const providers = createWalletApiProviders(base, {
      baseUrl: WALLET_API_URL,
      network: 'testnet2',
      deviceId: `agent-relay-${this.nametag}`,
    });

    const { sphere } = await Sphere.init({
      ...providers,
      network: this.network,
      mnemonic: this.mnemonic,
      market: true,
      groupChat: true,
    });

    this.sphere = sphere;
    console.log(`[${this.nametag}] Agent online as ${sphere.identity?.directAddress}`);

    // Register nametag on Nostr so agents can be reached by @name
    try {
      if (this.nametag && !sphere.getNametag()) {
        await sphere.registerNametag(this.nametag.replace('@', ''));
        console.log(`[${this.nametag}] Nametag registered`);
      }
    } catch (err) {
      console.warn(`[${this.nametag}] Nametag registration skipped (may already exist): ${err.message}`);
    }

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
      } else if (payload?.action) {
        console.warn(`[${this.nametag}] No handler for action: ${payload.action}`);
        await this.respond(msg.senderNametag || msg.senderPubkey, {
          type: 'error',
          from: this.nametag,
          payload: { error: `Unknown action: ${payload?.action}` },
        });
      }
      // Silently ignore messages without an action (Nostr protocol noise)
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

  // ── Market Intents ──────────────────────────────
  // Post an intent to the Sphere Market bulletin board
  async postMarketIntent(description, opts = {}) {
    if (!this.sphere?.market) {
      console.warn(`[${this.nametag}] Market module not available`);
      return null;
    }
    try {
      const result = await this.sphere.market.postIntent({
        description,
        intentType: opts.intentType || 'service',
        category: opts.category || 'quest',
        contactHandle: this.nametag,
        expiresInDays: opts.expiresInDays || 30,
        ...opts,
      });
      this._marketIntentId = result.intentId;
      console.log(`[${this.nametag}] Market intent posted: ${result.intentId} — "${description.slice(0, 60)}..."`);
      return result;
    } catch (err) {
      console.warn(`[${this.nametag}] Failed to post market intent: ${err.message}`);
      return null;
    }
  }

  // Close the posted market intent
  async closeMarketIntent() {
    if (!this._marketIntentId || !this.sphere?.market) return;
    try {
      await this.sphere.market.closeIntent(this._marketIntentId);
      console.log(`[${this.nametag}] Market intent closed: ${this._marketIntentId}`);
      this._marketIntentId = null;
    } catch (err) {
      console.warn(`[${this.nametag}] Failed to close market intent: ${err.message}`);
    }
  }

  async destroy() {
    await this.closeMarketIntent().catch(() => {});
    if (this.sphere) {
      await this.sphere.destroy();
    }
  }
}
