import React from "react";
import { useAbps } from "@/context/AbpsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CanProps {
  perm: string;
  fallback?: "hide" | "disable";
  reason?: string;
  children: React.ReactNode;
}

export function Can({
  perm,
  fallback = "hide",
  reason = "Access restricted for your designation.",
  children,
}: CanProps) {
  const { can } = useAbps();
  const allowed = can(perm);

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback === "hide") {
    return null;
  }

  // fallback === "disable"
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed opacity-50">
            <span className="pointer-events-none">{children}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-[#003366] text-white border border-[#FF9933] text-xs font-semibold">
          <p>{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
