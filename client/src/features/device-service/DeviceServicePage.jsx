import { useState, useMemo } from 'react';
import {
  Plus, Loader2, X, Edit3, Trash2, Search, Download, MessageCircle, Eye, EyeOff, Copy,
  Smartphone, Laptop, Monitor, Printer, Tablet, Package, Wrench, Lock,
  IndianRupee, AlertTriangle, CheckCircle2, Clock, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useDeviceServices, useCreateDeviceService, useUpdateDeviceService, useDeleteDeviceService,
  useDeviceTypes, useCreateDeviceType,
} from './deviceServiceApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate, exportCSV } from '../../lib/utils';

// ── Constants ───────────────────────────────────────────────────────────────

function iconForDeviceType(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('mobile') || t.includes('phone')) return Smartphone;
  if (t.includes('laptop')) return Laptop;
  if (t.includes('computer') || t.includes('pc') || t.includes('desktop')) return Monitor;
  if (t.includes('printer')) return Printer;
  if (t.includes('tablet') || t.includes('ipad')) return Tablet;
  return Package;
}

const LOCK_TYPES = [
  { value: 'none', label: 'No Lock' },
  { value: 'pin', label: 'PIN' },
  { value: 'password', label: 'Password' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'fingerprint', label: 'Fingerprint' },
  { value: 'face', label: 'Face Unlock' },
  { value: 'other', label: 'Other' },
];

const LOCK_LABEL_BY_VALUE = Object.fromEntries(LOCK_TYPES.map((l) => [l.value, l.label]));

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  { value: 'ready', label: 'Ready', cls: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  { value: 'delivered', label: 'Delivered', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  { value: 'returned', label: 'Returned', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: ArrowRight },
];

const STATUS_BY_KEY = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]));

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 z-10 max-h-[90vh] overflow-y-auto">
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

// ── Form Modal ──────────────────────────────────────────────────────────────

function ServiceFormModal({ entry, onClose }) {
  const isEdit = !!entry;
  const createMutation = useCreateDeviceService();
  const updateMutation = useUpdateDeviceService();
  const createTypeMutation = useCreateDeviceType();
  const { data: typesData } = useDeviceTypes();
  const mutation = isEdit ? updateMutation : createMutation;
  const deviceTypes = typesData?.data || [];

  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [form, setForm] = useState({
    serialNo: entry?.serialNo || '',
    deviceType: entry?.deviceType || 'Mobile',
    lockType: entry?.lockType || 'none',
    lockValue: entry?.lockValue || '',
    problem: entry?.problem || '',
    date: entry?.date ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    customerName: entry?.customerName || '',
    customerPhone: entry?.customerPhone || '',
    status: entry?.status || 'pending',
    amount: entry?.amount ?? '',
    notes: entry?.notes || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) return toast.error('Customer name is required');
    try {
      const payload = {
        ...form,
        amount: Number(form.amount) || 0,
      };
      if (isEdit) {
        await mutation.mutateAsync({ id: entry._id, ...payload });
        toast.success('Service updated');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Service entry added');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Service Entry' : 'Add Device for Service'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.date} onChange={set('date')} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.deviceType}
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  setShowAddType(true);
                } else {
                  setForm((f) => ({ ...f, deviceType: e.target.value }));
                }
              }}
              required
              className={inputCls + ' bg-white'}
            >
              <option value="">Select device type</option>
              {deviceTypes.map((t) => (
                <option key={t._id} value={t.name}>{t.name}</option>
              ))}
              <option value="__add_new__">+ Add new type...</option>
            </select>
            {showAddType && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="New device type name"
                  autoFocus
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const name = newTypeName.trim();
                    if (!name) return toast.error('Enter a name');
                    try {
                      const result = await createTypeMutation.mutateAsync(name);
                      setForm((f) => ({ ...f, deviceType: result.data?.name || name }));
                      setNewTypeName('');
                      setShowAddType(false);
                      toast.success('Type added');
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddType(false); setNewTypeName(''); }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number / IMEI</label>
          <input
            type="text"
            value={form.serialNo}
            onChange={set('serialNo')}
            placeholder="Device serial number or IMEI"
            className={inputCls + ' font-mono'}
          />
        </div>

        {/* Lock / Unlock Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Lock / Unlock Info</span>
            <span className="text-xs text-gray-400">— so staff can test the device</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lock Type</label>
              <select value={form.lockType} onChange={set('lockType')} className={inputCls + ' bg-white'}>
                {LOCK_TYPES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.lockType === 'pattern' ? 'Pattern (describe or sequence)' : form.lockType === 'pin' ? 'PIN' : form.lockType === 'password' ? 'Password' : 'Lock Value'}
              </label>
              <input
                type="text"
                value={form.lockValue}
                onChange={set('lockValue')}
                placeholder={
                  form.lockType === 'pin' ? 'e.g. 1234' :
                  form.lockType === 'pattern' ? 'e.g. L-shape, 1-2-5-8-7' :
                  form.lockType === 'password' ? 'Enter password' :
                  form.lockType === 'fingerprint' ? 'e.g. Owner registered only' :
                  form.lockType === 'face' ? 'e.g. Face unlock - need owner' :
                  form.lockType === 'none' ? 'Not required' :
                  'Details'
                }
                disabled={form.lockType === 'none'}
                className={inputCls + (form.lockType === 'none' ? ' bg-gray-100 text-gray-400' : '')}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Problem / Issue</label>
          <textarea
            value={form.problem}
            onChange={set('problem')}
            rows={2}
            placeholder="e.g. Display broken, not turning on, battery drain..."
            className={inputCls + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.customerName} onChange={set('customerName')} required
              placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
            <input type="tel" value={form.customerPhone} onChange={set('customerPhone')}
              placeholder="10-digit mobile" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select value={form.status} onChange={set('status')} required className={inputCls + ' bg-white'}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input type="number" value={form.amount} onChange={set('amount')} min="0" placeholder="0" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2}
            placeholder="Any additional notes..." className={inputCls + ' resize-none'} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Service'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── WhatsApp Helper ─────────────────────────────────────────────────────────

function notifyCustomer(entry) {
  const digits = (entry.customerPhone || '').replace(/\D/g, '');
  if (!digits) {
    toast.error('No phone number for this customer');
    return;
  }
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const deviceLabel = entry.deviceType || 'device';

  let msg;
  if (entry.status === 'ready') {
    msg = [
      `Hi ${entry.customerName},`,
      ``,
      `Your *${deviceLabel}* is ready for pickup.`,
      entry.serialNo ? `Serial: ${entry.serialNo}` : null,
      entry.amount ? `Service Charge: ₹${entry.amount}` : null,
      ``,
      `Please collect at your convenience.`,
      ``,
      `Thank you,`,
      `*Samwin Infotech*`,
      `Ph: +91 9566181510`,
    ].filter(Boolean).join('\n');
  } else if (entry.status === 'returned') {
    msg = [
      `Hi ${entry.customerName},`,
      ``,
      `Thank you for choosing Samwin Infotech for your *${deviceLabel}* service. Hope everything is working well!`,
      ``,
      `If you have any issues, please reach out to us.`,
      ``,
      `*Samwin Infotech*`,
      `Ph: +91 9566181510`,
    ].join('\n');
  } else {
    msg = [
      `Hi ${entry.customerName},`,
      ``,
      `Your *${deviceLabel}* is being serviced. We will notify you once it is ready for pickup.`,
      ``,
      `*Samwin Infotech*`,
      `Ph: +91 9566181510`,
    ].join('\n');
  }

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function DeviceServicePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useDeviceServices({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    deviceType: typeFilter || undefined,
  });
  const deleteMutation = useDeleteDeviceService();

  const services = data?.data || [];
  const [formModal, setFormModal] = useState(null);
  const [revealedLockId, setRevealedLockId] = useState(null);

  const allDeviceTypes = useMemo(() => {
    const set = new Set(services.map((s) => s.deviceType).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  // ── Stats ──
  const stats = useMemo(() => {
    const result = { total: services.length, pending: 0, ready: 0, returned: 0, totalAmount: 0 };
    services.forEach((s) => {
      result[s.status] = (result[s.status] || 0) + 1;
      result.totalAmount += s.amount || 0;
    });
    return result;
  }, [services]);

  const handleDelete = async (s) => {
    if (!confirm(`Delete service entry for ${s.customerName}?`)) return;
    try {
      await deleteMutation.mutateAsync(s._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (!services.length) return toast.error('No service entries to export');
    exportCSV(
      'device-service.csv',
      ['Date', 'Device Type', 'Serial No', 'Lock Type', 'Lock Value', 'Problem', 'Customer', 'Phone', 'Status', 'Amount', 'Notes'],
      services.map((s) => [
        formatDate(s.date),
        s.deviceType || '',
        s.serialNo || '',
        LOCK_LABEL_BY_VALUE[s.lockType] || s.lockType || '',
        s.lockValue || '',
        s.problem || '',
        s.customerName || '',
        s.customerPhone || '',
        STATUS_BY_KEY[s.status]?.label || s.status,
        s.amount || 0,
        s.notes || '',
      ])
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wrench className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Device Service</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track customer devices in for repair</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium uppercase">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium uppercase">Ready</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.ready}</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-700 font-medium uppercase">Returned</span>
          </div>
          <p className="text-2xl font-bold text-gray-700">{stats.returned}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-700 font-medium uppercase">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.totalAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, phone, serial, or problem..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Types</option>
          {allDeviceTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <Wrench className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-500">No service entries yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Add a device that customers brought in for repair</p>
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Device
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Serial No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Lock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Problem</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {services.map((s) => {
                  const TypeIcon = iconForDeviceType(s.deviceType);
                  const statusCfg = STATUS_BY_KEY[s.status] || STATUS_BY_KEY.pending;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(s.date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 capitalize">
                          <TypeIcon className="w-4 h-4 text-gray-500" />
                          {s.deviceType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                        {s.serialNo || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {s.lockType && s.lockType !== 'none' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-100 text-purple-700 uppercase">
                              <Lock className="w-2.5 h-2.5" />{LOCK_LABEL_BY_VALUE[s.lockType] || s.lockType}
                            </span>
                            {s.lockValue && (
                              <>
                                <span className="font-mono text-xs text-gray-700">
                                  {revealedLockId === s._id ? s.lockValue : '••••'}
                                </span>
                                <button
                                  onClick={() => setRevealedLockId(revealedLockId === s._id ? null : s._id)}
                                  className="p-0.5 text-gray-400 hover:text-gray-600"
                                  title={revealedLockId === s._id ? 'Hide' : 'Show'}
                                  type="button"
                                >
                                  {revealedLockId === s._id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(s.lockValue);
                                    toast.success('Copied');
                                  }}
                                  className="p-0.5 text-gray-400 hover:text-blue-600"
                                  title="Copy"
                                  type="button"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No lock</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        <p className="truncate" title={s.problem}>{s.problem || '-'}</p>
                        {s.notes && <p className="text-xs text-gray-400 truncate" title={s.notes}>{s.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <p className="font-medium text-gray-900">{s.customerName}</p>
                        <p className="text-xs text-gray-500">{s.customerPhone || '-'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${statusCfg.cls}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(s.amount)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => notifyCustomer(s)}
                            className="rounded-md p-1.5 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                            title="Notify customer on WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setFormModal(s)}
                            className="rounded-md p-1.5 bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="rounded-md p-1.5 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {formModal && (
        <ServiceFormModal
          entry={formModal === 'create' ? null : formModal}
          onClose={() => setFormModal(null)}
        />
      )}
    </div>
  );
}
