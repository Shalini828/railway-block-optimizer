import {
  LayoutDashboard,
  ClipboardList,
  BrainCircuit,
  CalendarRange,
  ShieldAlert,
  BarChart3,
  Siren,
  Wrench,
  Shield,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Network,
  type LucideIcon,
} from "lucide-react";
import type { RoleId } from "./abps-data";

export const ROUTE_ACCESS: Record<string, string> = {
  "/dashboard": "dashboard.view",
  "/requests": "requests.view",
  "/optimizer": "optimizer.view",
  "/simulation": "optimizer.simulate",
  "/impact-dna": "optimizer.view",
  "/planner": "planner.view",
  "/special-trains": "special_trains.view",
  "/conflicts": "conflicts.view",
  "/maintenance-tasks": "tasks.view",
  "/analytics": "analytics.view",
  "/emergency": "emergency.view",
  "/admin": "admin.manage",
};

export type NavItem = {
  to: string;
  labelEn: string;
  labelHi: string;
  icon: LucideIcon;
  badge: string | null;
  badgeTone: string;
};

export type NavSection = {
  titleEn: string;
  titleHi: string;
  items: NavItem[];
};

export const ADMIN_CONTROL_NAV: NavSection[] = [
  {
    titleEn: "CORRIDOR OPERATIONS",
    titleHi: "कॉरिडोर परिचालन",
    items: [
      {
        to: "/dashboard",
        labelEn: "Control Dashboard",
        labelHi: "नियंत्रण डैशबोर्ड",
        icon: LayoutDashboard,
        badge: "Live",
        badgeTone: "bg-[#137547] text-white",
      },
      {
        to: "/requests",
        labelEn: "Requisition Portal",
        labelHi: "मांग पत्र पोर्टल",
        icon: ClipboardList,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/optimizer",
        labelEn: "IR-ABPS Brain",
        labelHi: "एआई अनुकूलन इंजन",
        icon: BrainCircuit,
        badge: "AI",
        badgeTone: "bg-[#003366] text-white",
      },
      {
        to: "/impact-dna",
        labelEn: "Railway Impact DNA",
        labelHi: "रेलवे प्रभाव डीएनए",
        icon: Network,
        badge: "DNA",
        badgeTone: "bg-[#003366] text-white",
      },
      {
        to: "/simulation",
        labelEn: "What-If Simulation",
        labelHi: "व्हाट-इफ़ सिमुलेशन",
        icon: SlidersHorizontal,
        badge: "Sim",
        badgeTone: "bg-[#003366] text-white",
      },
      {
        to: "/planner",
        labelEn: "Gantt Planner",
        labelHi: "गैंट योजनाकार",
        icon: CalendarRange,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/special-trains",
        labelEn: "Special Trains",
        labelHi: "विशेष रेलगाड़ियाँ",
        icon: Sparkles,
        badge: "SPL",
        badgeTone: "bg-[#7c3aed] text-white",
      },
    ],
  },
  {
    titleEn: "SAFETY & ASSET SCRUTINY",
    titleHi: "सुरक्षा एवं परिसंपत्ति संवीक्षा",
    items: [
      {
        to: "/conflicts",
        labelEn: "Conflicts & Approvals",
        labelHi: "विवाद एवं अनुमोदन",
        icon: ShieldAlert,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/maintenance-tasks",
        labelEn: "Maintenance Tasks",
        labelHi: "अनुरक्षण कार्य",
        icon: Wrench,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/analytics",
        labelEn: "Impact Analytics",
        labelHi: "प्रभाव विश्लेषण",
        icon: BarChart3,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/emergency",
        labelEn: "Emergency Blocking",
        labelHi: "आपातकालीन ब्लॉक",
        icon: Siren,
        badge: "SOS",
        badgeTone: "bg-[#800000] text-white animate-pulse",
      },
    ],
  },
];

export const NAV_SECTIONS = ADMIN_CONTROL_NAV;

export const ENGINEERING_NAV: NavSection[] = [
  {
    titleEn: "CORRIDOR OPERATIONS",
    titleHi: "कॉरिडोर परिचालन",
    items: [
      {
        to: "/dashboard",
        labelEn: "My Dashboard",
        labelHi: "मेरा डैशबोर्ड",
        icon: LayoutDashboard,
        badge: "Live",
        badgeTone: "bg-[#137547] text-white",
      },
      {
        to: "/requests",
        labelEn: "My Requests",
        labelHi: "मेरे मांग पत्र",
        icon: ClipboardList,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/simulation",
        labelEn: "What-If Simulation",
        labelHi: "व्हाट-इफ़ सिमुलेशन",
        icon: SlidersHorizontal,
        badge: "Sim",
        badgeTone: "bg-[#003366] text-white",
      },
      {
        to: "/planner",
        labelEn: "My Blocks",
        labelHi: "मेरे ब्लॉक",
        icon: CalendarRange,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/special-trains",
        labelEn: "Special Trains",
        labelHi: "विशेष रेलगाड़ियाँ",
        icon: Sparkles,
        badge: null,
        badgeTone: "",
      },
    ],
  },
  {
    titleEn: "SAFETY & ASSET SCRUTINY",
    titleHi: "सुरक्षा एवं परिसंपत्ति संवीक्षा",
    items: [
      {
        to: "/conflicts",
        labelEn: "My Conflicts",
        labelHi: "मेरे विवाद",
        icon: ShieldAlert,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/maintenance-tasks",
        labelEn: "Maintenance Tasks",
        labelHi: "अनुरक्षण कार्य",
        icon: Wrench,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/analytics",
        labelEn: "TMS Analytics",
        labelHi: "टीएमएस विश्लेषण",
        icon: BarChart3,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/emergency",
        labelEn: "Emergency",
        labelHi: "आपातकालीन ब्लॉक",
        icon: Siren,
        badge: "SOS",
        badgeTone: "bg-[#800000] text-white animate-pulse",
      },
    ],
  },
];

export const TRACTION_NAV: NavSection[] = [
  {
    titleEn: "CORRIDOR OPERATIONS",
    titleHi: "कॉरिडोर परिचालन",
    items: [
      {
        to: "/dashboard",
        labelEn: "My Dashboard",
        labelHi: "मेरा डैशबोर्ड",
        icon: LayoutDashboard,
        badge: "Live",
        badgeTone: "bg-[#137547] text-white",
      },
      {
        to: "/requests",
        labelEn: "My Requests",
        labelHi: "मेरे मांग पत्र",
        icon: ClipboardList,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/planner",
        labelEn: "My Blocks",
        labelHi: "मेरे ब्लॉक",
        icon: CalendarRange,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/special-trains",
        labelEn: "Special Trains",
        labelHi: "विशेष रेलगाड़ियाँ",
        icon: Sparkles,
        badge: null,
        badgeTone: "",
      },
    ],
  },
  {
    titleEn: "SAFETY & ASSET SCRUTINY",
    titleHi: "सुरक्षा एवं परिसंपत्ति संवीक्षा",
    items: [
      {
        to: "/conflicts",
        labelEn: "My Conflicts",
        labelHi: "मेरे विवाद",
        icon: ShieldAlert,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/maintenance-tasks",
        labelEn: "Maintenance Tasks",
        labelHi: "अनुरक्षण कार्य",
        icon: Wrench,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/analytics",
        labelEn: "TRD Analytics",
        labelHi: "टीआरडी विश्लेषण",
        icon: BarChart3,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/emergency",
        labelEn: "Emergency",
        labelHi: "आपातकालीन ब्लॉक",
        icon: Siren,
        badge: "SOS",
        badgeTone: "bg-[#800000] text-white animate-pulse",
      },
    ],
  },
];

export const SIGNAL_NAV: NavSection[] = [
  {
    titleEn: "CORRIDOR OPERATIONS",
    titleHi: "कॉरिडोर परिचालन",
    items: [
      {
        to: "/dashboard",
        labelEn: "My Dashboard",
        labelHi: "मेरा डैशबोर्ड",
        icon: LayoutDashboard,
        badge: "Live",
        badgeTone: "bg-[#137547] text-white",
      },
      {
        to: "/requests",
        labelEn: "My Requests",
        labelHi: "मेरे मांग पत्र",
        icon: ClipboardList,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/planner",
        labelEn: "My Blocks",
        labelHi: "मेरे ब्लॉक",
        icon: CalendarRange,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/special-trains",
        labelEn: "Special Trains",
        labelHi: "विशेष रेलगाड़ियाँ",
        icon: Sparkles,
        badge: null,
        badgeTone: "",
      },
    ],
  },
  {
    titleEn: "SAFETY & ASSET SCRUTINY",
    titleHi: "सुरक्षा एवं परिसंपत्ति संवीक्षा",
    items: [
      {
        to: "/conflicts",
        labelEn: "My Conflicts",
        labelHi: "मेरे विवाद",
        icon: ShieldAlert,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/maintenance-tasks",
        labelEn: "Maintenance Tasks",
        labelHi: "अनुरक्षण कार्य",
        icon: Wrench,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/analytics",
        labelEn: "SMMS Analytics",
        labelHi: "एसएमएमएस विश्लेषण",
        icon: BarChart3,
        badge: null,
        badgeTone: "",
      },
      {
        to: "/emergency",
        labelEn: "Emergency",
        labelHi: "आपातकालीन ब्लॉक",
        icon: Siren,
        badge: "SOS",
        badgeTone: "bg-[#800000] text-white animate-pulse",
      },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  ...ADMIN_CONTROL_NAV,
  {
    titleEn: "SYSTEM GOVERNANCE",
    titleHi: "सिस्टम शासन",
    items: [
      {
        to: "/admin",
        labelEn: "System Administration",
        labelHi: "सिस्टम प्रशासन",
        icon: ShieldCheck,
        badge: "RBAC",
        badgeTone: "bg-[#003366] text-white",
      },
    ],
  },
];

export function getNavSections(roleId: RoleId | string): NavSection[] {
  if (roleId === "admin") {
    return ADMIN_NAV;
  }
  if (roleId === "engineering") {
    return ENGINEERING_NAV;
  }
  if (roleId === "traction") {
    return TRACTION_NAV;
  }
  if (roleId === "signal") {
    return SIGNAL_NAV;
  }
  return ADMIN_CONTROL_NAV;
}
