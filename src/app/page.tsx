"use client";

import dynamic from "next/dynamic";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

export default function Home() {
  return <Chart />;
}
