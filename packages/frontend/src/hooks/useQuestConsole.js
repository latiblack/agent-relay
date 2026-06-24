// useQuestConsole.js - WebSocket hook for Agent Console
// Connects to the relay server's WebSocket bridge for live agent messages

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://api.virtusub.xyz:3105';

export function useQuestConsole(passportId) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [questState, setQuestState] = useState(null); // { questId, phase, fragmentsCollected, totalFragments }
  const wsRef = useRef(null);

  useEffect(() => {
    if (!passportId) return;

    let ws;
    let reconnectTimer;

    function connect() {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Authenticate with passport
        ws.send(JSON.stringify({ type: 'auth', passportId }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'auth_ok') {
            console.log('[Console] Authenticated');
            return;
          }

          if (msg.type === 'agent_message') {
            setMessages(prev => [...prev, {
              time: new Date(msg.timestamp || Date.now()).toLocaleTimeString('en-US', { hour12: false }),
              from: msg.from || 'unknown',
              to: msg.to || 'unknown',
              message: msg.message || '',
              phase: msg.phase,
              data: msg.data,
            }]);

            // Track quest phase changes
            if (msg.phase) {
              setQuestState(prev => ({
                ...prev,
                phase: msg.phase,
                data: msg.data,
              }));
            }
          }
        } catch (e) {
          console.warn('[Console] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 3s
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [passportId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setQuestState(null);
  }, []);

  return { messages, connected, questState, clearMessages };
}
