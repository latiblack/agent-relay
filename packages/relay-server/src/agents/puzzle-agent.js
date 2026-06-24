// Puzzle Agent (@agentrelay-puzzle)
// Zero LLM - validates answers against known solutions, including fragment-by-fragment

import { QuestAgent } from '../quest-agent.js';
import { ACTIONS, QUESTS } from '../constants.js';

export class PuzzleAgent extends QuestAgent {
  constructor(config) {
    super({ nametag: '@agentrelay-puzzle', ...config });
    this.fragmentSessions = new Map(); // { sender -> { questId, collected: Set<int> } }
  }

  async init() {
    this.on(ACTIONS.SUBMIT_ANSWER, (data, msg) => this._handleAnswer(data, msg));
    this.on(ACTIONS.REQUEST_HINT, (data, msg) => this._handleHint(data, msg));
    this.on(ACTIONS.GET_QUEST_INFO, (data) => this._handleQuestInfo(data));
    await super.init();

    // Post market intent advertising available puzzles
    const quests = Object.values(QUESTS).filter(q => q.fragments?.length > 0);
    if (quests.length > 0) {
      const qNames = quests.map(q => q.title).join(', ');
      await this.postMarketIntent(
        `Puzzles available: ${qNames}. Decode fragments to uncover hidden signals. ` +
        `Submit answers via DM with action "submit_answer".`,
        { intentType: 'service', category: 'quest' }
      );
    }

    return this;
  }

  _handleAnswer(data, msg) {
    const { questId, answer } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }

    const sender = msg.senderNametag || msg.senderPubkey;
    const cleanAnswer = answer?.trim().toLowerCase() || '';

    // Check full answer first
    if (cleanAnswer === quest.answer?.toLowerCase()) {
      return this._fullCorrect(questId, quest);
    }

    // Check fragment-by-fragment
    if (quest.fragments?.length > 0) {
      return this._checkFragment(questId, quest, sender, cleanAnswer);
    }

    // Fallback: single answer check
    if (quest.answer && cleanAnswer === quest.answer.toLowerCase()) {
      return this._fullCorrect(questId, quest);
    }

    return this._incorrect(questId, quest, sender);
  }

  _checkFragment(questId, quest, sender, answer) {
    if (!this.fragmentSessions.has(sender)) {
      this.fragmentSessions.set(sender, { questId, collected: new Set() });
    }
    const session = this.fragmentSessions.get(sender);

    // Find which fragment this answer matches
    let foundIdx = -1;
    for (let i = 0; i < quest.fragments.length; i++) {
      if (quest.fragments[i].answer === answer) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx === -1) {
      return {
        action: 'puzzle_result',
        data: { correct: false, questId, error: 'None of the fragments match that answer.' },
      };
    }

    if (session.collected.has(foundIdx)) {
      return {
        action: 'puzzle_result',
        data: { correct: false, questId, error: 'Fragment already collected. Try another.' },
      };
    }

    // Collect the fragment
    session.collected.add(foundIdx);

    // Check if all fragments collected
    if (session.collected.size === quest.fragments.length) {
      return {
        action: 'puzzle_result',
        data: {
          correct: true,
          questId,
          fragmentsCollected: quest.fragments.length,
          nextStep: 'claim_reward',
          lore: quest.lore.complete,
        },
      };
    }

    // Return partial progress
    return {
      action: 'fragment_collected',
      data: {
        questId,
        fragmentIndex: foundIdx,
        collected: session.collected.size,
        total: quest.fragments.length,
        clue: quest.fragments[session.collected.size]?.clue || 'All clues collected! Submit the final answer.',
        answerSoFar: quest.fragments
          .filter((_, i) => session.collected.has(i))
          .map(f => f.answer)
          .join('_'),
      },
    };
  }

  _fullCorrect(questId, quest) {
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

  _incorrect(questId, quest, sender) {
    const session = this.fragmentSessions.get(sender);
    const attempts = session?.attempts || 0;
    if (session) session.attempts = (session.attempts || 0) + 1;

    const hintIdx = Math.min(attempts, quest.hints.length - 1);
    return {
      action: 'puzzle_result',
      data: {
        correct: false,
        questId,
        hint: quest.hints[Math.max(0, hintIdx)] || 'No more hints available.',
        attemptsLeft: Math.max(0, 5 - attempts - 1),
      },
    };
  }

  _handleHint(data, msg) {
    const { questId } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }

    const sender = msg?.senderNametag || msg?.senderPubkey;
    const session = sender ? this.fragmentSessions.get(sender) : null;
    const hintIdx = Math.min(session?.collected?.size || 0, quest.hints.length - 1);

    return {
      action: 'hint',
      data: { questId, hint: quest.hints[hintIdx] },
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
        difficulty: quest.difficulty,
        description: quest.description,
        fragments: quest.fragments?.length || 0,
        lore: quest.lore.intro,
        hintsAvailable: quest.hints.length,
        reward: quest.reward,
      },
    };
  }
}
