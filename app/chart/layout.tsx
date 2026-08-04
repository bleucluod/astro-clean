import type { ReactNode } from "react";

import { FinalEditorialPage } from "@/components/FinalEditorialPage";

export default function ChartLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <FinalEditorialPage pageKey="chart" slots={{ "birth-data-form": children }} />;
}
