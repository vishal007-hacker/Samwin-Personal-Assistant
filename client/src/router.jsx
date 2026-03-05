import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import CustomerListPage from './features/customers/CustomerListPage';
import CustomerFormPage from './features/customers/CustomerFormPage';
import CustomerProfilePage from './features/customers/CustomerProfilePage';
import SchemeListPage from './features/schemes/SchemeListPage';
import SchemeFormPage from './features/schemes/SchemeFormPage';
import PolicyListPage from './features/policies/PolicyListPage';
import PolicyEntryPage from './features/policies/PolicyEntryPage';
import PolicyDetailPage from './features/policies/PolicyDetailPage';
import PaymentCollectionPage from './features/payments/PaymentCollectionPage';
import PaymentHistoryPage from './features/payments/PaymentHistoryPage';
import RemindersPage from './features/reminders/RemindersPage';
import CreditListPage from './features/credits/CreditListPage';
import CreditDetailPage from './features/credits/CreditDetailPage';
import NewCreditPage from './features/credits/NewCreditPage';
import BroadcastPage from './features/broadcast/BroadcastPage';
import ReportsPage from './features/reports/ReportsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'customers', element: <CustomerListPage /> },
      { path: 'customers/new', element: <CustomerFormPage /> },
      { path: 'customers/:id', element: <CustomerProfilePage /> },
      { path: 'customers/:id/edit', element: <CustomerFormPage /> },
      { path: 'schemes', element: <SchemeListPage /> },
      { path: 'schemes/new', element: <SchemeFormPage /> },
      { path: 'schemes/:id/edit', element: <SchemeFormPage /> },
      { path: 'policies', element: <PolicyListPage /> },
      { path: 'policies/new', element: <PolicyEntryPage /> },
      { path: 'policies/:id', element: <PolicyDetailPage /> },
      { path: 'payments', element: <PaymentCollectionPage /> },
      { path: 'payments/history', element: <PaymentHistoryPage /> },
      { path: 'reminders', element: <RemindersPage /> },
      { path: 'credits', element: <CreditListPage /> },
      { path: 'credits/new', element: <NewCreditPage /> },
      { path: 'credits/:id', element: <CreditDetailPage /> },
      { path: 'broadcast', element: <BroadcastPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
]);
