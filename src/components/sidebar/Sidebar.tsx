"use client";

import type { IndicatorData } from "@/hooks/useIndicators";
import type { ProjectionResult } from "@/lib/projection";
import Collapsible from "@/components/ui/Collapsible";
import OverlayPanel from "./OverlayPanel";
import CompositePanel from "./CompositePanel";
import IndicatorPanel from "./IndicatorPanel";
import SRPanel from "./SRPanel";
import ProjectionPanel from "./ProjectionPanel";
import StressTestPanel from "@/components/backtest/StressTestPanel";
import ResearchNotes from "./ResearchNotes";

export default function Sidebar({
  indicators, overlays, onToggleOverlay, showSR, onToggleSR,
  projectionEnabled, onToggleProjection, projectionHorizon, onProjectionHorizonChange,
  projectionPaths, onProjectionPathsChange, projectionComputing, onProjectionRegenerate,
  projectionResult,
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
}) {
  return (
    <div className="w-72 border-l border-[#2a2a3a] bg-[#111118] overflow-y-auto flex-shrink-0">
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
