import { MODULES, getModule } from "@/data/academy/index";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return MODULES.map((m) => ({ module: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const mod = getModule(module);
  if (!mod) return { title: "Not Found" };
  return { title: `${mod.title} — QuantDash Academy` };
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const mod = getModule(module);
  if (!mod) notFound();

  // Find module index for numbering
  const modIndex = MODULES.findIndex((m) => m.slug === module);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#2a2a3a] bg-[#111118] px-6 py-2 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold text-[#6366f1]">QuantDash</Link>
        <div className="h-4 w-px bg-[#2a2a3a]" />
        <Link href="/academy" className="text-xs text-[#8888a0] hover:text-[#e8e8ef]">Academy</Link>
        <span className="text-xs text-[#2a2a3a]">/</span>
        <span className="text-xs text-[#e8e8ef]">{mod.title}</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <span className="w-12 h-12 rounded-xl bg-[#6366f1] text-white flex items-center justify-center text-xl font-bold">
            {mod.icon}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ef]">{mod.title}</h1>
            <p className="text-sm text-[#8888a0] mt-1">{mod.description}</p>
          </div>
        </div>

        <div className="space-y-2">
          {mod.lessons.map((lesson, i) => (
            <Link
              key={lesson.slug}
              href={`/academy/${module}/${lesson.slug}`}
              className="flex items-center gap-4 bg-[#111118] border border-[#2a2a3a] rounded-lg p-4 hover:border-[#6366f1] transition-colors group"
            >
              <span className="w-8 h-8 rounded-full bg-[#1a1a24] text-[#8888a0] flex items-center justify-center text-xs font-bold group-hover:bg-[#6366f1] group-hover:text-white transition-colors">
                {i + 1}
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#e8e8ef] group-hover:text-[#6366f1] transition-colors">
                  {lesson.title}
                </h3>
                <p className="text-xs text-[#8888a0] mt-0.5">{lesson.description}</p>
              </div>
              <span className="text-[#2a2a3a] group-hover:text-[#6366f1] transition-colors">
                &rarr;
              </span>
            </Link>
          ))}
        </div>

        {/* Navigation to other modules */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#2a2a3a]">
          {modIndex > 0 ? (
            <Link href={`/academy/${MODULES[modIndex - 1].slug}`} className="text-xs text-[#6366f1] hover:text-[#818cf8]">
              &larr; {MODULES[modIndex - 1].title}
            </Link>
          ) : <div />}
          <Link href="/academy" className="text-xs text-[#8888a0] hover:text-[#e8e8ef]">All Modules</Link>
          {modIndex < MODULES.length - 1 ? (
            <Link href={`/academy/${MODULES[modIndex + 1].slug}`} className="text-xs text-[#6366f1] hover:text-[#818cf8]">
              {MODULES[modIndex + 1].title} &rarr;
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}
