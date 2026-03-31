import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { Activity, BarChart3, CircleDollarSign, CreditCard, Gauge, Wallet } from 'lucide-react';
import { fetchLoans, fetchTreasuryBalance } from '../lib/api';
import { isActiveLoan, isDefaultedLoan } from '../lib/loanStatus';

const defaultLoansChart = [
  { m: 'Jan', v: 95 },
  { m: 'Feb', v: 140 },
  { m: 'Mar', v: 280 },
  { m: 'Apr', v: 230 },
  { m: 'May', v: 345 },
];

const defaultRiskChart = [
  { b: '0-20', v: 12 },
  { b: '21-40', v: 28 },
  { b: '41-60', v: 34 },
  { b: '61-80', v: 18 },
  { b: '81-100', v: 8 },
];

const defaultRepayChart = [
  { m: 'Jan', v: 48 },
  { m: 'Feb', v: 63 },
  { m: 'Mar', v: 51 },
  { m: 'Apr', v: 60 },
  { m: 'May', v: 72 },
];

function MetricCard({ metric, index }) {
  const Icon = metric.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative overflow-hidden rounded-xl border border-transparent bg-gradient-to-br from-cyan-400/60 via-violet-500/40 to-blue-500/60 p-[1px]"
    >
      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-slate-300">{metric.title}</p>
            <h3 className="mt-1.5 text-5xl font-semibold leading-none text-white" style={{ fontSize: '58px', transform: 'scale(0.5)', transformOrigin: 'left center' }}>{metric.value}</h3>
          </div>
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/20 p-1.5 text-cyan-300">
            <Icon size={18} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <button className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">More</button>
      </div>
      <div className="h-[220px]">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const [loansData, setLoansData] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [loans, treasuryBalance] = await Promise.all([
          fetchLoans({ skip: 0, limit: 300 }),
          fetchTreasuryBalance(),
        ]);
        if (!mounted) return;
        setLoansData(loans);
        setTreasury(treasuryBalance);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const { metrics, loansChart, riskChart, repayChart } = useMemo(() => {
    if (loansData.length === 0) {
      return {
        metrics: [
          { title: 'Total Loans Issued', value: '$0.00', icon: CircleDollarSign },
          { title: 'Active Loans', value: '0', icon: Activity },
          { title: 'Repaid Loans', value: '$0.00', icon: CreditCard },
          { title: 'Default Rate', value: '0.00%', icon: Gauge },
          {
            title: 'Treasury Liquidity',
            value: treasury?.balance_human != null ? `$${Number(treasury.balance_human).toLocaleString()}` : '$0.00',
            icon: Wallet,
          },
          { title: 'Average Risk Score', value: '0.0', icon: BarChart3 },
        ],
        loansChart: defaultLoansChart,
        riskChart: defaultRiskChart,
        repayChart: defaultRepayChart,
      };
    }

    const totalIssued = loansData.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const activeLoans = loansData.filter((loan) => isActiveLoan(loan.status));
    const repaidLoans = loansData.filter((loan) => String(loan.status || '').toUpperCase() === 'REPAID');
    const defaultedLoans = loansData.filter((loan) => isDefaultedLoan(loan.status));
    const defaultRate = loansData.length > 0 ? (defaultedLoans.length / loansData.length) * 100 : 0;
    const avgRisk = loansData.length > 0
      ? loansData.reduce((sum, loan) => sum + Number(loan.risk_score || 0), 0) / loansData.length
      : 0;

    const monthly = new Map();
    loansData.forEach((loan) => {
      const month = new Date(loan.created_at).toLocaleString('en-US', { month: 'short' });
      monthly.set(month, (monthly.get(month) || 0) + Number(loan.amount || 0));
    });

    const sortedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const loansChartData = sortedMonths
      .filter((month) => monthly.has(month))
      .slice(-5)
      .map((month) => ({ m: month, v: Math.round(monthly.get(month)) }));

    const buckets = [0, 0, 0, 0, 0];
    loansData.forEach((loan) => {
      const score = Number(loan.risk_score || 0);
      if (score <= 20) buckets[0] += 1;
      else if (score <= 40) buckets[1] += 1;
      else if (score <= 60) buckets[2] += 1;
      else if (score <= 80) buckets[3] += 1;
      else buckets[4] += 1;
    });

    const riskChartData = [
      { b: '0-20', v: buckets[0] },
      { b: '21-40', v: buckets[1] },
      { b: '41-60', v: buckets[2] },
      { b: '61-80', v: buckets[3] },
      { b: '81-100', v: buckets[4] },
    ];

    const repayHistory = sortedMonths
      .map((month) => ({
        m: month,
        v: loansData.filter((loan) => {
          const loanMonth = new Date(loan.created_at).toLocaleString('en-US', { month: 'short' });
          return loanMonth === month && String(loan.status || '').toUpperCase() === 'REPAID';
        }).length,
      }))
      .filter((entry) => entry.v > 0)
      .slice(-5);

    return {
      metrics: [
        { title: 'Total Loans Issued', value: `$${totalIssued.toLocaleString()}`, icon: CircleDollarSign },
        { title: 'Active Loans', value: String(activeLoans.length), icon: Activity },
        {
          title: 'Repaid Loans',
          value: `$${repaidLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0).toLocaleString()}`,
          icon: CreditCard,
        },
        { title: 'Default Rate', value: `${defaultRate.toFixed(2)}%`, icon: Gauge },
        {
          title: 'Treasury Liquidity',
          value: treasury?.balance_human != null ? `$${Number(treasury.balance_human).toLocaleString()}` : '$0.00',
          icon: Wallet,
        },
        { title: 'Average Risk Score', value: avgRisk.toFixed(1), icon: BarChart3 },
      ],
      loansChart: loansChartData.length > 0 ? loansChartData : defaultLoansChart,
      riskChart: riskChartData,
      repayChart: repayHistory.length > 0 ? repayHistory : defaultRepayChart,
    };
  }, [loansData, treasury]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-4xl font-semibold tracking-tight">Dashboard Panel</h2>
        <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">View all</button>
      </div>

      {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
      {loading && <p className="mb-3 text-sm text-cyan-300">Loading dashboard metrics...</p>}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.title} metric={metric} index={index} />
        ))}
      </section>

      <section className="mt-4 grid gap-3 xl:grid-cols-3">
        <ChartCard title="Loan Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={loansChart}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="m" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
              <Line type="monotone" dataKey="v" stroke="#22D3EE" strokeWidth={4} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Score Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskChart}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="b" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
              <Bar dataKey="v" fill="#22D3EE" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Repayment History">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={repayChart}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="m" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
              <Bar dataKey="v" fill="#A855F7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </>
  );
}
