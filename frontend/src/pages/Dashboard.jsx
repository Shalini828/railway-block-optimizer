import { CalendarDays } from "lucide-react";

import StatCard from "../components/dashboard/StatCard";
import CorridorStatus from "../components/dashboard/CorridorStatus";
import UpcomingBlocks from "../components/dashboard/UpcomingBlocks";

export default function Dashboard() {
  return (
    <div className="dashboard">
      {/* =========================
          PAGE HEADER
      ========================== */}

      <div className="page-header">
        <div>
          <div className="breadcrumb">Operations / Dashboard</div>

          <h2>Dashboard</h2>

          <p>Overview of railway maintenance, blocks and asset availability.</p>
        </div>

        <button className="primary-button">
          <CalendarDays size={16} />
          Generate AI Plan
        </button>
      </div>

      {/* =========================
          KPI CARDS
      ========================== */}

      <div className="stats-grid">
        <StatCard
          title="Asset Availability"
          value="96.8%"
          subtitle="Across monitored infrastructure"
          trend="4.5%"
          trendType="positive"
        />

        <StatCard
          title="Active Blocks"
          value="08"
          subtitle="Currently scheduled"
          trend="2"
          trendType="positive"
        />

        <StatCard
          title="Pending Maintenance"
          value="23"
          subtitle="7 require immediate attention"
          trend="3"
          trendType="negative"
        />

        <StatCard
          title="Block Hours"
          value="14.2h"
          subtitle="Utilized this operational day"
          trend="1.8h"
          trendType="positive"
        />

        <StatCard
          title="Train Conflicts"
          value="00"
          subtitle="No major conflicts detected"
          trend="100%"
          trendType="positive"
        />
      </div>

      {/* =========================
          DASHBOARD CONTENT
      ========================== */}

      <div className="dashboard-content-grid">
        <div className="corridor-section">
          <CorridorStatus />
        </div>

        <div className="upcoming-section">
          <UpcomingBlocks />
        </div>
      </div>
    </div>
  );
}
