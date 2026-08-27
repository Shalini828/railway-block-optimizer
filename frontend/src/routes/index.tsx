import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  ShieldAlert,
  TrainFront,
} from "lucide-react";
import { useAbps } from "@/context/AbpsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home | IR-ABPS Railway Block Planning" },
      {
        name: "description",
        content:
          "AI-powered automatic block planning to maximise asset availability on Indian Railways.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { signedIn } = useAbps();

  const features = [
    {
      title: "Control Dashboard",
      description: "Live corridor status, train path forecasting, and real-time risk radar.",
      icon: LayoutDashboard,
      link: "/dashboard",
      color: "text-sky-500",
    },
    {
      title: "Requisition Portal",
      description: "Submit and track TMS, SMMS, and TDMS maintenance requests.",
      icon: ClipboardList,
      link: "/requests",
      color: "text-blue-500",
    },
    {
      title: "AI Optimizer Engine",
      description: "Run advanced clustering algorithms to generate shadow blocks.",
      icon: BrainCircuit,
      link: "/optimizer",
      color: "text-purple-500",
    },
    {
      title: "Gantt Planner",
      description: "Visualize 7-day tactical and 30-day strategic corridor blocks.",
      icon: CalendarRange,
      link: "/planner",
      color: "text-emerald-500",
    },
    {
      title: "Impact Analytics",
      description: "Measure asset uptime trends and operational efficiency gains.",
      icon: BarChart3,
      link: "/analytics",
      color: "text-amber-500",
    },
    {
      title: "Conflicts & Approvals",
      description: "Automated train conflict detection and controller authorization workflow.",
      icon: ShieldAlert,
      link: "/conflicts",
      color: "text-rose-500",
    },
  ];

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-20 text-center shadow-sm">
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="relative z-10 flex max-w-3xl flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <TrainFront className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            AI-Powered Automatic <br className="hidden sm:block" />
            <span className="text-primary">Block Planning System</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Maximising asset availability for Indian Railways by intelligently clustering maintenance windows, eliminating redundant shutdowns, and avoiding express path conflicts.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link to="/dashboard">
                {signedIn ? "Open Dashboard" : "Access Dashboard"} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link to="/optimizer">
                <BrainCircuit className="mr-2 h-4 w-4" /> Run AI Optimizer
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Access Modules */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feat) => (
          <Link key={feat.title} to={feat.link} className="group outline-none">
            <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/50 transition-colors group-hover:bg-secondary">
                  <feat.icon className={`h-6 w-6 ${feat.color}`} />
                </div>
                <CardTitle className="text-xl transition-colors group-hover:text-primary">
                  {feat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feat.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}