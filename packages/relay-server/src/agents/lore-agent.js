// Lore Agent (@agentrelay-lore)
// Serves pre-written story content based on quest state - zero LLM

import { QuestAgent } from '../quest-agent.js';
import { ACTIONS, QUESTS } from '../constants.js';

export class LoreAgent extends QuestAgent {
  constructor(config) {
    super({ nametag: '@agentrelay-lore', ...config });
  }

  async init() {
    this.on(ACTIONS.GET_STORY, (data) => this._getStory(data));
    this.on(ACTIONS.ADVANCE_STORY, (data) => this._advanceStory(data));
    return super.init();
  }

  _getStory(data) {
    const { questId, chapter } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }

    const content = chapter === 'intro'
      ? quest.lore.intro
      : chapter === 'mid'
      ? quest.lore.mid
      : chapter === 'complete'
      ? quest.lore.complete
      : quest.lore.intro;

    return {
      action: 'story',
      data: { questId, chapter: chapter || 'intro', content },
    };
  }

  _advanceStory(data) {
    const { questId, currentChapter } = data || {};
    const quest = QUESTS[questId];
    if (!quest) {
      return { action: 'error', data: { error: `Unknown quest: ${questId}` } };
    }

    const chapters = ['intro', 'mid', 'complete'];
    const idx = chapters.indexOf(currentChapter);
    const nextChapter = idx >= 0 && idx < chapters.length - 1
      ? chapters[idx + 1]
      : 'complete';

    return {
      action: 'story_advanced',
      data: {
        questId,
        previousChapter: currentChapter,
        chapter: nextChapter,
        content: quest.lore[nextChapter],
      },
    };
  }
}
