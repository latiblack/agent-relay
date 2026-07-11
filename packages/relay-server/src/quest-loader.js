// Agent Relay - Quest Loader
// Loads quest definitions from .md puzzle files

import fs from 'fs';
import path from 'path';

export function loadQuestFromMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseQuestMd(content, path.basename(filePath, '.md'));
}

export function loadAllQuests(questsDir) {
  const quests = {};
  if (!fs.existsSync(questsDir)) return quests;

  const files = fs.readdirSync(questsDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const quest = loadQuestFromMd(path.join(questsDir, file));
    quests[quest.id] = quest;
  }
  return quests;
}

function parseQuestMd(content, defaultId) {
  const lines = content.split('\n');
  const quest = {
    id: defaultId,
    title: '',
    guild: 'explorer',
    difficulty: 'Easy',
    description: '',
    answer: '',
    fragments: [],
    lore: { intro: '', mid: '', complete: '' },
    hints: [],
    reward: { xp: 50, uct: '0' },
  };

  let section = null;
  let buffer = [];

  function commitBuffer() {
    const text = buffer.join('\n').trim();
    if (!text) return;

    if (section === 'lore_intro') quest.lore.intro = text;
    else if (section === 'lore_mid') quest.lore.mid = text;
    else if (section === 'lore_complete') quest.lore.complete = text;
    else if (section === 'hints') quest.hints.push(text);
    else if (section === 'description') quest.description = text;
  }

  for (const line of lines) {
    // Frontmatter / key-value headers
    const titleMatch = line.match(/^# (.+)/);
    const keyMatch = line.match(/^\*\*([\w ]+):\*\*\s*(.+)/);
    const sectionMatch = line.match(/^## (.+)/);
    const fragmentHeader = line.match(/^### Fragment (\d+)/);
    const clueMatch = line.match(/^\*\*Clue:\*\*\s*(.+)/);
    const answerMatch = line.match(/^\*\*Answer:\*\*\s*(.+)/);

    if (titleMatch) {
      quest.title = titleMatch[1];
      continue;
    }

    if (keyMatch) {
      const key = keyMatch[1].toLowerCase().replace(/\s+/g, '_');
      const val = keyMatch[2].trim();
      if (key === 'quest_id') quest.id = val;
      else if (key === 'guild') quest.guild = val.toLowerCase();
      else if (key === 'difficulty') quest.difficulty = val;
      else if (key === 'reward') {
        const xpMatch = val.match(/(\d+)\s*XP/);
        if (xpMatch) quest.reward.xp = parseInt(xpMatch[1]);
        const uctMatch = val.match(/(\d+(?:\.\d+)?)\s*UCT/);
        if (uctMatch) quest.reward.uct = uctMatch[1];
      }
      continue;
    }

    if (line.trim() === '---') continue;

    if (sectionMatch) {
      commitBuffer();
      buffer = [];
      const secName = sectionMatch[1].toLowerCase();
      if (secName === 'flow') section = 'flow';
      else if (secName === 'brief' || secName === 'description') section = 'description';
      else if (secName.includes('intro') || secName.includes('lore intro')) section = 'lore_intro';
      else if (secName.includes('mid')) section = 'lore_mid';
      else if (secName.includes('complete') || secName.includes('completion')) section = 'lore_complete';
      else if (secName.includes('hint')) section = 'hints';
      else if (secName === 'final answer') {
        const answerLine = lines[lines.indexOf(line) + 1];
        if (answerLine && answerLine.startsWith('**Answer:**')) {
          quest.answer = answerLine.replace('**Answer:**', '').trim().toLowerCase().replace(/^`(.+)`$/, '$1');
        }
        section = null;
      }
      else section = null;
      continue;
    }

    if (fragmentHeader) {
      const num = parseInt(fragmentHeader[1]);
      // Next lines will contain clue + answer
      continue;
    }

    if (clueMatch && fragmentHeader) {
      // We're processing a fragment
      continue;
    }

    if (answerMatch) {
      // This is part of a fragment or the final answer
      continue;
    }

    // Check for final answer pattern
    const finalAnswerMatch = line.match(/^\*\*Answer:\*\*\s*(.+)/);
    if (finalAnswerMatch && quest.answer === '') {
      quest.answer = finalAnswerMatch[1].trim().toLowerCase().replace(/^`(.+)`$/, '$1');
      continue;
    }

    // Lore responses
    if (line.startsWith('"') && line.endsWith('"') || line.startsWith('"')) {
      buffer.push(line.replace(/^"/, '').replace(/"$/, ''));
      continue;
    }

    buffer.push(line);
  }

  commitBuffer();

  // Parse fragments from the content
  const fragmentRegex = /### Fragment \d+\s*\n\*\*Clue:\*\*\s*(.+)\s*\n\*\*Answer:\*\*\s*(.+)/g;
  let match;
  while ((match = fragmentRegex.exec(content)) !== null) {
    quest.fragments.push({
      clue: match[1].trim(),
      answer: match[2].trim().toLowerCase().replace(/^`(.+)`$/, '$1'),
    });
  }

  // If no answer set from final answer, build it from fragments
  if (!quest.answer && quest.fragments.length > 0) {
    quest.answer = quest.fragments.map(f => f.answer).join('_');
  }

  return quest;
}
