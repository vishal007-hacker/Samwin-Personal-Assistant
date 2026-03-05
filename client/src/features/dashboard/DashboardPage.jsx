import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FileText,
  Shield,
  AlertTriangle,
  IndianRupee,
  Loader2,
  MessageCircle,
  CreditCard,
  Clock,
  ArrowRight,
  X,
  RotateCcw,
} from 'lucide-react';
import api from '../../lib/axios';
import {
  formatDate,
  formatCurrency,
  getDaysUntil,
  generateWhatsAppLink,
} from '../../lib/utils';

// ─── Stat Card ──────────────────────────────────────────────────────────────

const statCardConfig = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-700',
  },
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    valueColor: 'text-green-700',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueColor: 'text-red-700',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    valueColor: 'text-purple-700',
  },
};

function StatCard({ icon: Icon, label, value, color = 'blue', isCurrency = false }) {
  const theme = statCardConfig[color] || statCardConfig.blue;

  return (
    <div className={`rounded-lg ${theme.bg} p-5`}>
      <div className="flex items-center gap-4">
        <div className={`rounded-lg ${theme.iconBg} p-3`}>
          <Icon className={`h-6 w-6 ${theme.iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${theme.valueColor}`}>
            {isCurrency ? formatCurrency(value) : (value ?? '-')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ───────────────────────────────────────────────────

function RecordPaymentModal({ isOpen, onClose, payment }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    amount: payment?.premiumAmount ?? payment?.amount ?? '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    reference: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/payments', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded successfully');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    mutation.mutate({
      policy: payment?.policyId || payment?.policy?._id || payment?.policy,
      customer: payment?.customerId || payment?.customer?._id || payment?.customer,
      amount: Number(form.amount),
      date: form.date,
      method: form.method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {payment?.policyNumber && (
            <p className="text-sm text-gray-600">
              Policy: <span className="font-medium text-gray-900">{payment.policyNumber}</span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              min="1"
              step="any"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              name="method"
              value={form.method}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online Transfer</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input
              type="text"
              name="reference"
              value={form.reference}
              onChange={handleChange}
              placeholder="Transaction ID / Cheque No."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── WhatsApp Reminder Helper ───────────────────────────────────────────────

function buildReminderMessage(item) {
  const customerName = item.customerName || item.customer?.name || 'Customer';
  const amount = item.premiumAmount || item.amount || 0;
  const policyNumber = item.policyNumber || item.policy?.policyNumber || '';
  const dueDate = formatDate(item.dueDate || item.nextDueDate);

  return `Dear ${customerName}, your insurance premium of Rs.${amount} for policy ${policyNumber} is due on ${dueDate}. Please make the payment.`;
}

function openWhatsApp(item) {
  const phone = item.customerPhone || item.customer?.phone || '';
  if (!phone) {
    toast.error('No phone number available');
    return;
  }
  const message = buildReminderMessage(item);
  const link = generateWhatsAppLink(phone, message);
  window.open(link, '_blank');
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [paymentModal, setPaymentModal] = useState({ open: false, payment: null });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/dashboard/reset');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('All data has been reset successfully');
      setShowResetConfirm(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reset data');
    },
  });

  // ── Queries ──

  const {
    data: statsData,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data;
    },
  });

  const {
    data: overdueData,
    isLoading: overdueLoading,
  } = useQuery({
    queryKey: ['dashboard', 'overdue'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/overdue');
      return data;
    },
  });

  const {
    data: remindersData,
    isLoading: remindersLoading,
  } = useQuery({
    queryKey: ['dashboard', 'upcoming-reminders'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/upcoming-reminders', {
        params: { days: 15 },
      });
      return data;
    },
  });

  const {
    data: recentPoliciesData,
    isLoading: recentLoading,
  } = useQuery({
    queryKey: ['dashboard', 'recent-policies'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/recent-policies');
      return data;
    },
  });

  const stats = statsData?.data || {};
  const overdueItems = overdueData?.data || [];
  const reminders = remindersData?.data || [];
  const recentPolicies = recentPoliciesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Reset All Data
        </button>
      </div>

      {/* ── Stat Cards ── */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Total Policies"
            value={stats.totalPolicies}
            color="blue"
          />
          <StatCard
            icon={Shield}
            label="Active Policies"
            value={stats.activePolicies}
            color="green"
          />
          <StatCard
            icon={AlertTriangle}
            label="Overdue Payments"
            value={stats.overduePayments}
            color="red"
          />
          <StatCard
            icon={IndianRupee}
            label="Monthly Collection"
            value={stats.monthlyCollection}
            color="purple"
            isCurrency
          />
        </div>
      )}

      {/* ── Middle Widgets: Overdue + Reminders ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overdue Payments */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-base font-semibold text-gray-900">Overdue Payments</h2>
            </div>
            <Link
              to="/payments"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {overdueLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : overdueItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Shield className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm">No overdue payments</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Policy No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Days Overdue
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {overdueItems.map((item, idx) => {
                    const daysOverdue = Math.abs(getDaysUntil(item.dueDate || item.nextDueDate) || 0);
                    return (
                      <tr key={item._id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {item.customerName || item.customer?.name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {item.policyNumber || item.policy?.policyNumber || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-medium">
                          {formatCurrency(item.premiumAmount || item.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {formatDate(item.dueDate || item.nextDueDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-red-600">
                          {daysOverdue} days
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                setPaymentModal({ open: true, payment: item })
                              }
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay
                            </button>
                            <button
                              onClick={() => openWhatsApp(item)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">Upcoming Reminders</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            {remindersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Clock className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm">No upcoming reminders</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Policy No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Days Until
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {reminders.map((item, idx) => {
                    const daysUntil = getDaysUntil(item.dueDate || item.nextDueDate) ?? 0;
                    return (
                      <tr key={item._id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {item.customerName || item.customer?.name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {item.policyNumber || item.policy?.policyNumber || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-medium">
                          {formatCurrency(item.premiumAmount || item.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {formatDate(item.dueDate || item.nextDueDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-amber-600">
                          {daysUntil} days
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            onClick={() => openWhatsApp(item)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Policies ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900">Recent Policies</h2>
          </div>
          <Link
            to="/policies"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : recentPolicies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <FileText className="mb-2 h-10 w-10 text-gray-300" />
            <p className="text-sm">No recent policies</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentPolicies.map((policy, idx) => (
              <Link
                key={policy._id || idx}
                to={`/policies/${policy._id}`}
                className="rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-600">
                    {policy.policyNumber}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(policy.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {policy.customerName || policy.customer?.name || '-'}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {policy.schemeName || policy.scheme?.name || '-'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      <RecordPaymentModal
        isOpen={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, payment: null })}
        payment={paymentModal.payment}
      />

      {/* ── Reset Confirmation Modal ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reset All Data</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete <strong>all</strong> data including:
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
              <li>Customers</li>
              <li>Schemes</li>
              <li>Policies</li>
              <li>Payments</li>
              <li>Credits</li>
              <li>Notifications</li>
            </ul>
            <p className="text-sm font-medium text-red-600 mb-4">This action cannot be undone!</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 transition-colors"
              >
                {resetMutation.isPending ? 'Resetting...' : 'Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
