import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, User, Save, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchCustomers } from '../customers/customerApi';
import { useCreateCredit, useTopupCredit } from './creditApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate } from '../../lib/utils';

// ── Duplicate Popup ──────────────────────────────────────────────────────────

function DuplicatePopup({ existingCredit, onTopup, onCancel, isPending }) {
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Customer Already Exists</h2>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800 font-medium mb-2">
            {existingCredit.customer?.name} already has an open credit:
          </p>
          <div className="text-sm text-amber-700 space-y-1">
            <p>Reason: <span className="font-medium">{existingCredit.reason}</span></p>
            <p>Total: <span className="font-medium">{formatCurrency(existingCredit.totalAmount)}</span></p>
            <p>Balance: <span className="font-medium">{formatCurrency(existingCredit.balanceAmount)}</span></p>
            <p>Next Due: <span className="font-medium">{formatDate(existingCredit.dueDate)}</span></p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Please top-up the existing credit instead:
        </p>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Top-up Amount *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                required
                placeholder="Amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!amount || !dueDate) { toast.error('Amount and Due Date are required'); return; }
              onTopup(Number(amount), dueDate, notes);
            }}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {isPending ? 'Topping up...' : 'Top-up Credit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function NewCreditPage() {
  const navigate = useNavigate();
  const createMutation = useCreateCredit();
  const topupMutation = useTopupCredit();

  // Customer search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: searchData, isLoading: searching } = useSearchCustomers(debouncedSearch);
  const searchResults = searchData?.data || [];

  // Selected customer
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Duplicate popup state
  const [duplicateData, setDuplicateData] = useState(null);

  // Credit form
  const [form, setForm] = useState({
    reason: '',
    totalAmount: '',
    dueDate: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    if (!form.reason || !form.totalAmount || !form.dueDate) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        customer: selectedCustomer._id,
        reason: form.reason,
        totalAmount: Number(form.totalAmount),
        dueDate: form.dueDate,
        notes: form.notes || undefined,
      });
      toast.success('Credit created successfully!');
      navigate('/credits');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setDuplicateData(err.response.data.existingCredit);
      } else {
        toast.error(err.response?.data?.message || 'Failed to create credit');
      }
    }
  };

  const handleTopup = async (amount, dueDate, notes) => {
    if (!duplicateData) return;
    try {
      await topupMutation.mutateAsync({
        id: duplicateData._id,
        amount,
        dueDate,
        notes: notes || 'Top-up',
      });
      toast.success('Credit topped up successfully!');
      setDuplicateData(null);
      navigate('/credits');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to top-up');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Credit</h1>
      </div>

      {/* Step 1: Select Customer */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Customer</h2>

        {selectedCustomer ? (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                {selectedCustomer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Change
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {searchQuery.length >= 2 && searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {searchResults.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p className="mt-2 text-sm text-gray-400 text-center py-3">No customers found</p>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Credit Details */}
      <form onSubmit={handleSubmit}>
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Credit Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="e.g. Advance for policy payment"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.totalAmount}
                onChange={(e) => handleChange('totalAmount', e.target.value)}
                placeholder="Enter amount"
                required
                min="1"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !selectedCustomer}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Create Credit
          </button>
        </div>
      </form>

      {/* Duplicate Popup */}
      {duplicateData && (
        <DuplicatePopup
          existingCredit={duplicateData}
          onTopup={handleTopup}
          onCancel={() => setDuplicateData(null)}
          isPending={topupMutation.isPending}
        />
      )}
    </div>
  );
}
