// Treasury Agent (@agentrelay-treasury)
// Issues rewards on quest completion - zero LLM

import { QuestAgent } from '../quest-agent.js';
import { ACTIONS, QUESTS } from '../constants.js';

export class TreasuryAgent extends QuestAgent {
  constructor(config) {
    super({ nametag: '@agentrelay-treasury', ...config });
    this.rewards = new Map(); // { userAddress -> { totalXp, completedQuests[], tokenBalance } }
  }

  async init() {
    this.on(ACTIONS.CLAIM_REWARD, (data, msg) => this._claimReward(data, msg));
    this.on(ACTIONS.GET_BALANCE, (data, msg) => this._getBalance(data, msg));
    return super.init();
  }

  _claimReward(data, msg) {
    const { questId } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }

    const sender = msg.senderNametag || msg.senderPubkey;
    if (!this.rewards.has(sender)) {
      this.rewards.set(sender, { totalXp: 0, completedQuests: [], tokenBalance: '0' });
    }

    const account = this.rewards.get(sender);
    if (account.completedQuests.includes(questId)) {
      return { action: 'error', data: { error: 'Quest already claimed' } };
    }

    account.completedQuests.push(questId);
    account.totalXp += quest.reward.xp;

    return {
      action: 'reward_issued',
      data: {
        questId,
        xpAwarded: quest.reward.xp,
        totalXp: account.totalXp,
        message: `Congratulations! You earned ${quest.reward.xp} XP.`,
      },
    };
  }

  _getBalance(data, msg) {
    const sender = msg.senderNametag || msg.senderPubkey;
    const account = this.rewards.get(sender) || { totalXp: 0, completedQuests: [], tokenBalance: '0' };
    return {
      action: 'balance',
      data: account,
    };
  }
}
