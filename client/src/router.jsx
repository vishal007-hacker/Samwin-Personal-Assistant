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
import StockListPage from './features/stock/StockListPage';
import PhoneAccessoryListPage from './features/stock/PhoneAccessoryListPage';
import ComputerAccessoryListPage from './features/stock/ComputerAccessoryListPage';
import StockReportPage from './features/stock/StockReportPage';
import BroadcastPage from './features/broadcast/BroadcastPage';
import ReportsPage from './features/reports/ReportsPage';
import VehicleInsurancePage from './features/vehicle-insurance/VehicleInsurancePage';
import ExpenseListPage from './features/expenses/ExpenseListPage';
import SalesPage from './features/sales/SalesPage';
import BillingPage from './features/billing/BillingPage';
import LMSPage from './features/lms/LMSPage';
import CustomReminderPage from './features/custom-reminders/CustomReminderPage';
import EmployeeListPage from './features/employees/EmployeeListPage';
import AttendancePage from './features/employees/AttendancePage';
import ServicesPage from './features/services/ServicesPage';
import AccountsPage from './features/accounts/AccountsPage';
import MaintenancePage from './features/maintenance/MaintenancePage';
import DeviceServicePage from './features/device-service/DeviceServicePage';
import AIAssistantPage from './features/ai-assistant/AIAssistantPage';

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
      { path: 'vehicle-insurance', element: <VehicleInsurancePage /> },
      { path: 'credits', element: <CreditListPage /> },
      { path: 'credits/new', element: <NewCreditPage /> },
      { path: 'credits/:id', element: <CreditDetailPage /> },
      { path: 'stock', element: <StockListPage /> },
      { path: 'stock/phone-accessories', element: <PhoneAccessoryListPage /> },
      { path: 'stock/computer-accessories', element: <ComputerAccessoryListPage /> },
      { path: 'stock/report', element: <StockReportPage /> },
      { path: 'sales', element: <SalesPage /> },
      { path: 'expenses', element: <ExpenseListPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'broadcast', element: <BroadcastPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'lms', element: <LMSPage /> },
      { path: 'my-reminders', element: <CustomReminderPage /> },
      { path: 'employees', element: <EmployeeListPage /> },
      { path: 'employees/:id/attendance', element: <AttendancePage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'maintenance', element: <MaintenancePage /> },
      { path: 'device-service', element: <DeviceServicePage /> },
      { path: 'ai-assistant', element: <AIAssistantPage /> },
    ],
  },
]);
