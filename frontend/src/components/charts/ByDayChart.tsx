import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
  data: { day: string; count: number }[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ink-line bg-ink-raised px-3 py-2 shadow-lg">
      <p className="font-data text-xs text-steel">{label}</p>
      <p className="font-data text-sm text-white">
        {payload[0]!.value} {payload[0]!.value === 1 ? 'application' : 'applications'}
      </p>
    </div>
  );
};

// byDay comes back newest-first, capped at 90 days; chart reads left-to-right
// chronologically, over the trailing 30 so daily bars stay legible.
export const ByDayChart = ({ data }: Props) => {
  const chronological = [...data].reverse().slice(-30);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chronological} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#253048" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={(v: string) => v.slice(5)}
          tick={{ fill: '#5b6675', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          axisLine={{ stroke: '#253048' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: '#5b6675', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(63,184,175,0.08)' }} />
        <Bar dataKey="count" fill="#3fb8af" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
};
