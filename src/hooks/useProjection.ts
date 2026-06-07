"use client";

import { useState, useCallback, useMemo } from "react";
import type { Candle } from "./useCandles";
import { generateProjection, type ProjectionResult } from "@/lib/projection";

export function useProjection(candles: Candle[]) {
  const [enabled, setEnabled] = useState(false);
  const [horizon, setHorizon] = useState(100);
  const [nPaths, setNPaths] = useState(50);
  const [result, setResult] = useState<ProjectionResult | null>(null);
  const [computing, setComputing] = useState(false);

  const generate = useCallback(() => {
    if (candles.length < 50) return;
    setComputing(true);
    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      const r = generateProjection(candles, nPaths, horizon);
      setResult(r);
      setComputing(false);
    });
  }, [candles, nPaths, horizon]);

  const toggle = useCallback(() => {
    if (!enabled) {
      setEnabled(true);
      generate();
    } else {
      setEnabled(false);
      setResult(null);
    }
  }, [enabled, generate]);

  return { enabled, toggle, horizon, setHorizon, nPaths, setNPaths, result, computing, regenerate: generate };
}
