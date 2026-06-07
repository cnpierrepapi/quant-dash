"use client";

export default function ResearchNotes() {
  return (
    <div className="text-xs text-[#8888a0] space-y-2">
      <p>
        <span className="text-[#6366f1]">Parkinson (1980)</span> — Range-based vol estimator.
        ~5x more efficient than close-to-close. Uses high-low range.
      </p>
      <p>
        <span className="text-[#6366f1]">VPIN</span> — Easley, Lopez de Prado (2012).
        Order flow toxicity. High VPIN predicts larger price moves.
      </p>
      <p>
        <span className="text-[#6366f1]">Composite</span> — Weighted signal from trend, momentum,
        MACD, volatility regime, order flow, Bollinger position, and volume.
      </p>
    </div>
  );
}
