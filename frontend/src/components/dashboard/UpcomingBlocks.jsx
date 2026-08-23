import {
  Clock3,
  MapPin,
  Wrench,
  ChevronRight,
} from "lucide-react";

const upcomingBlocks = [
  {
    id: "BLK-024",
    corridor: "C-12",
    location: "A - B",
    department: "Engineering",
    task: "Rail inspection & tamping",
    time: "01:00 - 03:00",
    duration: "2h",
    priority: "High",
    priorityType: "high",
  },
  {
    id: "BLK-025",
    corridor: "C-08",
    location: "B - C",
    department: "Signal & Telecom",
    task: "Signal equipment maintenance",
    time: "03:30 - 05:30",
    duration: "2h",
    priority: "Medium",
    priorityType: "medium",
  },
  {
    id: "BLK-026",
    corridor: "C-05",
    location: "C - D",
    department: "Traction",
    task: "OHE inspection",
    time: "00:30 - 02:30",
    duration: "2h",
    priority: "High",
    priorityType: "high",
  },
  {
    id: "BLK-027",
    corridor: "C-03",
    location: "D - E",
    department: "Engineering",
    task: "Track geometry correction",
    time: "04:00 - 06:00",
    duration: "2h",
    priority: "Critical",
    priorityType: "critical",
  },
];

export default function UpcomingBlocks() {
  return (
    <section className="dashboard-panel upcoming-panel">

      <div className="panel-header">

        <div>
          <h3>Upcoming Blocks</h3>
          <p>Next scheduled maintenance windows</p>
        </div>

        <button className="view-all-button">
          View all
          <ChevronRight size={14} />
        </button>

      </div>


      <div className="blocks-list">

        {upcomingBlocks.map((block) => (

          <div className="block-item" key={block.id}>

            <div className="block-time">
              <Clock3 size={15} />
              <strong>{block.time}</strong>
              <span>{block.duration}</span>
            </div>


            <div className="block-main">

              <div className="block-title-row">
                <strong>{block.task}</strong>

                <span
                  className={`priority-badge ${block.priorityType}`}
                >
                  {block.priority}
                </span>
              </div>


              <div className="block-details">

                <span>
                  <MapPin size={12} />
                  {block.corridor} · {block.location}
                </span>

                <span>
                  <Wrench size={12} />
                  {block.department}
                </span>

              </div>

            </div>


            <div className="block-id">
              {block.id}
            </div>

          </div>

        ))}

      </div>

    </section>
  );
}