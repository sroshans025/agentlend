import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  CalendarClock,
  Clock3,
  HandCoins,
  Percent,
  Wallet,
  WalletCards,
} from 'lucide-react';
import { fetchLoans } from '../lib/api';
import { isActiveLoan, isDefaultedLoan, toLoanStatusLabel } from '../lib/loanStatus';

const seedLoans = [];

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-2 text-4xl font-semibold">{value}</h3>
        </div>
        <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-300">
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function formatAmount(amount) {
  return `$${amount.toLocaleString()} USDT`;
}

function getRepaymentStatus(status, dueDate) {
  if (isDefaultedLoan(status)) return 'Overdue';
  if (!dueDate) return 'On Track';
  const now = new Date();
  const due = new Date(dueDate);
  const msLeft = due.getTime() - now.getTime();
  if (msLeft < 0) return 'Overdue';
  const daysLeft = msLeft / (1000 * 60 * 60 * 24);
  if (daysLeft <= 5) return 'Near Due';
  return 'On Track';
}

function getLifecycleProgress(createdAt, dueDate) {
  if (!createdAt || !dueDate) return 50;
  const start = new Date(createdAt).getTime();
  const end = new Date(dueDate).getTime();
  const now = Date.now();
  if (end <= start) return 50;
  const progress = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function statusStyles(status) {
  if (status === 'On Track') {
    return {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      bar: 'from-cyan-400 to-emerald-400',
    };
  }
  if (status === 'Near Due') {
    return {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      bar: 'from-amber-400 to-orange-400',
    };
  }
  return {
    badge: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    bar: 'from-rose-400 to-red-500',
  };
}

function LoanCard({ loan, index }) {
  const styles = statusStyles(loan.repaymentStatus);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5, scale: 1.01 }}
      className="group rounded-2xl border border-transparent bg-gradient-to-br from-cyan-400/60 via-violet-500/40 to-blue-500/60 p-[1px]"
    >
      <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl transition-colors duration-300 group-hover:bg-slate-900/80">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-300">Borrower</p>
            <div className="mt-2 flex min-w-0 items-center gap-2 text-slate-100">
              <Wallet size={16} className="shrink-0 text-cyan-300" />
              <span className="truncate font-mono text-sm">{loan.wallet}</span>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
            {loan.repaymentStatus}
          </span>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between text-slate-200">
            <span className="inline-flex items-center gap-2 text-slate-400">
              <HandCoins size={15} /> Loan Amount
            </span>
            <span className="font-semibold">{formatAmount(loan.amount)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="inline-flex items-center gap-2 text-slate-400">
              <Percent size={15} /> Interest Rate
            </span>
            <span className="font-semibold">{loan.interestRate}% APR</span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="inline-flex items-center gap-2 text-slate-400">
              <CalendarClock size={15} /> Due Date
            </span>
            <span className="font-semibold">{loan.dueDate}</span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="inline-flex items-center gap-2 text-slate-400">
              <Activity size={15} /> Repayment Status
            </span>
            <span className="font-semibold">{loan.repaymentStatus}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Loan Lifecycle</span>
            <span>{loan.lifecycleProgress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-700/70">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${loan.lifecycleProgress}%` }}
              transition={{ duration: 0.7, delay: index * 0.06 }}
              className={`h-2.5 rounded-full bg-gradient-to-r ${styles.bar}`}
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">Loan #{loan.id}</div>
      </div>
    </motion.article>
  );
}

export default function ActiveLoansPage() {
  const [loans, setLoans] = useState(seedLoans);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchLoans({ skip: 0, limit: 200 });
        const mapped = data
          .filter((loan) => isActiveLoan(loan.status))
          .map((loan) => ({
          id: loan.loan_id,
          wallet: loan.borrower_wallet,
          amount: Number(loan.amount || 0),
          interestRate: Number(loan.interest_rate || 0),
          dueDate: loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A',
          lifecycleProgress: getLifecycleProgress(loan.created_at, loan.due_date),
          repaymentStatus: getRepaymentStatus(loan.status, loan.due_date),
          rawStatus: toLoanStatusLabel(loan.status),
          }));

        if (isMounted) {
          setLoans(mapped);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Failed to load loans');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalActive = loans.length;
    const outstanding = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const avgDaysLeft = loans.length > 0
      ? Math.round(
          loans.reduce((sum, loan) => {
            if (!loan.dueDate || loan.dueDate === 'N/A') return sum;
            const diff = new Date(loan.dueDate).getTime() - Date.now();
            return sum + Math.max(0, diff / (1000 * 60 * 60 * 24));
          }, 0) / loans.length
        )
      : 0;

    return { totalActive, outstanding, avgDaysLeft };
  }, [loans]);

  return (
    <>
      <div className="mb-5">
        <h2 className="text-5xl font-semibold tracking-tight">Active Loans</h2>
      </div>

      {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
      {loading && <p className="mb-3 text-sm text-cyan-300">Loading active loans...</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Active Loans" value={String(stats.totalActive)} icon={WalletCards} />
        <StatCard title="Outstanding Amount" value={`$${stats.outstanding.toLocaleString()} USDT`} icon={HandCoins} />
        <StatCard title="Average Days Left" value={String(stats.avgDaysLeft)} icon={Clock3} />
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loans.map((loan, index) => (
          <LoanCard key={loan.id} loan={loan} index={index} />
        ))}
      </section>
    </>
  );
}
