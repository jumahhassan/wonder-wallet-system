import { useAuth } from '@/hooks/useAuth';
import HRFinanceDashboard from './dashboard/HRFinanceDashboard';
import SalesAssistantDashboard from './dashboard/SalesAssistantDashboard';
import SalesAgentDashboard from './dashboard/SalesAgentDashboard';
import SuperAgentDashboard from './dashboard/SuperAgentDashboard';
import MarketingDashboard from './dashboard/MarketingDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render role-specific dashboards
  switch (role) {
    case 'hr_finance':
      return <HRFinanceDashboard />;
    case 'sales_assistant':
      return <SalesAssistantDashboard />;
    case 'sales_agent':
      return <SalesAgentDashboard />;
    case 'super_agent':
      return <SuperAgentDashboard />;
    case 'marketing':
      return <MarketingDashboard />;
    default:
      return <SuperAgentDashboard />;
  }
}
