import { SnowflakeIcon } from "./SnowflakeIcon";

export default function POCTopBar() {
  return (
    <div className="flex justify-between items-center px-5 h-14 bg-[#151b23]/90 backdrop-blur-md border-b border-[#2a3040] shrink-0">
      <div className="flex items-center gap-4">
        {/* Archetype logo — horizontal full-color reversed */}
        <img
          src="/logos/archetype-horizontal-reversed.png"
          alt="Archetype"
          className="h-[28px] opacity-95"
        />
        <div className="w-px h-6 bg-[#2a3040]" />
        <span className="text-[15px] font-semibold tracking-tight">
          <span className="text-[#29B5E8]">PRISM</span>{" "}
          <span className="text-[#d0d7de]">FinOps</span>
        </span>
        <span className="text-[12px] text-[#8b949e] font-normal">powered by</span>
        <div className="flex items-center gap-1.5">
          <SnowflakeIcon className="w-4 h-4" />
          <span className="text-[14px] font-semibold text-[#29B5E8]">Intelligence</span>
        </div>
        <span
          className="text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(41,181,232,0.15) 0%, rgba(88,166,255,0.1) 100%)",
            color: "#29B5E8",
            border: "1px solid rgba(41,181,232,0.25)",
          }}
        >
          POC &mdash; EOTSS
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[13px] text-[#8b949e]">
          <img
            src="/logos/eotss-seal.jpeg"
            alt="EOTSS"
            className="w-7 h-7 rounded-full object-cover ring-1 ring-[#2a3040]"
          />
          EOTSS Budget Director
        </div>
      </div>
    </div>
  );
}
