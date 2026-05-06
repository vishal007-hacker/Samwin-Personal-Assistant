import { useState } from 'react';
import {
  Search, Plus, Loader2, Receipt, X, Edit3, Trash2, Filter, IndianRupee,
  TrendingUp, Calendar, CreditCard, Tags,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useExpenses, useExpenseCategories, useExpenseSummary, useCreateExpense, useUpdateExpense, useDeleteExpense, useCreateExpenseCategory } from './expenseApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate } from '../../lib/utils';

const DEFAULT_CATEGORIES = [
  'Rent', 'Salaries', 'Electricity', 'Internet', 'Phone Recharge',
  'Office Supplies', 'Travel', 'Food', 'Maintenance', 'Marketing',
  'Insurance', 'Taxes', 'Miscellaneous',
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
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

// ── Custom Category Modal ───────────────────────────────────────────────────

function CustomCategoryModal({ onClose, onCreated }) {
  const createCategoryMutation = useCreateExpenseCategory();
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter a category name');
    try {
      await createCategoryMutation.mutateAsync(name.trim());
      toast.success(`Category "${name.trim()}" created!`);
      if (onCreated) onCreated(name.trim());
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    }
  };

  return (
    <Modal title="Add Custom Category" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Transport, Software, Stationery"
            autoFocus
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">This category will be saved and available in all expense forms.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createCategoryMutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {createCategoryMutation.isPending ? 'Saving...' : 'Save Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Expense Form Modal ──────────────────────────────────────────────────────

function ExpenseFormModal({ expense, categories, onClose }) {
  const isEdit = !!expense;
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();

  const [form, setForm] = useState({
    title: expense?.title || '',
    amount: expense?.amount || '',
    category: expense?.category || '',
    date: expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    paymentMethod: expense?.paymentMethod || 'cash',
    notes: expense?.notes || '',
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const mutation = isEdit ? updateMutation : createMutation;

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...(categories || [])])].sort();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast.error('Please select a category');

    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (isEdit) {
        await mutation.mutateAsync({ id: expense._id, ...payload });
        toast.success('Expense updated!');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Expense added!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm';

  return (
    <>
      <Modal title={isEdit ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={set('title')} required placeholder="e.g. Office rent, Electricity bill" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input type="number" value={form.amount} onChange={set('amount')} required min="0" step="0.01" placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={set('date')} required className={inputCls} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Category *</label>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Custom
              </button>
            </div>
            <select value={form.category} onChange={set('category')} required className={inputCls + ' bg-white'}>
              <option value="">Select Category</option>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={form.paymentMethod} onChange={set('paymentMethod')} className={inputCls + ' bg-white'}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any additional notes..." className={inputCls + ' resize-none'} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>
      {showCategoryModal && (
        <CustomCategoryModal
          onClose={() => setShowCategoryModal(false)}
          onCreated={(catName) => setForm((f) => ({ ...f, category: catName }))}
        />
      )}
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ExpenseListPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useExpenses({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
    paymentMethod: paymentFilter || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  });
  const { data: categoriesData } = useExpenseCategories();
  const { data: summaryData } = useExpenseSummary({
    from: dateFrom || undefined,
    to: dateTo || undefined,
  });
  const deleteMutation = useDeleteExpense();

  const expenses = data?.data || [];
  const pagination = data?.pagination || {};
  const categories = categoriesData?.data || [];
  const summary = summaryData?.data || {};

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort();

  const [formModal, setFormModal] = useState(null);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);

  const handleDelete = async (item) => {
    if (!confirm(`Delete expense "${item.title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(item._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setPaymentFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = categoryFilter || paymentFilter || dateFrom || dateTo;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage business expenses</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustomCategoryModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Tags className="w-4 h-4" /> Custom Category
          </button>
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Total Expenses</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Total Entries</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{summary.count || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500 font-medium">Categories</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{(summary.byCategory || []).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500 font-medium">Avg / Entry</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(summary.count ? (summary.total || 0) / summary.count : 0)}
          </p>
        </div>
      </div>

      {/* Top Categories */}
      {(summary.byCategory || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Categories</h3>
          <div className="flex flex-wrap gap-2">
            {(summary.byCategory || []).slice(0, 8).map((cat) => (
              <div key={cat._id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium text-gray-700">{cat._id}</span>
                <span className="text-xs font-semibold text-blue-600">{formatCurrency(cat.total)}</span>
                <span className="text-xs text-gray-400">({cat.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search expenses..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
              hasFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" /> Filters {hasFilters && `(active)`}
          </button>
        </div>
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">All Categories</option>
                  {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
                <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">All Methods</option>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From Date</label>
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To Date</label>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">Clear all filters</button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Receipt className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No expenses found</p>
            <button onClick={() => setFormModal('create')} className="mt-3 text-sm text-blue-600 hover:underline">
              Add your first expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(item.date)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <CreditCard className="w-3 h-3" />
                        {PAYMENT_LABELS[item.paymentMethod] || item.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{item.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setFormModal(item)} title="Edit" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} items)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">Previous</button>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {formModal && (
        <ExpenseFormModal
          expense={formModal === 'create' ? null : formModal}
          categories={categories}
          onClose={() => setFormModal(null)}
        />
      )}
      {showCustomCategoryModal && (
        <CustomCategoryModal onClose={() => setShowCustomCategoryModal(false)} />
      )}
    </div>
  );
}
