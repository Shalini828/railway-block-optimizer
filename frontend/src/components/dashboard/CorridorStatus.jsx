import { ChevronRight } from "lucide-react";

const corridors = [
  {
    id: "C-12",
    stations: "A - B",
    status: "Good",
    color: "good",
    blocks: 2,
    window: "01:00 - 03:00",
  },
  {
    id: "C-08",
    stations: "B - C",
    status: "Moderate",
    color: "moderate",
    blocks: 1,
    window: "03:30 - 05:30",
  },
  {
    id: "C-05",
    stations: "C - D",
    status: "Busy",
    color: "busy",
    blocks: 2,
    window: "00:30 - 02:30",
  },
  {
    id: "C-03",
    stations: "D - E",
    status: "Blocked",
    color: "blocked",
    blocks: 1,
    window: "04:00 - 06:00",
  },
];

export default function CorridorStatus() {
  return (
    <section className="dashboard-panel corridor-panel">
      <div className="panel-header">
        <div>
          <h3>Corridor Status</h3>
          <p>Current operational condition</p>
        </div>

        <button className="view-all-button">
          View all
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Railway Line */}

      <div className="corridor-line">
        <div className="station">
          <span className="station-dot good"></span>
          <strong>A</strong>
        </div>

        <div className="track good-track"></div>

        <div className="station">
          <span className="station-dot moderate"></span>
          <strong>B</strong>
        </div>

        <div className="track moderate-track"></div>

        <div className="station">
          <span className="station-dot busy"></span>
          <strong>C</strong>
        </div>

        <div className="track busy-track"></div>

        <div className="station">
          <span className="station-dot moderate"></span>
          <strong>D</strong>
        </div>

        <div className="track moderate-track"></div>

        <div className="station">
          <span className="station-dot good"></span>
          <strong>E</strong>
        </div>
      </div>

      {/* Legend */}

      <div className="corridor-legend">
        <span>
          <i className="legend-dot good"></i>
          Good
        </span>

        <span>
          <i className="legend-dot moderate"></i>
          Moderate
        </span>

        <span>
          <i className="legend-dot busy"></i>
          Busy
        </span>

        <span>
          <i className="legend-dot blocked"></i>
          Blocked
        </span>
      </div>

      {/* Table */}

      <div className="corridor-table">
        <div className="corridor-table-header">
          <span>Corridor</span>
          <span>Status</span>
          <span>Active Blocks</span>
          <span>Next Available Window</span>
        </div>

        {corridors.map((corridor) => (
          <div className="corridor-row" key={corridor.id}>
            <div>
              <strong>{corridor.id}</strong>
              <small>({corridor.stations})</small>
            </div>

            <span className={`status-badge ${corridor.color}`}>
              <i></i>
              {corridor.status}
            </span>

            <span>{corridor.blocks}</span>

            <span>{corridor.window}</span>
          </div>
        ))}
      </div>
    </section>
  );
}