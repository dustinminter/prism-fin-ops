import { IntelligenceProvider } from "@/contexts/IntelligenceContext";
import { PathfinderProvider } from "@/components/pathfinder/PathfinderProvider";
import TopBar from "@/components/intelligence/TopBar";
import Sidebar from "@/components/intelligence/Sidebar";
import IntelligenceChat from "@/components/intelligence/IntelligenceChat";

function IntelligenceLayout() {
  return (
    <div className="flex flex-col h-screen bg-white text-[#1e293b] overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <IntelligenceChat />
      </div>
    </div>
  );
}

export default function Intelligence() {
  return (
    <IntelligenceProvider>
      <PathfinderProvider>
        <IntelligenceLayout />
      </PathfinderProvider>
    </IntelligenceProvider>
  );
}
