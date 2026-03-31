import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';

function NavItems({ tabs, activeTab, onTabChange, compact = false }) {
  return (
    <nav className="space-y-2 p-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.label;

        return (
          <button
            key={tab.label}
            onClick={() => onTabChange(tab.label)}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-200 shadow-glow'
                : 'text-slate-300 hover:bg-white/5 hover:text-white hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]'
            } ${compact ? 'justify-center px-2' : ''}`}
            title={tab.label}
          >
            <Icon size={18} className="opacity-90" />
            {!compact && <span className="text-[28px] font-medium leading-none" style={{ fontSize: '26px', transform: 'scale(0.5)', transformOrigin: 'left center' }}>{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

export default function SidebarNav({
  tabs,
  activeTab,
  onTabChange,
  desktopCollapsed,
  onToggleDesktop,
  mobileOpen,
  onToggleMobile,
  onCloseMobile,
}) {
  return (
    <>
      <aside
        className={`hidden shrink-0 border-r border-white/10 bg-slate-950/40 backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col ${
          desktopCollapsed ? 'w-[86px]' : 'w-[260px]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <h1 className={`bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text font-bold leading-none text-transparent transition-all ${desktopCollapsed ? 'text-lg' : 'text-[28px]'}`}>
            {desktopCollapsed ? 'AL' : 'AgentLend AI'}
          </h1>
          <button
            onClick={onToggleDesktop}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10"
          >
            {desktopCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <NavItems tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} compact={desktopCollapsed} />
      </aside>

      <button
        onClick={onToggleMobile}
        className="fixed left-3 top-3 z-50 rounded-lg border border-cyan-400/30 bg-slate-900/80 px-3 py-2 text-sm text-cyan-200 backdrop-blur-xl lg:hidden"
      >
        Menu
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={onCloseMobile}
            aria-label="Close menu overlay"
          />
          <aside className="absolute left-0 top-0 h-full w-[280px] border-r border-white/10 bg-slate-950/95 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
              <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-xl font-bold text-transparent">
                AgentLend AI
              </h1>
              <button
                onClick={onCloseMobile}
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300"
              >
                <X size={16} />
              </button>
            </div>
            <NavItems
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tab) => {
                onTabChange(tab);
                onCloseMobile();
              }}
            />
          </aside>
        </div>
      )}
    </>
  );
}
