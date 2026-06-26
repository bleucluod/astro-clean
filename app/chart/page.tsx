import LegacyChartShell from "./LegacyChartShell";
import { PublicChartRealEngineUpgrade } from "../../components/PublicChartRealEngineUpgrade";

export default function ChartPage() {
  return (
    <>
      <LegacyChartShell />
      <div className="mx-auto max-w-6xl px-5 pb-10">
        <PublicChartRealEngineUpgrade />
      </div>
    </>
  );
}
