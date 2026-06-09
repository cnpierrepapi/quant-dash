"use client";

import { useState } from "react";
import type { APIKeyState } from "@/hooks/useAPIKeys";

export default function APIKeyEditor({
  keys, loading, error,
  onTest, onDisconnect,
}: {
  keys: APIKeyState;
  loading: boolean;
  error: string | null;
  onTest: (apiKey: string, apiSecret: string) => Promise<boolean>;
  onDisconnect: () => void;
}) {
  const [apiKey, setApiKey] = useState(keys.apiKey);
  const [apiSecret, setApiSecret] = useState(keys.apiSecret);
  const [showSecret, setShowSecret] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) return;
    await onTest(apiKey.trim(), apiSecret.trim());
  };

  if (keys.connected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-xs text-[#22c55e] font-medium">Connected</span>
          {keys.testnet && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#eab30820] text-[#eab308]">TESTNET</span>}
        </div>

        {keys.balance !== null && (
          <div className="text-xs">
            <span className="text-[#8888a0]">Balance: </span>
            <span className="text-[#e8e8ef] font-medium">${keys.balance.toFixed(2)}</span>
          </div>
        )}

        <div className="text-[10px] text-[#8888a0]">
          Key: {keys.apiKey.slice(0, 8)}...{keys.apiKey.slice(-4)}
        </div>

        <button onClick={onDisconnect} className="text-[10px] text-[#ef4444] hover:text-[#f87171]">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] text-[#8888a0] uppercase block mb-0.5">API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Binance Futures API Key"
          className="w-full bg-[#0a0a0f] text-xs text-[#e8e8ef] px-2 py-1.5 rounded border border-[#2a2a3a] focus:border-[#6366f1] focus:outline-none font-mono"
        />
      </div>

      <div>
        <label className="text-[10px] text-[#8888a0] uppercase block mb-0.5">API Secret</label>
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Binance Futures API Secret"
            className="w-full bg-[#0a0a0f] text-xs text-[#e8e8ef] px-2 py-1.5 rounded border border-[#2a2a3a] focus:border-[#6366f1] focus:outline-none font-mono pr-12"
          />
          <button
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8888a0] hover:text-[#e8e8ef]"
          >
            {showSecret ? "hide" : "show"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[10px] text-[#ef4444] bg-[#ef444410] px-2 py-1 rounded">{error}</div>
      )}

      <button
        onClick={handleConnect}
        disabled={loading || !apiKey.trim() || !apiSecret.trim()}
        className={`w-full text-xs px-2 py-1.5 rounded font-medium ${
          loading ? "bg-[#eab308] text-black" :
          "bg-[#6366f1] text-white hover:bg-[#818cf8] disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {loading ? "Testing..." : "Test Connection"}
      </button>

      <p className="text-[9px] text-[#8888a0]">
        Keys are encrypted in your browser. Never sent to our servers — only to Binance via the execution server.
      </p>
    </div>
  );
}
