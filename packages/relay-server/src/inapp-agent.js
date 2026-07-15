// Agent Relay - In-App Agent (Sphere SDK)
// Acts as the user's AI middleman using Sphere SDK Nostr DMs.
// User types → this agent sends DMs to quest agents → receives DM responses.

import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { AGENT_REGISTRY, QUESTS } from './constants.js';

const WAIT_TIMEOUT = 60000; // 60s max wait for agent response

export class InAppAgent {
  constructor({ questId, quest, passport, userTag, onMessage, mnemonic, network = 'testnet', dataDir = './data' }) {
    this.questId = questId;
    this.quest = quest;
    this.passport = passport;
    this.userTag = userTag || '@user';
    this.onMessage = onMessage;
    this.mnemonic = mnemonic;
    this.network = network;
    this.dataDir = dataDir;
    this.sphere = null;
    this.collectedFragments = [];
    this.currentClueIndex = 0;
    this.phase = 'idle';
    this.stopped = false;
    this._pendingResponses = new Map(); // { action -> { resolve, reject, timer } }
    this._dmHandler = null;
  }

  // ── Initialize Sphere SDK ─────────────────────────
  async init() {
    const apiKey = process.env.TESTNET2_API_KEY;
    const oracle = apiKey
      ? { apiKey, url: process.env.TESTNET2_GATEWAY || 'https://gateway.testnet2.unicity.network' }
      : undefined;

    const providers = createNodeProviders({
      network: this.network,
      dataDir: `${this.dataDir}/inapp`,
      oracle,
    });

    const { sphere } = await Sphere.init({
      ...providers,
      network: this.network,
      mnemonic: this.mnemonic,
      autoGenerate: !this.mnemonic,
      market: true,
    });

    this.sphere = sphere;

    // Listen for DM responses from quest agents
    this._dmHandler = sphere.communications.onDirectMessage((msg) => {
      this._handleDMResponse(msg);
    });

    const identity = sphere.identity;
    console.log(`[InAppAgent] Online as ${identity.nametag || identity.directAddress}`);
    return this;
  }

  // ── Handle incoming DMs (responses from quest agents) ──
  _handleDMResponse(msg) {
    try {
      const payload = typeof msg.content === 'string'
        ? JSON.parse(msg.content)
        : msg.content;

      // Only process messages relevant to this session (filter by questId)
      const msgQuestId = payload?.questId || payload?.payload?.questId;
      if (msgQuestId && msgQuestId !== this.questId) return;

      // Check sender — we only care about responses from known quest agents
      const sender = payload?.from || '';
      if (sender && !sender.startsWith('@ar-') && !sender.startsWith('@agentrelay-')) return;

      const action = payload?.payload?.action || payload?.action;
      if (action && this._pendingResponses.has(action)) {
        const { resolve, timer } = this._pendingResponses.get(action);
        clearTimeout(timer);
        this._pendingResponses.delete(action);
        resolve(payload);
      }

      // Only broadcast to console if this agent initiated the exchange
      // (i.e. there was a pending response match). Otherwise it's another user's DM.
    } catch (err) {
      console.error('[InAppAgent] Error parsing DM:', err);
    }
  }

  // ── Send DM to an agent and wait for response ─────
  async _sendAndWait(recipient, message, expectedAction) {
    if (this.stopped) throw new Error('Agent stopped');
    
    const content = typeof message === 'string' ? message : JSON.stringify(message);
    
    const responsePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingResponses.delete(expectedAction);
        reject(new Error(`Timeout waiting for ${expectedAction} from ${recipient}`));
      }, WAIT_TIMEOUT);
      this._pendingResponses.set(expectedAction, { resolve, reject, timer });
    });

    await this.sphere.communications.sendDM(recipient, content);
    return responsePromise;
  }

  // ── Deploy quest via DMs ──────────────────────────
  async start() {
    this.phase = 'deploying';

    this._emit('SYSTEM', this.userTag,
      `[DEPLOY] Quest "${this.quest.title}" activated. Initiating agent handshake...`,
      'init');

    // Step 1: Verification — send DM to @ar-verify
    this.phase = 'verifying';
    this._emit(this.userTag, AGENT_REGISTRY.VERIFICATION,
      `[VERIFY] Relay key ${this.passport.relayKey} — please validate`,
      'verifying');

    try {
      const verifyResp = await this._sendAndWait(
        AGENT_REGISTRY.VERIFICATION,
        {
          action: 'verify_key',
          data: { relayKey: this.passport.relayKey, passportId: this.passport.passportId },
          questId: this.questId,
        },
        'verification_result'
      );

      const verified = verifyResp?.payload?.data?.verified;
      this._emit(AGENT_REGISTRY.VERIFICATION, this.userTag,
        verified
          ? `[VERIFIED] Passport ${this.passport.passportId} | Guild: ${this.passport.guild} ✓`
          : `[FAILED] ${verifyResp?.payload?.data?.error || 'Verification failed'}`,
        'verifying',
        verifyResp?.payload?.data);

      if (!verified) {
        this._emit('SYSTEM', this.userTag, '[ABORT] Verification failed. Cannot proceed.', 'error');
        this.phase = 'error';
        return;
      }
    } catch (err) {
      this._emit('SYSTEM', this.userTag, `[ERROR] Verification DM failed: ${err.message}`, 'error');
      this.phase = 'error';
      return;
    }

    // Step 2: Request narrative from Lore agent
    this.phase = 'lore';
    // Emit lore immediately — it's static text, no need to wait for a DM round-trip
    this._emit(AGENT_REGISTRY.LORE, this.userTag,
      `[LORE] ${this.quest.lore.intro}`,
      'lore');
    // Fire DM in background (fire-and-forget) so the agent still logs it
    this._sendAndWait(
      AGENT_REGISTRY.LORE,
      {
        action: 'get_story',
        data: { questId: this.questId, chapter: 'intro' },
        questId: this.questId,
      },
      'story'
    ).then(loreResp => {
      const loreContent = loreResp?.payload?.data?.content;
      if (loreContent && loreContent !== this.quest.lore.intro) {
        this._emit(AGENT_REGISTRY.LORE, this.userTag,
          `[LORE] ${loreContent}`,
          'lore');
      }
    }).catch(() => {});

    // Step 3: Puzzle — present first clue via DM to Puzzle agent
    this.phase = 'puzzle';
    this.currentClueIndex = 0;
    this._emit(this.userTag, AGENT_REGISTRY.PUZZLE,
      `[READY] Standing by for puzzle clues.`,
      'puzzle');

    // Present first clue
    this._presentClue();
  }

  // ── Called when user submits an answer ────────────
  async handleUserInput(answer) {
    if (this.phase !== 'puzzle' || this.stopped) return;

    const clean = answer.trim();
    if (!clean) return;
    const cleanLower = clean.toLowerCase();

    // Show user's answer going through their agent
    this._emit(this.userTag, AGENT_REGISTRY.PUZZLE,
      `[ANSWER] "${clean}"`,
      'puzzle');

    const fragment = this.quest.fragments[this.currentClueIndex];
    if (!fragment) return;

    // Validate locally immediately (no DM wait — same fix as lore)
    const isCorrect = cleanLower === fragment.answer.toLowerCase();
    if (isCorrect) {
      this.collectedFragments.push(fragment.answer);
      this.currentClueIndex = this.collectedFragments.length;

      this._emit(AGENT_REGISTRY.PUZZLE, this.userTag,
        `[CORRECT] Fragment ${this.collectedFragments.length}/${this.quest.fragments.length} collected!`,
        'puzzle');

      if (this.collectedFragments.length >= this.quest.fragments.length) {
        await this._completeQuest();
      } else {
        this._presentClue();
      }
    } else {
      this._emit(AGENT_REGISTRY.PUZZLE, this.userTag,
        `[INCORRECT] "${clean}" doesn't match. Try again.`,
        'puzzle');
    }

    // Fire DM in background (fire-and-forget) so agent still logs it
    this._sendAndWait(
      AGENT_REGISTRY.PUZZLE,
      {
        action: 'submit_answer',
        data: { questId: this.questId, answer: clean },
        questId: this.questId,
      },
      'puzzle_result'
    ).then(puzzleResp => {
      const resultData = puzzleResp?.payload?.data;
      if (resultData?.correct !== undefined && resultData.correct !== isCorrect) {
        // DM disagrees with local — emit correction
        this._emit(AGENT_REGISTRY.PUZZLE, this.userTag,
          resultData.correct
            ? `[CORRECT] Fragment ${this.collectedFragments.length + 1}/${this.quest.fragments.length} collected!`
            : `[INCORRECT] ${resultData.hint || "Doesn't match. Try again."}`,
          'puzzle');
      }
    }).catch(() => {});
  }

  // ── Present current clue ──────────────────────────
  _presentClue() {
    if (this.currentClueIndex >= this.quest.fragments.length) return;
    const f = this.quest.fragments[this.currentClueIndex];
    const total = this.quest.fragments.length;
    const collected = this.collectedFragments.length;

    this._emit('@agentrelay-puzzle', this.userTag,
      `[FRAGMENT ${collected + 1}/${total}] ${f.clue}`,
      'puzzle',
      { fragmentIndex: this.currentClueIndex, total, collected });
  }

  // ── Complete the quest ────────────────────────────
  async _completeQuest() {
    this.phase = 'lore_complete';

    this._emit(AGENT_REGISTRY.LORE, this.userTag,
      `[LORE] ${this.quest.lore.complete}`,
      'lore_complete');

    // Fire-and-forget: request lore story in background (don't block rewards)
    this._sendAndWait(
      AGENT_REGISTRY.LORE,
      {
        action: 'advance_story',
        data: { questId: this.questId, chapter: 'complete' },
        questId: this.questId,
      },
      'story_advanced'
    ).then(loreResp => {
      const loreContent = loreResp?.payload?.data?.content;
      if (loreContent && loreContent !== this.quest.lore.complete) {
        this._emit(AGENT_REGISTRY.LORE, this.userTag,
          `[LORE] ${loreContent}`,
          'lore_complete');
      }
    }).catch(() => {});

    // Reward — emit immediately
    this.phase = 'rewarding';
    const xpAwarded = this.quest.reward.xp;

    this._emit(AGENT_REGISTRY.TREASURY, this.userTag,
      `[REWARD] +${xpAwarded} XP awarded!`,
      'rewarding',
      { xpAwarded });

    // Fire-and-forget: treasury DM in background (handles UCT send from treasury wallet)
    this._sendAndWait(
      AGENT_REGISTRY.TREASURY,
      {
        action: 'claim_reward',
        data: { questId: this.questId, passportId: this.passport.passportId, walletAddress: this.passport.walletAddress },
        questId: this.questId,
      },
      'reward_issued'
    ).catch(() => {});

    this.phase = 'completed';
    this._emit('SYSTEM', this.userTag,
      `[QUEST COMPLETE] ${this.quest.title} finished. All agents returning to standby.`,
      'completed',
      { xpAwarded, questId: this.questId, uctAwarded: this.quest.reward.uct || '0' });

    if (this.sphere) {
      await this.sphere.destroy();
    }
  }

  // ── Helpers ───────────────────────────────────────
  _emit(from, to, message, phase, data) {
    this.onMessage({ from, to, message, phase, data });
  }

  stop() {
    this.stopped = true;
    this.phase = 'stopped';
    // Reject all pending DM response waiters
    for (const [action, entry] of this._pendingResponses) {
      if (entry && typeof entry.reject === 'function') {
        clearTimeout(entry.timer);
        entry.reject(new Error('Agent stopped'));
      }
    }
    this._pendingResponses.clear();
    if (this.sphere) {
      this.sphere.destroy().catch(() => {});
    }
  }
}
