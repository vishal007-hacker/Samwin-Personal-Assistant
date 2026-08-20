import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../features/auth/AuthContext';
import ReminderPopup from '../../features/custom-reminders/ReminderPopup';
import UpdateChecker from '../../features/settings/UpdateChecker';
import AIChatWidget from '../../features/ai-assistant/AIChatWidget';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar collapsed={!sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          title={pageTitle}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet context={{ setPageTitle }} />
        </main>
      </div>

      {/* Global reminder popup — checks every 30s for due reminders */}
      <ReminderPopup />
      
      {/* Background system update checker */}
      <UpdateChecker />

      {/* Global AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
