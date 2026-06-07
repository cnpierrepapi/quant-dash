import { MODULES } from "@/data/academy/index";
import ModuleCard from "@/components/academy/ModuleCard";
import Link from "next/link";

export const metadata = {
  title: "Academy — QuantDash",
  description: "30 lessons on trading, technical analysis, and academic research.",
};

export default function AcademyPage() {
  const totalLessons = MODULES.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-xs text-[#6366f1] hover:text-[#818cf8] mb-2 block">
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[#e8e8ef]">Academy</h1>
            <p className="text-sm text-[#8888a0] mt-1">
              {totalLessons} lessons across {MODULES.length} modules. From candle basics to HMM regime detection.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => (
            <ModuleCard key={mod.slug} module={mod} />
          ))}
        </div>

        <div className="mt-12 text-xs text-[#8888a0] text-center">
          Built on peer-reviewed research: Wilder (1978), Bollinger (1983), Moskowitz (2012),
          Easley & Lopez de Prado (2012), Gatheral (2018), Han et al. (2024).
        </div>
      </div>
    </div>
  );
}
