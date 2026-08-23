import { ArrowDown, ArrowUp } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendType = "positive",
}) {
  const isPositive = trendType === "positive";

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{title}</span>

        <span className={`trend ${trendType}`}>
          {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {trend}
        </span>
      </div>

      <div className="stat-value">{value}</div>

      <p>{subtitle}</p>
    </div>
  );
}