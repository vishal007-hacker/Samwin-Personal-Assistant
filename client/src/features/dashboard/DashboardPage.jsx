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
  Database,
  Archive,
  Upload,
  Github,
  Car,
  TrendingUp,
  TrendingDown,
  Receipt,
  BellRing,
  Repeat,
  BookOpen,
  Wallet,
  Sparkles,
} from 'lucide-react';
import api from '../../lib/axios';
import {
  formatDate,
  formatCurrency,
  getDaysUntil,
  generateWhatsAppLink,
} from '../../lib/utils';
import { useSalesSummary } from '../sales/salesApi';
import { useExpenseSummary } from '../expenses/expenseApi';
import { useCustomReminders } from '../custom-reminders/customReminderApi';
import { useCredits } from '../credits/creditApi';

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
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
  },
  orange: {
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    valueColor: 'text-orange-700',
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
  const [backingUp, setBackingUp] = useState(null); // 'data' | 'full' | null
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [gitPushing, setGitPushing] = useState(false);
  const queryClient = useQueryClient();

  const handleGitPush = async () => {
    if (!confirm('Export the database and push the new backup to GitHub?')) return;
    setGitPushing(true);
    try {
      const { data } = await api.post('/backup/git-push');
      if (data?.data?.pushed) {
        toast.success(`Pushed ${data.data.backupFolder} (${data.data.totalDocs} docs) to GitHub`);
      } else {
        toast(data?.data?.message || 'Nothing to push', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'GitHub push failed');
    } finally {
      setGitPushing(false);
    }
  };

  // ── Backup handlers ──
  const downloadFromApi = async (path, fallbackName) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = 'Backup failed';
      try { msg = JSON.parse(text)?.message || msg; } catch { /* not JSON */ }
      throw new Error(msg);
    }
    // Filename from Content-Disposition, fall back to provided name
    const cd = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="?([^"]+)"?/i);
    const filename = match ? match[1] : fallbackName;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackupData = async () => {
    setBackingUp('data');
    try {
      await downloadFromApi('/backup/data', 'samwin-data-backup.json');
      toast.success('Data backup downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setBackingUp(null);
    }
  };

  const handleBackupFull = async () => {
    setBackingUp('full');
    try {
      await downloadFromApi('/backup/full', 'samwin-full-backup.zip');
      toast.success('Full backup downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setBackingUp(null);
    }
  };

  const handleRestoreFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setRestoreFile(file);
    e.target.value = ''; // allow re-selecting same file
  };

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const fd = new FormData();
      fd.append('file', restoreFile);
      const res = await fetch(`${baseUrl}/backup/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Restore failed');
      }
      const total = json.data?.totalDocs ?? 0;
      const errors = json.data?.errors ?? [];
      toast.success(`Restored ${total} documents${errors.length ? ` (${errors.length} errors)` : ''}`);
      if (errors.length) console.warn('Restore errors:', errors);
      setRestoreFile(null);
      queryClient.invalidateQueries(); // refresh all data on the page
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setRestoring(false);
    }
  };

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
    data: vehicleExpiringData,
    isLoading: vehicleExpiringLoading,
  } = useQuery({
    queryKey: ['dashboard', 'vehicle-expiring'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/vehicle-expiring');
      return data;
    },
  });

  const { data: salesSummaryData, isLoading: salesLoading } = useSalesSummary({});
  const { data: expenseSummaryData } = useExpenseSummary({});
  const { data: customRemindersData, isLoading: customRemindersLoading } = useCustomReminders('true');

  // Credit overdue + upcoming
  const { data: creditOverdueData, isLoading: creditOverdueLoading } = useCredits({ status: 'overdue', limit: 50 });
  const { data: creditOpenData, isLoading: creditOpenLoading } = useCredits({ status: 'open', limit: 50 });

  const { data: bibleData } = useQuery({
    queryKey: ['bible-verse', 'today'],
    queryFn: async () => {
      const { data } = await api.get('/bible-verse/today');
      return data;
    },
    staleTime: 60 * 60 * 1000, // cache 1 hour
  });
  const bibleVerse = bibleData?.data;

  const vehicleExpiring = vehicleExpiringData?.data || [];
  const customReminders = customRemindersData?.data || [];
  const salesSummary = salesSummaryData?.data || {};
  const totalExpenses = expenseSummaryData?.data?.total || 0;
  const creditOverdue = creditOverdueData?.data || [];
  // Upcoming = open credits due in next 30 days (not overdue)
  const now = new Date();
  const creditUpcoming = (creditOpenData?.data || []).filter((c) => {
    const due = new Date(c.dueDate);
    return due >= now && due <= new Date(now.getTime() + 30 * 86400000);
  });

  return (
    <div className="space-y-6">
      {/* ── Daily Bible Verse Scrolling Banner ── */}
      {bibleVerse && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 shadow-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="shrink-0 p-2 bg-white/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <Link
              to={`/posters?ref=${encodeURIComponent(bibleVerse.reference || '')}`}
              title="Turn this verse into a shareable poster"
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Make Poster
            </Link>
            <div className="overflow-hidden flex-1 min-w-0">
              <div className="animate-marquee whitespace-nowrap">
                <span className="text-sm font-semibold text-yellow-200 mr-4">
                  {bibleVerse.reference}
                </span>
                <span className="text-sm text-white/90 mr-12">
                  {bibleVerse.tamil}
                </span>
                <span className="text-sm font-semibold text-yellow-200 mr-4">
                  {bibleVerse.reference}
                </span>
                <span className="text-sm text-white/90 mr-12">
                  {bibleVerse.english}
                </span>
                <span className="text-sm font-semibold text-yellow-200 mr-4">
                  {bibleVerse.reference}
                </span>
                <span className="text-sm text-white/90 mr-12">
                  {bibleVerse.tamil}
                </span>
                <span className="text-sm font-semibold text-yellow-200 mr-4">
                  {bibleVerse.reference}
                </span>
                <span className="text-sm text-white/90">
                  {bibleVerse.english}
                </span>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee {
              display: inline-block;
              animation: marquee 40s linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}</style>
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBackupData}
            disabled={backingUp !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download all DB data as JSON"
          >
            {backingUp === 'data' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Backup Data
          </button>
          <button
            onClick={handleBackupFull}
            disabled={backingUp !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg font-medium hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download source code + DB data as a zip"
          >
            {backingUp === 'full' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Download Full Backup
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg font-medium hover:bg-amber-100 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Restore Backup
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFileSelect}
              className="hidden"
            />
          </label>
          <button
            onClick={handleGitPush}
            disabled={gitPushing}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-700 text-white bg-gray-900 rounded-lg font-medium hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Export DB and push backup to GitHub"
          >
            {gitPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            {gitPushing ? 'Pushing...' : 'Push to GitHub'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards (Sales Dashboard) ── */}
      {salesLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-100 p-3">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Income</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(salesSummary.todayIncome || 0)}</p>
                <p className="text-xs text-gray-400">{salesSummary.todayCount || 0} sales today</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(salesSummary.total || 0)}</p>
                <p className="text-xs text-gray-400">{salesSummary.count || 0} transactions</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-red-50 p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-100 p-3">
                <Receipt className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-gray-400">All time expenses</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-purple-50 p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-100 p-3">
                {(salesSummary.total || 0) - totalExpenses >= 0
                  ? <TrendingUp className="h-6 w-6 text-purple-600" />
                  : <TrendingDown className="h-6 w-6 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit / Loss</p>
                <p className={`text-2xl font-bold ${(salesSummary.total || 0) - totalExpenses >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                  {formatCurrency((salesSummary.total || 0) - totalExpenses)}
                </p>
                <p className="text-xs text-gray-400">Sales - Expenses</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Middle Widgets: Credit Dues + Reminders ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Credit Overdue & Upcoming */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-red-500" />
              <h2 className="text-base font-semibold text-gray-900">Credit Dues</h2>
              {creditOverdue.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {creditOverdue.length} overdue
                </span>
              )}
            </div>
            <Link
              to="/credits"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {creditOverdueLoading || creditOpenLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : creditOverdue.length === 0 && creditUpcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Wallet className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm">No credit dues</p>
              </div>
            ) : (
              <div>
                {/* Overdue Credits */}
                {creditOverdue.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                      <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Overdue</span>
                    </div>
                    {creditOverdue.map((credit) => {
                      const daysOverdue = Math.abs(getDaysUntil(credit.dueDate) || 0);
                      return (
                        <div key={credit._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="p-1.5 bg-red-100 rounded-lg shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link to={`/credits/${credit._id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                                {credit.customer?.name || '-'}
                              </Link>
                              <span className="text-xs font-semibold text-red-600">{daysOverdue}d overdue</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{credit.reason} &middot; Due: {formatDate(credit.dueDate)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-red-600">{formatCurrency(credit.balanceAmount)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upcoming Credits */}
                {creditUpcoming.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Upcoming (30 days)</span>
                    </div>
                    {creditUpcoming.map((credit) => {
                      const daysLeft = getDaysUntil(credit.dueDate) || 0;
                      return (
                        <div key={credit._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                            <Clock className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link to={`/credits/${credit._id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                                {credit.customer?.name || '-'}
                              </Link>
                              <span className="text-xs font-medium text-amber-600">{daysLeft}d left</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{credit.reason} &middot; Due: {formatDate(credit.dueDate)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(credit.balanceAmount)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Reminders */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-orange-500" />
              <h2 className="text-base font-semibold text-gray-900">My Reminders</h2>
            </div>
            <Link
              to="/my-reminders"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {customRemindersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : customReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <BellRing className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm">No active reminders</p>
                <Link to="/my-reminders" className="mt-2 text-xs text-blue-600 hover:underline">Create a reminder</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {customReminders.map((rem) => {
                  const nextTrigger = rem.nextTrigger ? new Date(rem.nextTrigger) : null;
                  const now = new Date();
                  const diffMs = nextTrigger ? nextTrigger - now : 0;
                  const minsLeft = Math.max(0, Math.floor(diffMs / 60000));
                  const timeLabel = minsLeft < 60
                    ? `${minsLeft}m`
                    : minsLeft < 1440
                      ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
                      : `${Math.floor(minsLeft / 1440)}d`;

                  const intervalLabel = rem.intervalMinutes < 60
                    ? `Every ${rem.intervalMinutes} mins`
                    : `Every ${rem.intervalMinutes / 60}h`;

                  return (
                    <div key={rem._id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                        <BellRing className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{rem.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Repeat className="h-3 w-3" /> {intervalLabel}
                          </span>
                          <span className="text-xs text-gray-400">Until {formatDate(rem.endDate)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full">
                          <Clock className="h-3 w-3 text-orange-500" />
                          <span className="text-xs font-semibold text-orange-700">Next: {timeLabel}</span>
                        </span>
                        {rem.triggerCount > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{rem.triggerCount}x triggered</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Vehicle Insurance Expiring ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900">Vehicle Insurance — Expiring / Expired</h2>
          </div>
          <Link
            to="/vehicle-insurance"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {vehicleExpiringLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : vehicleExpiring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Car className="mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm">No expiring vehicle insurance</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Policy No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {vehicleExpiring.map((item, idx) => {
                  const daysUntil = getDaysUntil(item.policyExpiryDate);
                  const isExpired = daysUntil !== null && daysUntil < 0;
                  const customerName = item.customer?.name || '-';
                  const customerPhone = item.customer?.phone || '';
                  const vehicleInfo = [item.vehicleBrand, item.model, item.vehicleNumber].filter(Boolean).join(' — ');

                  return (
                    <tr key={item._id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {customerName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {vehicleInfo || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {item.policyNumber || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {formatDate(item.policyExpiryDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {isExpired ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            Expired {Math.abs(daysUntil)}d ago
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            {daysUntil}d left
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (!customerPhone) {
                              toast.error('No phone number available');
                              return;
                            }
                            const msg = `Dear ${customerName}, your vehicle insurance for ${item.vehicleBrand || ''} ${item.model || ''} (${item.vehicleNumber || ''}) — Policy: ${item.policyNumber || ''} is ${isExpired ? 'expired' : 'expiring'} on ${formatDate(item.policyExpiryDate)}. Please renew at the earliest. Thank you, Samwin Infotech`;
                            window.open(generateWhatsAppLink(customerPhone, msg), '_blank');
                          }}
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

      {/* Recent Policies section removed — moved to Vehicle Insurance page */}

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

      {/* ── Restore Confirmation Modal ── */}
      {restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !restoring && setRestoreFile(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <Upload className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Restore Backup</h3>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">File</p>
              <p className="text-sm font-mono text-gray-900 truncate" title={restoreFile.name}>{restoreFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(restoreFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 font-medium mb-1">⚠️ This will REPLACE your current data</p>
              <p className="text-xs text-amber-700">
                Each collection in the backup will be wiped and re-inserted. Tip: click "Backup Data" first to save a safety copy of your current state before restoring.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRestoreFile(null)}
                disabled={restoring}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreConfirm}
                disabled={restoring}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
              >
                {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
                {restoring ? 'Restoring...' : 'Restore Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
