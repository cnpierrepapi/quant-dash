import { getLesson, getAdjacentLessons, MODULES } from "@/data/academy/index";
import { LESSONS } from "@/data/academy/lessons";
import LessonRenderer from "@/components/academy/LessonRenderer";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const params: { module: string; lesson: string }[] = [];
  for (const mod of MODULES) {
    for (const les of mod.lessons) {
      params.push({ module: mod.slug, lesson: les.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ module: string; lesson: string }> }) {
  const { module, lesson } = await params;
  const data = getLesson(module, lesson);
  if (!data) return { title: "Not Found" };
  return { title: `${data.lesson.title} — QuantDash Academy` };
}

export default async function LessonPage({ params }: { params: Promise<{ module: string; lesson: string }> }) {
  const { module, lesson } = await params;
  const data = getLesson(module, lesson);
  if (!data) notFound();

  const content = LESSONS[module]?.[lesson];
  if (!content) notFound();

  const adj = getAdjacentLessons(module, lesson);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#2a2a3a] bg-[#111118] px-6 py-2 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold text-[#6366f1]">QuantDash</Link>
        <div className="h-4 w-px bg-[#2a2a3a]" />
        <Link href="/academy" className="text-xs text-[#8888a0] hover:text-[#e8e8ef]">Academy</Link>
        <span className="text-xs text-[#2a2a3a]">/</span>
        <Link href={`/academy/${module}`} className="text-xs text-[#8888a0] hover:text-[#e8e8ef]">{data.module.title}</Link>
        <span className="text-xs text-[#2a2a3a]">/</span>
        <span className="text-xs text-[#e8e8ef]">{data.lesson.title}</span>
      </div>

      <LessonRenderer
        title={data.lesson.title}
        content={content}
        prev={adj.prev}
        next={adj.next}
        moduleName={data.module.title}
      />
    </div>
  );
}
