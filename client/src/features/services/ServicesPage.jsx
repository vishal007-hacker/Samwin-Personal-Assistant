import { useState } from 'react';
import {
  Plus, Loader2, X, Edit3, Trash2, Wrench, Search, Download, MessageCircle,
  IndianRupee, Calendar, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useServices, useCreateService, useUpdateService, useDeleteService, useServiceTypes, useCreateServiceType } from './serviceApi';
import { useSearchCustomers } from '../customers/customerApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, formatCurrency, exportCSV } from '../../lib/utils';
import AddableSelect from '../../components/AddableSelect';

// ── Constants ───────────────────────────────────────────────────────────────

// Pretty labels for the 3 legacy codes that pre-existed before this list
// became user-editable. Any user-added type just displays its name as-is.
const LEGACY_LABELS = {
  new_installation: 'New Installation',
  addon_works: 'Addon Works',
  service: 'Service',
};
const labelFor = (v) => LEGACY_LABELS[v] || v;

const TYPE_COLORS = {
  new_installation: 'bg-emerald-100 text-emerald-700',
  addon_works: 'bg-violet-100 text-violet-700',
  service: 'bg-sky-100 text-sky-700',
};

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

// ── Customer Search ─────────────────────────────────────────────────────────

function CustomerSearch({ selected, onSelect }) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const { data } = useSearchCustomers(debouncedQ);
  const customers = data?.data || [];

  if (selected) {
    return (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <div>
          <p className="text-sm font-medium text-blue-900">{selected.name}</p>
          <p className="text-xs text-blue-600">{selected.phone}</p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-blue-400 hover:text-blue-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, phone, or Aadhaar..."
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
      />
      {debouncedQ.length >= 2 && customers.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {customers.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => { onSelect(c); setQ(''); }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
            >
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500">{c.phone}</p>
            </button>
          ))}
        </div>
      )}
      {debouncedQ.length >= 2 && customers.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
          No customers found
        </div>
      )}
    </div>
  );
}

// ── Service Form ────────────────────────────────────────────────────────────

function ServiceFormModal({ entry, onClose }) {
  const isEdit = !!entry;
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const createTypeMutation = useCreateServiceType();
  const { data: typesData } = useServiceTypes();
  const types = typesData?.data || [];
  const mutation = isEdit ? updateMutation : createMutation;

  const [customer, setCustomer] = useState(entry?.customer || null);
  const [form, setForm] = useState({
    date: entry?.date ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    typeOfWork: entry?.typeOfWork || 'service',
    materialsUsed: entry?.materialsUsed || '',
    askingPrice: entry?.askingPrice || '',
    receivedCash: entry?.receivedCash || '',
    notes: entry?.notes || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer) return toast.error('Please select a customer');
    if (!form.date) return toast.error('Date is required');

    try {
      const payload = {
        ...form,
        customer: customer._id,
        askingPrice: Number(form.askingPrice) || 0,
        receivedCash: Number(form.receivedCash) || 0,
      };
      if (isEdit) {
        await mutation.mutateAsync({ id: entry._id, ...payload });
        toast.success('Service updated!');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Service added!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const balance = (Number(form.askingPrice) || 0) - (Number(form.receivedCash) || 0);

  return (
    <Modal title={isEdit ? 'Edit Service' : 'Add Service'} onClose={onClose}>
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
              Type of Work <span className="text-red-500">*</span>
            </label>
            <AddableSelect
              value={form.typeOfWork}
              onChange={set('typeOfWork')}
              options={types.map((t) => ({ value: t.name, label: labelFor(t.name) }))}
              placeholder="Select type"
              entityLabel="service type"
              required
              onCreate={async (name) => {
                const res = await createTypeMutation.mutateAsync(name);
                const created = res?.data || res;
                return { value: created.name, label: labelFor(created.name) };
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer <span className="text-red-500">*</span>
          </label>
          <CustomerSearch selected={customer} onSelect={setCustomer} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Materials Used</label>
          <textarea
            value={form.materialsUsed}
            onChange={set('materialsUsed')}
            rows={2}
            placeholder="e.g. CCTV camera, DVR, cables, mounts..."
            className={inputCls + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price</label>
            <input type="number" value={form.askingPrice} onChange={set('askingPrice')} min="0" placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received Cash</label>
            <input type="number" value={form.receivedCash} onChange={set('receivedCash')} min="0" placeholder="0" className={inputCls} />
          </div>
        </div>

        {(form.askingPrice || form.receivedCash) && (
          <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-700 flex items-center justify-between">
            <span className="font-medium">Balance Due:</span>
            <span className={balance > 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-600'}>
              {formatCurrency(balance)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={2}
            placeholder="Any additional notes about this service..."
            className={inputCls + ' resize-none'}
          />
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

function sendServiceReminder(svc) {
  const phone = (svc.customer?.phone || '').replace(/\D/g, '');
  if (!phone) {
    toast.error('No phone number for this customer');
    return;
  }
  const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
  const lines = [
    `Dear ${svc.customer?.name || 'Customer'},`,
    ``,
    `This is a friendly reminder from *Samwin Infotech* regarding your previous service:`,
    ``,
    `*Service Type:* ${labelFor(svc.typeOfWork)}`,
    `*Date:* ${formatDate(svc.date)}`,
    svc.materialsUsed ? `*Work Done:* ${svc.materialsUsed}` : null,
    ``,
    `It's time for your next service or check-up. Please contact us to schedule a visit.`,
    ``,
    `Thank you,`,
    `*Samwin Infotech*`,
    `Ph: +91 9566181510`,
  ].filter(Boolean);
  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useServices({
    search: debouncedSearch || undefined,
    typeOfWork: typeFilter || undefined,
  });
  const { data: typesData } = useServiceTypes();
  const types = typesData?.data || [];
  const deleteMutation = useDeleteService();

  const services = data?.data || [];
  const [formModal, setFormModal] = useState(null);

  const totals = services.reduce(
    (acc, s) => {
      acc.asked += s.askingPrice || 0;
      acc.received += s.receivedCash || 0;
      return acc;
    },
    { asked: 0, received: 0 }
  );

  const handleDelete = async (svc) => {
    if (!confirm(`Delete this service for ${svc.customer?.name || 'customer'}?`)) return;
    try {
      await deleteMutation.mutateAsync(svc._id);
      toast.success('Service deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (!services.length) return toast.error('No services to export');
    exportCSV(
      'services.csv',
      ['Date', 'Customer', 'Phone', 'Type of Work', 'Materials Used', 'Asking Price', 'Received Cash', 'Balance', 'Notes'],
      services.map((s) => [
        formatDate(s.date),
        s.customer?.name || '',
        s.customer?.phone || '',
        labelFor(s.typeOfWork),
        s.materialsUsed || '',
        s.askingPrice || 0,
        s.receivedCash || 0,
        (s.askingPrice || 0) - (s.receivedCash || 0),
        s.notes || '',
      ])
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wrench className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Our Services</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track installations, addon works, and service jobs</p>
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Total Services</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{services.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500 font-medium">Total Asked</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.asked)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Total Received</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.received)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Balance: {formatCurrency(totals.asked - totals.received)}</p>
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
            placeholder="Search by materials or notes..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t._id} value={t.name}>{labelFor(t.name)}</option>
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
          <p className="text-lg font-medium text-gray-500">No services yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Track your first installation or service</p>
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Service
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Materials</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Asked</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {services.map((svc) => {
                  const balance = (svc.askingPrice || 0) - (svc.receivedCash || 0);
                  return (
                    <tr key={svc._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(svc.date)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <p className="font-medium text-gray-900">{svc.customer?.name || '-'}</p>
                        <p className="text-xs text-gray-500">{svc.customer?.phone || '-'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${TYPE_COLORS[svc.typeOfWork] || 'bg-gray-100 text-gray-700'}`}>
                          {labelFor(svc.typeOfWork)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        <p className="truncate" title={svc.materialsUsed}>{svc.materialsUsed || '-'}</p>
                        {svc.notes && <p className="text-xs text-gray-400 truncate" title={svc.notes}><FileText className="w-3 h-3 inline mr-1" />{svc.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 whitespace-nowrap">{formatCurrency(svc.askingPrice)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-700 whitespace-nowrap">{formatCurrency(svc.receivedCash)}</td>
                      <td className={`px-4 py-3 text-right text-sm font-semibold whitespace-nowrap ${balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => sendServiceReminder(svc)}
                            className="rounded-md p-1.5 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                            title="Send service reminder on WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setFormModal(svc)}
                            className="rounded-md p-1.5 bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(svc)}
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
