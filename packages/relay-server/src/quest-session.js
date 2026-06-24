// Agent Relay - Quest State Machine
// Manages user quest sessions through the 4-agent flow:
// verifying → lore_intro → puzzle → lore_complete → rewarding → completed

import { AGENT_REGISTRY, MESSAGE_TYPES, QUESTS } from './constants.js';

export const QUEST_PHASES = {
  IDLE: 'idle',
  VERIFYING: 'verifying',
  LORE_INTRO: 'lore_intro',
  PUZZLE: 'puzzle',
  LORE_COMPLETE: 'lore_complete',
  REWARDING: 'rewarding',
  COMPLETED: 'completed',
};

const PHASE_ORDER = [
  QUEST_PHASES.IDLE,
  QUEST_PHASES.VERIFYING,
  QUEST_PHASES.LORE_INTRO,
  QUEST_PHASES.PUZZLE,
  QUEST_PHASES.LORE_COMPLETE,
  QUEST_PHASES.REWARDING,
  QUEST_PHASES.COMPLETED,
];

export class QuestSession {
  constructor({ questId, passport, onMessage }) {
    this.questId = questId;
    this.passport = passport;
    this.phase = QUEST_PHASES.IDLE;
    this.fragmentsCollected = [];
    this.attempts = 0;
    this.hintsGiven = 0;
    this.onMessage = onMessage; // callback to push to WebSocket bridge
    this.createdAt = Date.now();
  }

  get quest() {
    return QUESTS[this.questId];
  }

  canTransitionTo(targetPhase) {
    const currentIdx = PHASE_ORDER.indexOf(this.phase);
    const targetIdx = PHASE_ORDER.indexOf(targetPhase);
    return targetIdx === currentIdx + 1;
  }

  transitionTo(targetPhase) {
    if (!this.canTransitionTo(targetPhase)) {
      console.warn(`[QuestSession] Invalid transition: ${this.phase} -> ${targetPhase}`);
      return false;
    }
    this.phase = targetPhase;
    return true;
  }

  // Called by the orchestrator when a message arrives for this session
  async handleAgentMessage(agentName, payload) {
    switch (this.phase) {
      case QUEST_PHASES.VERIFYING:
        return this._handleVerification(agentName, payload);
      case QUEST_PHASES.LORE_INTRO:
        return this._handleLoreIntro(agentName, payload);
      case QUEST_PHASES.PUZZLE:
        return this._handlePuzzle(agentName, payload);
      case QUEST_PHASES.LORE_COMPLETE:
        return this._handleLoreComplete(agentName, payload);
      case QUEST_PHASES.REWARDING:
        return this._handleReward(agentName, payload);
      default:
        return null;
    }
  }

  _handleVerification(agentName, payload) {
    if (payload?.action === 'verification_result') {
      if (payload.data?.verified) {
        this._emit(`${agentName} -> ${AGENT_REGISTRY.LORE}`, 'Passport validated. Requesting narrative context...');
        this.onMessage({
          from: agentName,
          to: AGENT_REGISTRY.LORE,
          message: 'Passport validated. Requesting narrative context...',
          phase: 'verifying',
        });
        return { next: QUEST_PHASES.LORE_INTRO, data: { questId: this.questId, passport: this.passport } };
      } else {
        this.onMessage({
          from: agentName,
          to: 'system',
          message: `Verification failed: ${payload.data?.error}`,
          phase: 'error',
        });
        return { next: QUEST_PHASES.IDLE, data: { error: payload.data?.error } };
      }
    }
    return null;
  }

  _handleLoreIntro(agentName, payload) {
    if (payload?.action === 'story') {
      this._emit(`${agentName} -> ${AGENT_REGISTRY.PUZZLE}`, 'Narrative loaded. Initializing puzzle sequence...');
      this.onMessage({
        from: agentName,
        to: AGENT_REGISTRY.PUZZLE,
        message: 'Narrative loaded. Initializing puzzle sequence.',
        phase: 'lore_intro',
      });
      return { next: QUEST_PHASES.PUZZLE, data: { questId: this.questId, lore: payload.data?.content } };
    }
    return null;
  }

  _handlePuzzle(agentName, payload) {
    if (payload?.action === 'puzzle_result') {
      if (payload.data?.correct) {
        this._emit(`${agentName} -> ${AGENT_REGISTRY.LORE}`, 'Puzzle solved. Requesting completion narrative...');
        this.onMessage({
          from: agentName,
          to: AGENT_REGISTRY.LORE,
          message: 'Puzzle solved. Requesting completion narrative.',
          phase: 'puzzle',
          data: { correct: true },
        });
        return { next: QUEST_PHASES.LORE_COMPLETE, data: { questId: this.questId } };
      } else {
        this.attempts++;
        this.onMessage({
          from: agentName,
          to: 'user',
          message: `Incorrect. ${payload.data?.hint || 'Try again.'}`,
          phase: 'puzzle',
          data: { correct: false, attemptsLeft: payload.data?.attemptsLeft },
        });
        return { next: QUEST_PHASES.PUZZLE, data: { hint: payload.data?.hint } }; // stay in puzzle phase
      }
    }
    return null;
  }

  _handleLoreComplete(agentName, payload) {
    if (payload?.action === 'story_advanced' || payload?.action === 'story') {
      this._emit(`${agentName} -> ${AGENT_REGISTRY.TREASURY}`, 'Quest complete. Dispatching reward...');
      this.onMessage({
        from: agentName,
        to: AGENT_REGISTRY.TREASURY,
        message: 'Quest complete. Dispatching reward.',
        phase: 'lore_complete',
      });
      return { next: QUEST_PHASES.REWARDING, data: { questId: this.questId } };
    }
    return null;
  }

  _handleReward(agentName, payload) {
    if (payload?.action === 'reward_issued') {
      this._emit('TREASURY', `Reward issued: ${payload.data?.xpAwarded} XP`);
      this.onMessage({
        from: agentName,
        to: 'user',
        message: `Reward issued: ${payload.data?.xpAwarded} XP (Total: ${payload.data?.totalXp} XP)`,
        phase: 'rewarding',
      });
      return { next: QUEST_PHASES.COMPLETED, data: payload.data };
    }
    return null;
  }

  _emit(from, message) {
    console.log(`[QuestSession ${this.questId}] ${from}: ${message}`);
  }
}

// ── Session Manager ────────────────────────────────

export class QuestSessionManager {
  constructor() {
    this.sessions = new Map(); // { passportId -> QuestSession }
  }

  createSession({ questId, passport, onMessage }) {
    const session = new QuestSession({ questId, passport, onMessage });
    this.sessions.set(passport.passportId, session);
    return session;
  }

  getSession(passportId) {
    return this.sessions.get(passportId);
  }

  removeSession(passportId) {
    this.sessions.delete(passportId);
  }
}
