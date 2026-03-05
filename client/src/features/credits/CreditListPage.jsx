import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Loader2,
  Wallet,
  MessageCircle,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  Trash2,
  X,
  IndianRupee,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCredits, useTopupCredit, usePayCredit, useCloseCredit, useDeleteCredit } from './creditApi';
import { formatDate, formatCurrency, getDaysUntil, generateWhatsAppLink } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../auth/AuthContext';

// ── Status Badge ─────────────────────────────────────────────────────────────

function CreditStatusBadge({ credit }) {
  if (credit.status === 'closed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
        Closed
      </span>
    );
  }
  const daysUntil = getDaysUntil(credit.dueDate);
  if (daysUntil !== null && daysUntil < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        {Math.abs(daysUntil)}d overdue
      </span>
    );
  }
  if (daysUntil !== null && daysUntil <= 7) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
        {daysUntil}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
      Open
    </span>
  );
}

// ── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Topup Modal ──────────────────────────────────────────────────────────────

function TopupModal({ credit, onClose }) {
  const topupMutation = useTopupCredit();
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await topupMutation.mutateAsync({ id: credit._id, amount: Number(amount), dueDate, notes });
      toast.success('Credit topped up!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title="Top-up Credit" onClose={onClose}>
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
        <p className="text-gray-600">
          <span className="font-medium text-gray-800">{credit.customer?.name}</span>
          {' '}- Current balance: {formatCurrency(credit.balanceAmount)}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={topupMutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {topupMutation.isPending ? 'Saving...' : 'Top-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ credit, onClose }) {
  const payMutation = usePayCredit();
  const [amount, setAmount] = useState(credit.balanceAmount || '');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await payMutation.mutateAsync({ id: credit._id, amount: Number(amount), notes });
      toast.success(Number(amount) >= credit.balanceAmount ? 'Credit closed!' : 'Payment recorded!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title="Record Payment" onClose={onClose}>
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
        <p className="text-gray-600">
          <span className="font-medium text-gray-800">{credit.customer?.name}</span>
          {' '}- Balance: {formatCurrency(credit.balanceAmount)}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            max={credit.balanceAmount}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Max: {formatCurrency(credit.balanceAmount)}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={payMutation.isPending} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors">
            {payMutation.isPending ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CreditListPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Selection for bulk WhatsApp
  const [selected, setSelected] = useState(new Set());

  // Modals
  const [topupItem, setTopupItem] = useState(null);
  const [payItem, setPayItem] = useState(null);

  const closeMutation = useCloseCredit();
  const deleteMutation = useDeleteCredit();

  const statusParam = filter === 'all' ? undefined : filter;
  const { data, isLoading } = useCredits({
    page,
    limit: 50,
    status: statusParam,
    search: debouncedSearch || undefined,
  });

  const credits = data?.data || [];
  const pagination = data?.pagination || {};

  // Selection helpers
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === credits.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(credits.map((c) => c._id)));
    }
  };

  // Bulk WhatsApp
  const handleBulkWhatsApp = () => {
    const selectedCredits = credits.filter((c) => selected.has(c._id));
    if (selectedCredits.length === 0) {
      toast.error('Select at least one credit');
      return;
    }

    selectedCredits.forEach((credit, index) => {
      const phone = credit.customer?.phone;
      if (!phone) return;

      const name = credit.customer?.name || 'Customer';
      const dueDate = credit.dueDate ? new Date(credit.dueDate).toLocaleDateString('en-IN') : 'N/A';
      const message = `Dear ${name},\n\nThis is a reminder about your credit of ${formatCurrency(credit.balanceAmount)} (Reason: ${credit.reason}) which was due on ${dueDate}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\nSamwin Infotech`;

      const link = generateWhatsAppLink(phone, message);
      setTimeout(() => window.open(link, '_blank'), index * 800);
    });

    toast.success(`Opening WhatsApp for ${selectedCredits.length} customer(s)...`);
  };

  // Single WhatsApp
  const handleWhatsApp = (credit) => {
    const phone = credit.customer?.phone;
    if (!phone) { toast.error('No phone number'); return; }

    const name = credit.customer?.name || 'Customer';
    const dueDate = credit.dueDate ? new Date(credit.dueDate).toLocaleDateString('en-IN') : 'N/A';
    const message = `Dear ${name},\n\nThis is a reminder about your credit of ${formatCurrency(credit.balanceAmount)} (Reason: ${credit.reason}) which was due on ${dueDate}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\nSamwin Infotech`;

    window.open(generateWhatsAppLink(phone, message), '_blank');
  };

  const handleClose = async (credit) => {
    if (!confirm(`Close credit for ${credit.customer?.name}? Remaining balance of ${formatCurrency(credit.balanceAmount)} will be written off.`)) return;
    try {
      await closeMutation.mutateAsync(credit._id);
      toast.success('Credit closed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (credit) => {
    if (!confirm(`Delete credit for ${credit.customer?.name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(credit._id);
      toast.success('Credit deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer credits and collections</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp ({selected.size})
            </button>
          )}
          <Link
            to="/credits/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Credit
          </Link>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(1); setSelected(new Set()); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                filter === key
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customer, phone, reason..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : credits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Wallet className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No credits found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={credits.length > 0 && selected.size === credits.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {credits.map((credit) => (
                  <tr key={credit._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(credit._id)}
                        onChange={() => toggleSelect(credit._id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link
                        to={`/credits/${credit._id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {credit.customer?.name || '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {credit.customer?.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                      {credit.reason}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatCurrency(credit.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(credit.balanceAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(credit.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <CreditStatusBadge credit={credit} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/credits/${credit._id}`}
                          title="View Details"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {credit.status === 'open' && (
                          <>
                            <button
                              onClick={() => setPayItem(credit)}
                              title="Collect Payment"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              Collect
                            </button>
                            <button
                              onClick={() => setTopupItem(credit)}
                              title="Top-up"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleClose(credit)}
                              title="Close Credit"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleWhatsApp(credit)}
                              title="WhatsApp"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(credit)}
                            title="Delete"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} credits)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {topupItem && <TopupModal credit={topupItem} onClose={() => setTopupItem(null)} />}
      {payItem && <PaymentModal credit={payItem} onClose={() => setPayItem(null)} />}
    </div>
  );
}
