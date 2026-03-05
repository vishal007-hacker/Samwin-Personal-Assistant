import { useState, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Calendar,
  DollarSign,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate } from '../../lib/utils';
import { usePayments, useDeletePayment } from './paymentApi';

// ─── CSV Export Utility ─────────────────────────────────────────────────────

function exportToCSV(payments) {
  if (!payments || payments.length === 0) return;

  const headers = ['Date', 'Customer', 'Policy No', 'Amount', 'Method', 'Reference', 'Recorded By'];

  const rows = payments.map((p) => [
    formatDate(p.paymentDate),
    p.customer?.name || p.customerName || '-',
    p.policy?.policyNumber || p.policyNumber || '-',
    p.amount || 0,
    p.method?.replace('_', ' ') || '-',
    p.referenceNumber || '-',
    p.recordedBy?.name || p.recordedByName || '-',
  ]);

  const csvContent =
    [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payment-history-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PaymentHistoryPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const deleteMutation = useDeletePayment();

  const { data, isLoading, isError } = usePayments({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const payments = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const handleExport = () => {
    exportToCSV(payments);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Payment deleted');
      setDeleteId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <button
          onClick={handleExport}
          disabled={payments.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                placeholder="Start date"
                className="pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <span className="text-gray-400">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                placeholder="End date"
                className="pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {(startDate || endDate || searchTerm) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
                setPage(1);
              }}
              className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Loading payments...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-red-500">Failed to load payment history.</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No payment records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Policy No
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Recorded By
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {payment.customer?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {payment.policy?.policyNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                      {payment.method?.replace('_', ' ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payment.referenceNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {payment.recordedBy?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteId(payment._id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Payment</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this payment? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
