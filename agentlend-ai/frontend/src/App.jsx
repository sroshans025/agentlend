import { useMemo, useState } from 'react';
import {
  ShieldCheck,
  HandCoins,
  LayoutDashboard,
  Landmark,
  ListChecks,
  RotateCcw,
  BarChart3,
  Activity,
  Settings,
} from 'lucide-react';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import RequestLoanPage from './pages/RequestLoanPage';
import AIRiskAnalysisPage from './pages/AIRiskAnalysisPage';
import DecisionLogsPage from './pages/DecisionLogsPage';
import ActiveLoansPage from './pages/ActiveLoansPage';
import RepaymentMonitorPage from './pages/RepaymentMonitorPage';
import TreasuryPoolPage from './pages/TreasuryPoolPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import SettingsPage from './pages/SettingsPage';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Request Loan', icon: HandCoins },
  { label: 'AI Risk Analysis', icon: ShieldCheck },
  { label: 'Decision Logs', icon: ListChecks },
  { label: 'Active Loans', icon: RotateCcw },
  { label: 'Repayment Monitor', icon: Activity },
  { label: 'Treasury Pool', icon: Landmark },
  { label: 'Admin Analytics', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
];

const pageMap = {
  Dashboard: DashboardPage,
  'Request Loan': RequestLoanPage,
  'AI Risk Analysis': AIRiskAnalysisPage,
  'Decision Logs': DecisionLogsPage,
  'Active Loans': ActiveLoansPage,
  'Repayment Monitor': RepaymentMonitorPage,
  'Treasury Pool': TreasuryPoolPage,
  'Admin Analytics': AdminAnalyticsPage,
  Settings: SettingsPage,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const ActivePage = useMemo(() => pageMap[activeTab] || DashboardPage, [activeTab]);

  return (
    <AppShell tabs={navItems} activeTab={activeTab} onTabChange={setActiveTab}>
      <ActivePage />
    </AppShell>
  );
}
