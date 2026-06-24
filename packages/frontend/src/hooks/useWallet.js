// Agent Relay - Wallet Connection Hook
// Uses Sphere Connect for wallet auth (same flow as SphereQuests)

import { useState, useEffect, useCallback, useRef } from 'react';

const SPHERE_WALLET_URL = 'https://sphere.unicity.network';
const NETWORK = 'mainnet';
const REQUIRED_PERMISSIONS = [
  'identity:read',
  'sign:request',
  'balance:read',
  'tokens:read',
  'history:read',
  'events:subscribe',
];

export function useWallet() {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [identity, setIdentity] = useState(null);
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    clientRef.current?.disconnect?.().catch(() => {});
    clientRef.current = null;
    setClient(null);
    setIdentity(null);
    setStatus('idle');
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    try {
      // Dynamic import of Sphere Connect
      const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');

      const result = await autoConnect({
        dapp: {
          name: 'Agent Relay',
          url: window.location.origin,
          icon: `${window.location.origin}/icon.svg`,
        },
        walletUrl: SPHERE_WALLET_URL,
        network: NETWORK,
        permissions: [...REQUIRED_PERMISSIONS],
      });

      clientRef.current = result.client;
      setClient(result.client);
      setIdentity(result.connection.identity);
      setStatus('connected');
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { status, identity, client, error, connect, disconnect };
}
