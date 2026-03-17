import { useAuth } from "@/_core/hooks/useAuth";
import { SnowflakeIcon } from "./SnowflakeIcon";

export default function TopBar() {
  const { user } = useAuth();
  const displayName = user?.name || user?.email || "Guest";
  
  return (
    <div className="flex justify-between items-center px-5 h-12 bg-[#010409] border-b border-[#21262d] shrink-0">
      <div className="flex items-center gap-3">
        <img
          src="/logos/archetype-horizontal-reversed.png"
          alt="Archetype"
          className="h-[24px] brightness-0 invert opacity-70"
        />
        <div className="w-px h-5 bg-[#21262d]" />
        <span className="text-[14px] font-semibold tracking-tight text-[#e6edf3]">
          PRISM FinOps
        </span>
        <div className="flex items-center gap-1.5">
          <SnowflakeIcon className="w-4 h-4" />
          <span className="text-[13px] font-medium text-[#29B5E8]">Snowflake Intelligence</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-[#8b949e]" title={displayName}>
        <img
          src="/logos/eotss-seal.jpeg"
          alt="EOTSS"
          className="w-7 h-7 rounded-full object-cover ring-1 ring-[#21262d]"
        />
        <span className="max-w-[160px] truncate">{displayName}</span>
      </div>
    </div>
  );
}
