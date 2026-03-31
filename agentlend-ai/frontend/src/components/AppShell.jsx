import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Network, Wallet } from 'lucide-react';
import SidebarNav from './SidebarNav';
import { fetchTreasuryBalance } from '../lib/api';

function HeaderChip({ children, className = '' }) {
  return (
    <div className={`inline-flex h-11 shrink-0 items-center rounded-[16px] border border-white/15 bg-white/10 px-3 shadow-glow backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

export default function AppShell({ tabs, activeTab, onTabChange, children }) {
  const ethAddress = useMemo(() => 'f00285d2823...b4e9', []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [treasuryLabel, setTreasuryLabel] = useState('Loading...');

  useEffect(() => {
    let mounted = true;

    async function loadTreasury() {
      try {
        const treasury = await fetchTreasuryBalance();
        if (!mounted) return;
        const balance = Number(treasury?.balance_human || 0);
        setTreasuryLabel(`$${balance.toLocaleString()}`);
      } catch {
        if (!mounted) return;
        setTreasuryLabel('Unavailable');
      }
    }

    loadTreasury();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen lg:flex">
      <SidebarNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        desktopCollapsed={desktopCollapsed}
        onToggleDesktop={() => setDesktopCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="flex-1 px-3 pt-14 sm:px-4 lg:px-5 lg:pt-3">
        <header className="mb-5 flex items-center gap-2 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/50 px-2.5 py-2 shadow-card backdrop-blur-xl">
          <HeaderChip>
            <div className="flex items-center gap-2 text-[13px] text-slate-100 lg:text-sm">
              <Network size={15} className="text-cyan-300" />
              <span className="font-medium">Ethereum</span>
              <ChevronDown size={13} className="text-slate-300" />
            </div>
          </HeaderChip>

          <HeaderChip className="lg:ml-auto">
            <div className="flex items-center gap-2 text-[13px] text-slate-100 lg:text-sm">
              <Wallet size={15} className="text-violet-300" />
              <span className="font-medium">Connected {ethAddress}</span>
              <ChevronDown size={13} className="text-slate-300" />
            </div>
          </HeaderChip>

          <HeaderChip className="pr-3">
            <div className="leading-tight text-slate-200">
              <p className="text-[11px] text-slate-400">Treasury Balance</p>
              <p className="text-[15px] font-semibold">{treasuryLabel}</p>
            </div>
          </HeaderChip>

          <HeaderChip className="pr-3">
            <div className="flex items-center gap-2 text-slate-200">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-slate-300">AI Agent</p>
                <p className="text-[15px] font-semibold text-emerald-300">Active</p>
              </div>
              <ChevronDown size={13} className="text-slate-300" />
            </div>
          </HeaderChip>
        </header>

        {children}
      </main>
    </div>
  );
}
