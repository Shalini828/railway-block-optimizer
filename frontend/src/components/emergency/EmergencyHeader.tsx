import { useState } from "react";
import { Siren, RefreshCw, RadioTower, ShieldAlert, Sparkles, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EmergencyHeaderProps {
  lastUpdated: string;
  onRefresh: () => void;
  onCreateResponse: () => void;
  isRefreshing?: boolean;
}

export function EmergencyHeader({
  lastUpdated,
  onRefresh,
  onCreateResponse,
  isRefreshing = false,
}: EmergencyHeaderProps) {
  return (
    <div className="mb-6 rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Title & Subtitle */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/15 text-destructive border border-destructive/30 shadow-[0_0_12px_rgba(220,38,38,0.25)]">
              <Siren className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Emergency Response &amp; Re-Blocking Command Center
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex border-primary/40 bg-primary/10 text-primary text-[10px] font-semibold tracking-wider">
                  <Sparkles className="mr-1 size-3" /> DECISION SUPPORT
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                AI-assisted incident assessment, traffic protection and emergency block planning across the corridor.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Operational Status & Primary Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:self-end lg:self-center">
          {/* Operational Status Badge */}
          <div className="flex items-center gap-1.5 rounded-md border border-safe/30 bg-safe/10 px-2.5 py-1 text-xs font-medium text-safe">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-safe"></span>
            </span>
            <span className="font-semibold tracking-wider text-[11px]">SYSTEM OPERATIONAL</span>
          </div>

          {/* Last Updated */}
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex font-mono bg-secondary/50 px-2.5 py-1 rounded border border-border">
            <span>Last updated:</span>
            <span className="text-foreground font-medium">{lastUpdated}</span>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs border-border hover:bg-secondary"
            title="Refresh telemetry and corridor status"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>

          {/* Primary Action Button */}
          <Button
            size="sm"
            onClick={onCreateResponse}
            className="h-8 gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-destructive/40"
          >
            <PlusCircle className="size-3.5" />
            <span>+ CREATE EMERGENCY RESPONSE</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
