import ChartAnalyzer from "./components/ChartAnalyzer";

export default function App() {
  return (
    <div className="h-screen w-full bg-[#0A0C10] text-[#E2E8F0] font-sans flex flex-col overflow-hidden selection:bg-emerald-500/30">
      <ChartAnalyzer />
    </div>
  );
}
