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
    await super.init();

    // Post market intent advertising reward service
    await this.postMarketIntent(
      `I issue XP rewards on quest completion. Claim rewards via DM ` +
      `with action "claim_reward" after finishing a quest.`,
      { intentType: 'service', category: 'quest' }
    );

    return this;
  }

  _claimReward(data, msg) {
    const { questId, walletAddress } = data || {};
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

    // Send UCT reward from treasury wallet to user's wallet (fire-and-forget)
    const uctAmount = quest.reward.uct;
    const UCT_COIN_ID = 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';
    if (uctAmount && uctAmount !== '0' && walletAddress && this.sphere?.payments?.send) {
      const amountWei = (BigInt(uctAmount) * 10n ** 18n).toString();
      this.sphere.payments.send({
        recipient: walletAddress,
        amount: amountWei,
        coinId: UCT_COIN_ID,
      }).then(sendResult => {
        const transferId = sendResult?.transferId || sendResult?.txHash || 'ok';
        console.log(`[TreasuryAgent] Sent ${uctAmount} UCT to ${walletAddress}: ${transferId}`);
      }).catch(err => {
        console.warn(`[TreasuryAgent] Failed to send ${uctAmount} UCT to ${walletAddress}:`, err.message);
      });
    }

    return {
      action: 'reward_issued',
      data: {
        questId,
        xpAwarded: quest.reward.xp,
        totalXp: account.totalXp,
        uctSent: uctAmount || '0',
        message: `Congratulations! You earned ${quest.reward.xp} XP${uctAmount && uctAmount !== '0' ? ` and ${uctAmount} UCT` : ''}.`,
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
