// Agent Relay - Wallet Connection Hook
// Uses Sphere Connect for wallet auth (same flow as SphereQuests)

import { useState, useEffect, useCallback, useRef } from 'react';

const SPHERE_WALLET_URL = 'https://sphere.unicity.network';
const SPHERE_NETWORK = { id: 4, name: 'testnet2' };

// UCT coin hex ID from testnet2 token registry
const UCT_COIN_ID = 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';
const UCT_DECIMALS = 18;

const REQUIRED_PERMISSIONS = [
  'identity:read',
  'sign:request',
  'balance:read',
  'tokens:read',
  'history:read',
  'events:subscribe',
  'transfer:request',
];

export function useWallet() {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [identity, setIdentity] = useState(null);
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const clientRef = useRef(null);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    clientRef.current?.disconnect?.().catch(() => {});
    clientRef.current = null;
    setClient(null);
    setIdentity(null);
    setAssets([]);
    setStatus('idle');
  }, []);

  const fetchBalance = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      const result = await c.query('sphere_getAssets');
      if (result?.assets) {
        setAssets(result.assets);
      }
    } catch (err) {
      console.warn('Failed to fetch wallet assets:', err);
    }
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
        network: SPHERE_NETWORK,
        permissions: [...REQUIRED_PERMISSIONS],
      });

      clientRef.current = result.client;
      setClient(result.client);
      setIdentity(result.connection.identity);
      setStatus('connected');

      // Fetch balance after connection
      try {
        const assetsResult = await result.client.query('sphere_getAssets');
        if (assetsResult?.assets) {
          setAssets(assetsResult.assets);
        }
      } catch (err) {
        console.warn('Failed to fetch wallet assets:', err);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Get UCT balance as human-readable string
  const getUctBalance = useCallback(() => {
    const uctAsset = assets.find(a => a.coinId === UCT_COIN_ID);
    if (!uctAsset) return '0';
    const raw = uctAsset.totalAmount || uctAsset.balance || '0';
    // Convert from wei-like units (18 decimals)
    const formatted = (BigInt(raw) / BigInt(10 ** 9)).toString(); // rough
    const full = (Number(raw) / 10 ** UCT_DECIMALS).toFixed(4);
    return full.replace(/\.?0+$/, '');
  }, [assets]);

  // Send UCT tokens via wallet intent
  const sendUct = useCallback(async (recipient, amountWei) => {
    const c = clientRef.current;
    if (!c) throw new Error('Wallet not connected');
    return c.intent('send', {
      recipient,
      amount: amountWei.toString(),
      coinId: UCT_COIN_ID,
    });
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { status, identity, client, error, connect, disconnect, assets, fetchBalance, getUctBalance, sendUct };
}
