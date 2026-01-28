import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Transactions from "./pages/Transactions";
import UsersManagement from "./pages/UsersManagement";
import WalletsFunds from "./pages/WalletsFunds";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import SalesRequests from "./pages/SalesRequests";
import EscalatedRequests from "./pages/EscalatedRequests";
import AgentsManagement from "./pages/AgentsManagement";
import NewSaleRequest from "./pages/NewSaleRequest";
import MyTransactions from "./pages/MyTransactions";
import MyCommission from "./pages/MyCommission";
import MyClients from "./pages/MyClients";
import SimCardManagement from "./pages/SimCardManagement";

const queryClient = new QueryClient();

const ProtectedPage = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('super_agent' | 'sales_assistant' | 'sales_agent')[] }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/transactions" element={<ProtectedPage><Transactions /></ProtectedPage>} />
            <Route path="/users" element={<ProtectedPage allowedRoles={['super_agent']}><UsersManagement /></ProtectedPage>} />
            <Route path="/wallets" element={<ProtectedPage allowedRoles={['super_agent']}><WalletsFunds /></ProtectedPage>} />
            <Route path="/reports" element={<ProtectedPage allowedRoles={['super_agent', 'sales_assistant']}><Reports /></ProtectedPage>} />
            <Route path="/audit-logs" element={<ProtectedPage allowedRoles={['super_agent']}><AuditLogs /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage allowedRoles={['super_agent']}><Settings /></ProtectedPage>} />
            <Route path="/sales-requests" element={<ProtectedPage allowedRoles={['super_agent', 'sales_assistant']}><SalesRequests /></ProtectedPage>} />
            <Route path="/escalated-requests" element={<ProtectedPage allowedRoles={['super_agent']}><EscalatedRequests /></ProtectedPage>} />
            <Route path="/agents" element={<ProtectedPage allowedRoles={['super_agent', 'sales_assistant']}><AgentsManagement /></ProtectedPage>} />
            <Route path="/sim-cards" element={<ProtectedPage allowedRoles={['super_agent', 'sales_assistant']}><SimCardManagement /></ProtectedPage>} />
            <Route path="/new-sale" element={<ProtectedPage allowedRoles={['sales_agent']}><NewSaleRequest /></ProtectedPage>} />
            <Route path="/my-transactions" element={<ProtectedPage allowedRoles={['sales_agent']}><MyTransactions /></ProtectedPage>} />
            <Route path="/my-commission" element={<ProtectedPage allowedRoles={['sales_agent']}><MyCommission /></ProtectedPage>} />
            <Route path="/my-clients" element={<ProtectedPage allowedRoles={['sales_agent']}><MyClients /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
