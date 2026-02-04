import { SnowflakeIcon } from "./SnowflakeIcon";

export default function TopBar() {
  return (
    <div className="flex justify-between items-center px-5 h-12 bg-white border-b border-[#e2e8f0] shrink-0">
      <div className="flex items-center gap-3">
        <img
          src="/logos/archetype-horizontal-reversed.png"
          alt="Archetype"
          className="h-[24px] brightness-0 opacity-70"
        />
        <div className="w-px h-5 bg-[#e2e8f0]" />
        <span className="text-[14px] font-semibold tracking-tight text-[#1e293b]">
          PRISM FinOps
        </span>
        <span className="text-[12px] text-[#94a3b8]">powered by</span>
        <div className="flex items-center gap-1.5">
          <SnowflakeIcon className="w-4 h-4" />
          <span className="text-[13px] font-semibold text-[#29B5E8]">Intelligence</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
        <img
          src="/logos/eotss-seal.jpeg"
          alt="EOTSS"
          className="w-7 h-7 rounded-full object-cover ring-1 ring-[#e2e8f0]"
        />
        EOTSS Budget Director
      </div>
    </div>
  );
}
