import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity, CalendarClock, ChevronDown } from 'lucide-react';
import { fetchDecisionLogs, fetchLoans } from '../lib/api';
import { isDefaultedLoan } from '../lib/loanStatus';

const fallbackRadarData = [
  { factor: 'Approval Rate', score: 70 },
  { factor: 'Portfolio Health', score: 74 },
  { factor: 'Risk Stability', score: 68 },
  { factor: 'Pricing Fit', score: 66 },
  { factor: 'Repayment Strength', score: 72 },
];

const fallbackRiskTrend = [
  { m: 'Jan', v: 28 },
  { m: 'Feb', v: 32 },
  { m: 'Mar', v: 35 },
  { m: 'Apr', v: 30 },
  { m: 'May', v: 38 },
  { m: 'Jun', v: 34 },
  { m: 'Jul', v: 31 },
];

const fallbackTopWallets = [
  { t: '0xab12', v: 1800 },
  { t: '0xcd34', v: 1560 },
  { t: '0xef56', v: 1200 },
  { t: '0x7812', v: 980 },
  { t: '0x9a44', v: 840 },
  { t: '0xbc88', v: 620 },
];

const fallbackHeatRows = [
  ['Jan', [1, 2, 1, 2, 2, 1, 1, 2, 2, 3, 2, 2, 2, 1]],
  ['Feb', [2, 1, 2, 2, 1, 2, 3, 2, 1, 2, 2, 3, 1, 1]],
  ['Mar', [2, 2, 1, 3, 2, 2, 1, 2, 2, 2, 3, 1, 2, 1]],
];

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function shortWallet(wallet) {
  if (!wallet || wallet.length < 10) return wallet || 'N/A';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function LeftMetricCard({ title, value, Icon }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br from-cyan-400/60 via-violet-500/40 to-blue-500/60 p-[1px]">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-300">{title}</p>
            <h3 className="mt-2 text-6xl font-semibold leading-none">{value}</h3>
          </div>
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/20 p-2 text-cyan-300">
            <Icon size={20} />
          </div>
        </div>
      </div>
    </article>
  );
}

function Card({ title, children, withMore = true }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[2rem] font-semibold leading-none" style={{ fontSize: '36px', transform: 'scale(0.5)', transformOrigin: 'left center' }}>{title}</h3>
        {withMore && (
          <button className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
            More <ChevronDown size={14} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export default function AIRiskAnalysisPage() {
  const [logs, setLogs] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [logData, loanData] = await Promise.all([
          fetchDecisionLogs({ skip: 0, limit: 400 }),
          fetchLoans({ skip: 0, limit: 400 }),
        ]);
        if (!mounted) return;
        setLogs(logData);
        setLoans(loanData);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load AI risk analysis');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const {
    borrowerCount,
    avgRisk,
    radarData,
    riskTrend,
    topWallets,
    heatRows,
    latestExplanation,
  } = useMemo(() => {
    const walletSet = new Set();
    loans.forEach((loan) => walletSet.add(loan.borrower_wallet));
    logs.forEach((log) => walletSet.add(log.wallet_address));

    const borrowerCount = walletSet.size;

    const riskSeries = logs.length > 0
      ? logs.map((log) => Number(log.risk_score || 0))
      : loans.map((loan) => Number(loan.risk_score || 0));
    const avgRisk = riskSeries.length > 0
      ? riskSeries.reduce((sum, value) => sum + value, 0) / riskSeries.length
      : 0;

    const approvedCount = logs.filter((log) => String(log.decision || '').toUpperCase() === 'APPROVED').length;
    const approvalRate = logs.length > 0 ? (approvedCount / logs.length) * 100 : 0;

    const defaultedCount = loans.filter((loan) => isDefaultedLoan(loan.status)).length;
    const repaidCount = loans.filter((loan) => String(loan.status || '').toUpperCase() === 'REPAID').length;
    const defaultRate = loans.length > 0 ? (defaultedCount / loans.length) * 100 : 0;
    const repaymentRate = loans.length > 0 ? (repaidCount / loans.length) * 100 : 0;

    const variance = riskSeries.length > 0
      ? riskSeries.reduce((sum, value) => sum + (value - avgRisk) ** 2, 0) / riskSeries.length
      : 0;
    const riskStdDev = Math.sqrt(variance);

    const avgInterest = logs.length > 0
      ? logs.reduce((sum, log) => sum + Number(log.interest_rate || 0), 0) / logs.length
      : 0;

    const radarData = logs.length > 0 || loans.length > 0
      ? [
          { factor: 'Approval Rate', score: clampScore(approvalRate) },
          { factor: 'Portfolio Health', score: clampScore(100 - defaultRate) },
          { factor: 'Risk Stability', score: clampScore(100 - riskStdDev * 3) },
          { factor: 'Pricing Fit', score: clampScore(100 - avgInterest * 3.2) },
          { factor: 'Repayment Strength', score: clampScore(repaymentRate) },
        ]
      : fallbackRadarData;

    const monthlyRisk = new Map();
    logs.forEach((log) => {
      const month = new Date(log.timestamp).toLocaleString('en-US', { month: 'short' });
      const bucket = monthlyRisk.get(month) || { total: 0, count: 0 };
      bucket.total += Number(log.risk_score || 0);
      bucket.count += 1;
      monthlyRisk.set(month, bucket);
    });
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const riskTrend = monthOrder
      .filter((month) => monthlyRisk.has(month))
      .slice(-7)
      .map((month) => {
        const value = monthlyRisk.get(month);
        return {
          m: month,
          v: Number((value.total / Math.max(1, value.count)).toFixed(1)),
        };
      });

    const loanByWallet = new Map();
    loans.forEach((loan) => {
      const wallet = loan.borrower_wallet || 'unknown';
      loanByWallet.set(wallet, (loanByWallet.get(wallet) || 0) + Number(loan.amount || 0));
    });
    const topWallets = [...loanByWallet.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([wallet, amount]) => ({ t: shortWallet(wallet), v: Math.round(amount) }));

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const targetMonths = [2, 1, 0].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return { y: date.getFullYear(), m: date.getMonth(), label: monthNames[date.getMonth()] };
    });

    const heatRows = targetMonths.map(({ y, m, label }) => {
      const bins = Array.from({ length: 14 }, () => 0);
      logs.forEach((log) => {
        const date = new Date(log.timestamp);
        if (date.getFullYear() !== y || date.getMonth() !== m) return;
        const dayBin = Math.min(13, Math.floor((date.getDate() - 1) / 2));
        bins[dayBin] += 1;
      });
      const levels = bins.map((count) => {
        if (count >= 4) return 3;
        if (count >= 2) return 2;
        return 1;
      });
      return [label, levels];
    });

    const latestLog = [...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const latestExplanation = latestLog
      ? latestLog.ai_explanation || latestLog.reason || 'No AI explanation available for the latest decision.'
      : 'No decision logs available yet. Submit a loan request to generate AI analysis details.';

    return {
      borrowerCount,
      avgRisk,
      radarData,
      riskTrend: riskTrend.length > 0 ? riskTrend : fallbackRiskTrend,
      topWallets: topWallets.length > 0 ? topWallets : fallbackTopWallets,
      heatRows: heatRows.some(([, levels]) => levels.some((level) => level > 1)) ? heatRows : fallbackHeatRows,
      latestExplanation,
    };
  }, [logs, loans]);

  return (
    <>
      <div className="mb-5">
        <h2 className="text-5xl font-semibold tracking-tight">AI Risk Analysis</h2>
      </div>

      {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
      {loading && <p className="mb-3 text-sm text-cyan-300">Loading AI risk analysis...</p>}

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <LeftMetricCard title="Borrowers Analyzed" value={borrowerCount.toLocaleString()} Icon={CalendarClock} />
          <LeftMetricCard title="Average Risk Score" value={`${avgRisk.toFixed(1)}/100`} Icon={Activity} />

          <Card title="Top Borrowers by Volume">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topWallets}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="t" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
                  <Bar dataKey="v" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4 rounded-2xl border border-white/10 bg-slate-900/55 p-4 shadow-card backdrop-blur-xl">
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.25)" />
                <PolarAngleAxis dataKey="factor" tick={{ fill: '#E2E8F0', fontSize: 14 }} />
                <Radar dataKey="score" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.25} strokeWidth={3} />
                <Radar dataKey="score" stroke="#A855F7" fill="#A855F7" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card title="Monthly Risk Trend">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskTrend}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="m" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip contentStyle={{ background: '#0B1228', border: '1px solid rgba(148,163,184,0.25)' }} />
                  <Bar dataKey="v" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Activity Score">
            <div className="space-y-2">
              {heatRows.map(([month, row]) => (
                <div key={month} className="flex items-center gap-2">
                  <span className="w-9 text-xs text-slate-400">{month}</span>
                  <div className="grid grid-cols-14 gap-1">
                    {row.map((v, idx) => (
                      <div
                        key={`${month}-${idx}`}
                        className={`h-4 w-4 rounded-sm ${
                          v === 1 ? 'bg-cyan-500/45' : v === 2 ? 'bg-sky-400/65' : 'bg-violet-500/65'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-transparent bg-gradient-to-br from-cyan-400/55 via-violet-500/35 to-blue-500/55 p-[1px]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-4xl font-semibold">AI Explanation</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
              More <ChevronDown size={14} />
            </button>
          </div>
          <p className="text-3xl leading-relaxed text-slate-100" style={{ fontSize: '36px', transform: 'scale(0.5)', transformOrigin: 'left top' }}>
            {latestExplanation}
          </p>
        </div>
      </section>
    </>
  );
}
