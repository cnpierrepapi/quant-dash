"use client";

import type { IndicatorData } from "@/hooks/useIndicators";
import type { ProjectionResult } from "@/lib/projection";
import type { APIKeyState } from "@/hooks/useAPIKeys";
import type { ExecutionLogEntry, LivePosition } from "@/hooks/useLiveStrategy";
import Collapsible from "@/components/ui/Collapsible";
import OverlayPanel from "./OverlayPanel";
import CompositePanel from "./CompositePanel";
import IndicatorPanel from "./IndicatorPanel";
import SRPanel from "./SRPanel";
import ProjectionPanel from "./ProjectionPanel";
import StressTestPanel from "@/components/backtest/StressTestPanel";
import ResearchNotes from "./ResearchNotes";
import APIKeyEditor from "@/components/live/APIKeyEditor";
import LivePanel from "@/components/live/LivePanel";

export default function Sidebar({
  indicators, overlays, onToggleOverlay, showSR, onToggleSR,
  projectionEnabled, onToggleProjection, projectionHorizon, onProjectionHorizonChange,
  projectionPaths, onProjectionPathsChange, projectionComputing, onProjectionRegenerate,
  projectionResult,
  // Execution props
  apiKeys, apiLoading, apiError, onTestConnection, onDisconnect,
  liveActive, paperMode, onPaperModeChange, onLiveStart, onLiveStop,
  positionPct, onPositionPctChange, leverage, onLeverageChange,
  stopLossPct, onStopLossPctChange, takeProfitPct, onTakeProfitPctChange,
  livePositions, executionLog, strategyName,
}: {
  indicators: IndicatorData | null;
  overlays: Set<string>;
  onToggleOverlay: (key: string) => void;
  showSR: boolean;
  onToggleSR: () => void;
  projectionEnabled: boolean;
  onToggleProjection: () => void;
  projectionHorizon: number;
  onProjectionHorizonChange: (h: number) => void;
  projectionPaths: number;
  onProjectionPathsChange: (n: number) => void;
  projectionComputing: boolean;
  onProjectionRegenerate: () => void;
  projectionResult: ProjectionResult | null;
  // Execution
  apiKeys: APIKeyState;
  apiLoading: boolean;
  apiError: string | null;
  onTestConnection: (apiKey: string, apiSecret: string) => Promise<boolean>;
  onDisconnect: () => void;
  liveActive: boolean;
  paperMode: boolean;
  onPaperModeChange: (v: boolean) => void;
  onLiveStart: () => void;
  onLiveStop: () => void;
  positionPct: number;
  onPositionPctChange: (v: number) => void;
  leverage: number;
  onLeverageChange: (v: number) => void;
  stopLossPct: number;
  onStopLossPctChange: (v: number) => void;
  takeProfitPct: number;
  onTakeProfitPctChange: (v: number) => void;
  livePositions: LivePosition[];
  executionLog: ExecutionLogEntry[];
  strategyName: string;
}) {
  return (
    <div className="w-72 border-l border-[#2a2a3a] bg-[#111118] overflow-y-auto flex-shrink-0">
      <Collapsible title="Binance API" defaultOpen={false}>
        <APIKeyEditor
          keys={apiKeys} loading={apiLoading} error={apiError}
          onTest={onTestConnection} onDisconnect={onDisconnect}
        />
      </Collapsible>

      <Collapsible title="Go Live" defaultOpen={false}>
        <LivePanel
          active={liveActive} paperMode={paperMode} onPaperModeChange={onPaperModeChange}
          onStart={onLiveStart} onStop={onLiveStop}
          positionPct={positionPct} onPositionPctChange={onPositionPctChange}
          leverage={leverage} onLeverageChange={onLeverageChange}
          stopLossPct={stopLossPct} onStopLossPctChange={onStopLossPctChange}
          takeProfitPct={takeProfitPct} onTakeProfitPctChange={onTakeProfitPctChange}
          positions={livePositions} log={executionLog}
          connected={apiKeys.connected} strategyName={strategyName}
        />
      </Collapsible>

      <Collapsible title="Overlays">
        <OverlayPanel overlays={overlays} onToggle={onToggleOverlay} showSR={showSR} onToggleSR={onToggleSR} />
      </Collapsible>

      <Collapsible title="Projection">
        <ProjectionPanel
          enabled={projectionEnabled} onToggle={onToggleProjection}
          horizon={projectionHorizon} onHorizonChange={onProjectionHorizonChange}
          nPaths={projectionPaths} onPathsChange={onProjectionPathsChange}
          computing={projectionComputing} onRegenerate={onProjectionRegenerate}
        />
      </Collapsible>

      {indicators?.composite && (
        <Collapsible title="QuantDash Composite">
          <CompositePanel composite={indicators.composite} />
        </Collapsible>
      )}

      {indicators && (
        <Collapsible title="Indicators">
          <IndicatorPanel indicators={indicators} />
        </Collapsible>
      )}

      {indicators?.supportResistance && (
        <Collapsible title="Support / Resistance">
          <SRPanel levels={indicators.supportResistance} />
        </Collapsible>
      )}

      {projectionResult && (
        <Collapsible title="Stress Test" defaultOpen={false}>
          <StressTestPanel projection={projectionResult} />
        </Collapsible>
      )}

      <Collapsible title="Research Notes" defaultOpen={false}>
        <ResearchNotes />
      </Collapsible>
    </div>
  );
}
