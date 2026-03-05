import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Download,
  BarChart3,
  FileText,
  Users,
  Building2,
} from 'lucide-react';
import api from '../../lib/axios';
import { formatDate, formatCurrency } from '../../lib/utils';

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

const TABS = [
  { key: 'premium', label: 'Premium Collection', icon: BarChart3 },
  { key: 'policy', label: 'Policy-wise', icon: FileText },
  { key: 'customer', label: 'Customer-wise', icon: Users },
  { key: 'scheme', label: 'Scheme-wise', icon: Building2 },
];

// ─── Reports Page ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('premium');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // ── Queries ──

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

  // ── Derived Data ──

  const premiumResult = premiumQuery.data?.data || {};
  const premiumData = premiumResult.report || [];
  const policyData = policyQuery.data?.data || [];
  const customerData = customerQuery.data?.data || [];
  const schemeData = schemeQuery.data?.data || [];

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
      default:
        break;
    }
  };

  // ── Loading / Error helpers ──

  const queryForTab = {
    premium: premiumQuery,
    policy: policyQuery,
    customer: customerQuery,
    scheme: schemeQuery,
  }[activeTab];

  const isLoading = queryForTab?.isLoading;
  const isError = queryForTab?.isError;
  const errorMessage = queryForTab?.error?.response?.data?.message || 'Failed to load report data';

  // ── Check if current tab has data for export ──
  const hasData = {
    premium: premiumData.length > 0,
    policy: policyData.length > 0,
    customer: customerData.length > 0,
    scheme: schemeData.length > 0,
  }[activeTab];

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

      {/* Date Range Filter */}
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Report tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
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
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-green-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Amount Collected</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(premiumSummary.totalAmount)}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {premiumSummary.totalPayments}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {premiumData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <BarChart3 className="mb-2 h-10 w-10 text-gray-300" />
                    <p className="text-sm">No collection data for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Total Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Payment Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {[...premiumData]
                          .sort((a, b) => {
                            const da = new Date(a._id || a.date);
                            const db = new Date(b._id || b.date);
                            return db - da;
                          })
                          .map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                {formatDate(row._id || row.date)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                {formatCurrency(row.totalAmount)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                {row.paymentCount || row.count || 0}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Policy-wise ── */}
          {activeTab === 'policy' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Policies</p>
                  <p className="text-2xl font-bold text-blue-700">{policySummary.count}</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Premium</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(policySummary.totalPremium)}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(policySummary.totalPaid)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {policyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <FileText className="mb-2 h-10 w-10 text-gray-300" />
                    <p className="text-sm">No policy data for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Policy Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Customer Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Premium Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Total Paid
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Payments
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Last Payment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {policyData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                              {row.policyNumber || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {row.customerName || row.customer?.name || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {formatCurrency(row.premiumAmount)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-700">
                              {formatCurrency(row.totalPaid)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {row.paymentCount || 0}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {formatDate(row.lastPaymentDate)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  row.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : row.status === 'matured'
                                    ? 'bg-blue-100 text-blue-800'
                                    : row.status === 'lapsed'
                                    ? 'bg-red-100 text-red-800'
                                    : row.status === 'surrendered'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {row.status
                                  ? row.status.charAt(0).toUpperCase() + row.status.slice(1)
                                  : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Customer-wise ── */}
          {activeTab === 'customer' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-blue-700">{customerSummary.count}</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Policies</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {customerSummary.totalPolicies}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(customerSummary.totalPaid)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {customerData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Users className="mb-2 h-10 w-10 text-gray-300" />
                    <p className="text-sm">No customer data available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Customer Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Phone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Policy Count
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Total Paid
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Payment Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {customerData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                              {row.customerName || row.name || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {row.phone || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {row.policyCount || 0}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-700">
                              {formatCurrency(row.totalPaid)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {row.paymentCount || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Scheme-wise ── */}
          {activeTab === 'scheme' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Policies</p>
                  <p className="text-2xl font-bold text-blue-700">{schemeSummary.totalPolicies}</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Sum Assured</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(schemeSummary.totalSumAssured)}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Total Premium</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(schemeSummary.totalPremium)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {schemeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Building2 className="mb-2 h-10 w-10 text-gray-300" />
                    <p className="text-sm">No scheme data available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Scheme Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Policy Count
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Total Sum Assured
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Total Premium
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {schemeData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                              {row.schemeName || row.name || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {row.type
                                ? row.type.charAt(0).toUpperCase() + row.type.slice(1)
                                : '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {row.company || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                              {row.policyCount || 0}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                              {formatCurrency(row.totalSumAssured)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-700">
                              {formatCurrency(row.totalPremium)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
