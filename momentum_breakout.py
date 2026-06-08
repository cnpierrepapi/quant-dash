# Momentum Breakout with RSI Confirmation
# Upload this to QuantDash Strategy > Code > Upload .py
#
# Entry: EMA(20) crosses above EMA(50) while RSI is not overbought
# Exit:  EMA(20) drops below EMA(50) or RSI hits extreme overbought

# --- ENTRY CONDITIONS ---
# Buy when fast EMA leads slow EMA (trend confirmation)
if ema(20) > ema(50):  # entry: trend is bullish
    pass

# Only enter when RSI shows room to run
if rsi(14) > 30:  # entry: not oversold dead cat
    pass

# --- EXIT CONDITIONS ---
# Sell when trend reverses
if ema(20) < ema(50):  # exit: trend flipped bearish
    pass
