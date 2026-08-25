"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { TimelinePoint } from "@/entities/article";
import { vars } from "@/shared/styles/theme.css";
import * as styles from "./TimelineChart.css";

interface Props {
  data: TimelinePoint[];
}

function formatHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}시`;
}

export function TimelineChart({ data }: Props) {
  if (data.length === 0) {
    return <p className={styles.empty}>데이터 없음</p>;
  }

  const chartData = data.map((p) => ({ ...p, label: formatHour(p.hour) }));

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={vars.color.chartGrid} />
          {/* 눈금 라벨은 currentColor를 상속하면 데이터 잉크를 따라가 대비가 모자란다. */}
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: vars.color.textMuted }}
            stroke={vars.color.border}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: vars.color.textMuted }}
            stroke={vars.color.border}
          />
          <Tooltip
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
          <Line
            type="monotone"
            dataKey="count"
            stroke="currentColor"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
