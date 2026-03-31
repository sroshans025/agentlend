import { useEffect, useMemo, useState } from 'react';
import { Search, X, CheckCircle2, XCircle } from 'lucide-react';
import { fetchDecisionLogs, fetchLoans } from '../lib/api';

const seedRows = [];

const PAGE_SIZE = 4;

function formatAmount(value) {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${value.toLocaleString()}`;
  }
  return `$${value}`;
}

export default function DecisionLogsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState(seedRows);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [logs, loans] = await Promise.all([
          fetchDecisionLogs({ skip: 0, limit: 200 }),
          fetchLoans({ skip: 0, limit: 200 }),
        ]);

        const amountByLoanId = new Map(loans.map((loan) => [loan.loan_id, loan.amount]));
        const mapped = logs.map((log) => ({
          loanId: log.loan_id || log.log_id,
          wallet: log.wallet_address,
          amount: Number(amountByLoanId.get(log.loan_id) || 0),
          riskScore: Number(log.risk_score || 0),
          interestRate: Number(log.interest_rate || 0),
          decision: String(log.decision || '').toUpperCase() === 'REJECTED' ? 'Rejected' : 'Approved',
          timestamp: new Date(log.timestamp).toLocaleString(),
          explanation: log.ai_explanation || 'No AI explanation provided.',
          analytics: `Wallet ${log.wallet_address} • Decision score ${Number(log.risk_score || 0).toFixed(1)}.`,
          riskFactors: log.reason || 'No explicit risk factors provided.',
        }));

        if (isMounted) {
          setRows(mapped);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Failed to load decision logs');
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((row) =>
      `${row.loanId} ${row.wallet} ${row.decision} ${row.riskScore} ${row.timestamp}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-5xl font-semibold tracking-tight">Decision Logs</h2>
        <div className="w-full max-w-md rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
      {loading && <p className="mb-3 text-sm text-cyan-300">Loading decision logs...</p>}

      <div className="overflow-hidden rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-blue-500/20 p-[1px]">
        <div className="rounded-2xl bg-slate-950/75 backdrop-blur-xl">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-slate-900/95 text-sm text-slate-300 backdrop-blur-xl">
              <tr>
                <th className="px-4 py-3">Loan ID</th>
                <th className="px-4 py-3">Wallet Address</th>
                <th className="px-4 py-3">Loan Amount</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Interest Rate</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {current.length > 0 ? (
                current.map((row) => (
                  <tr
                    key={row.loanId}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer border-t border-white/5 text-sm text-slate-200 transition-colors duration-200 hover:bg-cyan-500/10"
                  >
                    <td className="px-4 py-3">{row.loanId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.wallet}</td>
                    <td className="px-4 py-3">{formatAmount(row.amount)}</td>
                    <td className="px-4 py-3 text-emerald-300">{row.riskScore}/100</td>
                    <td className="px-4 py-3">{row.interestRate}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.decision === 'Approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {row.decision === 'Approved' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {row.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{row.timestamp}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No decision logs found for this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm text-slate-300">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                className="rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:opacity-40"
              >
                Prev
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => setPage(number)}
                  className={`h-8 w-8 rounded-lg border text-xs transition ${
                    number === page
                      ? 'border-cyan-300 bg-cyan-500/20 text-cyan-200'
                      : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {number}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                className="rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-cyan-400/35 bg-slate-900/95 p-5 shadow-card backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Loan #{selected.loanId} Analysis</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 text-slate-200">
              <div>
                <p className="text-sm text-slate-400">AI Explanation</p>
                <p>{selected.explanation}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">wallet analytics</p>
                <p>{selected.analytics}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Risk Factors</p>
                <p>{selected.riskFactors}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
