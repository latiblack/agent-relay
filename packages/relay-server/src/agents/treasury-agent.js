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

  async _claimReward(data, msg) {
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

    // Send UCT reward from treasury wallet to user's wallet
    const uctAmount = quest.reward.uct;
    const UCT_COIN_ID = 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';
    let uctSent = '0';
    if (uctAmount && uctAmount !== '0' && walletAddress) {
      if (!this.sphere?.payments?.send) {
        // Surface misconfiguration instead of silently skipping
        const reason = !this.sphere ? 'this.sphere is undefined' : !this.sphere.payments ? 'this.sphere.payments is undefined' : 'this.sphere.payments.send is not a function';
        console.error(`[TreasuryAgent] NOT sending ${uctAmount} UCT to ${walletAddress}: ${reason}`);
        return {
          action: 'reward_issued',
          data: {
            questId,
            xpAwarded: quest.reward.xp,
            totalXp: account.totalXp,
            uctSent: '0',
            uctError: reason,
            message: `You earned ${quest.reward.xp} XP, but the UCT payout failed (${reason}).`,
          },
        };
      }
      const amountWei = (BigInt(uctAmount) * 10n ** 18n).toString();
      try {
        // Backend confirmation step: ensure the treasury's incoming tokens are
        // received/confirmed into the in-memory spendable pool before spending.
        // This mirrors the user "accepting" a payment in their Sphere wallet on
        // the deploy-fee path. Without it, pending/lazy tokens never become
        // spendable and planSend reports "Insufficient balance".
        if (typeof this.sphere?.payments?.receive === 'function') {
          try {
            await this.sphere.payments.receive();
          } catch (rxErr) {
            console.warn(`[TreasuryAgent] receive() before send warning (non-fatal):`, rxErr?.message || rxErr);
          }
        }
        const sendResult = await this.sphere.payments.send({
          recipient: walletAddress,
          amount: amountWei,
          coinId: UCT_COIN_ID,
        });
        const transferId = sendResult?.transferId || sendResult?.txHash || 'ok';
        uctSent = uctAmount;
        console.log(`[TreasuryAgent] Sent ${uctAmount} UCT to ${walletAddress}: ${transferId}`);
      } catch (err) {
        // Make the failure VISIBLE instead of swallowing it
        const detail = err?.stack || err?.message || String(err);
        console.error(`[TreasuryAgent] FAILED to send ${uctAmount} UCT to ${walletAddress}:`, detail);
        return {
          action: 'reward_issued',
          data: {
            questId,
            xpAwarded: quest.reward.xp,
            totalXp: account.totalXp,
            uctSent: '0',
            uctError: err?.message || String(err),
            message: `You earned ${quest.reward.xp} XP, but the 1 UCT payout failed: ${err?.message || err}. Check relay logs.`,
          },
        };
      }
    }

    return {
      action: 'reward_issued',
      data: {
        questId,
        xpAwarded: quest.reward.xp,
        totalXp: account.totalXp,
        uctSent,
        message: `Congratulations! You earned ${quest.reward.xp} XP${uctSent && uctSent !== '0' ? ` and ${uctSent} UCT` : ''}.`,
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
