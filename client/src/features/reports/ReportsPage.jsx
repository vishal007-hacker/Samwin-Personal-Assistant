import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Download,
  BarChart3,
  FileText,
  Users,
  Building2,
  Car,
  Smartphone,
  ShoppingBag,
  Receipt,
  Wallet,
  GraduationCap,
  UserCheck,
  CalendarCheck,
} from 'lucide-react';
import api from '../../lib/axios';
import { formatDate, formatCurrency } from '../../lib/utils';
import { useStocks } from '../stock/stockApi';
import { useSales } from '../sales/salesApi';
import { useExpenses } from '../expenses/expenseApi';
import { useBillings } from '../billing/billingApi';
import { useVehicleInsurances } from '../vehicle-insurance/vehicleInsuranceApi';
import { useCredits } from '../credits/creditApi';
import { useAllEmployees } from '../employees/employeeApi';
import { useAttendance } from '../employees/attendanceApi';
import { useLMSEntries } from '../lms/lmsApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
}

function exportCSV(filename, headers, rows) {
  const escape = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Tab Definitions ────────────────────────────────────────────────────────

const TAB_GROUPS = [
  {
    label: 'Insurance',
    tabs: [
      { key: 'premium', label: 'Premium Collection', icon: BarChart3, dateRange: true },
      { key: 'policy', label: 'Policy-wise', icon: FileText, dateRange: true },
      { key: 'customer', label: 'Customer-wise', icon: Users },
      { key: 'scheme', label: 'Scheme-wise', icon: Building2 },
      { key: 'vehicle', label: 'Vehicle Insurance', icon: Car },
    ],
  },
  {
    label: 'Sales & Inventory',
    tabs: [
      { key: 'stock', label: 'Stock', icon: Smartphone },
      { key: 'sales', label: 'Sales', icon: ShoppingBag, dateRange: true },
      { key: 'billing', label: 'Billing', icon: FileText, dateRange: true },
    ],
  },
  {
    label: 'Finance',
    tabs: [
      { key: 'credit', label: 'Credit', icon: Wallet },
      { key: 'expense', label: 'Expenses', icon: Receipt, dateRange: true },
    ],
  },
  {
    label: 'People',
    tabs: [
      { key: 'employee', label: 'Employees', icon: UserCheck },
      { key: 'attendance', label: 'Attendance', icon: CalendarCheck, dateRange: true },
    ],
  },
  {
    label: 'Other',
    tabs: [
      { key: 'lms', label: 'LMS', icon: GraduationCap },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap((g) => g.tabs);
const TAB_BY_KEY = Object.fromEntries(ALL_TABS.map((t) => [t.key, t]));

// ─── Reusable UI ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    gray: 'bg-gray-50 text-gray-700',
  };
  const bg = colorMap[color]?.split(' ')[0] || 'bg-blue-50';
  const text = colorMap[color]?.split(' ')[1] || 'text-blue-700';
  return (
    <div className={`rounded-lg ${bg} p-5`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <Icon className="mb-2 h-10 w-10 text-gray-300" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function DataTable({ columns, rows, emptyIcon, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <EmptyState icon={emptyIcon} message={emptyMessage} />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-6 py-3 text-${c.align || 'left'} text-xs font-medium uppercase tracking-wider text-gray-500`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                {columns.map((c, i) => (
                  <td
                    key={i}
                    className={`whitespace-nowrap px-6 py-4 text-sm ${c.cellClass || 'text-gray-900'}`}
                  >
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports Page ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('premium');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const tabConfig = TAB_BY_KEY[activeTab];
  const showDateRange = !!tabConfig?.dateRange;

  // ── Insurance queries ──
  const premiumQuery = useQuery({
    queryKey: ['reports', 'premium-collection', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/premium-collection', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      return data;
    },
    enabled: activeTab === 'premium',
  });

  const policyQuery = useQuery({
    queryKey: ['reports', 'policy-wise', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/policy-wise', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      return data;
    },
    enabled: activeTab === 'policy',
  });

  const customerQuery = useQuery({
    queryKey: ['reports', 'customer-wise'],
    queryFn: async () => {
      const { data } = await api.get('/reports/customer-wise');
      return data;
    },
    enabled: activeTab === 'customer',
  });

  const schemeQuery = useQuery({
    queryKey: ['reports', 'scheme-wise'],
    queryFn: async () => {
      const { data } = await api.get('/reports/scheme-wise');
      return data;
    },
    enabled: activeTab === 'scheme',
  });

  // ── Module queries (gated by activeTab to avoid waste) ──
  const vehicleQuery = useVehicleInsurances();
  const stockQuery = useStocks();
  const salesQuery = useSales(
    showDateRange && activeTab === 'sales'
      ? { from: dateRange.startDate, to: dateRange.endDate }
      : {}
  );
  const expenseQuery = useExpenses(
    showDateRange && activeTab === 'expense'
      ? { from: dateRange.startDate, to: dateRange.endDate }
      : {}
  );
  const billingQuery = useBillings(
    showDateRange && activeTab === 'billing'
      ? { from: dateRange.startDate, to: dateRange.endDate }
      : {}
  );
  const creditQuery = useCredits();
  const employeeQuery = useAllEmployees();
  const attendanceQuery = useAttendance(
    activeTab === 'attendance'
      ? { from: dateRange.startDate, to: dateRange.endDate }
      : {}
  );
  const lmsQuery = useLMSEntries();

  // ── Derived Data ──
  const premiumResult = premiumQuery.data?.data || {};
  const premiumData = premiumResult.report || [];
  const policyData = policyQuery.data?.data || [];
  const customerData = customerQuery.data?.data || [];
  const schemeData = schemeQuery.data?.data || [];
  const vehicleData = vehicleQuery.data?.data || [];
  const stockData = stockQuery.data?.data || stockQuery.data || [];
  const salesData = salesQuery.data?.data || salesQuery.data || [];
  const expenseData = expenseQuery.data?.data || expenseQuery.data || [];
  const billingData = billingQuery.data?.data || billingQuery.data || [];
  const creditData = creditQuery.data?.data || creditQuery.data || [];
  const employeeData = employeeQuery.data?.data || employeeQuery.data || [];
  const attendanceData = attendanceQuery.data?.data || [];
  const lmsData = lmsQuery.data?.data || lmsQuery.data || [];

  // ── Summaries ──
  const premiumSummary = useMemo(() => {
    if (premiumResult.summary) return premiumResult.summary;
    const totalAmount = premiumData.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const totalPayments = premiumData.reduce((s, r) => s + (r.paymentCount || r.count || 0), 0);
    return { totalAmount, totalPayments };
  }, [premiumData, premiumResult.summary]);

  const policySummary = useMemo(() => {
    const totalPaid = policyData.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const totalPremium = policyData.reduce((s, r) => s + (r.premiumAmount || 0), 0);
    return { totalPaid, totalPremium, count: policyData.length };
  }, [policyData]);

  const customerSummary = useMemo(() => {
    const totalPaid = customerData.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const totalPolicies = customerData.reduce((s, r) => s + (r.policyCount || 0), 0);
    return { totalPaid, totalPolicies, count: customerData.length };
  }, [customerData]);

  const schemeSummary = useMemo(() => {
    const totalSumAssured = schemeData.reduce((s, r) => s + (r.totalSumAssured || 0), 0);
    const totalPremium = schemeData.reduce((s, r) => s + (r.totalPremium || 0), 0);
    const totalPolicies = schemeData.reduce((s, r) => s + (r.policyCount || 0), 0);
    return { totalSumAssured, totalPremium, totalPolicies };
  }, [schemeData]);

  const vehicleSummary = useMemo(() => {
    const total = vehicleData.length;
    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);
    let active = 0, expired = 0, expiringSoon = 0;
    vehicleData.forEach((r) => {
      const exp = r.policyExpiryDate ? new Date(r.policyExpiryDate) : null;
      if (r.status === 'expired' || (exp && exp < today)) expired += 1;
      else {
        active += 1;
        if (exp && exp <= in30) expiringSoon += 1;
      }
    });
    return { total, active, expired, expiringSoon };
  }, [vehicleData]);

  const stockSummary = useMemo(() => {
    const total = stockData.length;
    const inStock = stockData.filter((s) => s.status === 'in_stock').length;
    const sold = stockData.filter((s) => s.status === 'sold').length;
    const purchaseValue = stockData
      .filter((s) => s.status === 'in_stock')
      .reduce((sum, s) => sum + (s.purchasePrice || 0), 0);
    const sellingValue = stockData
      .filter((s) => s.status === 'in_stock')
      .reduce((sum, s) => sum + (s.sellingPrice || 0), 0);
    const revenue = stockData
      .filter((s) => s.status === 'sold')
      .reduce((sum, s) => sum + (s.soldTo?.finalPrice || s.sellingPrice || 0), 0);
    return { total, inStock, sold, purchaseValue, sellingValue, revenue };
  }, [stockData]);

  const salesSummary = useMemo(() => {
    const totalAmount = salesData.reduce((s, r) => s + (r.amount || 0), 0);
    const totalQty = salesData.reduce((s, r) => s + (r.quantity || 0), 0);
    return { totalAmount, totalQty, count: salesData.length };
  }, [salesData]);

  const expenseSummary = useMemo(() => {
    const totalAmount = expenseData.reduce((s, r) => s + (r.amount || 0), 0);
    const byCategory = expenseData.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + (r.amount || 0);
      return acc;
    }, {});
    return { totalAmount, count: expenseData.length, byCategory };
  }, [expenseData]);

  const billingSummary = useMemo(() => {
    const totalAmount = billingData.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const counts = billingData.reduce(
      (acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      },
      { invoice: 0, quotation: 0, receipt: 0 }
    );
    return { totalAmount, count: billingData.length, ...counts };
  }, [billingData]);

  const creditSummary = useMemo(() => {
    const totalIssued = creditData.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const outstanding = creditData.reduce((s, r) => s + (r.balanceAmount || 0), 0);
    const open = creditData.filter((r) => r.status === 'open').length;
    const closed = creditData.filter((r) => r.status === 'closed').length;
    return { totalIssued, outstanding, open, closed, count: creditData.length };
  }, [creditData]);

  const employeeSummary = useMemo(() => {
    const total = employeeData.length;
    const active = employeeData.filter((e) => e.isActive).length;
    const totalSalary = employeeData
      .filter((e) => e.isActive)
      .reduce((s, e) => s + (e.salary || 0), 0);
    return { total, active, inactive: total - active, totalSalary };
  }, [employeeData]);

  const attendanceSummary = useMemo(() => {
    const counts = { present: 0, absent: 0, 'half-day': 0, leave: 0 };
    attendanceData.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    const totalExpenses = attendanceData.reduce((s, r) => s + (r.expenses || 0), 0);
    return { ...counts, totalExpenses, total: attendanceData.length };
  }, [attendanceData]);

  // ── CSV Export Handlers ──
  const handleExport = () => {
    switch (activeTab) {
      case 'premium':
        exportCSV(
          'premium-collection.csv',
          ['Date', 'Total Amount', 'Payment Count'],
          premiumData.map((r) => [
            formatDate(r._id || r.date),
            r.totalAmount || 0,
            r.paymentCount || r.count || 0,
          ])
        );
        break;
      case 'policy':
        exportCSV(
          'policy-wise-report.csv',
          ['Policy Number', 'Customer Name', 'Premium Amount', 'Total Paid', 'Payment Count', 'Last Payment Date', 'Status'],
          policyData.map((r) => [
            r.policyNumber || '',
            r.customerName || r.customer?.name || '',
            r.premiumAmount || 0,
            r.totalPaid || 0,
            r.paymentCount || 0,
            formatDate(r.lastPaymentDate),
            r.status || '',
          ])
        );
        break;
      case 'customer':
        exportCSV(
          'customer-wise-report.csv',
          ['Customer Name', 'Phone', 'Policy Count', 'Total Paid', 'Payment Count'],
          customerData.map((r) => [
            r.customerName || r.name || '',
            r.phone || '',
            r.policyCount || 0,
            r.totalPaid || 0,
            r.paymentCount || 0,
          ])
        );
        break;
      case 'scheme':
        exportCSV(
          'scheme-wise-report.csv',
          ['Scheme Name', 'Type', 'Company', 'Policy Count', 'Total Sum Assured', 'Total Premium'],
          schemeData.map((r) => [
            r.schemeName || r.name || '',
            r.type || '',
            r.company || '',
            r.policyCount || 0,
            r.totalSumAssured || 0,
            r.totalPremium || 0,
          ])
        );
        break;
      case 'vehicle':
        exportCSV(
          'vehicle-insurance.csv',
          ['Customer', 'Vehicle No', 'Brand/Model', 'Insurance Type', 'Company', 'Policy No', 'Expiry', 'Status'],
          vehicleData.map((r) => [
            r.customer?.name || '',
            r.vehicleNumber || '',
            `${r.vehicleBrand || ''} ${r.model || ''}`.trim(),
            r.insuranceType || '',
            r.policyCompany || '',
            r.policyNumber || '',
            formatDate(r.policyExpiryDate),
            r.status || '',
          ])
        );
        break;
      case 'stock':
        exportCSV(
          'stock-report.csv',
          ['Code', 'Category', 'Brand', 'Model', 'Purchase Price', 'Selling Price', 'Status', 'Sold Date'],
          stockData.map((r) => [
            r.uniqueCode || '',
            r.category || '',
            r.brand || '',
            r.model || '',
            r.purchasePrice || 0,
            r.sellingPrice || 0,
            r.status || '',
            r.soldAt ? formatDate(r.soldAt) : '',
          ])
        );
        break;
      case 'sales':
        exportCSV(
          'sales-report.csv',
          ['Date', 'Category', 'Quantity', 'Unit Price', 'Amount', 'Customer', 'Payment Method'],
          salesData.map((r) => [
            formatDate(r.date),
            r.categoryName || '',
            r.quantity || 0,
            r.unitPrice || 0,
            r.amount || 0,
            r.customerName || '',
            r.paymentMethod || '',
          ])
        );
        break;
      case 'expense':
        exportCSV(
          'expense-report.csv',
          ['Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Notes'],
          expenseData.map((r) => [
            formatDate(r.date),
            r.title || '',
            r.category || '',
            r.amount || 0,
            r.paymentMethod || '',
            r.notes || '',
          ])
        );
        break;
      case 'billing':
        exportCSV(
          'billing-report.csv',
          ['Number', 'Type', 'Date', 'Customer', 'Phone', 'Subtotal', 'Total Amount'],
          billingData.map((r) => [
            r.number || '',
            r.type || '',
            formatDate(r.date),
            r.customer?.name || '',
            r.customer?.phone || '',
            r.subtotal || 0,
            r.totalAmount || 0,
          ])
        );
        break;
      case 'credit':
        exportCSV(
          'credit-report.csv',
          ['Customer', 'Reason', 'Total Amount', 'Balance', 'Due Date', 'Status'],
          creditData.map((r) => [
            r.customer?.name || '',
            r.reason || '',
            r.totalAmount || 0,
            r.balanceAmount || 0,
            formatDate(r.dueDate),
            r.status || '',
          ])
        );
        break;
      case 'employee':
        exportCSV(
          'employee-report.csv',
          ['Name', 'Phone', 'Designation', 'Salary', 'Date of Joining', 'Active'],
          employeeData.map((r) => [
            r.name || '',
            r.phone || '',
            r.designation || '',
            r.salary || 0,
            formatDate(r.dateOfJoining),
            r.isActive ? 'Yes' : 'No',
          ])
        );
        break;
      case 'attendance':
        exportCSV(
          'attendance-report.csv',
          ['Date', 'Employee', 'Status', 'Morning In', 'Afternoon Out', 'After Lunch In', 'Night Out', 'Expenses', 'Notes'],
          attendanceData.map((r) => [
            formatDate(r.date),
            r.employee?.name || '',
            r.status || '',
            r.morningIn || '',
            r.afternoonOut || '',
            r.afterLunchIn || '',
            r.nightOut || '',
            r.expenses || 0,
            r.notes || '',
          ])
        );
        break;
      case 'lms':
        exportCSV(
          'lms-report.csv',
          ['Title', 'Link', 'User ID', 'Message'],
          lmsData.map((r) => [r.title || '', r.link || '', r.userId || '', r.message || ''])
        );
        break;
      default:
        break;
    }
  };

  // ── Loading / data state per tab ──
  const QUERY_BY_TAB = {
    premium: premiumQuery,
    policy: policyQuery,
    customer: customerQuery,
    scheme: schemeQuery,
    vehicle: vehicleQuery,
    stock: stockQuery,
    sales: salesQuery,
    expense: expenseQuery,
    billing: billingQuery,
    credit: creditQuery,
    employee: employeeQuery,
    attendance: attendanceQuery,
    lms: lmsQuery,
  };
  const queryForTab = QUERY_BY_TAB[activeTab];
  const isLoading = queryForTab?.isLoading;
  const isError = queryForTab?.isError;
  const errorMessage = queryForTab?.error?.response?.data?.message || 'Failed to load report data';

  const DATA_BY_TAB = {
    premium: premiumData,
    policy: policyData,
    customer: customerData,
    scheme: schemeData,
    vehicle: vehicleData,
    stock: stockData,
    sales: salesData,
    expense: expenseData,
    billing: billingData,
    credit: creditData,
    employee: employeeData,
    attendance: attendanceData,
    lms: lmsData,
  };
  const hasData = (DATA_BY_TAB[activeTab] || []).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={handleExport}
          disabled={!hasData || isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Date Range Filter (only when applicable) */}
      {showDateRange && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Grouped Tabs */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm space-y-3">
        {TAB_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="text-sm text-red-500">{errorMessage}</p>
        </div>
      ) : (
        <>
          {/* ── Premium Collection ── */}
          {activeTab === 'premium' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SummaryCard label="Total Amount Collected" value={formatCurrency(premiumSummary.totalAmount)} color="green" />
                <SummaryCard label="Total Payments" value={premiumSummary.totalPayments} color="blue" />
              </div>
              <DataTable
                emptyIcon={BarChart3}
                emptyMessage="No collection data for this period"
                columns={[
                  { label: 'Date', render: (r) => formatDate(r._id || r.date) },
                  { label: 'Total Amount', render: (r) => formatCurrency(r.totalAmount), cellClass: 'font-medium text-gray-900' },
                  { label: 'Payment Count', render: (r) => r.paymentCount || r.count || 0, cellClass: 'text-gray-600' },
                ]}
                rows={[...premiumData].sort((a, b) => new Date(b._id || b.date) - new Date(a._id || a.date))}
              />
            </div>
          )}

          {/* ── Policy-wise ── */}
          {activeTab === 'policy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryCard label="Total Policies" value={policySummary.count} color="blue" />
                <SummaryCard label="Total Premium" value={formatCurrency(policySummary.totalPremium)} color="purple" />
                <SummaryCard label="Total Paid" value={formatCurrency(policySummary.totalPaid)} color="green" />
              </div>
              <DataTable
                emptyIcon={FileText}
                emptyMessage="No policy data for this period"
                columns={[
                  { label: 'Policy Number', render: (r) => r.policyNumber || '-', cellClass: 'font-medium text-blue-600' },
                  { label: 'Customer', render: (r) => r.customerName || r.customer?.name || '-' },
                  { label: 'Premium', render: (r) => formatCurrency(r.premiumAmount) },
                  { label: 'Paid', render: (r) => formatCurrency(r.totalPaid), cellClass: 'font-medium text-green-700' },
                  { label: 'Payments', render: (r) => r.paymentCount || 0, cellClass: 'text-gray-600' },
                  { label: 'Last Payment', render: (r) => formatDate(r.lastPaymentDate), cellClass: 'text-gray-600' },
                  {
                    label: 'Status',
                    render: (r) => (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'active' ? 'bg-green-100 text-green-800' :
                        r.status === 'matured' ? 'bg-blue-100 text-blue-800' :
                        r.status === 'lapsed' ? 'bg-red-100 text-red-800' :
                        r.status === 'surrendered' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : '-'}
                      </span>
                    ),
                  },
                ]}
                rows={policyData}
              />
            </div>
          )}

          {/* ── Customer-wise ── */}
          {activeTab === 'customer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryCard label="Total Customers" value={customerSummary.count} color="blue" />
                <SummaryCard label="Total Policies" value={customerSummary.totalPolicies} color="purple" />
                <SummaryCard label="Total Paid" value={formatCurrency(customerSummary.totalPaid)} color="green" />
              </div>
              <DataTable
                emptyIcon={Users}
                emptyMessage="No customer data available"
                columns={[
                  { label: 'Customer', render: (r) => r.customerName || r.name || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Phone', render: (r) => r.phone || '-', cellClass: 'text-gray-600' },
                  { label: 'Policy Count', render: (r) => r.policyCount || 0, cellClass: 'text-gray-600' },
                  { label: 'Total Paid', render: (r) => formatCurrency(r.totalPaid), cellClass: 'font-medium text-green-700' },
                  { label: 'Payment Count', render: (r) => r.paymentCount || 0, cellClass: 'text-gray-600' },
                ]}
                rows={customerData}
              />
            </div>
          )}

          {/* ── Scheme-wise ── */}
          {activeTab === 'scheme' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryCard label="Total Policies" value={schemeSummary.totalPolicies} color="blue" />
                <SummaryCard label="Total Sum Assured" value={formatCurrency(schemeSummary.totalSumAssured)} color="purple" />
                <SummaryCard label="Total Premium" value={formatCurrency(schemeSummary.totalPremium)} color="green" />
              </div>
              <DataTable
                emptyIcon={Building2}
                emptyMessage="No scheme data available"
                columns={[
                  { label: 'Scheme', render: (r) => r.schemeName || r.name || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Type', render: (r) => (r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : '-'), cellClass: 'text-gray-600' },
                  { label: 'Company', render: (r) => r.company || '-', cellClass: 'text-gray-600' },
                  { label: 'Policies', render: (r) => r.policyCount || 0, cellClass: 'text-gray-600' },
                  { label: 'Sum Assured', render: (r) => formatCurrency(r.totalSumAssured) },
                  { label: 'Premium', render: (r) => formatCurrency(r.totalPremium), cellClass: 'font-medium text-green-700' },
                ]}
                rows={schemeData}
              />
            </div>
          )}

          {/* ── Vehicle Insurance ── */}
          {activeTab === 'vehicle' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SummaryCard label="Total Policies" value={vehicleSummary.total} color="blue" />
                <SummaryCard label="Active" value={vehicleSummary.active} color="green" />
                <SummaryCard label="Expiring (30 days)" value={vehicleSummary.expiringSoon} color="amber" />
                <SummaryCard label="Expired" value={vehicleSummary.expired} color="red" />
              </div>
              <DataTable
                emptyIcon={Car}
                emptyMessage="No vehicle insurance records"
                columns={[
                  { label: 'Customer', render: (r) => r.customer?.name || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Vehicle No', render: (r) => r.vehicleNumber || '-', cellClass: 'font-mono text-gray-700' },
                  { label: 'Brand / Model', render: (r) => `${r.vehicleBrand || ''} ${r.model || ''}`.trim() || '-' },
                  { label: 'Type', render: (r) => r.insuranceType || '-', cellClass: 'text-gray-600' },
                  { label: 'Company', render: (r) => r.policyCompany || '-', cellClass: 'text-gray-600' },
                  { label: 'Policy No', render: (r) => r.policyNumber || '-', cellClass: 'text-blue-600' },
                  { label: 'Expiry', render: (r) => formatDate(r.policyExpiryDate) },
                  {
                    label: 'Status',
                    render: (r) => (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'active' ? 'bg-green-100 text-green-800' :
                        r.status === 'expired' ? 'bg-red-100 text-red-800' :
                        r.status === 'renewed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : '-'}
                      </span>
                    ),
                  },
                ]}
                rows={vehicleData}
              />
            </div>
          )}

          {/* ── Stock ── */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <SummaryCard label="Total Items" value={stockSummary.total} color="blue" />
                <SummaryCard label="In Stock" value={stockSummary.inStock} color="green" />
                <SummaryCard label="Sold" value={stockSummary.sold} color="purple" />
                <SummaryCard label="Stock Cost" value={formatCurrency(stockSummary.purchaseValue)} color="amber" />
                <SummaryCard label="Stock Value" value={formatCurrency(stockSummary.sellingValue)} color="indigo" />
                <SummaryCard label="Sales Revenue" value={formatCurrency(stockSummary.revenue)} color="green" />
              </div>
              <DataTable
                emptyIcon={Smartphone}
                emptyMessage="No stock items"
                columns={[
                  { label: 'Code', render: (r) => r.uniqueCode || '-', cellClass: 'font-mono text-gray-700' },
                  { label: 'Category', render: (r) => (r.category || '').replace('_', ' '), cellClass: 'text-gray-600 capitalize' },
                  { label: 'Brand', render: (r) => r.brand || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Model', render: (r) => r.model || '-', cellClass: 'text-gray-700' },
                  { label: 'Purchase', render: (r) => formatCurrency(r.purchasePrice), cellClass: 'text-gray-600' },
                  { label: 'Selling', render: (r) => formatCurrency(r.sellingPrice), cellClass: 'font-medium text-gray-900' },
                  {
                    label: 'Status',
                    render: (r) => (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'in_stock' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {r.status === 'in_stock' ? 'In Stock' : 'Sold'}
                      </span>
                    ),
                  },
                  { label: 'Sold On', render: (r) => (r.soldAt ? formatDate(r.soldAt) : '-'), cellClass: 'text-gray-600' },
                ]}
                rows={stockData}
              />
            </div>
          )}

          {/* ── Sales ── */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryCard label="Total Sales" value={salesSummary.count} color="blue" />
                <SummaryCard label="Total Quantity" value={salesSummary.totalQty} color="purple" />
                <SummaryCard label="Total Amount" value={formatCurrency(salesSummary.totalAmount)} color="green" />
              </div>
              <DataTable
                emptyIcon={ShoppingBag}
                emptyMessage="No sales for this period"
                columns={[
                  { label: 'Date', render: (r) => formatDate(r.date) },
                  { label: 'Category', render: (r) => r.categoryName || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Qty', render: (r) => r.quantity || 0, cellClass: 'text-gray-600' },
                  { label: 'Unit Price', render: (r) => formatCurrency(r.unitPrice), cellClass: 'text-gray-600' },
                  { label: 'Amount', render: (r) => formatCurrency(r.amount), cellClass: 'font-medium text-green-700' },
                  { label: 'Customer', render: (r) => r.customerName || '-', cellClass: 'text-gray-600' },
                  { label: 'Method', render: (r) => (r.paymentMethod || '').replace('_', ' '), cellClass: 'text-gray-600 capitalize' },
                ]}
                rows={salesData}
              />
            </div>
          )}

          {/* ── Billing ── */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SummaryCard label="Total Documents" value={billingSummary.count} color="blue" />
                <SummaryCard label="Invoices" value={billingSummary.invoice} color="green" />
                <SummaryCard label="Quotations" value={billingSummary.quotation} color="amber" />
                <SummaryCard label="Total Amount" value={formatCurrency(billingSummary.totalAmount)} color="purple" />
              </div>
              <DataTable
                emptyIcon={FileText}
                emptyMessage="No billing documents for this period"
                columns={[
                  { label: 'Number', render: (r) => r.number || '-', cellClass: 'font-mono font-medium text-blue-600' },
                  {
                    label: 'Type',
                    render: (r) => (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.type === 'invoice' ? 'bg-green-100 text-green-800' :
                        r.type === 'quotation' ? 'bg-amber-100 text-amber-800' :
                        r.type === 'receipt' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : '-'}
                      </span>
                    ),
                  },
                  { label: 'Date', render: (r) => formatDate(r.date) },
                  { label: 'Customer', render: (r) => r.customer?.name || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Phone', render: (r) => r.customer?.phone || '-', cellClass: 'text-gray-600' },
                  { label: 'Subtotal', render: (r) => formatCurrency(r.subtotal), cellClass: 'text-gray-600' },
                  { label: 'Total', render: (r) => formatCurrency(r.totalAmount), cellClass: 'font-medium text-green-700' },
                ]}
                rows={billingData}
              />
            </div>
          )}

          {/* ── Credit ── */}
          {activeTab === 'credit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SummaryCard label="Total Credits" value={creditSummary.count} color="blue" />
                <SummaryCard label="Open" value={creditSummary.open} color="amber" />
                <SummaryCard label="Closed" value={creditSummary.closed} color="green" />
                <SummaryCard label="Outstanding" value={formatCurrency(creditSummary.outstanding)} color="red" />
              </div>
              <DataTable
                emptyIcon={Wallet}
                emptyMessage="No credit records"
                columns={[
                  { label: 'Customer', render: (r) => r.customer?.name || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Reason', render: (r) => r.reason || '-', cellClass: 'text-gray-700' },
                  { label: 'Total', render: (r) => formatCurrency(r.totalAmount), cellClass: 'text-gray-600' },
                  { label: 'Balance', render: (r) => formatCurrency(r.balanceAmount), cellClass: 'font-medium text-red-700' },
                  { label: 'Due Date', render: (r) => formatDate(r.dueDate) },
                  {
                    label: 'Status',
                    render: (r) => (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'open' ? 'bg-amber-100 text-amber-800' :
                        r.status === 'closed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : '-'}
                      </span>
                    ),
                  },
                ]}
                rows={creditData}
              />
            </div>
          )}

          {/* ── Employees ── */}
          {activeTab === 'employee' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SummaryCard label="Total Employees" value={employeeSummary.total} color="blue" />
                <SummaryCard label="Active" value={employeeSummary.active} color="green" />
                <SummaryCard label="Inactive" value={employeeSummary.inactive} color="gray" />
                <SummaryCard label="Total Salary" value={formatCurrency(employeeSummary.totalSalary)} color="purple" />
              </div>
              <DataTable
                emptyIcon={UserCheck}
                emptyMessage="No employees"
                columns={[
                  { label: 'Name', render: (r) => r.name || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Phone', render: (r) => r.phone || '-', cellClass: 'text-gray-600' },
                  { label: 'Designation', render: (r) => r.designation || '-', cellClass: 'text-gray-700' },
                  { label: 'Salary', render: (r) => formatCurrency(r.salary), cellClass: 'font-medium text-gray-900' },
                  { label: 'Joined', render: (r) => formatDate(r.dateOfJoining), cellClass: 'text-gray-600' },
                  {
                    label: 'Status',
                    render: (r) => (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    ),
                  },
                ]}
                rows={employeeData}
              />
            </div>
          )}

          {/* ── Attendance ── */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <SummaryCard label="Total Records" value={attendanceSummary.total} color="blue" />
                <SummaryCard label="Present" value={attendanceSummary.present} color="green" />
                <SummaryCard label="Half Day" value={attendanceSummary['half-day']} color="amber" />
                <SummaryCard label="Absent / Leave" value={attendanceSummary.absent + attendanceSummary.leave} color="red" />
                <SummaryCard label="Total Expenses" value={formatCurrency(attendanceSummary.totalExpenses)} color="purple" />
              </div>
              <DataTable
                emptyIcon={CalendarCheck}
                emptyMessage="No attendance records for this period"
                columns={[
                  { label: 'Date', render: (r) => formatDate(r.date) },
                  { label: 'Employee', render: (r) => r.employee?.name || '-', cellClass: 'font-medium text-gray-900' },
                  {
                    label: 'Status',
                    render: (r) => (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'present' ? 'bg-green-100 text-green-800' :
                        r.status === 'half-day' ? 'bg-amber-100 text-amber-800' :
                        r.status === 'absent' ? 'bg-red-100 text-red-800' :
                        r.status === 'leave' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : '-'}
                      </span>
                    ),
                  },
                  { label: 'Morning', render: (r) => r.morningIn || '-', cellClass: 'font-mono text-gray-600' },
                  { label: 'Afternoon Out', render: (r) => r.afternoonOut || '-', cellClass: 'font-mono text-gray-600' },
                  { label: 'After Lunch', render: (r) => r.afterLunchIn || '-', cellClass: 'font-mono text-gray-600' },
                  { label: 'Night Out', render: (r) => r.nightOut || '-', cellClass: 'font-mono text-gray-600' },
                  { label: 'Expenses', render: (r) => (r.expenses ? formatCurrency(r.expenses) : '-'), cellClass: 'text-gray-600' },
                ]}
                rows={attendanceData}
              />
            </div>
          )}

          {/* ── LMS ── */}
          {activeTab === 'lms' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SummaryCard label="Total Entries" value={lmsData.length} color="blue" />
                <SummaryCard label="With Links" value={lmsData.filter((r) => r.link).length} color="purple" />
              </div>
              <DataTable
                emptyIcon={GraduationCap}
                emptyMessage="No LMS entries"
                columns={[
                  { label: 'Title', render: (r) => r.title || '-', cellClass: 'font-medium text-gray-900' },
                  { label: 'Link', render: (r) => r.link || '-', cellClass: 'text-blue-600 truncate max-w-xs' },
                  { label: 'User ID', render: (r) => r.userId || '-', cellClass: 'text-gray-600' },
                  { label: 'Notes', render: (r) => r.message || '-', cellClass: 'text-gray-600' },
                ]}
                rows={lmsData}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
