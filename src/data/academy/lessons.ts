// All 30 lesson contents — each has markdown body + chart config for simulated panel

export type LessonContent = {
  body: string;
  chartConfig: {
    symbol?: string;
    interval?: string;
    overlays?: string[];
    showSR?: boolean;
    showComposite?: boolean;
  };
};

export const LESSONS: Record<string, Record<string, LessonContent>> = {
  // ═══════════════════════════════════════════
  // MODULE 1: FOUNDATIONS
  // ═══════════════════════════════════════════
  foundations: {
    "what-is-a-strategy": {
      body: `# What Is a Trading Strategy?

A trading strategy is a systematic set of rules that tells you three things:

## 1. Signal — When to trade
The signal is the condition that triggers action. It could be a moving average crossover, an RSI reading below 30, or a more complex combination. The key word is *systematic* — if you can't write it as code, it's not a strategy, it's intuition.

## 2. Position — How much to trade
Position sizing is where most retail traders fail. The Kelly Criterion (Lesson 18) tells us the mathematically optimal bet size given your edge and odds. Even a profitable signal becomes unprofitable with poor sizing.

## 3. Risk — When to stop
Every strategy needs a kill switch. This includes:
- **Stop-loss**: maximum loss per trade (usually ATR-based)
- **Circuit breaker**: pause trading after a daily loss threshold
- **Drawdown limit**: reduce size or halt after X% from peak

## The QuantDash Framework

In this tool, you'll define strategies using either:
- The **Visual Builder** — dropdown conditions with AND/OR logic
- The **Code Editor** — DSL syntax like \`buy when ema(20) crosses_above ema(50)\`
- **File Upload** — drop in a .py strategy file

The backtest engine then runs your rules against real Binance data and produces an academic-grade performance report.

## Key Insight
The signal is the *least important* part of a strategy. Sizing and risk management determine whether a 55% win-rate edge makes you money or blows up your account. We'll prove this with the Kelly Criterion and Monte Carlo simulations later.`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "reading-candles": {
      body: `# Reading Candles

Every candle tells a story of the battle between buyers and sellers during a time period.

## OHLC Components
- **Open**: Where the period started
- **Close**: Where it ended
- **High**: Maximum price reached (buyer's peak effort)
- **Low**: Minimum price reached (seller's peak effort)
- **Body**: The |open - close| range — represents *conviction*
- **Wicks**: The high/low extensions beyond the body — represents *rejection*

## What Wicks Tell You
Long upper wick = buyers pushed price up but sellers rejected it. This is bearish pressure even if the candle closed green.

Long lower wick = sellers pushed price down but buyers absorbed it. This is bullish pressure even if the candle closed red.

Small body + long wicks = indecision. Neither side won. Often precedes a breakout.

## Timeframes
The same price data looks completely different at different timeframes:
- **1m**: Noise. Useful only for execution timing.
- **15m**: Short-term structure. Good for intraday.
- **1H**: The workhorse. Most strategies are calibrated here.
- **4H**: Swing trading sweet spot.
- **1D**: Trend identification. Where institutions think.

## In QuantDash
Use the interval buttons in the toolbar to switch timeframes. Notice how the same indicators (EMA, RSI) give completely different signals at 1m vs 1D. A strategy that works on 1H may fail on 1m because of microstructure noise.

## The Microstructure Secret
Our projection engine preserves candle microstructure — not just close prices, but the exact wick-to-body ratios from real historical candles. This means projected future candles *look and behave* like real ones, not just random walks.`,
      chartConfig: { interval: "1d", overlays: [] },
    },

    "order-books": {
      body: `# Order Books & Execution

The order book is where price is actually determined. Understanding it explains why backtests always overestimate real performance.

## The Spread
- **Bid**: Highest price someone will pay (buy limit orders)
- **Ask**: Lowest price someone will sell at (sell limit orders)
- **Spread**: Ask - Bid. This is the market maker's profit margin.

For BTC/USDT on Binance, the spread is typically 0.01% ($10 on a $100K price). For altcoins, it can be 0.1-0.5%.

## Why Backtests Lie
Your backtest assumes you buy at the close price. In reality:
1. **Slippage**: Your market order moves the price. The larger your order, the worse the fill.
2. **Fees**: Binance charges 0.1% per side (taker). That's 0.2% round-trip.
3. **Latency**: By the time your order arrives, the price has moved.

Our backtest engine deducts 0.2% round-trip fees. This is conservative — real slippage can be higher on large orders or illiquid pairs.

## Maker vs Taker
- **Taker**: You hit existing orders. Instant fill, but you pay the spread + fees.
- **Maker**: You place limit orders. Better price, but may not fill.

## VPIN Connection
The VPIN indicator (Lesson 15) measures order flow *toxicity* — whether informed traders are actively buying or selling. High VPIN means the spread should widen and your execution quality will degrade.

## Practical Rule
Any strategy showing < 0.5% average return per trade is likely not covering real execution costs. Our break-even analysis (Lesson 26) makes this explicit.`,
      chartConfig: { overlays: [], showComposite: false },
    },
  },

  // ═══════════════════════════════════════════
  // MODULE 2: TECHNICAL INDICATORS
  // ═══════════════════════════════════════════
  "technical-indicators": {
    "sma-ema": {
      body: `# Moving Averages — SMA vs EMA

Moving averages are the most widely used indicator in trading. They smooth price data to reveal the underlying trend.

## SMA (Simple Moving Average)
SMA(n) = average of the last n closing prices.

Equal weight to all bars. Slow to react. Good for identifying the *established* trend.

## EMA (Exponential Moving Average)
EMA uses exponential weighting: recent bars matter more.

Formula: EMA_t = alpha * price + (1 - alpha) * EMA_{t-1}, where alpha = 2/(n+1)

EMA(20) reacts faster than SMA(20). Better for catching trend changes early, but more false signals.

## The Golden Cross
When the short MA (20) crosses ABOVE the long MA (50), it's called a golden cross — a bullish signal. The reverse (death cross) is bearish.

This is one of our preset strategies. Select "Golden Cross" from the Presets dropdown to see it in action.

## Academic Finding
Brock, Lakonishok & LeBaron (1992) found MA crossover strategies produced significant profits in the Dow Jones from 1897-1986. However, subsequent research shows this edge has largely disappeared in mature markets due to crowding. In crypto, the evidence is mixed — momentum persists longer due to 24/7 trading and retail dominance.

## In QuantDash
Toggle EMA 20 (amber) and EMA 50 (blue) in the overlay panel. Watch how crossovers align with major trend changes. Notice that in sideways markets, they produce many false signals — this is why we add filters (Lesson 23).`,
      chartConfig: { overlays: ["ema20", "ema50", "sma20", "sma50"] },
    },

    "rsi": {
      body: `# RSI — Relative Strength Index

RSI measures the speed and magnitude of price changes to identify overbought/oversold conditions.

## Formula (Wilder, 1978)
RSI = 100 - 100 / (1 + RS), where RS = average gain / average loss over N periods (default 14).

## Interpretation
- **RSI > 70**: Overbought — price may be due for a pullback
- **RSI < 30**: Oversold — price may be due for a bounce
- **RSI = 50**: Neutral — no momentum bias

## The RSI Trap
The most common mistake: buying when RSI drops below 30. In strong downtrends, RSI can stay below 30 for days while price keeps falling. The signal is not "RSI < 30" but "RSI *crosses above* 30" — the transition from oversold back to momentum.

This is why our "RSI Oversold Bounce" preset uses \`buy when rsi(14) crosses_above 30\`.

## Divergence
When price makes a new low but RSI makes a higher low, that's bullish divergence — momentum is weakening even as price falls. This is one of the most reliable reversal signals, but hard to automate.

## In the Composite Score
RSI contributes 15% weight to the academic composite. It's labeled OVERBOUGHT (>70), OVERSOLD (<30), or NEUTRAL. The composite dampens RSI's false signals by combining it with trend, MACD, and order flow.

## In QuantDash
Check the RSI gauge in the Indicators panel. The visual bar shows current positioning. Use it as a filter — don't trade long when RSI > 70, don't trade short when RSI < 30.`,
      chartConfig: { overlays: ["ema20"], showComposite: true },
    },

    "macd": {
      body: `# MACD — Moving Average Convergence Divergence

MACD (Appel, 1979) measures the relationship between two EMAs to identify momentum shifts.

## Components
1. **MACD Line** = EMA(12) - EMA(26) — the spread between fast and slow EMAs
2. **Signal Line** = EMA(9) of the MACD line — smoothed version
3. **Histogram** = MACD - Signal — the difference between them

## Signals
- **Histogram crosses above 0**: Bullish momentum increasing
- **Histogram crosses below 0**: Bearish momentum increasing
- **MACD crosses above Signal**: Buy signal
- **MACD crosses below Signal**: Sell signal

## Why the Histogram Matters More
The MACD/Signal crossover is slow — by the time it triggers, much of the move has happened. The histogram shows momentum *change* — when it shrinks, momentum is fading even if the trend is still intact.

## The MACD Cross Preset
Our "MACD Cross" preset uses \`buy when macd_histogram crosses_above 0\`. This captures the moment bearish momentum flips to bullish.

## Academic Context
MACD is essentially a trend-following momentum indicator. Moskowitz, Ooi & Pedersen (2012) showed that time-series momentum exists across asset classes and timeframes. MACD captures a specific form of this — the 12/26 EMA spread responds to 1-3 month momentum cycles.

## In QuantDash
The MACD histogram value shows in the Indicators panel. Green = bullish momentum, red = bearish. It contributes 15% to the composite score.`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "bollinger": {
      body: `# Bollinger Bands — Volatility Envelopes

Bollinger Bands (1983) wrap a moving average with bands at +/- k standard deviations, creating a dynamic volatility envelope.

## Formula
- Middle Band = SMA(20)
- Upper Band = SMA(20) + 2 * sigma(20)
- Lower Band = SMA(20) - 2 * sigma(20)

Where sigma(20) is the 20-period standard deviation.

## Key Concepts

### Mean Reversion
When price touches the lower band, it's statistically 2 standard deviations below the mean. In range-bound markets, this often triggers a bounce. Our "BB Mean Reversion" preset trades this: \`buy when price < bb_lower\`.

### The Squeeze
When the bands contract (narrow), volatility is low. Low volatility precedes high volatility — this is the vol clustering effect (Lesson 13). A squeeze often precedes a breakout.

### %B Position
%B = (price - lower) / (upper - lower). It ranges from 0 (at lower band) to 1 (at upper band). Values above 1 or below 0 mean price is outside the bands.

## In the Composite Score
Bollinger position contributes 10% weight. At upper band = bearish bias, at lower band = bullish bias. Combined with other signals, this helps time entries.

## In QuantDash
Toggle "BB Upper" and "BB Lower" in overlays. The indigo bands show the 2-sigma envelope. Watch how price oscillates between them in range markets but walks the upper band in strong trends.`,
      chartConfig: { overlays: ["bbUpper", "bbLower"], showComposite: true },
    },

    "atr": {
      body: `# ATR — Average True Range

ATR (Wilder, 1978) measures volatility in absolute price terms. Unlike Bollinger Bands (which use standard deviation), ATR captures the full range including gaps.

## Formula
True Range = max(High - Low, |High - Prev Close|, |Low - Prev Close|)
ATR(14) = 14-period smoothed average of True Range

## Uses

### 1. Stop-Loss Placement
The most important use. Set your stop at entry - 1.5 * ATR. This means your stop adjusts to current volatility — tight stops in calm markets, wide stops in volatile markets.

### 2. Position Sizing
Risk $X per trade. Size = $X / (1.5 * ATR). This ensures each trade risks the same dollar amount regardless of volatility.

### 3. Breakout Confirmation
A breakout accompanied by expanding ATR is more likely to be real. Contracting ATR during a breakout suggests a false move.

## In QuantDash
ATR(14) shows in the Indicators panel as a dollar value. For BTC at $100K, an ATR of $2,000 means daily range is about 2%. A 1.5x ATR stop would be $3,000 (3%).

## Academic Connection
ATR is closely related to Parkinson volatility (also shown in our panel). Parkinson is ~5x more statistically efficient because it uses the full high-low range, not just closing prices. Both tell you about regime — low ATR = compression = breakout imminent.`,
      chartConfig: { overlays: ["ema50"], showComposite: true },
    },

    "vwap": {
      body: `# VWAP — Volume-Weighted Average Price

VWAP is the average price weighted by volume — it tells you the *true* average price at which the market has transacted.

## Formula
VWAP = Cumulative(Typical Price * Volume) / Cumulative(Volume)
Typical Price = (High + Low + Close) / 3

## Why It Matters
Institutions use VWAP as a benchmark. If they buy above VWAP, they got a bad fill. Below VWAP = good fill. This creates a natural support/resistance level.

## Trading with VWAP
- **Price above VWAP**: Buyers are in control. Look for long entries on pullbacks to VWAP.
- **Price below VWAP**: Sellers are in control. Look for short entries on rallies to VWAP.
- **Price crossing VWAP**: Potential trend change.

## Intraday Only
VWAP resets each day (the cumulative calculation starts over). It's most useful on 1m-1H timeframes. On daily or weekly charts, it becomes a running cumulative average and loses its intraday anchoring meaning.

## In QuantDash
Toggle VWAP (purple line) in overlays. Switch to 15m or 1H timeframe for best results. The line acts as a magnet — price tends to revert to it during quiet periods.`,
      chartConfig: { overlays: ["vwap"], interval: "15m" },
    },

    "support-resistance": {
      body: `# Support & Resistance

Support and resistance levels are prices where buying or selling pressure has historically concentrated. They're the most intuitive concept in trading and the hardest to automate.

## How We Detect Them
Our algorithm uses pivot-based detection:
1. Scan for local highs (no higher high within N bars on either side) → resistance
2. Scan for local lows (no lower low within N bars on either side) → support
3. Cluster nearby levels (within 0.5%) → increase strength count
4. Rank by strength (number of touches)

## The Strength Count
A level touched 3 times is stronger than one touched once. Each touch that *doesn't* break the level adds confidence. But when a strong level finally breaks, it often becomes the opposite — old resistance becomes new support (and vice versa).

## In QuantDash
S/R levels are shown as dotted lines: green for support, red for resistance. The "x" count in the panel shows how many times each level was tested. Toggle them with the "S/R Levels" button in overlays.

## Limitations
S/R detection is backward-looking. A level that held 5 times in the past provides no guarantee for the future. Use S/R as context for your strategy, not as the strategy itself. For example: "buy the golden cross, but only if price is near support."`,
      chartConfig: { overlays: [], showSR: true },
    },
  },

  // ═══════════════════════════════════════════
  // MODULE 3: ACADEMIC RESEARCH
  // ═══════════════════════════════════════════
  "academic-research": {
    "why-strategies-fail": {
      body: `# Why Most Strategies Fail

Most backtested strategies that look profitable are actually detecting randomness, not edge. Here's why, and how to tell the difference.

## 1. Overfitting
If you test 100 random strategies, ~5 will show "significant" results at the 95% confidence level. This is pure chance. The more parameters you tune, the more likely you are to find something that fits historical noise.

**Our defense**: The Monte Carlo bootstrap (5,000 shuffled paths) shows where your strategy's actual return ranks against random reshufflings. If your result is above the 80th percentile, it's *likely* real. Below 50th = likely luck.

## 2. The Runs Test
The Wald-Wolfowitz runs test checks whether your sequence of wins and losses is random. If it is (p > 0.05), your strategy's W/L pattern is indistinguishable from coin flips — meaning any profitability came from the *size* of wins vs losses, not from predictive ability.

## 3. P-Hacking
Testing many variations until one "works" inflates your false positive rate. If you tested 20 parameter combinations, your effective p-value is 20x worse.

**Rule of thumb**: If your strategy only works with very specific parameters (EMA 23 but not 20 or 25), it's likely overfit.

## In QuantDash
After running a backtest, click "Show Academic Report" to see the runs test and Monte Carlo results. These two tests alone will eliminate 80% of false strategies.`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "fat-tails": {
      body: `# Fat Tails & Kurtosis

The most dangerous assumption in finance: that returns are normally distributed. They're not. Understanding this saves accounts.

## Normal Distribution Expects:
- 3-sigma event (3x std dev): once every 741 days (~2 years)
- 4-sigma event: once every 31,560 days (~86 years)
- 5-sigma event: once every 3.5 million days (never in a human lifetime)

## Reality (BTC/USDT):
- 3-sigma events: 2-5x MORE frequent than Gaussian predicts
- 4-sigma events: 10-50x MORE frequent
- 5-sigma events: happen multiple times per year

## Kurtosis
Kurtosis measures how fat the tails are. A normal distribution has kurtosis = 3 (excess kurtosis = 0). BTC daily returns have excess kurtosis of +5 to +8. This means:
- The tails contain far more probability mass than expected
- Extreme moves are not "black swans" — they're regular features of the market

## Why This Matters
If you size positions assuming Gaussian tails, you'll be wiped out by events that are "impossible" under your model but routine in reality. This is why:
1. **Kelly sizing must be fractional** (half-Kelly or less)
2. **VaR should use Cornish-Fisher** (adjusts for skewness and kurtosis)
3. **Leverage caps are non-negotiable** (our projection test proves 3x is safe, 10x is not)

## In QuantDash
The Cornish-Fisher VaR in the Academic Report adjusts for fat tails. Compare it to the Parametric (Gaussian) VaR — the difference is how much risk you're underestimating.`,
      chartConfig: { overlays: [], showComposite: true },
    },

    "vol-clustering": {
      body: `# Volatility Clustering

"Large changes tend to be followed by large changes — of either sign — and small changes tend to be followed by small changes." — Mandelbrot (1963)

## The GARCH Effect
Volatility is autocorrelated. If today was volatile, tomorrow is more likely to be volatile too. This is measured by the autocorrelation of |returns| at lag 1, typically 0.15-0.25 for crypto.

## GARCH(1,1) Model
sigma_t^2 = omega + alpha * r_{t-1}^2 + beta * sigma_{t-1}^2

Where alpha captures the shock from yesterday's return, and beta captures the persistence of yesterday's volatility. Typical crypto values: alpha = 0.10, beta = 0.85.

## Why It Matters for Trading
1. **Regime detection**: High vol clusters → high-vol regime. Low vol clusters → low-vol regime.
2. **Position sizing**: In high-vol regimes, reduce position size. In low-vol regimes, tighter stops are sufficient.
3. **Breakout timing**: A squeeze in volatility (low ATR, narrow Bollinger Bands) often precedes a breakout because vol clusters — once it starts expanding, it tends to continue.

## Our Projection Engine
The future candle projection uses a GARCH-lite model to ensure simulated paths exhibit realistic vol clustering. Without this, projections would underestimate the probability of consecutive large moves — exactly the scenarios that blow up leveraged strategies.

## In QuantDash
Watch the Parkinson Vol indicator in the sidebar. When it's trending up, vol is clustering — expect more volatility. When it's trending down, a squeeze may be forming.`,
      chartConfig: { overlays: ["bbUpper", "bbLower"], showComposite: true },
    },

    "rough-vol": {
      body: `# Rough Volatility

## The Discovery
Gatheral, Jaisson & Rosenbaum (2018) — "Volatility is Rough" — showed that across virtually all asset classes, volatility follows a fractional Brownian motion with Hurst exponent H ≈ 0.1.

## What H = 0.1 Means
- H = 0.5: Standard Brownian motion (random walk)
- H > 0.5: Persistent (trending volatility)
- H < 0.5: Anti-persistent (mean-reverting volatility)
- H = 0.1: Very rough — volatility changes are extremely anti-persistent

In plain English: vol spikes are sharp but collapse quickly. The market doesn't "gradually" become volatile — it jumps to high vol and then rapidly mean-reverts.

## Practical Implications
1. **Vol spikes are short-lived**: Don't panic-sell during vol spikes. They tend to compress within days.
2. **Standard models understate vol-of-vol**: If you assume smooth volatility paths, you'll underestimate the speed of regime transitions.
3. **Options are mispriced**: Most options pricing models assume smoother vol dynamics than reality.

## Measuring H
We estimate H via variogram analysis: plot E[|vol(t+lag) - vol(t)|^2] vs lag on log-log scale. The slope = 2H. A slope near 0.2 confirms H ≈ 0.1.

## In QuantDash
The Parkinson Vol indicator shows realized volatility. Watch how it spikes and collapses rather than trending smoothly. This is rough volatility in action — and our projection engine's GARCH-lite model approximates this behavior.`,
      chartConfig: { overlays: [], showComposite: true },
    },

    "vpin": {
      body: `# Order Flow Toxicity — VPIN

## The Paper
Easley, Lopez de Prado & O'Hara (2012) — "Flow Toxicity and Liquidity in a High-Frequency World"

VPIN (Volume-Synchronized Probability of Informed Trading) measures whether informed traders are actively trading — a leading indicator of price jumps and crashes.

## How It Works
1. Divide trading volume into equal-size buckets (not time-based)
2. For each bucket: classify volume as buy or sell (Binance gives this directly via taker_buy_vol)
3. Imbalance = |V_buy - V_sell| / V_total
4. VPIN = rolling mean of imbalance over last 50 buckets

## Interpretation
- **VPIN < 0.30**: Normal, balanced flow
- **VPIN 0.30-0.45**: Elevated — some informed activity
- **VPIN > 0.45**: Toxic — informed traders are active, crash/jump risk elevated

## Why Volume Buckets, Not Time Buckets?
Information arrives at irregular intervals. During quiet periods, time-based sampling over-represents noise. Volume-based sampling ensures each bucket contains the same "amount" of information.

## 2025 Update
Easley et al. (2025) applied VPIN to Bitcoin and found it predicts large price moves 1.5-2x better than time-based volatility measures.

## In QuantDash
VPIN shows in the Indicators panel. When it reads "TOXIC" (>0.45), consider:
- Reducing position size
- Widening stops
- Not entering new trades

The Academic Report includes a VPIN correlation card showing whether high VPIN periods predicted larger subsequent moves in your backtest data.`,
      chartConfig: { overlays: [], showComposite: true },
    },

    "hmm-regimes": {
      body: `# Regime Detection — Hidden Markov Models

## The Idea
Markets operate in distinct regimes (bull, bear, sideways) with different statistical properties. An HMM identifies these regimes automatically from return data.

## How HMM Works (simplified)
1. Assume N hidden states (we use 3: bear, sideways, bull)
2. Each state has its own return distribution (mean and variance)
3. Transitions between states follow a Markov process (tomorrow's state depends only on today's)
4. The Baum-Welch EM algorithm learns: state means, state variances, and the transition probabilities

## What You Get
- **State means**: Bear might have mean daily return = -0.3%, Sideways = 0%, Bull = +0.2%
- **State variances**: Bear vol >> Bull vol (markets fall faster than they rise)
- **Transition matrix**: P(stay in bull) = 0.92, P(bull → bear) = 0.03
- **Expected duration**: 1 / (1 - P(stay)) — e.g., bull regime lasts ~12 days on average

## Trading Application
Different strategies work in different regimes:
- **Bull**: Momentum strategies thrive (ride the trend)
- **Bear**: Mean reversion can work (snap-back rallies)
- **Sideways**: Range-bound strategies (buy support, sell resistance)

## In QuantDash
The Academic Report includes a "HMM Regime Breakdown" card that splits your backtest trades by regime. This reveals whether your strategy performs uniformly or only works in one regime (a red flag for robustness).`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "tsmom": {
      body: `# Time-Series Momentum

## The Paper
Moskowitz, Ooi & Pedersen (2012) — "Time Series Momentum" (Journal of Financial Economics)

The most important finding: assets that went up over the past 12 months tend to continue going up. This holds across equities, bonds, currencies, and commodities. Han, Kang & Ryu (2024) confirmed it for crypto.

## How TSMOM Works
1. Compute cumulative return over past 12 months (skip last month)
2. If positive → go long. If negative → go flat (or short).
3. Size position by inverse volatility: position = vol_target / realized_vol
4. Rebalance monthly

## Why Skip the Last Month?
Short-term reversal. The last 1-4 weeks tend to mean-revert (profit-taking after strong moves). Skipping them improves the signal.

## Vol Scaling (the secret sauce)
Equal dollar exposure across assets produces horrible risk-adjusted returns. Targeting constant volatility (e.g., 40% annualized) normalizes risk and dramatically improves Sharpe ratios.

## Crypto-Specific Findings
- Momentum is stronger in crypto than traditional markets (less institutional arbitrage)
- Works best on 30-180 day lookbacks
- Degrades below 7 days (noise) and above 365 days (mean reversion kicks in)

## In QuantDash
Our TSMOM tool (in quant-lab) runs this strategy across 8 crypto assets. In the dashboard, you can approximate it with \`buy when ema(50) is_above ema(200)\` — a simplified momentum signal that captures the same regime.`,
      chartConfig: { overlays: ["ema50", "ema200"] },
    },
  },

  // ═══════════════════════════════════════════
  // MODULE 4: RISK MANAGEMENT
  // ═══════════════════════════════════════════
  "risk-management": {
    "kelly-criterion": {
      body: `# Kelly Criterion

## The Formula
f* = (p * b - q) / b

Where:
- f* = fraction of bankroll to bet
- p = probability of winning
- q = 1 - p = probability of losing
- b = ratio of average win to average loss

## Example
Win rate = 55%, avg win = $200, avg loss = $150
b = 200/150 = 1.33
f* = (0.55 * 1.33 - 0.45) / 1.33 = 21%

Full Kelly says bet 21% of your bankroll per trade.

## Why Half-Kelly
Full Kelly maximizes long-term growth but produces terrifying drawdowns. In practice:
- **Full Kelly**: Maximum growth, but 50%+ drawdowns are common
- **Half Kelly**: ~75% of the growth, drawdowns cut roughly in half
- **Quarter Kelly**: Smoother ride, but much slower compounding

Our projection test (from projection_test.py) proves this: full Kelly at 3x leverage has nearly identical ruin rate to half-Kelly, but half-Kelly's max drawdown is much smaller.

## The Critical Insight
Kelly tells you the *maximum* you should bet. Betting MORE than Kelly is mathematically guaranteed to reduce your long-term wealth. Most retail traders massively over-bet.

## In QuantDash
Select "Half Kelly" in the sizing config when defining your strategy. The backtest will size each trade based on the trailing 60-bar win rate and R:R ratio. The break-even analysis in the Academic Report shows whether your edge justifies Kelly sizing.`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "var-cvar": {
      body: `# Value at Risk (VaR) & Expected Shortfall (CVaR)

## What VaR Answers
"What is the worst I can lose with 95% (or 99%) confidence in one period?"

## Three Methods

### 1. Historical VaR
Sort all historical returns. The 5th percentile = 95% VaR.
Simple, no distributional assumptions, but limited by your sample size.

### 2. Parametric (Gaussian) VaR
VaR = mu + z * sigma, where z = -1.645 for 95% confidence.
Assumes normal returns. Underestimates risk because of fat tails.

### 3. Cornish-Fisher VaR
Adjusts Gaussian VaR for skewness and kurtosis:
z_cf = z + (z^2-1)*S/6 + (z^3-3z)*K/24 - (2z^3-5z)*S^2/36

This gives a much more accurate estimate for fat-tailed crypto returns.

## CVaR (Expected Shortfall)
VaR tells you the threshold. CVaR tells you: "When it's worse than VaR, *how bad* is it on average?" CVaR = mean of returns below VaR. This is always worse than VaR and is the better risk measure.

## In QuantDash
The Academic Report shows all three VaR methods plus CVaR at 95% confidence. Compare Parametric vs Cornish-Fisher — the gap shows how much risk you'd underestimate by assuming Gaussian returns.`,
      chartConfig: { overlays: [], showComposite: true },
    },

    "drawdown-survival": {
      body: `# Drawdown Survival

Drawdowns are not just a financial event — they're a psychological one. Understanding their mechanics prevents the worst trading mistake: abandoning a winning strategy at its worst moment.

## Anatomy of a Drawdown
1. **Peak**: Your equity high-water mark
2. **Trough**: The lowest point before recovery
3. **Depth**: (Trough - Peak) / Peak — expressed as negative percentage
4. **Duration**: Time from peak to recovery (not just peak to trough)

## Recovery Math
A 10% drawdown requires an 11% gain to recover.
A 20% drawdown requires 25%.
A 50% drawdown requires 100%.
A 90% drawdown requires 900%.

This asymmetry is why circuit breakers exist.

## Circuit Breakers (from DEED Strategy)
- **Daily loss > 3%**: Halt trading for 1 day. Prevents emotional revenge trading.
- **Drawdown > 15%**: Halt for 5 days. Forces regime reassessment.
- **Equity < 5%**: Ruin — strategy has failed, stop permanently.

## In QuantDash
The Drawdown card in the Academic Report shows your top 5 worst drawdowns with depth and duration. The stress test (in the sidebar) shows max drawdown distribution across projected future paths. If median projected max DD > 20%, your leverage is too high.`,
      chartConfig: { overlays: [], showComposite: false },
    },

    "leverage-ruin": {
      body: `# Leverage & Ruin

Leverage is the single most dangerous parameter in trading. The relationship between leverage and ruin probability is *exponential*, not linear.

## The Ruin Curve
From our projection test (200 paths x 2000 candles):
- **1x**: Ruin probability ≈ 0%. Safe.
- **3x**: Ruin ≈ 0-1%. Safe with half-Kelly.
- **5x**: Ruin ≈ 1-5%. Acceptable for experienced traders.
- **10x**: Ruin ≈ 5-20%. Dangerous.
- **20x**: Ruin ≈ 20-50%. Nearly guaranteed eventual ruin.

## Why Ruin is Exponential
Each leveraged loss reduces your capital, but the leverage stays constant. A 3% daily loss at 10x is a 30% equity hit. Two consecutive 3% days = 51% gone. At this point, you need 104% gain to recover — while still at 10x leverage, meaning you need a 10.4% unleveraged move without any pullback.

## Vol Clustering Makes It Worse
Bad days cluster (GARCH effect). So the consecutive-tail-event scenario isn't a theoretical edge case — it happens regularly. Our projection test measures the longest streak of 2-sigma events: typically 3-5 days. At 10x leverage, that's catastrophic.

## The Safe Leverage Formula
Safe leverage ≈ 1 / (3 * daily_vol * tail_factor)
For BTC (daily vol ≈ 3%, tail factor ≈ 2): safe ≈ 1 / (3 * 0.03 * 2) = 5.6x

## In QuantDash
The stress test panel in the sidebar shows ruin probability at 1x, 3x, and 5x. Enable projection first, then check the stress test. If ruin > 1% at your intended leverage, reduce it.`,
      chartConfig: { overlays: [], showComposite: false },
    },
  },

  // ═══════════════════════════════════════════
  // MODULE 5: STRATEGY BUILDING
  // ═══════════════════════════════════════════
  "strategy-building": {
    "first-backtest": {
      body: `# Your First Strategy — EMA Crossover

Let's build and test the simplest possible strategy: buy when EMA(20) crosses above EMA(50), sell when it crosses below.

## Step 1: Load the Preset
Click the "Presets" dropdown in the Strategy panel and select "Golden Cross". This populates:
- Entry: \`ema(20) crosses_above ema(50)\`
- Exit: \`ema(20) crosses_below ema(50)\`

## Step 2: Run the Backtest
Click "Run Backtest". The engine will:
1. Walk through all 500 candles
2. Mark entry points (green arrows) and exit points (red arrows) on the chart
3. Generate a trade log with P&L per trade
4. Compute overall return, win rate, and Sharpe ratio

## Step 3: Read the Results
Look at the header bar: total return, trade count, win rate, Sharpe, and max drawdown. These tell you the headline story.

## Step 4: Open the Academic Report
Click "Show Academic Report" below the results. This is where the real analysis begins:
- Is the return *actually* better than random? (Monte Carlo)
- Is the W/L sequence structured or random? (Runs test)
- Does the win rate exceed break-even? (Break-even analysis)

## What You'll Likely Find
The golden cross on 1H BTC produces modest results (~0.3-1% per trade) with ~45-55% win rate. It works best in trending markets and gives many false signals in sideways markets. This is *normal* — and why we add filters in the next lesson.`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "adding-filters": {
      body: `# Adding Filters — Improving Your Strategy

The golden cross alone has too many false signals. Let's add filters to reduce noise.

## Filter 1: RSI Confirmation
Instead of buying every golden cross, only buy when RSI(14) < 50. This ensures we're buying when momentum hasn't already peaked.

In the Visual Builder, click "+ Add condition" under Entry, then select:
- RSI(14) < 50

Set logic to AND. Now both conditions must be true to trigger a buy.

## Filter 2: Volume Gate
Add: Volume > SMA(20) of volume. Only trade when volume confirms the move. (In our DSL: this isn't directly supported yet, but you can use the code editor.)

## Filter 3: Regime Filter
Only trade when the composite score > 0 (positive overall signal). This uses all 7 academic indicators as a meta-filter.

## The Tradeoff
Every filter you add:
- **Reduces false signals** (fewer bad trades)
- **Reduces total trades** (less opportunity)
- **Increases the risk of overfitting** (more parameters = more curve-fitting)

## The Rule of Three
Three well-chosen filters is usually the sweet spot. Beyond that, you're likely fitting noise. Our runs test and Monte Carlo bootstrap will tell you if you've gone too far.

## Test It
Run the backtest with filters, then compare the Academic Report to the unfiltered golden cross. Look for:
- Higher Sharpe ratio
- Better MC percentile rank
- Maintained trade count (should be 50%+ of original)`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "composite-signal": {
      body: `# The Composite Signal

Our academic composite combines 7 indicators into a single conviction score. Here's how and why.

## The 7 Components

| Signal | Weight | Source | What It Captures |
|--------|--------|--------|-----------------|
| Trend | 20% | EMA(20) vs EMA(50) | Direction of trend |
| Momentum | 15% | RSI(14) | Speed of price change |
| MACD | 15% | MACD histogram | Momentum acceleration |
| Volatility | 15% | Parkinson(7d/30d) | Vol regime shift |
| Order Flow | 15% | VPIN + buy % | Informed trading activity |
| BB Position | 10% | Price within bands | Mean reversion signal |
| Volume | 10% | Current / SMA(20) | Conviction confirmation |

## Why These Weights?
Trend gets the highest weight because it's the most persistent signal in crypto (Moskowitz 2012). Order flow and volatility get equal weight because they capture different aspects of market microstructure. BB and volume get lower weight because they're more noisy.

## How to Use It
- **Score > +40**: Strong conviction. Multiple signals agree. Consider larger position.
- **Score +15 to +40**: Moderate conviction. Trade with standard size.
- **Score -15 to +15**: No conviction. Stay flat or reduce size.
- **Score < -15**: Bearish conviction. Exit longs, consider shorts.

## The Key Insight
No single indicator is reliable. But when 5-6 out of 7 agree, the probability of a false signal drops dramatically. The composite acts as a meta-filter on any strategy you build.

## In QuantDash
The composite score updates in real-time in the sidebar. Each signal shows its current label and weight contribution. Use it as a go/no-go gate for any strategy.`,
      chartConfig: { overlays: ["ema20", "ema50", "bbUpper", "bbLower"], showComposite: true },
    },

    "uploading-py": {
      body: `# Uploading a Strategy File

You can bring your own strategy into QuantDash by uploading a Python (.py) or text (.txt) file.

## DSL Format (.txt)
The simplest format. Write conditions in plain English:

\`\`\`
buy when ema(20) crosses_above ema(50) and rsi(14) < 30
sell when ema(20) crosses_below ema(50) or rsi(14) > 70
\`\`\`

## Python Format (.py)
The parser looks for common patterns in Python strategy files:

\`\`\`python
if ema_20 > ema_50:
    buy()
if rsi_14 > 70:
    sell()
\`\`\`

It's best-effort — complex Python logic won't parse perfectly. But simple conditional expressions work.

## Available Indicators in DSL
\`ema(N)\`, \`sma(N)\`, \`rsi(N)\`, \`atr(N)\`, \`vwap\`, \`vpin\`,
\`macd_histogram\`, \`bb_upper\`, \`bb_lower\`, \`bb_mid\`, \`price\`

## Available Operators
\`crosses_above\`, \`crosses_below\`, \`>\` (is_above), \`<\` (is_below), \`==\` (equals)

## How to Upload
1. Click "Code" tab in the Strategy panel
2. Click "Upload .py / .txt"
3. Select your file
4. The parser will attempt to extract entry and exit conditions
5. Check the Visual Builder tab to verify it parsed correctly
6. Adjust any misinterpreted conditions

## Bidirectional Sync
Whatever you type in the code editor automatically updates the visual builder, and vice versa. You can start in one and refine in the other.`,
      chartConfig: { overlays: ["ema20", "ema50"] },
    },

    "reading-results": {
      body: `# Reading Backtest Results — What Matters

After running a backtest, you get a wall of numbers. Here's what to look at and in what order.

## Priority 1: Monte Carlo Percentile
If your result is below the 50th percentile of random shuffles, your strategy is *worse* than chance. Above 80th = likely real edge. This is the single most important test.

## Priority 2: Runs Test
If p > 0.05, your W/L sequence is random. This doesn't mean the strategy is bad — it means the edge comes from *sizing* (bigger wins than losses), not *timing* (predicting direction). Many valid strategies have random W/L sequences.

## Priority 3: Break-Even Win Rate
If your actual win rate is below break-even, you're losing money on average per trade. Even with occasional big wins, the math doesn't work long-term.

## Priority 4: Sharpe Ratio
- < 0: Losing money
- 0-0.5: Marginal
- 0.5-1.0: Decent
- 1.0-2.0: Strong
- > 2.0: Suspicious (likely overfit or too few trades)

## Priority 5: Max Drawdown
Any strategy with max DD > 30% will be psychologically impossible to follow in real trading. Even if the expected return is high, you'll likely abandon it during the drawdown.

## Red Flags
- Sharpe > 3.0 with many trades → probably overfit
- Win rate > 70% but tiny average win → one large loss will erase everything
- Very few trades (< 20) → insufficient sample size for any statistical conclusion

## In QuantDash
The Academic Report presents all these metrics in 8 cards. Read them in the priority order above. If the first two checks fail, don't bother with the rest — redesign the strategy.`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },
  },

  // ═══════════════════════════════════════════
  // MODULE 6: FORWARD TESTING
  // ═══════════════════════════════════════════
  "forward-testing": {
    "projection-engine": {
      body: `# Future Candle Projection — How It Works

Our projection engine generates realistic future candle paths using a combination of three academic techniques.

## Step 1: OHLC Microstructure Decomposition
Each historical candle is decomposed into three components:
- **Return**: close/open - 1
- **Upper wick extension**: high/max(open,close) - 1
- **Lower wick extension**: min(open,close)/low - 1

This preserves the full candle shape — not just the close.

## Step 2: Vol-Regime Pooling
Candles are pooled by trailing 20-day vol into terciles (low/mid/high). When generating future candles, we sample from the pool matching the current vol regime. This means:
- In low-vol regimes, we sample small, tight candles
- In high-vol regimes, we sample large, wild candles

## Step 3: GARCH-Lite Conditional Vol
sigma_t = omega + alpha * |r_{t-1}| + beta * sigma_{t-1}

This ensures vol clustering — if the last candle was big, the next one tends to be big too.

## Step 4: Poisson Jump Layer
Real markets have discrete jumps (flash crashes, news spikes). We separate candles with |return| > 3 sigma into a "jump pool" and sample from it at the observed historical frequency using a Poisson process.

## The Fan Chart
The projection generates N paths (default 50). At each future time step, we compute percentiles:
- **P50** (median): Bold line — most likely path
- **P25-P75**: Tighter dotted band — 50% of paths fall here
- **P10-P90**: Faint outer band — 80% of paths

## In QuantDash
Click "Enable Projection" in the sidebar. The fan appears beyond the last candle. Adjust horizon and path count, then click "Regenerate" for a fresh simulation.`,
      chartConfig: { overlays: ["ema20"] },
    },

    "stress-testing": {
      body: `# Stress Testing Your Strategy

A strategy that works on historical data might fail catastrophically on future data. Stress testing answers: "How bad can it get?"

## What We Test
1. **Leverage sweep**: Run the buy-and-hold return on projected paths at 1x, 3x, and 5x leverage
2. **Ruin probability**: What % of paths result in 95%+ loss?
3. **Max drawdown distribution**: Not just the average, but the *distribution* of worst drawdowns
4. **Circuit breaker trips**: How often would the 3% daily loss or 15% DD breaker trigger?

## How to Read the Results
The stress test table in the sidebar shows:
- **Median return**: The typical outcome at each leverage level
- **P5/P95**: The 5th and 95th percentile outcomes — the range of realistic outcomes
- **Ruin %**: Should be < 1% at your intended leverage
- **MaxDD median**: The typical worst drawdown you'll experience

## The Safe Leverage Rule
If ruin > 1% at a given leverage, it's too high. The math is simple: over 200 paths of 100 candles each, if even 2 paths hit ruin, that's 1%. Over a long enough period, low-probability events become certainties.

## In QuantDash
Enable projection in the sidebar, then scroll down to the "Stress Test" section. It automatically runs the leverage sweep on your projected paths.`,
      chartConfig: { overlays: [] },
    },

    "paper-trading": {
      body: `# Paper Trading — Tracking Without Capital

Paper trading bridges the gap between backtest and live. You track your strategy's signals in real-time but without risking capital.

## Why Paper Trade?
1. **Validate the backtest**: Does the strategy generate the same trade frequency and win rate in real-time?
2. **Test execution**: How would you actually enter and exit? Are the signals clear?
3. **Build confidence**: Living through a drawdown on paper is psychologically different from seeing it in a backtest.

## What to Track
- Every signal (entry and exit) with timestamp
- Hypothetical fill price (use the candle close at signal time)
- Running P&L
- Drawdowns
- How often you'd want to override the signal (a sign of low conviction)

## How Long?
Minimum 30 trades. Below that, you don't have statistical significance. For a daily strategy, this could take 2-3 months. For hourly, 1-2 weeks.

## Using QuantDash for Paper Trading
1. Define your strategy in the builder
2. Enable real-time polling (the green dot confirms live data)
3. Watch for entry/exit signals as they form
4. Log trades manually or screenshot the chart
5. Compare to what the backtest predicted

## Red Flags During Paper Trading
- Real-time signals differ significantly from backtest signals (data issue or lookahead bias)
- You consistently want to override signals (strategy doesn't match your market view)
- Win rate deviates > 15pp from backtest (regime has changed)`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },

    "backtest-to-live": {
      body: `# From Backtest to Live — Bridging the Gap

The gap between backtest performance and live performance is the graveyard of retail trading strategies. Here's why it exists and how to minimize it.

## The Five Gaps

### 1. Execution Gap
Backtests fill at the close price. Real orders fill at market + spread + slippage. Our backtest deducts 0.2% round-trip, but real slippage can be higher during fast moves.

### 2. Regime Gap
Your backtest covers a specific historical period. If the market was trending, trend strategies looked great. If it shifts to sideways, those same strategies fail. The HMM regime breakdown reveals this vulnerability.

### 3. Crowding Gap
As more people trade the same signal (e.g., golden cross), the edge disappears. Signals that worked in 2020 may not work in 2026 because everyone's using them.

### 4. Psychology Gap
You *will* want to override your strategy during drawdowns. This is the biggest performance drag for discretionary overrides of systematic strategies.

### 5. Data Gap
Binance historical data may have survivorship bias (delisted tokens are excluded), missing ticks during extreme moves, or different fee structures than current.

## Mitigation Checklist
- [ ] Monte Carlo percentile > 80th (not luck)
- [ ] Runs test p-value < 0.05 (structured, not random)
- [ ] Break-even edge > +5pp (enough to survive execution costs)
- [ ] Works across at least 2 regimes (HMM breakdown)
- [ ] Stress test ruin < 1% at intended leverage
- [ ] Paper traded for 30+ trades with consistent results
- [ ] Max drawdown < 20% (psychologically survivable)

## When to Kill a Strategy
- 20 consecutive trades below backtest expectation
- Max drawdown exceeds 1.5x the backtest max drawdown
- Fundamental market structure change (new fee tiers, regulatory event)

## In QuantDash
Use every tool we've built: backtest for historical edge, academic report for validation, projection + stress test for forward risk, and paper trading for real-time confirmation. Only go live when all checks pass.`,
      chartConfig: { overlays: ["ema20", "ema50"], showComposite: true },
    },
  },
};
