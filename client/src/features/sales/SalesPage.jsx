import { useState } from 'react';
import {
  Search, Plus, Loader2, X, Edit3, Trash2, IndianRupee, TrendingUp, TrendingDown,
  Calendar, ShoppingBag, Tags, Filter, BarChart3, ChevronLeft, ChevronRight, Receipt, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useSalesCategories, useCreateSalesCategory, useUpdateSalesCategory, useDeleteSalesCategory,
  useSales, useSalesSummary, useSalesReport, useCreateSale, useUpdateSale, useDeleteSale,
} from './salesApi';
import { useExpenseSummary } from '../expenses/expenseApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate, exportCSV } from '../../lib/utils';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Category Management Modal ───────────────────────────────────────────────

function CategoryModal({ onClose }) {
  const { data: catData, isLoading } = useSalesCategories();
  const createMutation = useCreateSalesCategory();
  const updateMutation = useUpdateSalesCategory();
  const deleteMutation = useDeleteSalesCategory();
  const categories = catData?.data || [];

  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);

  const resetForm = () => { setName(''); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Enter category name');
    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, name: name.trim() });
        toast.success('Category updated!');
      } else {
        await createMutation.mutateAsync({ name: name.trim() });
        toast.success('Category created!');
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleEdit = (cat) => {
    setEditId(cat._id);
    setName(cat.name);
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(cat._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm';

  return (
    <Modal title="Manage Categories" onClose={onClose} wide>
      <div className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SIM Card, Recharge" className={inputCls} required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors whitespace-nowrap">
              {editId ? 'Update' : 'Add'}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} className="px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </form>

        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></div>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No categories yet. Add one above.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">{cat.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => handleEdit(cat)} className="p-1 text-gray-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(cat)} className="p-1 text-gray-400 hover:text-red-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── New Sale Modal ──────────────────────────────────────────────────────────

function SaleFormModal({ sale, categories, onClose }) {
  const isEdit = !!sale;
  const createMutation = useCreateSale();
  const updateMutation = useUpdateSale();

  const [form, setForm] = useState({
    category: sale?.category || '',
    quantity: sale?.quantity || 1,
    unitPrice: sale?.unitPrice || '',
    amount: sale?.amount || '',
    paymentMethod: sale?.paymentMethod || 'cash',
    date: sale?.date ? sale.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    customerName: sale?.customerName || '',
    notes: sale?.notes || '',
  });

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'quantity' || key === 'unitPrice') {
        const qty = key === 'quantity' ? Number(val) || 0 : Number(next.quantity) || 0;
        const up = key === 'unitPrice' ? Number(val) || 0 : Number(next.unitPrice) || 0;
        next.amount = qty * up;
      }
      return next;
    });
  };

  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast.error('Please select a category');
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        amount: Number(form.amount),
      };
      if (isEdit) {
        await mutation.mutateAsync({ id: sale._id, ...payload });
        toast.success('Sale updated!');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Sale recorded!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm';

  return (
    <Modal title={isEdit ? 'Edit Sale' : 'New Sale'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select value={form.category} onChange={set('category')} required className={inputCls + ' bg-white'}>
            <option value="">Select Category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
            <input type="number" value={form.quantity} onChange={set('quantity')} required min="1" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
            <input type="number" value={form.unitPrice} onChange={set('unitPrice')} required min="0" step="0.01" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
            <input type="number" value={form.amount} readOnly className={inputCls + ' bg-gray-50 font-semibold'} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={set('date')} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={form.paymentMethod} onChange={set('paymentMethod')} className={inputCls + ' bg-white'}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <input type="text" value={form.customerName} onChange={set('customerName')} placeholder="Optional" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any notes..." className={inputCls + ' resize-none'} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Record Sale'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Report Modal ────────────────────────────────────────────────────────────

function ReportModal({ onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const { data: reportData, isLoading } = useSalesReport({ from, to });
  const report = reportData?.data || {};

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm';

  return (
    <Modal title="Sales Report" onClose={onClose} wide>
      <div className="p-4 space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></div>
        ) : !report.total && report.total !== 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">Select date range to view report</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-sm text-green-600 font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(report.total)}</p>
                <p className="text-xs text-green-500 mt-1">{report.count} transactions</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-blue-600 font-medium">Daily Average</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(report.dailyBreakdown?.length ? report.total / report.dailyBreakdown.length : 0)}
                </p>
                <p className="text-xs text-blue-500 mt-1">{report.dailyBreakdown?.length || 0} days with sales</p>
              </div>
            </div>

            {report.categoryBreakdown?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">By Category</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Count</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.categoryBreakdown.map((c) => (
                        <tr key={c._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900">{c._id}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{c.count}</td>
                          <td className="px-4 py-2 text-right text-gray-900 font-medium">{formatCurrency(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.paymentBreakdown?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">By Payment Method</h3>
                <div className="flex flex-wrap gap-3">
                  {report.paymentBreakdown.map((p) => (
                    <div key={p._id} className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                      <p className="text-xs text-gray-500">{PAYMENT_LABELS[p._id] || p._id}</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.total)}</p>
                      <p className="text-xs text-gray-400">{p.count} sales</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.dailyBreakdown?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Daily Breakdown</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Sales</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.dailyBreakdown.map((d) => (
                        <tr key={d._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900">{formatDate(d._id)}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{d.count}</td>
                          <td className="px-4 py-2 text-right text-gray-900 font-medium">{formatCurrency(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function SalesPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const params = { page, limit: 20 };
  if (debouncedSearch) params.search = debouncedSearch;
  if (categoryFilter) params.category = categoryFilter;
  if (paymentFilter) params.paymentMethod = paymentFilter;

  const { data, isLoading } = useSales(params);
  const { data: catData } = useSalesCategories();
  const { data: summaryData } = useSalesSummary({});
  const { data: expenseSummaryData } = useExpenseSummary({});
  const deleteMutation = useDeleteSale();

  const sales = data?.data || [];
  const pagination = data?.pagination || {};
  const categories = catData?.data || [];
  const summary = summaryData?.data || {};
  const totalExpenses = expenseSummaryData?.data?.total || 0;

  const [formModal, setFormModal] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleDelete = async (item) => {
    if (!confirm(`Delete this sale?`)) return;
    try {
      await deleteMutation.mutateAsync(item._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (sales.length === 0) return toast.error('No data to export');
    const headers = ['Date', 'Category', 'Quantity', 'Unit Price', 'Amount', 'Customer', 'Payment Method', 'Notes'];
    const rows = sales.map((s) => [
      formatDate(s.date),
      s.categoryName,
      s.quantity,
      s.unitPrice,
      s.amount,
      s.customerName,
      s.paymentMethod,
      s.notes,
    ]);
    exportCSV('sales.csv', headers, rows);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-1">Track sales, manage categories and view reports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowCategoryModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Tags className="w-4 h-4" /> Categories
          </button>
          <button onClick={() => setShowReport(true)} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 className="w-4 h-4" /> Report
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => setFormModal('create')} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Sale
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Today's Income</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.todayIncome || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.todayCount || 0} sales today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Total Sales</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.count || 0} total transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500 font-medium">Total Expenses</span>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-1">All time expenses</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            {(summary.total || 0) - totalExpenses >= 0
              ? <TrendingUp className="w-4 h-4 text-green-500" />
              : <TrendingDown className="w-4 h-4 text-red-500" />
            }
            <span className="text-xs text-gray-500 font-medium">Net Profit / Loss</span>
          </div>
          <p className={`text-xl font-bold ${(summary.total || 0) - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency((summary.total || 0) - totalExpenses)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Sales - Expenses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search sales..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Payments</option>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /><p className="text-sm text-gray-400 mt-2">Loading...</p></div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No sales found</p>
            <p className="text-sm text-gray-400 mt-1">Record your first sale to get started</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Unit Price</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(s.date)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{s.categoryName}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(s.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-semibold">{formatCurrency(s.amount)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.customerName || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setFormModal(s)} className="p-1 text-gray-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s)} className="p-1 text-gray-400 hover:text-red-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} records)
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {formModal && (
        <SaleFormModal
          sale={formModal === 'create' ? null : formModal}
          categories={categories}
          onClose={() => setFormModal(null)}
        />
      )}
      {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} />}
      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}
