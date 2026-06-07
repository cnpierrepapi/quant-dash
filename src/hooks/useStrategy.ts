"use client";

import { useState, useCallback } from "react";
import { type Strategy, createEmptyStrategy } from "@/lib/strategy-types";
import { parseDSL, parsePython, strategyToDSL, PRESETS } from "@/lib/strategy-parser";

export function useStrategy() {
  const [strategy, setStrategy] = useState<Strategy>(createEmptyStrategy());
  const [dslText, setDslText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const updateFromDSL = useCallback((text: string) => {
    setDslText(text);
    try {
      const parsed = parseDSL(text);
      if (parsed.entryLong.conditions.length > 0 || parsed.exitLong.conditions.length > 0) {
        setStrategy(parsed);
        setParseError(null);
      }
    } catch (e) {
      setParseError(String(e));
    }
  }, []);

  const updateFromBuilder = useCallback((s: Strategy) => {
    setStrategy(s);
    setDslText(strategyToDSL(s));
    setParseError(null);
  }, []);

  const loadPreset = useCallback((name: string) => {
    const preset = PRESETS[name];
    if (preset) {
      setStrategy({ ...preset });
      setDslText(strategyToDSL(preset));
      setParseError(null);
    }
  }, []);

  const loadFile = useCallback((content: string, filename: string) => {
    try {
      const parsed = filename.endsWith(".py") ? parsePython(content) : parseDSL(content);
      setStrategy(parsed);
      setDslText(strategyToDSL(parsed));
      setParseError(null);
    } catch (e) {
      setParseError(`Failed to parse ${filename}: ${e}`);
    }
  }, []);

  return {
    strategy, dslText, parseError,
    updateFromDSL, updateFromBuilder, loadPreset, loadFile,
    presetNames: Object.keys(PRESETS),
  };
}
