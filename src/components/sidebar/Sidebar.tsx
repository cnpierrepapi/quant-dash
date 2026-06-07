"use client";

import type { IndicatorData } from "@/hooks/useIndicators";
import Collapsible from "@/components/ui/Collapsible";
import OverlayPanel from "./OverlayPanel";
import CompositePanel from "./CompositePanel";
import IndicatorPanel from "./IndicatorPanel";
import SRPanel from "./SRPanel";
import ResearchNotes from "./ResearchNotes";

export default function Sidebar({
  indicators,
  overlays,
  onToggleOverlay,
  showSR,
  onToggleSR,
}: {
  indicators: IndicatorData | null;
  overlays: Set<string>;
  onToggleOverlay: (key: string) => void;
  showSR: boolean;
  onToggleSR: () => void;
}) {
  return (
    <div className="w-72 border-l border-[#2a2a3a] bg-[#111118] overflow-y-auto flex-shrink-0">
      <Collapsible title="Overlays">
        <OverlayPanel overlays={overlays} onToggle={onToggleOverlay} showSR={showSR} onToggleSR={onToggleSR} />
      </Collapsible>

      {indicators?.composite && (
        <Collapsible title="Academic Composite">
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

      <Collapsible title="Research Notes" defaultOpen={false}>
        <ResearchNotes />
      </Collapsible>
    </div>
  );
}
