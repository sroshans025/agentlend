import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Landmark,
  Link2,
  MinusCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchLoans, fetchTreasuryBalance } from '../lib/api';
import { isDefaultedLoan, isOutstandingLoan } from '../lib/loanStatus';

const fallbackEvents = [
  {
    id: 1,
    type: 'repayment',
    title: 'Loan Repayment Detected',
    wallet: '0xf00285d2...8b23',
    amount: '$13.07 USDT',
    txHash: 'a03e3019f21',
    explorer: 'https://etherscan.io/tx/0xa03e3019f21',
    time: '12s ago',
  },
  {
    id: 2,
    type: 'issued',
    title: 'Loan Issued',
    wallet: '0x4f8eA190...d112',
    amount: '$2,000 USDT',
    txHash: 'a0362ddca11',
    explorer: 'https://etherscan.io/tx/0xa0362ddca11',
    time: '1m ago',
  },
  {
    id: 3,
    type: 'default',
    title: 'Default Alert',
    wallet: '0x22Ac0D90...17e1',
    amount: '$300 USDT',
    txHash: 'a0355ddac90',
    explorer: 'https://etherscan.io/tx/0xa0355ddac90',
    time: '3m ago',
  },
];

const tokenBalanceData = [
  { m: 'Jan', v: 31 },
  { m: 'Feb', v: 24 },
  { m: 'Mar', v: 20 },
  { m: 'Apr', v: 14 },
  { m: 'May', v: 35 },
  { m: 'Jun', v: 26 },
  { m: 'Jul', v: 10 },
];

const utilizationData = [
  { m: 'Jan', u: 24 },
  { m: 'Feb', u: 34 },
  { m: 'Mar', u: 32 },
  { m: 'Apr', u: 66 },
  { m: 'May', u: 45 },
  { m: 'Jun', u: 52 },
  { m: 'Jul', u: 73 },
];

function eventStyles(type) {
  if (type === 'repayment') {
    return {
      icon: CheckCircle2,
      iconClass: 'text-emerald-300',
      dotClass: 'bg-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.75)]',
      lineClass: 'from-emerald-400/80 to-emerald-400/20',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    };
  }
  if (type === 'issued') {
    return {
      icon: MinusCircle,
      iconClass: 'text-sky-300',
      dotClass: 'bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.75)]',
      lineClass: 'from-sky-400/80 to-sky-400/20',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    };
  }
  return {
    icon: AlertTriangle,
    iconClass: 'text-rose-300',
    dotClass: 'bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.75)]',
    lineClass: 'from-rose-400/80 to-rose-400/20',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
  };
}

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

function MetricCard({ title, value, icon: Icon, subtitle, fullValue }) {
  return (
    <div className="rounded-2xl border border-transparent bg-gradient-to-br from-cyan-400/55 via-violet-500/35 to-blue-500/55 p-[1px]">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="text-sm text-slate-300">{title}</p>
          <div className="rounded-lg bg-cyan-500/20 p-1.5 text-cyan-300">
            <Icon size={16} />
          </div>
        </div>
        <h3 className="truncate text-3xl font-semibold leading-tight lg:text-4xl" title={fullValue || value}>{value}</h3>
        {fullValue && fullValue !== value && (
          <p className="mt-1 truncate text-xs text-slate-500" title={fullValue}>{fullValue}</p>
        )}
        {subtitle && <p className="mt-2 text-sm text-slate-300">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function RepaymentMonitorPage() {
  const [loans, setLoans] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [loansData, treasuryData] = await Promise.all([
          fetchLoans({ skip: 0, limit: 300 }),
          fetchTreasuryBalance(),
        ]);
        if (!mounted) return;
        setLoans(loansData);
        setTreasury(treasuryData);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load monitor data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const timelineEvents = useMemo(() => {
    if (loans.length === 0) return fallbackEvents;

    const mapped = loans.slice(0, 6).map((loan) => {
      const status = String(loan.status || '').toUpperCase();
      const type = status === 'REPAID' ? 'repayment' : isDefaultedLoan(status) ? 'default' : 'issued';
      const title = type === 'repayment'
        ? 'Loan Repayment Detected'
        : type === 'default'
          ? 'Default Alert'
          : 'Loan Issued';

      return {
        id: loan.loan_id,
        type,
        title,
        wallet: loan.borrower_wallet,
        amount: `$${Number(loan.amount || 0).toLocaleString()} USDT`,
        txHash: loan.transaction_hash ? loan.transaction_hash.slice(0, 12) : 'N/A',
        explorer: loan.transaction_hash ? `https://sepolia.etherscan.io/tx/${loan.transaction_hash}` : '#',
        time: new Date(loan.created_at).toLocaleString(),
      };
    });

    return mapped.length > 0 ? mapped : fallbackEvents;
  }, [loans]);

  const treasuryMetrics = useMemo(() => {
    const totalLiquidity = Number(treasury?.balance_human || 0);
    const outstanding = loans
      .filter((loan) => isOutstandingLoan(loan.status))
      .reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const capacity = totalLiquidity > 0 ? Math.max(0, 100 - (outstanding / totalLiquidity) * 100) : 0;
    const utilization = totalLiquidity > 0 ? Math.min(100, (outstanding / totalLiquidity) * 100) : 0;
    return {
      totalLiquidity,
      capacity,
      utilization,
    };
  }, [loans, treasury]);

  return (
    <>
      <div className="mb-5">
        <h2 className="text-5xl font-semibold tracking-tight">Repayment Monitor</h2>
      </div>

      {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
      {loading && <p className="mb-3 text-sm text-cyan-300">Loading repayment monitor...</p>}

      <section className="grid gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-transparent bg-gradient-to-br from-cyan-400/55 via-violet-500/35 to-blue-500/55 p-[1px] xl:col-span-5">
          <div className="h-full rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Timeline</h3>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Realtime Stream
              </span>
            </div>

            <div className="space-y-4">
              {timelineEvents.map((event, index) => {
                const styles = eventStyles(event.type);
                const EventIcon = styles.icon;

                return (
                  <motion.article
                    key={event.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    whileHover={{ scale: 1.01 }}
                    className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <EventIcon size={18} className={styles.iconClass} />
                        <h4 className="text-[22px] font-semibold" style={{ fontSize: '30px', transform: 'scale(0.5)', transformOrigin: 'left center' }}>
                          {event.title}
                        </h4>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[11px] ${styles.badge}`}>{event.time}</span>
                    </div>

                    <div className="relative pl-5">
                      <span className={`absolute left-0 top-1 h-full w-[2px] bg-gradient-to-b ${styles.lineClass}`} />
                      <span className={`absolute left-[-4px] top-1 h-[10px] w-[10px] rounded-full ${styles.dotClass}`} />

                      <div className="space-y-1 text-sm text-slate-200">
                        <p className="text-slate-300">Wallet Address <span className="font-mono text-slate-100">{event.wallet}</span></p>
                        <p>Amount: <span className="font-semibold text-slate-100">{event.amount}</span></p>
                        <p>
                          Transaction hash:{' '}
                          <span className="font-mono text-cyan-300">{event.txHash}</span>{' '}
                          <a href={event.explorer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 transition hover:text-cyan-200">
                            Explorer
                            <ArrowUpRight size={13} />
                          </a>
                        </p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4 xl:col-span-7">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Total Liquidity"
              value={`${formatCurrencyCompact(treasuryMetrics.totalLiquidity)} USDT`}
              fullValue={`${formatCurrencyFull(treasuryMetrics.totalLiquidity)} USDT`}
              icon={Landmark}
            />
            <MetricCard title="Lending Capacity" value={`${treasuryMetrics.capacity.toFixed(1)}%`} subtitle="Gauged against dynamic demand" icon={Gauge} />
          </div>

          <MetricCard title="Capital Utilization" value={`${treasuryMetrics.utilization.toFixed(1)}%`} subtitle="Treasury usage across active loans" icon={CircleDollarSign} />

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Token Balance</h3>
                <button className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                  More
                  <Link2 size={12} />
                </button>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tokenBalanceData}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="m" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
                    <Bar dataKey="v" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Treasury Usage</h3>
                <button className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                  More
                  <Link2 size={12} />
                </button>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={utilizationData}>
                    <defs>
                      <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.55} />
                        <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="m" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
                    <Area type="monotone" dataKey="u" stroke="#22D3EE" strokeWidth={3} fill="url(#usageGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </section>
      </section>
    </>
  );
}
