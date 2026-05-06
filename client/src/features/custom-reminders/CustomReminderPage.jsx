import { useState } from 'react';
import {
  Plus, Search, Loader2, X, Trash2, Bell, BellOff, BellRing,
  Clock, Calendar, Repeat, AlertCircle, CheckCircle2, Play, Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useCustomReminders, useCreateCustomReminder, useStopCustomReminder, useDeleteCustomReminder,
} from './customReminderApi';
import { formatDate } from '../../lib/utils';

// ── Interval Options ────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { value: 5, label: 'Every 5 Minutes' },
  { value: 10, label: 'Every 10 Minutes' },
  { value: 15, label: 'Every 15 Minutes' },
  { value: 30, label: 'Every 30 Minutes' },
  { value: 60, label: 'Every 1 Hour' },
  { value: 180, label: 'Every 3 Hours' },
  { value: 360, label: 'Every 6 Hours' },
  { value: 600, label: 'Every 10 Hours' },
];

const INTERVAL_LABELS = Object.fromEntries(INTERVAL_OPTIONS.map((o) => [o.value, o.label]));

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
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

// ── New Reminder Form ───────────────────────────────────────────────────────

function NewReminderModal({ onClose }) {
  const createMutation = useCreateCustomReminder();

  const [form, setForm] = useState({
    title: '',
    intervalMinutes: 60,
    endDate: '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Please enter what to remind');
    if (!form.endDate) return toast.error('Please select end date');

    const endDateTime = new Date(form.endDate + 'T23:59:59');
    if (endDateTime <= new Date()) return toast.error('End date must be in the future');

    try {
      await createMutation.mutateAsync({
        title: form.title,
        intervalMinutes: Number(form.intervalMinutes),
        endDate: endDateTime.toISOString(),
      });
      toast.success('Reminder created! You will be notified.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create reminder');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  // Minimum date = today
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal title="New Reminder" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* What to remind */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What to remind? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.title}
            onChange={set('title')}
            required
            rows={3}
            placeholder="e.g. Follow up with customer, Check server status, Take backup..."
            className={inputCls + ' resize-none'}
          />
        </div>

        {/* Reminder Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reminder Duration <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INTERVAL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  Number(form.intervalMinutes) === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="interval"
                  value={opt.value}
                  checked={Number(form.intervalMinutes) === opt.value}
                  onChange={set('intervalMinutes')}
                  className="sr-only"
                />
                <Repeat className={`w-4 h-4 shrink-0 ${Number(form.intervalMinutes) === opt.value ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upto How Long? <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={form.endDate}
              onChange={set('endDate')}
              min={today}
              required
              className={inputCls + ' pl-10'}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Reminder will repeat until this date</p>
        </div>

        {/* Summary */}
        {form.title && form.endDate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Summary</p>
            <p className="text-sm text-blue-800">
              "<span className="font-medium">{form.title}</span>" will remind you{' '}
              <span className="font-medium">{INTERVAL_LABELS[form.intervalMinutes]?.toLowerCase()}</span>{' '}
              until <span className="font-medium">{new Date(form.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {createMutation.isPending ? 'Creating...' : 'Set Reminder'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Time helpers ─────────────────────────────────────────────────────────────

function timeUntil(date) {
  const now = new Date();
  const target = new Date(date);
  const diff = target - now;
  if (diff <= 0) return 'Now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function CustomReminderPage() {
  const [filter, setFilter] = useState('active');
  const { data, isLoading } = useCustomReminders(filter === 'all' ? undefined : filter === 'active' ? 'true' : 'false');
  const stopMutation = useStopCustomReminder();
  const deleteMutation = useDeleteCustomReminder();

  const reminders = data?.data || [];
  const [showForm, setShowForm] = useState(false);

  const handleStop = async (rem) => {
    try {
      await stopMutation.mutateAsync(rem._id);
      toast.success('Reminder stopped');
    } catch (err) {
      toast.error('Failed to stop');
    }
  };

  const handleDelete = async (rem) => {
    if (!confirm(`Delete reminder "${rem.title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(rem._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed');
    }
  };

  const tabs = [
    { key: 'active', label: 'Active', icon: BellRing },
    { key: 'inactive', label: 'Completed', icon: CheckCircle2 },
    { key: 'all', label: 'All', icon: Bell },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <BellRing className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Reminders</h1>
            <p className="text-sm text-gray-500 mt-0.5">Set recurring reminders for important tasks</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Reminder
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                filter === tab.key
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <Bell className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">No reminders yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Create a reminder to get notified at regular intervals</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Reminder
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((rem) => {
            const isActive = rem.isActive;
            const isExpired = new Date(rem.endDate) < new Date();
            const nextIn = isActive && !isExpired ? timeUntil(rem.nextTrigger) : null;

            return (
              <div
                key={rem._id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors ${
                  isActive ? 'border-orange-200' : 'border-gray-200 opacity-70'
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-lg shrink-0 ${isActive ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    {isActive ? (
                      <BellRing className="w-5 h-5 text-orange-600" />
                    ) : (
                      <BellOff className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900">{rem.title}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3.5 h-3.5" />
                        {INTERVAL_LABELS[rem.intervalMinutes] || `Every ${rem.intervalMinutes}m`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Until {formatDate(rem.endDate)}
                      </span>
                      {rem.triggerCount > 0 && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Triggered {rem.triggerCount} time{rem.triggerCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Next trigger info */}
                    {isActive && nextIn && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">
                        <Clock className="w-3 h-3 text-orange-500" />
                        <span className="text-xs font-semibold text-orange-700">Next in {nextIn}</span>
                        <span className="text-xs text-orange-500">({formatTime(rem.nextTrigger)})</span>
                      </div>
                    )}

                    {!isActive && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-gray-500" />
                        <span className="text-xs font-medium text-gray-500">
                          {isExpired ? 'Expired' : 'Stopped'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isActive && (
                      <button
                        onClick={() => handleStop(rem)}
                        title="Stop Reminder"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" /> Stop
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rem)}
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar for active reminders */}
                {isActive && !isExpired && (
                  <div className="h-1 bg-gray-100">
                    <div
                      className="h-full bg-orange-400 transition-all"
                      style={{
                        width: `${Math.max(5, Math.min(100,
                          ((Date.now() - new Date(rem.createdAt).getTime()) /
                          (new Date(rem.endDate).getTime() - new Date(rem.createdAt).getTime())) * 100
                        ))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && <NewReminderModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
