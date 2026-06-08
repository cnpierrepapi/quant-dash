"use client";

import { useState, useCallback } from "react";
import { type Strategy, createEmptyStrategy } from "@/lib/strategy-types";
import { parseDSL, parsePython, parsePine, isPineScript, strategyToDSL, PRESETS } from "@/lib/strategy-parser";

export function useStrategy() {
  const [strategy, setStrategy] = useState<Strategy>(createEmptyStrategy());
  const [dslText, setDslText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [sourceFormat, setSourceFormat] = useState<"dsl" | "pine" | "py">("dsl");

  const smartParse = useCallback((text: string): Strategy => {
    if (isPineScript(text)) {
      setSourceFormat("pine");
      return parsePine(text);
    }
    setSourceFormat("dsl");
    return parseDSL(text);
  }, []);

  const updateFromDSL = useCallback((text: string) => {
    setDslText(text);
    try {
      const parsed = smartParse(text);
      if (parsed.entryLong.conditions.length > 0 || parsed.exitLong.conditions.length > 0) {
        setStrategy(parsed);
        setParseError(null);
      }
    } catch (e) {
      setParseError(String(e));
    }
  }, [smartParse]);

  const updateFromBuilder = useCallback((s: Strategy) => {
    setStrategy(s);
    setDslText(strategyToDSL(s));
    setSourceFormat("dsl");
    setParseError(null);
  }, []);

  const loadPreset = useCallback((name: string) => {
    const preset = PRESETS[name];
    if (preset) {
      setStrategy({ ...preset });
      setDslText(strategyToDSL(preset));
      setSourceFormat("dsl");
      setParseError(null);
    }
  }, []);

  const loadFile = useCallback((content: string, filename: string) => {
    try {
      let parsed: Strategy;
      if (filename.endsWith(".pine") || filename.endsWith(".pinescript") || isPineScript(content)) {
        parsed = parsePine(content);
        setSourceFormat("pine");
      } else if (filename.endsWith(".py")) {
        parsed = parsePython(content);
        setSourceFormat("py");
      } else {
        parsed = parseDSL(content);
        setSourceFormat("dsl");
      }
      setStrategy(parsed);
      setDslText(strategyToDSL(parsed));
      setParseError(null);
    } catch (e) {
      setParseError(`Failed to parse ${filename}: ${e}`);
    }
  }, []);

  return {
    strategy, dslText, parseError, sourceFormat,
    updateFromDSL, updateFromBuilder, loadPreset, loadFile,
    presetNames: Object.keys(PRESETS),
  };
}
