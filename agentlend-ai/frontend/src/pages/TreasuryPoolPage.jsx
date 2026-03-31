import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Coins, Droplets, ShieldCheck } from 'lucide-react';
import { fetchLoans, fetchTreasuryBalance } from '../lib/api';
import { isOutstandingLoan } from '../lib/loanStatus';

const poolData = [
  { name: 'Available', value: 60 },
  { name: 'Lent Out', value: 30 },
  { name: 'Reserved', value: 10 },
];

const trendData = [
  { m: 'Jan', v: 1.2 },
  { m: 'Feb', v: 1.24 },
  { m: 'Mar', v: 1.28 },
  { m: 'Apr', v: 1.41 },
  { m: 'May', v: 1.36 },
  { m: 'Jun', v: 1.5 },
];

const colors = ['#22D3EE', '#A855F7', '#F59E0B'];

function formatCurrencyCompact(value) {
  const amount = Number(value || 0);
  const absAmount = Math.abs(amount);

  if (absAmount >= 1e15) return `$${(amount / 1e15).toFixed(2)}Q`;
  if (absAmount >= 1e12) return `$${(amount / 1e12).toFixed(2)}T`;
  if (absAmount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (absAmount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (absAmount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;

  return `$${amount.toLocaleString()}`;
}

function formatCurrencyFull(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function Stat({ title, value, fullValue, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-2 truncate text-3xl font-semibold leading-tight lg:text-4xl" title={fullValue || value}>{value}</h3>
          {fullValue && fullValue !== value && (
            <p className="mt-1 truncate text-xs text-slate-500" title={fullValue}>{fullValue}</p>
          )}
        </div>
        <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-300">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function TreasuryPoolPage() {
  const [treasury, setTreasury] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [treasuryData, loansData] = await Promise.all([
          fetchTreasuryBalance(),
          fetchLoans({ skip: 0, limit: 300 }),
        ]);
        if (!mounted) return;
        setTreasury(treasuryData);
        setLoans(loansData);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load treasury data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const { stats, composition, trend } = useMemo(() => {
    const totalTreasury = Number(treasury?.balance_human || 0);
    const lentOut = loans
      .filter((loan) => isOutstandingLoan(loan.status))
      .reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const reserveRatio = 18;
    const reserved = totalTreasury * (reserveRatio / 100);
    const available = Math.max(0, totalTreasury - lentOut - reserved);

    const totalForChart = Math.max(totalTreasury, available + lentOut + reserved, 1);
    const compositionData = [
      { name: 'Available', value: Math.round((available / totalForChart) * 100) },
      { name: 'Lent Out', value: Math.round((lentOut / totalForChart) * 100) },
      { name: 'Reserved', value: Math.round((reserved / totalForChart) * 100) },
    ];

    const monthly = new Map();
    loans.forEach((loan) => {
      const month = new Date(loan.created_at).toLocaleString('en-US', { month: 'short' });
      monthly.set(month, (monthly.get(month) || 0) + Number(loan.amount || 0));
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const trendData = months.map((month) => ({
      m: month,
      v: Number(((monthly.get(month) || 0) / 1000000).toFixed(2)),
    }));

    return {
      stats: {
        totalTreasury,
        available,
        reserveRatio,
      },
      composition: compositionData,
      trend: trendData.some((item) => item.v > 0) ? trendData : trendData.map((item, index) => ({ ...item, v: trendData[index]?.v || 0 })) || trendData,
    };
  }, [loans, treasury]);

  return (
    <>
      <div className="mb-5">
        <h2 className="text-5xl font-semibold tracking-tight">Treasury Pool</h2>
      </div>

      {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
      {loading && <p className="mb-3 text-sm text-cyan-300">Loading treasury pool...</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          title="Total Treasury"
          value={formatCurrencyCompact(stats.totalTreasury)}
          fullValue={formatCurrencyFull(stats.totalTreasury)}
          icon={Coins}
        />
        <Stat
          title="Available Liquidity"
          value={formatCurrencyCompact(stats.available)}
          fullValue={formatCurrencyFull(stats.available)}
          icon={Droplets}
        />
        <Stat title="Reserve Ratio" value={`${stats.reserveRatio}%`} icon={ShieldCheck} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
          <h3 className="mb-3 text-lg font-semibold">Pool Composition</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={composition} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={4}>
                  {composition.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
          <h3 className="mb-3 text-lg font-semibold">Liquidity Trend (M)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="m" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
                <Line type="monotone" dataKey="v" stroke="#22D3EE" strokeWidth={4} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </>
  );
}
