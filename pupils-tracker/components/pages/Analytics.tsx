"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { useTracker } from "@/lib/store";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";

const GRID = "var(--color-paper-100)";
const TICK = { fontSize: 11, fill: "var(--color-paper-500)" };

export function Analytics() {
  const { pupils, assignments, submissions, attendance, behavior } =
    useTracker();

  const hwData = assignments.map((a) => {
    const subs = submissions[a.id] || {};
    const done = pupils.filter((p) => !!subs[p.id]).length;
    const pct = pupils.length > 0 ? Math.round((done / pupils.length) * 100) : 0;
    return { name: a.title, pct };
  });

  const attData = Object.keys(attendance)
    .sort()
    .map((date) => {
      const dayRec = attendance[date];
      const ids = Object.keys(dayRec);
      const present = ids.filter((id) => dayRec[id] === "present").length;
      const late = ids.filter((id) => dayRec[id] === "late").length;
      const total = ids.length || 1;
      return {
        date: date.slice(5),
        present: Math.round(((present + late) / total) * 100),
      };
    });

  const behData = pupils
    .map((p) => {
      const recs = behavior.filter((b) => b.pupilId === p.id);
      const net = recs.reduce(
        (s, b) => s + (b.type === "positive" ? b.points : -b.points),
        0
      );
      return { name: p.name.split(" ")[0], net };
    })
    .filter((d) => d.net !== 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);

  const empty = <EmptyState title="Not enough data yet" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Homework completion by assignment">
        {hwData.length === 0 ? (
          empty
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hwData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="name" tick={TICK} />
              <YAxis domain={[0, 100]} tick={TICK} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar
                dataKey="pct"
                fill="var(--color-brand-500)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard title="Attendance rate over time">
        {attData.length === 0 ? (
          empty
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={attData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={TICK} />
              <YAxis domain={[0, 100]} tick={TICK} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="present"
                stroke="var(--color-info)"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard
        title="Behavior net points (top movers)"
        className="lg:col-span-2"
      >
        {behData.length === 0 ? (
          empty
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={behData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="name" tick={TICK} />
              <YAxis tick={TICK} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="net"
                name="Net points"
                fill="var(--color-paper-400)"
                radius={[6, 6, 0, 0]}
              >
                {behData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.net >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  );
}
