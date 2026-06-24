// Agent Relay - Core Message Types
// Shared between relay server and quest agents

// ── Agent Identity ──────────────────────────────────
// Each agent has a permanent Sphere identity with a nametag
// Per-user agents are ephemeral (session-scoped)

export const AGENT_REGISTRY = {
  VERIFICATION: '@ar-verify',
  LORE: '@agentrelay-lore',
  PUZZLE: '@agentrelay-puzzle',
  TREASURY: '@agentrelay-treasury',
};

// ── Message Types ───────────────────────────────────

export const MESSAGE_TYPES = {
  QUEST_MESSAGE: 'quest_message',
  QUEST_ACTION: 'quest_action',
  QUEST_RESULT: 'quest_result',
  ERROR: 'error',
};

export const ACTIONS = {
  // Verification
  VERIFY_KEY: 'verify_key',
  VERIFY_PASSPORT: 'verify_passport',

  // Puzzle
  SUBMIT_ANSWER: 'submit_answer',
  REQUEST_HINT: 'request_hint',
  GET_QUEST_INFO: 'get_quest_info',

  // Lore
  GET_STORY: 'get_story',
  ADVANCE_STORY: 'advance_story',

  // Treasury
  CLAIM_REWARD: 'claim_reward',
  GET_BALANCE: 'get_balance',
};

// ── Message Format ──────────────────────────────────

/**
 * @typedef {Object} QuestMessage
 * @property {string} type - MESSAGE_TYPES.QUEST_MESSAGE
 * @property {string} version - "1.0"
 * @property {string} questId
 * @property {string} from - Agent nametag
 * @property {string} to - Agent nametag
 * @property {QuestPayload} payload
 */

/**
 * @typedef {Object} QuestPayload
 * @property {string} action
 * @property {Object} data
 */

// ── Session States ──────────────────────────────────

export const QUEST_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const GUILDS = {
  EXPLORER: 'explorer',
  BUILDER: 'builder',
  CREATOR: 'creator',
  RESEARCH: 'research',
};

// ── Quest Definitions ───────────────────────────────
// Loaded from .md puzzle files by quest-loader.js
// Inline definitions below serve as fallback when .md files aren't available

export const QUESTS = {
  'signal-hunt-01': {
    id: 'signal-hunt-01',
    title: 'Signal Hunt',
    guild: GUILDS.EXPLORER,
    difficulty: 'Easy',
    description: 'Collect clues from 5 agents to find the hidden signal.',
    answer: 'light_frequency_signal_cipher_convergence',
    fragments: [
      { clue: 'I am the first. What transmits through crystal without sound?', answer: 'light' },
      { clue: 'I am the second. What do you call a pattern that repeats at regular intervals?', answer: 'frequency' },
      { clue: 'I am the third. What word describes data sent across a network?', answer: 'signal' },
      { clue: 'I am the fourth. What is the name for a hidden message within a message?', answer: 'cipher' },
      { clue: 'I am the fifth. What do you call the point where two or more signals meet?', answer: 'convergence' },
    ],
    hints: [
      'Each fragment is a single word. Think about network fundamentals.',
      'The final answer is five words joined by underscores, in the order presented.',
      'Fragment 1 = light, Fragment 2 = frequency... continue the sequence.',
    ],
    lore: {
      intro: 'An ancient transmission has been detected at the edge of the network. Five beacon nodes are broadcasting fragments of a forgotten frequency. Decode them all to unlock the signal.',
      mid: 'The fragments are aligning. The signal grows stronger with each piece recovered.',
      complete: 'The signal has been decoded. The network hums with a new voice. Welcome to the relay.',
    },
    reward: { xp: 50 },
  },
};
