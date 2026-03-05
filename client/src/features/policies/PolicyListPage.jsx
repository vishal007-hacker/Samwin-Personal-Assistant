import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate, statusColors, frequencyLabel } from '../../lib/utils';
import { usePolicies, useDeletePolicy } from './policyApi';

export default function PolicyListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const deleteMutation = useDeletePolicy();

  const { data, isLoading, isError } = usePolicies({
    page,
    limit: 15,
    status: status || undefined,
    search: debouncedSearch || undefined,
  });

  const policies = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Policy deleted');
      setDeleteId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
        <Link
          to="/policies/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Policy
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none sm:w-48"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="matured">Matured</option>
            <option value="lapsed">Lapsed</option>
            <option value="surrendered">Surrendered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by policy number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Loading policies...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-red-500">Failed to load policies.</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No policies found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy Number</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheme</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Premium</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Due</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {policies.map((policy) => (
                  <tr key={policy._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{policy.policyNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{policy.customer?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{policy.scheme?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(policy.premiumAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{frequencyLabel[policy.premiumFrequency] || policy.premiumFrequency}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(policy.nextDueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[policy.status] || 'bg-gray-100 text-gray-800'}`}>
                        {policy.status?.charAt(0).toUpperCase() + policy.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/policies/${policy._id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/policies/${policy._id}`}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(policy._id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Policy</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this policy? This action cannot be undone.</p>
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
