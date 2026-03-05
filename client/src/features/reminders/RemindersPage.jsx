import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Search,
  Loader2,
  MessageCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, formatCurrency, getDaysUntil } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';

// ── API Hooks ────────────────────────────────────────────────────────────────

function useReminders(params) {
  return useQuery({
    queryKey: ['reminders', params],
    queryFn: async () => {
      const { data } = await api.get('/reminders', { params });
      return data;
    },
    keepPreviousData: true,
  });
}

function useUpdateReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reminderSettings }) => {
      const { data } = await api.put(`/reminders/${id}/settings`, { reminderSettings });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// ── Reminder Checkbox ────────────────────────────────────────────────────────

function ReminderCheckbox({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
      />
      <span className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
    </label>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function DueBadge({ daysUntil }) {
  if (daysUntil === null || daysUntil === undefined) return <span className="text-xs text-gray-400">-</span>;

  if (daysUntil < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        {Math.abs(daysUntil)}d overdue
      </span>
    );
  }

  if (daysUntil === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        Due today
      </span>
    );
  }

  if (daysUntil <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
        <Clock className="w-3 h-3" />
        {daysUntil}d left
      </span>
    );
  }

  if (daysUntil <= 10) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
        {daysUntil}d left
      </span>
    );
  }

  if (daysUntil <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
        {daysUntil}d left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
      <CheckCircle2 className="w-3 h-3" />
      {daysUntil}d left
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useReminders({
    page,
    limit: 50,
    search: debouncedSearch,
    filter,
  });

  const updateSettingsMutation = useUpdateReminderSettings();

  const policies = data?.data || [];
  const pagination = data?.pagination || {};

  const handleToggleReminder = (policyId, currentSettings, field) => {
    const newSettings = {
      ...currentSettings,
      [field]: !currentSettings[field],
    };
    updateSettingsMutation.mutate(
      { id: policyId, reminderSettings: newSettings },
      {
        onError: () => toast.error('Failed to update reminder setting'),
      }
    );
  };

  const handleWhatsApp = (policy) => {
    const phone = policy.customer?.phone;
    const customerName = policy.customer?.name || 'Customer';
    const schemeName = policy.scheme?.name || '';

    if (!phone) {
      toast.error('Customer phone number not available');
      return;
    }

    const dueDate = policy.nextPremiumDate
      ? new Date(policy.nextPremiumDate).toLocaleDateString('en-IN')
      : 'N/A';

    const isOverdue = policy.nextPremiumDate && new Date(policy.nextPremiumDate) < new Date();

    let message;
    if (isOverdue) {
      message = `Dear ${customerName},\n\nYour insurance premium of Rs.${policy.premiumAmount} for policy ${policy.policyNumber} (${schemeName}) was due on ${dueDate} and is now overdue.\n\nPlease make the payment immediately to avoid policy lapse.\n\nThank you,\nSamwin Infotech`;
    } else {
      message = `Dear ${customerName},\n\nThis is a reminder that your insurance premium of Rs.${policy.premiumAmount} for policy ${policy.policyNumber} (${schemeName}) is due on ${dueDate}.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nSamwin Infotech`;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filterTabs = [
    { key: 'all', label: 'All Active', icon: Bell },
    { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
    { key: 'upcoming', label: 'Upcoming (30d)', icon: Clock },
    { key: 'expiring', label: 'Expiring Soon', icon: Filter },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage premium due reminders and notifications
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              filter === key
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by customer, phone, policy..."
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
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No policies found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Policy No
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Scheme
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Policy End
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Next Due
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {policies.map((policy) => {
                  const daysUntil = getDaysUntil(policy.nextPremiumDate);
                  const settings = policy.reminderSettings || {
                    oneMonthBefore: true,
                    tenDaysBefore: true,
                    fiveDaysBefore: true,
                    oneDayBefore: true,
                  };

                  return (
                    <tr key={policy._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Customer Name */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {policy.customer?.name || '-'}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {policy.customer?.phone || '-'}
                        </span>
                      </td>

                      {/* Policy Number */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 font-mono">
                          {policy.policyNumber}
                        </span>
                      </td>

                      {/* Scheme */}
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm text-gray-900">
                            {policy.scheme?.name || '-'}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {policy.scheme?.type || ''}
                          </span>
                        </div>
                      </td>

                      {/* Policy End Date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {formatDate(policy.maturityDate)}
                        </span>
                      </td>

                      {/* Next Due Date */}
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm text-gray-700">
                            {formatDate(policy.nextPremiumDate)}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {formatCurrency(policy.premiumAmount)}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <DueBadge daysUntil={daysUntil} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleWhatsApp(policy)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                          title="Send WhatsApp reminder"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} policies)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
