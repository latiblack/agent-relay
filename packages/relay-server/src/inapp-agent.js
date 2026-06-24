// Agent Relay - In-App Agent
// Acts as the user's AI middleman. User types → this agent speaks to quest agents.

import { AGENT_REGISTRY } from './constants.js';

export class InAppAgent {
  constructor({ questId, quest, passport, userTag, onMessage }) {
    this.questId = questId;
    this.quest = quest;
    this.passport = passport;
    this.userTag = userTag || '@user';
    this.onMessage = onMessage;
    this.collectedFragments = [];
    this.currentClueIndex = 0;
    this.phase = 'idle';
    this.stopped = false;
  }

  // ── Called when user deploys a quest ──────────────
  async start() {
    this.phase = 'deploying';

    this._emit('SYSTEM', this.userTag,
      `[DEPLOY] Quest "${this.quest.title}" activated. Initiating agent handshake...`,
      'init');

    await this._delay(800);

    // Step 1: Verification handshake
    this.phase = 'verifying';
    this._emit(this.userTag, '@ar-verify',
      `[VERIFY] Relay key ${this.passport.relayKey} — please validate`,
      'verifying');

    await this._delay(1200);

    this._emit('@ar-verify', this.userTag,
      `[VERIFIED] Passport ${this.passport.passportId} | Guild: ${this.passport.guild} ✓`,
      'verifying');

    await this._delay(800);

    // Step 2: Request narrative
    this.phase = 'lore';
    this._emit(this.userTag, '@agentrelay-lore',
      `[REQUEST] Need narrative context for "${this.quest.title}"`,
      'lore');

    await this._delay(1000);

    this._emit('@agentrelay-lore', this.userTag,
      `[LORE] ${this.quest.lore.intro}`,
      'lore');

    await this._delay(1000);

    // Step 3: Puzzle — present first clue
    this.phase = 'puzzle';
    this.currentClueIndex = 0;
    this._emit(this.userTag, '@agentrelay-puzzle',
      `[READY] Standing by for puzzle clues.`,
      'puzzle');

    await this._delay(600);

    this._presentClue();
  }

  // ── Called when user submits an answer ────────────
  async handleUserInput(answer) {
    if (this.phase !== 'puzzle' || this.stopped) return;

    const clean = answer.trim();
    if (!clean) return;

    // Show user's answer going through their agent
    this._emit(this.userTag, '@agentrelay-puzzle',
      `[ANSWER] "${clean}"`,
      'puzzle');

    await this._delay(500);

    const fragment = this.quest.fragments[this.currentClueIndex];
    if (!fragment) return;

    const isCorrect = clean.toLowerCase() === fragment.answer.toLowerCase();

    if (isCorrect) {
      this.collectedFragments.push(fragment.answer);
      const total = this.quest.fragments.length;
      const collected = this.collectedFragments.length;

      this._emit('@agentrelay-puzzle', this.userTag,
        `[CORRECT] Fragment ${collected}/${total} collected! Answer: ${fragment.answer}`,
        'puzzle');

      await this._delay(400);

      // Check if all fragments collected
      if (collected >= total) {
        await this._completeQuest();
      } else {
        // Present next clue
        this.currentClueIndex = collected;
        await this._delay(600);
        this._presentClue();
      }
    } else {
      this._emit('@agentrelay-puzzle', this.userTag,
        `[INCORRECT] "${clean}" doesn't match. Try again.`,
        'puzzle');
    }
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

    await this._delay(600);

    this._emit(this.userTag, '@agentrelay-lore',
      `[DONE] All fragments decoded. Requesting closing narrative.`,
      'lore_complete');

    await this._delay(1000);

    this._emit('@agentrelay-lore', this.userTag,
      `[LORE] ${this.quest.lore.complete}`,
      'lore_complete');

    await this._delay(800);

    // Reward
    this.phase = 'rewarding';

    this._emit(this.userTag, '@agentrelay-treasury',
      `[CLAIM] Quest ${this.questId} complete. Requesting reward.`,
      'rewarding');

    await this._delay(1000);

    this._emit('@agentrelay-treasury', this.userTag,
      `[REWARD] +${this.quest.reward.xp} XP awarded! Total: ${this.quest.reward.xp} XP`,
      'rewarding',
      { xpAwarded: this.quest.reward.xp });

    await this._delay(600);

    this.phase = 'completed';
    this._emit('SYSTEM', this.userTag,
      `[QUEST COMPLETE] ${this.quest.title} finished. All agents returning to standby.`,
      'completed');
  }

  // ── Helpers ───────────────────────────────────────
  _emit(from, to, message, phase, data) {
    this.onMessage({ from, to, message, phase, data });
  }

  stop() {
    this.stopped = true;
    this.phase = 'stopped';
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
