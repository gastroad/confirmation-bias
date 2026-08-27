"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { OutletDailyPoint } from "@/entities/outlet";
import { vars } from "@/shared/styles/theme.css";
import * as styles from "./OutletVolumeChart.css";

interface Props {
  data: OutletDailyPoint[];
}

function label(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function OutletVolumeChart({ data }: Props) {
  if (data.length === 0) return <p className={styles.empty}>표시할 기간의 기사가 없습니다.</p>;

  const chartData = data.map((p) => ({ ...p, label: label(p.date) }));

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={vars.color.chartGrid} vertical={false} />
          {/* 눈금 라벨은 currentColor를 상속하면 데이터 잉크를 따라가 대비가 모자란다. */}
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: vars.color.textMuted }}
            stroke={vars.color.border}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: vars.color.textMuted }}
            stroke={vars.color.border}
          />
          <Tooltip
            cursor={{ fill: vars.color.bg }}
            formatter={(v) => [`${v}건`, "기사 수"]}
            labelStyle={{ fontSize: 12, color: vars.color.text }}
            contentStyle={{
              fontSize: 12,
              background: vars.color.surface,
              border: `1px solid ${vars.color.border}`,
              borderRadius: 8,
              color: vars.color.text,
            }}
          />
          <Bar dataKey="count" fill="currentColor" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
