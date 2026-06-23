// Agent Relay - SphereQuests XP Popup Bridge Hook
// Opens a popup to quest.unicity.network to verify user has 100+ XP

import { useState, useCallback, useRef } from 'react';

const SPHEREQUESTS_URL = 'https://quest.unicity.network';
const XP_REQUIREMENT = 100;

export function useSphereQuestsGate() {
  const [status, setStatus] = useState('pending'); // pending | checking | verified | rejected | error
  const [xp, setXp] = useState(null);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);

  const checkXp = useCallback(async (walletAddress) => {
    setStatus('checking');
    setError(null);

    try {
      const result = await new Promise((resolve, reject) => {
        const popupUrl = `${SPHEREQUESTS_URL}/agentrelay-check?wallet=${encodeURIComponent(walletAddress)}`;
        const popup = window.open(
          popupUrl,
          'spherequests-check',
          'width=420,height=600,scrollbars=yes'
        );

        if (!popup) {
          reject(new Error('Popup blocked. Please allow popups for this site.'));
          return;
        }

        popupRef.current = popup;

        // Listen for the verification message
        const handleMessage = (event) => {
          if (event.data?.type === 'agentrelay_xp') {
            window.removeEventListener('message', handleMessage);
            clearTimeout(timer);
            resolve(event.data);
          }
        };

        window.addEventListener('message', handleMessage);

        // Timeout after 2 minutes
        const timer = setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          popup.close();
          reject(new Error('Verification timed out.'));
        }, 120000);

        // Check if popup was closed
        const closeCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(closeCheck);
            window.removeEventListener('message', handleMessage);
            clearTimeout(timer);
            reject(new Error('Verification popup was closed.'));
          }
        }, 1000);
      });

      setXp(result.xp);

      if (result.verified && result.xp >= XP_REQUIREMENT) {
        setStatus('verified');
        return true;
      } else {
        setStatus('rejected');
        return false;
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
      return false;
    } finally {
      popupRef.current?.close();
      popupRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('pending');
    setXp(null);
    setError(null);
    popupRef.current?.close();
    popupRef.current = null;
  }, []);

  return { status, xp, error, checkXp, reset };
}
