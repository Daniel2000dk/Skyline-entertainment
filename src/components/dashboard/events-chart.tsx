"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const dayLabel = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const monthLabel = new Intl.DateTimeFormat("nl-NL", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function bucketLabel(bucket: string) {
  return bucket.length === 10
    ? dayLabel.format(new Date(`${bucket}T12:00:00Z`))
    : monthLabel.format(new Date(`${bucket}-15T12:00:00Z`));
}

type Point = { bucket: string; count: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">
        {point.count} {point.count === 1 ? "evenement" : "evenementen"}
      </p>
      <p className="text-xs text-muted-foreground">{bucketLabel(point.bucket)}</p>
    </div>
  );
}

/** Single-series column chart (no legend: the title names the series) plus a table view. */
export function EventsChart({ data, title }: { data: Point[]; title: string }) {
  const total = data.reduce((sum, point) => sum + point.count, 0);
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">
        {title}: {total} in totaal. De tabel hieronder bevat alle waarden.
      </figcaption>
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            barCategoryGap="20%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis
              dataKey="bucket"
              tickFormatter={bucketLabel}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.5 }} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Toon als tabel</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th scope="col" className="py-1 font-medium">
                Periode
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Evenementen
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((point) => (
              <tr key={point.bucket} className="border-b last:border-0">
                <td className="py-1">{bucketLabel(point.bucket)}</td>
                <td className="py-1 text-right">{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
