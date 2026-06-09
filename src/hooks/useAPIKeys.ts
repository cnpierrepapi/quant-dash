"use client";

import { useState, useCallback, useEffect } from "react";
import { encrypt, decrypt } from "@/lib/crypto";

const STORAGE_KEY = "qd_binance_keys";
const PASSPHRASE = "quantdash_local_v1"; // Symmetric key for localStorage encryption

export type APIKeyState = {
  apiKey: string;
  apiSecret: string;
  connected: boolean;
  testnet: boolean;
  balance: number | null;
};

export function useAPIKeys() {
  const [keys, setKeys] = useState<APIKeyState>({
    apiKey: "",
    apiSecret: "",
    connected: false,
    testnet: true,
    balance: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load encrypted keys from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    decrypt(stored, PASSPHRASE)
      .then((json) => {
        const parsed = JSON.parse(json);
        setKeys((prev) => ({ ...prev, apiKey: parsed.apiKey || "", apiSecret: parsed.apiSecret || "" }));
      })
      .catch(() => {
        // Corrupted — clear it
        localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  const saveKeys = useCallback(async (apiKey: string, apiSecret: string) => {
    const json = JSON.stringify({ apiKey, apiSecret });
    const encrypted = await encrypt(json, PASSPHRASE);
    localStorage.setItem(STORAGE_KEY, encrypted);
    setKeys((prev) => ({ ...prev, apiKey, apiSecret }));
    setError(null);
  }, []);

  const testConnection = useCallback(async (apiKey: string, apiSecret: string) => {
    setLoading(true);
    setError(null);
    try {
      const { testConnection: test } = await import("@/lib/exec-client");
      const result = await test(apiKey, apiSecret);
      if (result.success) {
        await saveKeys(apiKey, apiSecret);
        setKeys((prev) => ({
          ...prev,
          apiKey,
          apiSecret,
          connected: true,
          testnet: result.testnet,
          balance: result.balance,
        }));
        return true;
      } else {
        setError(result.error || "Connection failed");
        return false;
      }
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [saveKeys]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setKeys({ apiKey: "", apiSecret: "", connected: false, testnet: true, balance: null });
    setError(null);
  }, []);

  return { keys, loading, error, testConnection, disconnect, saveKeys };
}
