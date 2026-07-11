"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { GraduationCap, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { useTracker } from "@/lib/store";
import { behaviorDelta } from "@/lib/behaviors";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import {
  PBD_BI,
  PBD_BI_SUBJECT,
  type PbdSkill,
  type PbdBiRecord,
} from "@/lib/pbd-bi";

const GRID = "var(--color-paper-100)";
const TICK = { fontSize: 11, fill: "var(--color-paper-500)" };

// Color a mastery level (TP 1-6): low = danger, mid = warning, high = success.
const tpColor = (tp: number) =>
  tp <= 2
    ? "var(--color-danger)"
    : tp === 3
    ? "var(--color-warning)"
    : "var(--color-success)";

function PbdBiAnalysis({
  className,
  records,
}: {
  className: string;
  records: PbdBiRecord[];
}) {
  const n = records.length;
  const avg = (key: "listening" | "speaking" | "reading" | "writing" | "overall") =>
    records.reduce((s, p) => s + p[key], 0) / n;

  const overallAvg = avg("overall");
  const proficient = records.filter((p) => p.overall >= 3).length;
  const needsSupport = records
    .filter((p) => p.overall <= 2)
    .sort((a, b) => a.overall - b.overall);
  const topPerformers = records.filter((p) => p.overall === 6);
  // All pupils ranked by overall band (high → low), tie-broken by name.
  const byBand = [...records].sort(
    (a, b) => b.overall - a.overall || a.name.localeCompare(b.name)
  );

  const distData = [1, 2, 3, 4, 5, 6].map((tp) => ({
    tp: `TP${tp}`,
    level: tp,
    count: records.filter((p) => p.overall === tp).length,
  }));

  // Pupils proficient (TP >= 3) in each skill.
  const profBySkill = (key: PbdSkill) =>
    records.filter((p) => p[key] >= 3).length;
  const skillData = [
    { skill: "Listening", value: profBySkill("listening") },
    { skill: "Speaking", value: profBySkill("speaking") },
    { skill: "Reading", value: profBySkill("reading") },
    { skill: "Writing", value: profBySkill("writing") },
  ];
  const SKILL_COLORS = [
    "var(--color-mark-blue)",
    "var(--color-mark-amber)",
    "var(--color-mark-green)",
    "var(--color-mark-purple)",
  ];
  const CHART_LABEL = { fontSize: 11, fill: "var(--color-paper-500)" };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper-900">
          Class {className} · {PBD_BI_SUBJECT} — PBD
        </h2>
        <p className="text-sm text-paper-500">
          Tahap Penguasaan (mastery level) 1–6, where 6 is highest · {n} pupils
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pupils"
          value={n}
          icon={<GraduationCap className="h-6 w-6" />}
          tone="brand"
        />
        <StatCard
          label="Class average (overall)"
          value={overallAvg.toFixed(1)}
          sub="out of 6"
          icon={<TrendingUp className="h-6 w-6" />}
          tone="info"
        />
        <StatCard
          label="Proficient (TP 3+)"
          value={`${Math.round((proficient / n) * 100)}%`}
          sub={`${proficient}/${n} pupils`}
          icon={<Trophy className="h-6 w-6" />}
          tone="success"
        />
        <StatCard
          label="Needs support (TP ≤ 2)"
          value={needsSupport.length}
          sub="pupils"
          icon={<AlertTriangle className="h-6 w-6" />}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Overall mastery (TP) distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="tp" tick={TICK} />
              <YAxis allowDecimals={false} tick={TICK} />
              <Tooltip formatter={(v) => `${v} pupils`} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {distData.map((d) => (
                  <Cell key={d.tp} fill={tpColor(d.level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Skill proficiency (pupils at TP 3+)">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={skillData}
                dataKey="value"
                nameKey="skill"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={CHART_LABEL}
              >
                {skillData.map((d, i) => (
                  <Cell key={d.skill} fill={SKILL_COLORS[i % SKILL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} pupils`} />
              <Legend wrapperStyle={CHART_LABEL} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={`Needs support · TP ≤ 2 (${needsSupport.length})`}>
          {needsSupport.length === 0 ? (
            <EmptyState title="None — every pupil is above TP 2 🎉" />
          ) : (
            <ul className="space-y-2">
              {needsSupport.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center gap-3 rounded-md border border-danger-bg bg-danger-bg/40 p-3"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
                  <Avatar size="xs" name={p.name} />
                  <span className="flex-1 truncate text-sm font-medium text-paper-700">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-danger">
                    TP {p.overall}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={`Top performers · TP 6 (${topPerformers.length})`}>
          {topPerformers.length === 0 ? (
            <EmptyState title="No pupil at TP 6 yet" />
          ) : (
            <ul className="space-y-2">
              {topPerformers.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center gap-3 rounded-md border border-success-bg bg-success-bg/40 p-3"
                >
                  <Trophy className="h-5 w-5 shrink-0 text-success" />
                  <Avatar size="xs" name={p.name} />
                  <span className="flex-1 truncate text-sm font-medium text-paper-700">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-success">
                    TP {p.overall}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title={`Overall band — all pupils (${n})`}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {byBand.map((p) => (
            <li
              key={p.name}
              className="flex items-center gap-3 rounded-md border border-paper-100 p-2.5"
            >
              <span className="flex-1 truncate text-sm text-paper-700">
                {p.name}
              </span>
              <span
                className="flex h-6 min-w-[1.75rem] items-center justify-center rounded-md px-2 text-xs font-bold text-surface"
                style={{ backgroundColor: tpColor(p.overall) }}
                title={`Overall TP ${p.overall}`}
              >
                {p.overall}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

export function Analytics() {
  const { pupils, assignments, submissions, attendance, behavior, currentClassName } =
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
      const net = recs.reduce((s, b) => s + behaviorDelta(b), 0);
      return { name: p.name.split(" ")[0], net };
    })
    .filter((d) => d.net !== 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);

  const empty = <EmptyState title="Not enough data yet" />;

  return (
    <div className="space-y-4">
      {PBD_BI[currentClassName] && (
        <PbdBiAnalysis
          className={currentClassName}
          records={PBD_BI[currentClassName].records}
        />
      )}

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
    </div>
  );
}
