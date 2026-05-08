import { useState } from 'react';
import {
  Search, Plus, Loader2, Car, Edit3, Trash2, X, AlertTriangle, Eye, Upload, FileText, MessageCircle,
  Shield, IndianRupee, Clock, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useSearchCustomers } from '../customers/customerApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, formatCurrency, getDaysUntil, exportCSV } from '../../lib/utils';
import api from '../../lib/axios';
import {
  useVehicleInsurances,
  useInsuranceTypes,
  useCreateVehicleInsurance,
  useUpdateVehicleInsurance,
  useDeleteVehicleInsurance,
  useCreateInsuranceType,
} from './vehicleInsuranceApi';

const DEFAULT_WHATSAPP = '919566181510';

function getCustomerPhone(item) {
  let phone = (item.customer?.phone || '').replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;
  return phone;
}

// Full details → send to office number
function buildOfficeWhatsAppUrl(item) {
  const c = item.customer || {};
  const lines = [
    `*Vehicle Insurance Details*`,
    ``,
    `*Customer:* ${c.name || '-'}`,
    `*Phone:* ${c.phone || '-'}`,
    `*Aadhaar:* ${c.aadhaarNumber || '-'}`,
    `*PAN:* ${c.panNumber || '-'}`,
    ``,
    `*Insurance Type:* ${item.insuranceType || '-'}`,
    `*Vehicle No:* ${item.vehicleNumber || '-'}`,
    `*Vehicle:* ${item.vehicleBrand} ${item.model} (${item.yearOfManufacturing})`,
    `*Registration Date:* ${item.registrationDate ? new Date(item.registrationDate).toLocaleDateString('en-IN') : '-'}`,
    `*Engine No:* ${item.engineNumber || '-'}`,
    `*Chasis No:* ${item.chasisNumber || '-'}`,
    `*Policy Company:* ${item.policyCompany || '-'}`,
    `*Policy No:* ${item.policyNumber || '-'}`,
    `*Policy Expiry:* ${item.policyExpiryDate ? new Date(item.policyExpiryDate).toLocaleDateString('en-IN') : '-'}`,
    ``,
    `— Samwin Infotech`,
  ];
  return `https://wa.me/${DEFAULT_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
}

// Reminder → send to customer
function buildCustomerWhatsAppUrl(item) {
  const c = item.customer || {};
  const expiryDate = item.policyExpiryDate ? new Date(item.policyExpiryDate).toLocaleDateString('en-IN') : '-';
  const lines = [
    `Dear ${c.name},`,
    ``,
    `Your vehicle insurance is expiring soon.`,
    ``,
    `*Vehicle No:* ${item.vehicleNumber || '-'}`,
    `*Vehicle:* ${item.vehicleBrand} ${item.model}`,
    `*Policy Company:* ${item.policyCompany || '-'}`,
    `*Policy No:* ${item.policyNumber || '-'}`,
    `*Expiry Date:* ${expiryDate}`,
    ``,
    `Please renew your insurance before the expiry date to avoid any lapse in coverage.`,
    ``,
    `Thank you,`,
    `*Samwin Infotech*`,
    `Ph: +91 9566181510`,
  ];
  return `https://wa.me/${getCustomerPhone(item)}?text=${encodeURIComponent(lines.join('\n'))}`;
}

// ── Modal Shell ─────────────────────────────────────────────────

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

// ── Customer Search ─────────────────────────────────────────────

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
          <p className="text-xs text-blue-600">{selected.phone} | Aadhaar: {selected.aadhaarNumber || '-'} | PAN: {selected.panNumber || '-'}</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-blue-400 hover:text-blue-600">
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
              <p className="text-xs text-gray-500">{c.phone} | Aadhaar: {c.aadhaarNumber || '-'} | PAN: {c.panNumber || '-'}</p>
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

// ── Insurance Type Dropdown with "Add New" ──────────────────────

function InsuranceTypeSelect({ value, onChange, types, onNewType }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      onNewType(newName.trim());
      setNewName('');
      setShowAdd(false);
    }
  };

  return (
    <div>
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === '__add_new__') {
            setShowAdd(true);
          } else {
            onChange(e.target.value);
          }
        }}
        required
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
      >
        <option value="">Select Insurance Type</option>
        {types.map((t) => (
          <option key={t._id} value={t.name}>{t.name}</option>
        ))}
        <option value="__add_new__">+ Add New Type</option>
      </select>
      {showAdd && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New type name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <button type="button" onClick={handleAdd} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Add
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Create/Edit Form Modal ──────────────────────────────────────

function FormModal({ record, onClose }) {
  const isEdit = !!record;
  const createMutation = useCreateVehicleInsurance();
  const updateMutation = useUpdateVehicleInsurance();
  const createTypeMutation = useCreateInsuranceType();
  const { data: typesData } = useInsuranceTypes();
  const types = typesData?.data || [];

  const [customer, setCustomer] = useState(record?.customer || null);
  const [form, setForm] = useState({
    insuranceType: record?.insuranceType || '',
    vehicleNumber: record?.vehicleNumber || '',
    vehicleBrand: record?.vehicleBrand || '',
    model: record?.model || '',
    yearOfManufacturing: record?.yearOfManufacturing || '',
    registrationDate: record?.registrationDate ? record.registrationDate.slice(0, 10) : '',
    engineNumber: record?.engineNumber || '',
    chasisNumber: record?.chasisNumber || '',
    policyCompany: record?.policyCompany || '',
    policyNumber: record?.policyNumber || '',
    policyExpiryDate: record?.policyExpiryDate ? record.policyExpiryDate.slice(0, 10) : '',
    notes: record?.notes || '',
  });
  const [rcBook, setRcBook] = useState(null);
  const [oldInsurance, setOldInsurance] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleNewType = async (name) => {
    try {
      await createTypeMutation.mutateAsync(name);
      setForm((f) => ({ ...f, insuranceType: name }));
      toast.success(`Type "${name}" added!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add type');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer) return toast.error('Please select a customer');

    const fd = new FormData();
    fd.append('customer', customer._id);
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (rcBook) fd.append('rcBook', rcBook);
    if (oldInsurance) fd.append('oldInsurance', oldInsurance);

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: record._id, formData: fd });
        toast.success('Updated!');
      } else {
        await createMutation.mutateAsync(fd);
        toast.success('Vehicle insurance created!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const mutation = isEdit ? updateMutation : createMutation;
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm';

  return (
    <Modal title={isEdit ? 'Edit Vehicle Insurance' : 'Create Vehicle Insurance'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
          <CustomerSearch selected={customer} onSelect={setCustomer} />
        </div>

        {/* Customer info display */}
        {customer && (customer.aadhaarNumber || customer.panNumber) && (
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3">
            <div>
              <p className="text-xs text-gray-500">Aadhaar Number</p>
              <p className="text-sm font-medium">{customer.aadhaarNumber || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">PAN Number</p>
              <p className="text-sm font-medium">{customer.panNumber || '-'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Insurance Type */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Type *</label>
            <InsuranceTypeSelect
              value={form.insuranceType}
              onChange={(v) => setForm((f) => ({ ...f, insuranceType: v }))}
              types={types}
              onNewType={handleNewType}
            />
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
            <input type="text" value={form.vehicleNumber} onChange={set('vehicleNumber')} placeholder="e.g. TN76VR4360" className={inputCls} style={{ textTransform: 'uppercase' }} />
          </div>

          {/* Vehicle Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Brand *</label>
            <input type="text" value={form.vehicleBrand} onChange={set('vehicleBrand')} required placeholder="e.g. Maruti, Hyundai, Honda" className={inputCls} />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
            <input type="text" value={form.model} onChange={set('model')} required placeholder="e.g. Swift, i20, City" className={inputCls} />
          </div>

          {/* Year of Manufacturing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year of Manufacturing *</label>
            <input type="number" value={form.yearOfManufacturing} onChange={set('yearOfManufacturing')} required min="1990" max="2030" placeholder="e.g. 2023" className={inputCls} />
          </div>

          {/* Registration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
            <input type="date" value={form.registrationDate} onChange={set('registrationDate')} className={inputCls} />
          </div>

          {/* Engine Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Engine Number</label>
            <input type="text" value={form.engineNumber} onChange={set('engineNumber')} placeholder="Engine number" className={inputCls} />
          </div>

          {/* Chasis Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chasis Number</label>
            <input type="text" value={form.chasisNumber} onChange={set('chasisNumber')} placeholder="Chasis number" className={inputCls} />
          </div>

          {/* Policy Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Company</label>
            <input type="text" value={form.policyCompany} onChange={set('policyCompany')} placeholder="e.g. ICICI Lombard, New India" className={inputCls} />
          </div>

          {/* Policy Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number *</label>
            <input type="text" value={form.policyNumber} onChange={set('policyNumber')} required placeholder="Policy number" className={inputCls} />
          </div>

          {/* Policy Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Expiry Date *</label>
            <input type="date" value={form.policyExpiryDate} onChange={set('policyExpiryDate')} required className={inputCls} />
          </div>

          {/* RC Book Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RC Book</label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setRcBook(e.target.files[0])}
                className="hidden"
                id="rcBook"
              />
              <label htmlFor="rcBook" className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                <Upload className="w-4 h-4" />
                {rcBook ? rcBook.name : record?.rcBookFile ? 'Replace existing file' : 'Upload RC Book'}
              </label>
            </div>
            {record?.rcBookFile && !rcBook && (
              <a href={`/uploads/${record.rcBookFile}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                <FileText className="w-3 h-3" /> View current file
              </a>
            )}
          </div>

          {/* Old Insurance Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Old Insurance</label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setOldInsurance(e.target.files[0])}
                className="hidden"
                id="oldInsurance"
              />
              <label htmlFor="oldInsurance" className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                <Upload className="w-4 h-4" />
                {oldInsurance ? oldInsurance.name : record?.oldInsuranceFile ? 'Replace existing file' : 'Upload Old Insurance'}
              </label>
            </div>
            {record?.oldInsuranceFile && !oldInsurance && (
              <a href={`/uploads/${record.oldInsuranceFile}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                <FileText className="w-3 h-3" /> View current file
              </a>
            )}
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any additional notes..." className={inputCls + ' resize-none'} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Detail Modal ────────────────────────────────────────────────

function DetailModal({ record, onClose }) {
  const daysUntil = getDaysUntil(record.policyExpiryDate);
  const isExpiringSoon = daysUntil !== null && daysUntil <= 10 && daysUntil >= 0;
  const isExpired = daysUntil !== null && daysUntil < 0;

  return (
    <Modal title="Vehicle Insurance Details" onClose={onClose}>
      <div className="space-y-4">
        {(isExpiringSoon || isExpired) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isExpired ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            <AlertTriangle className="w-4 h-4" />
            {isExpired ? `Expired ${Math.abs(daysUntil)} days ago` : `Expiring in ${daysUntil} days`}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-500">Customer</p><p className="font-medium">{record.customer?.name}</p></div>
          <div><p className="text-gray-500">Phone</p><p className="font-medium">{record.customer?.phone}</p></div>
          <div><p className="text-gray-500">Aadhaar</p><p className="font-medium">{record.customer?.aadhaarNumber || '-'}</p></div>
          <div><p className="text-gray-500">PAN</p><p className="font-medium">{record.customer?.panNumber || '-'}</p></div>
          <div className="col-span-2 border-t pt-3"><p className="text-gray-500">Insurance Type</p><p className="font-medium">{record.insuranceType}</p></div>
          <div><p className="text-gray-500">Vehicle No.</p><p className="font-medium">{record.vehicleNumber || '-'}</p></div>
          <div><p className="text-gray-500">Vehicle</p><p className="font-medium">{record.vehicleBrand} {record.model}</p></div>
          <div><p className="text-gray-500">Year</p><p className="font-medium">{record.yearOfManufacturing}</p></div>
          <div><p className="text-gray-500">Registration Date</p><p className="font-medium">{formatDate(record.registrationDate)}</p></div>
          <div><p className="text-gray-500">Engine No.</p><p className="font-medium">{record.engineNumber || '-'}</p></div>
          <div><p className="text-gray-500">Chasis No.</p><p className="font-medium">{record.chasisNumber || '-'}</p></div>
          <div><p className="text-gray-500">Policy Company</p><p className="font-medium">{record.policyCompany || '-'}</p></div>
          <div><p className="text-gray-500">Policy No.</p><p className="font-medium">{record.policyNumber}</p></div>
          <div><p className="text-gray-500">Policy Expiry</p><p className="font-medium">{formatDate(record.policyExpiryDate)}</p></div>
          <div><p className="text-gray-500">Reminder Starts</p><p className="font-medium">{formatDate(record.reminderStartDate)}</p></div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a href={buildCustomerWhatsAppUrl(record)} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <MessageCircle className="w-4 h-4" /> To Customer
          </a>
          <a href={buildOfficeWhatsAppUrl(record)} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <MessageCircle className="w-4 h-4" /> To Office
          </a>
          {record.rcBookFile && (
            <a href={`/uploads/${record.rcBookFile}`} target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              <FileText className="w-4 h-4" /> RC Book
            </a>
          )}
          {record.oldInsuranceFile && (
            <a href={`/uploads/${record.oldInsuranceFile}`} target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              <FileText className="w-4 h-4" /> Old Insurance
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export default function VehicleInsurancePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useVehicleInsurances({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    filter: filter || undefined,
  });
  const deleteMutation = useDeleteVehicleInsurance();

  // Dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data;
    },
  });
  const stats = statsData?.data || {};

  const items = data?.data || [];
  const pagination = data?.pagination || {};

  const [formModal, setFormModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const handleDelete = async (item) => {
    if (!confirm(`Delete vehicle insurance for ${item.vehicleBrand} ${item.model}?`)) return;
    try {
      await deleteMutation.mutateAsync(item._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (items.length === 0) return toast.error('No data to export');
    const headers = ['Customer', 'Phone', 'Vehicle No', 'Brand', 'Model', 'Year', 'Insurance Type', 'Policy Company', 'Policy No', 'Expiry', 'Status'];
    const rows = items.map((c) => {
      const daysUntil = getDaysUntil(c.policyExpiryDate);
      const status = daysUntil !== null && daysUntil < 0 ? 'Expired' : daysUntil !== null && daysUntil <= 10 ? 'Expiring Soon' : 'Active';
      return [
        c.customer?.name,
        c.customer?.phone,
        c.vehicleNumber,
        c.vehicleBrand,
        c.model,
        c.yearOfManufacturing,
        c.insuranceType,
        c.policyCompany,
        c.policyNumber,
        formatDate(c.policyExpiryDate),
        status,
      ];
    });
    exportCSV('vehicle-insurance.csv', headers, rows);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Insurance</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vehicle insurance policies & reminders</p>
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
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Policies</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalPolicies ?? '-'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Policies</p>
              <p className="text-xl font-bold text-gray-900">{stats.activePolicies ?? '-'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Monthly Collection</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.monthlyCollection || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Vehicle Insurance</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalVehicleInsurance ?? '-'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Expiring Soon (10 days)</p>
              <p className="text-xl font-bold text-amber-600">{stats.vehicleExpiringSoon ?? '-'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Expired</p>
              <p className="text-xl font-bold text-red-600">{stats.vehicleExpired ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by customer, vehicle, policy..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: '', label: 'All' },
              { value: 'expiring_soon', label: 'Expiring Soon' },
              { value: 'expired', label: 'Expired' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setFilter(opt.value); setPage(1); }}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  filter === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Car className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No vehicle insurance records found</p>
            <button onClick={() => setFormModal('create')} className="mt-3 text-sm text-blue-600 hover:underline">
              Create your first record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const daysUntil = getDaysUntil(item.policyExpiryDate);
                  const isExpiringSoon = daysUntil !== null && daysUntil <= 10 && daysUntil >= 0;
                  const isExpired = daysUntil !== null && daysUntil < 0;

                  return (
                    <tr key={item._id} className={`hover:bg-gray-50/50 transition-colors ${isExpired ? 'bg-red-50/30' : isExpiringSoon ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{item.customer?.name}</p>
                        <p className="text-xs text-gray-500">{item.customer?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.insuranceType}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{item.vehicleBrand} {item.model}</p>
                        {item.vehicleNumber && <p className="text-xs font-mono font-semibold text-gray-600">{item.vehicleNumber}</p>}
                        <p className="text-xs text-gray-400">{item.yearOfManufacturing}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.policyCompany || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{item.policyNumber}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{formatDate(item.policyExpiryDate)}</p>
                        {isExpiringSoon && <p className="text-xs font-medium text-amber-600">{daysUntil} days left</p>}
                        {isExpired && <p className="text-xs font-medium text-red-600">Expired {Math.abs(daysUntil)}d ago</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                          isExpired ? 'bg-red-100 text-red-700'
                            : isExpiringSoon ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <a href={buildCustomerWhatsAppUrl(item)} target="_blank" rel="noreferrer" title="WhatsApp to Customer" className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a href={buildOfficeWhatsAppUrl(item)} target="_blank" rel="noreferrer" title="WhatsApp to Office" className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <button onClick={() => setDetailModal(item)} title="View" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setFormModal(item)} title="Edit" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* Modals */}
      {formModal && (
        <FormModal
          record={formModal === 'create' ? null : formModal}
          onClose={() => setFormModal(null)}
        />
      )}
      {detailModal && (
        <DetailModal record={detailModal} onClose={() => setDetailModal(null)} />
      )}
    </div>
  );
}
