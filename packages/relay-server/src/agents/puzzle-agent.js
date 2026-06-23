// Puzzle Agent (@agentrelay-puzzle)
// Zero LLM - validates answers against known solutions

import { QuestAgent } from '../quest-agent.js';
import { ACTIONS, QUESTS } from '../constants.js';

export class PuzzleAgent extends QuestAgent {
  constructor(config) {
    super({ nametag: '@agentrelay-puzzle', ...config });
    this.sessions = new Map(); // { userAddress -> { questId, attempts, hintsGiven } }
  }

  async init() {
    this.on(ACTIONS.SUBMIT_ANSWER, (data, msg) => this._handleAnswer(data, msg));
    this.on(ACTIONS.REQUEST_HINT, (data, msg) => this._handleHint(data, msg));
    this.on(ACTIONS.GET_QUEST_INFO, (data) => this._handleQuestInfo(data));
    return super.init();
  }

  _handleAnswer(data, msg) {
    const { questId, answer } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }

    const sender = msg.senderNametag || msg.senderPubkey;
    if (!this.sessions.has(sender)) {
      this.sessions.set(sender, { questId, attempts: 0, hintsGiven: 0 });
    }
    const session = this.sessions.get(sender);
    session.attempts++;

    const isCorrect = answer?.trim().toLowerCase() === quest.answer?.toLowerCase();

    if (isCorrect) {
      session.completed = true;
      return {
        action: 'puzzle_result',
        data: {
          correct: true,
          questId,
          nextStep: 'claim_reward',
          lore: quest.lore.complete,
        },
      };
    }

    return {
      action: 'puzzle_result',
      data: {
        correct: false,
        questId,
        attemptsLeft: 5 - session.attempts,
        hint: session.attempts <= quest.hints.length
          ? quest.hints[session.attempts - 1]
          : 'No more hints available.',
      },
    };
  }

  _handleHint(data) {
    const { questId } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }
    return {
      action: 'hint',
      data: { questId, hint: quest.hints[0] },
    };
  }

  _handleQuestInfo(data) {
    const { questId } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }
    return {
      action: 'quest_info',
      data: {
        id: quest.id,
        title: quest.title,
        guild: quest.guild,
        description: quest.description,
        lore: quest.lore.intro,
        hintsAvailable: quest.hints.length,
      },
    };
  }
}
