import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  TriangleAlert,
  TrainFront,
  Route,
  BarChart3,
  SlidersHorizontal,
  Siren,
} from "lucide-react";

const menuSections = [
  {
    title: "MAIN",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, path: "/" },
      { name: "Block Planner", icon: CalendarDays, path: "/block-planner" },
      { name: "Maintenance Tasks", icon: Wrench, path: "/maintenance" },
      { name: "Assets & Defects", icon: TriangleAlert, path: "/assets" },
      { name: "Trains", icon: TrainFront, path: "/trains" },
      { name: "Corridors", icon: Route, path: "/corridors" },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { name: "Analytics & Reports", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    title: "SIMULATION",
    items: [
      { name: "What-if Simulation", icon: SlidersHorizontal, path: "/simulation" },
      {
        name: "Emergency Re-planning",
        icon: Siren,
        path: "/emergency",
      },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <TrainFront size={20} />
        </div>

        <div>
          <h2>Railway</h2>
          <span>Block Planner</span>
        </div>
      </div>

      <nav>
        {menuSections.map((section) => (
          <div className="menu-section" key={section.title}>
            <p className="menu-title">{section.title}</p>

            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  href={item.path}
                  className={`menu-item ${
                    item.name === "Dashboard" ? "active" : ""
                  }`}
                  key={item.name}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="ai-status">
        <div className="status-dot"></div>

        <div>
          <span>AI ENGINE</span>
          <strong>Online</strong>
        </div>
      </div>
    </aside>
  );
}