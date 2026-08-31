import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/maintenance-tasks")({
  component: MaintenanceTasksPage,
});

type MaintenanceTask = {
  task_id: string;
  asset_id: string | null;
  department: string;
  task_type: string | null;
  description: string | null;
  created_date: string | null;
  due_date: string | null;
  estimated_duration_min: number | null;
  overdue_days: number | null;
  safety_risk: number | null;
  task_status: string | null;
  priority_score: number | null;
  priority_category: string | null;
};

export default function MaintenanceTasksPage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTasks = () => {
    setLoading(true);

    fetch("http://127.0.0.1:8000/maintenance-tasks/")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch maintenance tasks");
        }
        return res.json();
      })
      .then((data) => {
        setTasks(data.tasks ?? []);
      })
      .catch((error) => {
        console.error("Maintenance Tasks API error:", error);
        toast.error("Could not load maintenance tasks.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (taskId: string, status: string) => {
    setUpdating(taskId);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/maintenance-tasks/${taskId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task_status: status,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update task");
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.task_id === taskId
            ? { ...task, task_status: status }
            : task,
        ),
      );

      toast.success(`Task ${taskId} updated to ${status}.`);
    } catch (error) {
      console.error("Task update error:", error);
      toast.error("Could not update task status.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Maintenance Tasks"
        subtitle="View, prioritize and manage maintenance tasks generated from the railway maintenance database."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Tasks</p>
          <p className="mt-1 text-2xl font-semibold">{tasks.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-semibold">
            {tasks.filter((task) => task.task_status === "PENDING").length}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-semibold">
            {tasks.filter((task) => task.task_status === "COMPLETED").length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading maintenance tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No maintenance tasks found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Task ID</th>
                  <th className="px-4 py-3 text-left font-medium">Asset</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium">Priority</th>
                  <th className="px-4 py-3 text-left font-medium">Risk</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.task_id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {task.task_id}
                    </td>

                    <td className="px-4 py-3">
                      {task.asset_id ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {task.department}
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      {task.description ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {task.due_date ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold">
                          {task.priority_score ?? "—"}
                        </span>
                        {task.priority_category && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {task.priority_category}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {task.safety_risk ?? "—"}/5
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border px-2 py-1 text-xs">
                        {task.task_status ?? "UNKNOWN"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {task.task_status === "COMPLETED" ? (
                        <button
                          disabled
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
                        >
                          Completed
                        </button>
                      ) : (
                        <button
                          disabled={updating === task.task_id}
                          onClick={() =>
                            updateStatus(task.task_id, "COMPLETED")
                          }
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {updating === task.task_id
                            ? "Updating..."
                            : "Mark Complete"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}