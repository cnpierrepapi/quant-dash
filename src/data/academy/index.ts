// Academy module/lesson registry

export type LessonMeta = {
  slug: string;
  title: string;
  description: string;
  indicators?: string[];   // which overlays to enable in simulated chart
  symbol?: string;
  interval?: string;
};

export type ModuleMeta = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  lessons: LessonMeta[];
};

export const MODULES: ModuleMeta[] = [
  {
    slug: "foundations",
    title: "Foundations",
    description: "The building blocks every quant trader needs before writing a single line of code.",
    icon: "1",
    lessons: [
      { slug: "what-is-a-strategy", title: "What Is a Trading Strategy?", description: "Signal, position, risk — the three pillars.", indicators: ["ema20", "ema50"] },
      { slug: "reading-candles", title: "Reading Candles", description: "OHLC, timeframes, wicks, and what they tell you.", interval: "1d" },
      { slug: "order-books", title: "Order Books & Execution", description: "Spreads, slippage, maker/taker, why backtests lie." },
    ],
  },
  {
    slug: "technical-indicators",
    title: "Technical Indicators",
    description: "The mathematical tools that transform raw price data into actionable signals.",
    icon: "2",
    lessons: [
      { slug: "sma-ema", title: "Moving Averages (SMA vs EMA)", description: "Trend detection, golden/death cross, lag tradeoff.", indicators: ["ema20", "ema50", "sma20", "sma50"] },
      { slug: "rsi", title: "RSI — Momentum Oscillator", description: "Overbought/oversold, divergences, failure swings." },
      { slug: "macd", title: "MACD — Signal Line Crossovers", description: "Histogram interpretation, zero-line crosses." },
      { slug: "bollinger", title: "Bollinger Bands", description: "Volatility envelopes, squeeze detection.", indicators: ["bbUpper", "bbLower"] },
      { slug: "atr", title: "ATR — Measuring Volatility", description: "Stop placement, position sizing by vol." },
      { slug: "vwap", title: "VWAP — Institutional Benchmark", description: "Intraday anchoring, deviation bands.", indicators: ["vwap"], interval: "15m" },
      { slug: "support-resistance", title: "Support & Resistance", description: "Pivot detection, level strength, breakout vs rejection." },
    ],
  },
  {
    slug: "academic-research",
    title: "Academic Research",
    description: "Peer-reviewed findings that separate quant traders from gamblers.",
    icon: "3",
    lessons: [
      { slug: "why-strategies-fail", title: "Why Most Strategies Fail", description: "Runs test, p-hacking, overfitting." },
      { slug: "fat-tails", title: "Fat Tails & Kurtosis", description: "Why Gaussian assumptions destroy accounts." },
      { slug: "vol-clustering", title: "Volatility Clustering", description: "GARCH, vol begets vol, autocorrelation." },
      { slug: "rough-vol", title: "Rough Volatility", description: "Gatheral (2018), H = 0.1, vol-of-vol." },
      { slug: "vpin", title: "Order Flow Toxicity (VPIN)", description: "Easley & Lopez de Prado, crash prediction." },
      { slug: "hmm-regimes", title: "Regime Detection (HMM)", description: "Bull/bear states, transition matrices." },
      { slug: "tsmom", title: "Time-Series Momentum", description: "Moskowitz (2012), why crypto momentum persists." },
    ],
  },
  {
    slug: "risk-management",
    title: "Risk Management",
    description: "Position sizing and survival — because edge without risk control is gambling.",
    icon: "4",
    lessons: [
      { slug: "kelly-criterion", title: "Kelly Criterion", description: "Full Kelly, half-Kelly, why sizing > signal." },
      { slug: "var-cvar", title: "Value at Risk", description: "Historical, Parametric, Cornish-Fisher, CVaR." },
      { slug: "drawdown-survival", title: "Drawdown Survival", description: "Circuit breakers, max DD recovery, equity psychology." },
      { slug: "leverage-ruin", title: "Leverage & Ruin", description: "The ruin probability curve. 3x vs 10x vs 20x." },
    ],
  },
  {
    slug: "strategy-building",
    title: "Strategy Building",
    description: "From idea to backtest — building strategies that survive contact with real data.",
    icon: "5",
    lessons: [
      { slug: "first-backtest", title: "Your First Strategy", description: "EMA crossover backtest, reading the results.", indicators: ["ema20", "ema50"] },
      { slug: "adding-filters", title: "Adding Filters", description: "RSI confirmation, volume gates, regime filters." },
      { slug: "composite-signal", title: "The Composite Signal", description: "Combining indicators with academic weighting." },
      { slug: "uploading-py", title: "Uploading a Strategy File", description: ".py file format, the DSL syntax, visual builder." },
      { slug: "reading-results", title: "Reading Backtest Results", description: "Sharpe vs Sortino, MC percentile, runs test." },
    ],
  },
  {
    slug: "forward-testing",
    title: "Forward Testing",
    description: "What happens next — projecting your strategy into unseen data.",
    icon: "6",
    lessons: [
      { slug: "projection-engine", title: "Future Candle Projection", description: "FHS + OHLC microstructure bootstrap." },
      { slug: "stress-testing", title: "Stress Testing", description: "Leverage sweep, tail events, vol clustering survival." },
      { slug: "paper-trading", title: "Paper Trading", description: "Tracking live signals without capital." },
      { slug: "backtest-to-live", title: "Backtest to Live", description: "The gap, execution slippage, when to kill a strategy." },
    ],
  },
];

export function getModule(slug: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getLesson(moduleSlug: string, lessonSlug: string): { module: ModuleMeta; lesson: LessonMeta; index: number } | undefined {
  const mod = getModule(moduleSlug);
  if (!mod) return undefined;
  const idx = mod.lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx === -1) return undefined;
  return { module: mod, lesson: mod.lessons[idx], index: idx };
}

export function getAdjacentLessons(moduleSlug: string, lessonSlug: string): {
  prev: { module: string; lesson: string } | null;
  next: { module: string; lesson: string } | null;
} {
  // Flatten all lessons
  const all: { module: string; lesson: string }[] = [];
  for (const mod of MODULES) {
    for (const les of mod.lessons) {
      all.push({ module: mod.slug, lesson: les.slug });
    }
  }
  const idx = all.findIndex((a) => a.module === moduleSlug && a.lesson === lessonSlug);
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}
