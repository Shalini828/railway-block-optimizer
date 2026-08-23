import { Bell, CalendarDays, ChevronDown } from "lucide-react";

export default function Topbar() {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <h1>Railway Operations</h1>
          <p>Maintenance & Block Planning</p>
        </div>
      </div>

      <div className="topbar-right">
        <div className="date-display">
          <CalendarDays size={16} />
          <span>{today}</span>
        </div>

        <button className="notification-btn">
          <Bell size={18} />
          <span className="notification-dot"></span>
        </button>

        <div className="office-profile">
          <div className="profile-avatar">CO</div>

          <div className="profile-info">
            <strong>Control Office</strong>
            <span>Division 01</span>
          </div>

          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}