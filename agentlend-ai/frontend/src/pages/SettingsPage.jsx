import { useState } from 'react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [autoApproval, setAutoApproval] = useState(false);

  return (
    <>
      <div className="mb-5">
        <h2 className="text-5xl font-semibold tracking-tight">Settings</h2>
      </div>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="font-semibold">Realtime Decision Alerts</p>
            <p className="text-sm text-slate-400">Receive push alerts for every high-risk decision.</p>
          </div>
          <button onClick={() => setNotifications((v) => !v)} className={`rounded-full px-3 py-1 text-sm ${notifications ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
            {notifications ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="font-semibold">Auto-Approve Low-Risk Loans</p>
            <p className="text-sm text-slate-400">Automatically approve requests with risk score below threshold.</p>
          </div>
          <button onClick={() => setAutoApproval((v) => !v)} className={`rounded-full px-3 py-1 text-sm ${autoApproval ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
            {autoApproval ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-2 font-semibold">Risk Threshold</p>
          <input type="range" min={20} max={80} defaultValue={45} className="w-full accent-cyan-400" />
          <p className="mt-2 text-sm text-slate-400">Current threshold: 45</p>
        </div>
      </section>
    </>
  );
}
