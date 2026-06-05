import { useState, useMemo } from 'react';
import {
  Wrench, Plus, Loader2, X, Edit3, Trash2, Search, Download, Calendar, AlertTriangle,
  Clock, CheckCircle2, IndianRupee, History, BarChart3, MessageCircle, Phone, MapPin, Tag, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useMaintenanceProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useMaintenanceRecords, useCreateRecord, useUpdateRecord, useDeleteRecord,
} from './maintenanceApi';
import { formatCurrency, formatDate, exportCSV } from '../../lib/utils';
import AddableSelect from '../../components/AddableSelect';

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function statusFromDue(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return { label: 'No Schedule', cls: 'bg-gray-100 text-gray-600', tone: 'gray' };
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'bg-red-100 text-red-700', tone: 'red' };
  if (days === 0) return { label: 'Due Today', cls: 'bg-amber-100 text-amber-700', tone: 'amber' };
  if (days <= 7) return { label: `${days}d left`, cls: 'bg-amber-100 text-amber-700', tone: 'amber' };
  if (days <= 30) return { label: `${days}d left`, cls: 'bg-blue-100 text-blue-700', tone: 'blue' };
  return { label: `${days}d left`, cls: 'bg-green-100 text-green-700', tone: 'green' };
}

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6 z-10 max-h-[90vh] overflow-y-auto`}>
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

// ── Product Form ────────────────────────────────────────────────────────────

function ProductFormModal({ product, onClose }) {
  const isEdit = !!product;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const mutation = isEdit ? updateMutation : createMutation;

  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || '',
    serialNumber: product?.serialNumber || '',
    location: product?.location || '',
    frequencyDays: product?.frequencyDays || 30,
    nextMaintenanceDate: product?.nextMaintenanceDate ? product.nextMaintenanceDate.slice(0, 10) : '',
    isActive: product?.isActive !== false,
    notes: product?.notes || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    try {
      const payload = {
        ...form,
        frequencyDays: Number(form.frequencyDays) || 30,
      };
      if (!payload.nextMaintenanceDate) delete payload.nextMaintenanceDate;
      if (isEdit) {
        await mutation.mutateAsync({ id: product._id, ...payload });
        toast.success('Product updated');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Product added');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Product' : 'Add Product to Maintain'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.name} onChange={set('name')} required
            placeholder="e.g. HP Printer, Dell Laptop, Office AC" className={inputCls} autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" value={form.category} onChange={set('category')}
              placeholder="Printer, Computer, AC..." className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial / Tag No.</label>
            <input type="text" value={form.serialNumber} onChange={set('serialNumber')}
              placeholder="Optional" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input type="text" value={form.location} onChange={set('location')}
            placeholder="e.g. Reception, Main Office, Storage" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency (days) <span className="text-red-500">*</span>
            </label>
            <input type="number" value={form.frequencyDays} onChange={set('frequencyDays')} required min="1"
              className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">e.g. 30 for monthly, 90 for quarterly, 365 for yearly</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Maintenance Date</label>
            <input type="date" value={form.nextMaintenanceDate} onChange={set('nextMaintenanceDate')} className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Auto-set to today + frequency if blank</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2}
            placeholder="Any details about this product..." className={inputCls + ' resize-none'} />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
          Active (still being maintained)
        </label>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Record Form ─────────────────────────────────────────────────────────────

function RecordFormModal({ record, defaultProductId, products, onClose }) {
  const isEdit = !!record;
  const createMutation = useCreateRecord();
  const updateMutation = useUpdateRecord();
  const createProductMutation = useCreateProduct();
  const mutation = isEdit ? updateMutation : createMutation;

  const [form, setForm] = useState({
    product: record?.product?._id || defaultProductId || '',
    date: record?.date ? record.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    workDone: record?.workDone || '',
    cost: record?.cost ?? '',
    servicePersonName: record?.servicePersonName || '',
    servicePersonContact: record?.servicePersonContact || '',
    nextDueDate: record?.nextDueDate ? record.nextDueDate.slice(0, 10) : '',
    notes: record?.notes || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  const selectedProduct = products.find((p) => p._id === form.product);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product) return toast.error('Select a product');
    try {
      const payload = {
        ...form,
        cost: Number(form.cost) || 0,
      };
      if (!payload.nextDueDate) delete payload.nextDueDate;
      if (isEdit) {
        await mutation.mutateAsync({ id: record._id, ...payload });
        toast.success('Record updated');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Maintenance recorded');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Maintenance Record' : 'Record Maintenance'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product <span className="text-red-500">*</span>
            </label>
            <AddableSelect
              value={form.product}
              onChange={set('product')}
              options={products.map((p) => ({
                value: p._id,
                label: `${p.name}${p.category ? ` (${p.category})` : ''}${p.location ? ` — ${p.location}` : ''}`,
              }))}
              placeholder="Select product"
              entityLabel="product"
              required
              onCreate={async (name) => {
                const res = await createProductMutation.mutateAsync({ name });
                const created = res?.data || res;
                return { value: created._id, label: created.name };
              }}
            />
          </div>
        )}

        {isEdit && record?.product && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
            <span className="font-medium text-blue-900">{record.product.name}</span>
            {record.product.category && <span className="text-blue-600 ml-2">({record.product.category})</span>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.date} onChange={set('date')} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
            <input type="number" value={form.cost} onChange={set('cost')} min="0" placeholder="0" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Done / Items Serviced</label>
          <textarea value={form.workDone} onChange={set('workDone')} rows={3}
            placeholder="e.g. Replaced toner, cleaned printhead, software update..." className={inputCls + ' resize-none'} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Person Name</label>
            <input type="text" value={form.servicePersonName} onChange={set('servicePersonName')}
              placeholder="Name of technician" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Person Contact</label>
            <input type="text" value={form.servicePersonContact} onChange={set('servicePersonContact')}
              placeholder="Phone number" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
          <input type="date" value={form.nextDueDate} onChange={set('nextDueDate')} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">
            {selectedProduct
              ? `If blank, will auto-set to ${selectedProduct.frequencyDays} days from service date`
              : 'If blank, auto-set from product frequency'}
          </p>
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
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Record' : 'Save Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Contact Helpers ─────────────────────────────────────────────────────────

function openWhatsApp(name, contact) {
  const digits = (contact || '').replace(/\D/g, '');
  if (!digits) {
    toast.error('No contact number');
    return;
  }
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const message = `Hi ${name || ''}, this is from Samwin Infotech regarding our office equipment maintenance. Could you please confirm a time for the next visit?`.trim();
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ── Product Detail Modal (shows full history for one product) ──────────────

function ProductDetailModal({ product, records, onClose, onAddRecord, onEditProduct, onEditRecord, onDeleteRecord }) {
  const productRecords = useMemo(
    () => records.filter((r) => r.product?._id === product._id).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [records, product._id]
  );

  const totalCost = productRecords.reduce((s, r) => s + (r.cost || 0), 0);
  const status = statusFromDue(product.nextMaintenanceDate);

  return (
    <Modal title="" onClose={onClose} wide>
      {/* Product Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl p-5 mb-5 -mt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-5 h-5 opacity-80" />
              <h2 className="text-xl font-bold truncate">{product.name}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-90">
              {product.category && <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{product.category}</span>}
              {product.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{product.location}</span>}
              {product.serialNumber && <span>S/N: {product.serialNumber}</span>}
              {!product.isActive && <span className="bg-red-500/30 px-2 py-0.5 rounded text-xs">Inactive</span>}
            </div>
            {product.notes && <p className="text-xs opacity-80 mt-2">{product.notes}</p>}
          </div>
          <button
            onClick={() => onEditProduct(product)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            title="Edit product"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100">
          <p className="text-[10px] uppercase font-semibold text-blue-600 tracking-wider">Frequency</p>
          <p className="text-lg font-bold text-blue-700">Every {product.frequencyDays} days</p>
        </div>
        <div className="bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-100">
          <p className="text-[10px] uppercase font-semibold text-amber-600 tracking-wider">Next Due</p>
          <p className="text-sm font-bold text-amber-700">{product.nextMaintenanceDate ? formatDate(product.nextMaintenanceDate) : '-'}</p>
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold rounded mt-0.5 ${status.cls}`}>{status.label}</span>
        </div>
        <div className="bg-green-50 rounded-lg px-3 py-2.5 border border-green-100">
          <p className="text-[10px] uppercase font-semibold text-green-600 tracking-wider">Services</p>
          <p className="text-lg font-bold text-green-700">{productRecords.length}</p>
        </div>
        <div className="bg-purple-50 rounded-lg px-3 py-2.5 border border-purple-100">
          <p className="text-[10px] uppercase font-semibold text-purple-600 tracking-wider">Total Spent</p>
          <p className="text-lg font-bold text-purple-700">{formatCurrency(totalCost)}</p>
        </div>
      </div>

      {/* History Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Maintenance History</h3>
          <span className="text-xs text-gray-400">({productRecords.length})</span>
        </div>
        <button
          onClick={() => onAddRecord(product._id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Record
        </button>
      </div>

      {/* History Records */}
      {productRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
          <History className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm">No maintenance records yet</p>
          <button
            onClick={() => onAddRecord(product._id)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Record first service
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {productRecords.map((r) => (
            <div key={r._id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" /> {formatDate(r.date)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-700">
                      <IndianRupee className="w-3 h-3" /> {formatCurrency(r.cost)}
                    </span>
                    {r.nextDueDate && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Next: {formatDate(r.nextDueDate)}
                      </span>
                    )}
                  </div>
                  {r.workDone && (
                    <p className="text-sm text-gray-700 mb-1.5">
                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wider mr-1">Work:</span>
                      {r.workDone}
                    </p>
                  )}
                  {(r.servicePersonName || r.servicePersonContact) && (
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-1">
                      {r.servicePersonName && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" /> {r.servicePersonName}
                        </span>
                      )}
                      {r.servicePersonContact && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" /> {r.servicePersonContact}
                        </span>
                      )}
                    </div>
                  )}
                  {r.notes && (
                    <p className="text-xs text-gray-500 italic">{r.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.servicePersonContact && (
                    <button
                      onClick={() => openWhatsApp(r.servicePersonName, r.servicePersonContact)}
                      className="rounded-md p-1.5 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                      title="WhatsApp service person"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditRecord(r)}
                    className="rounded-md p-1.5 bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord(r)}
                    className="rounded-md p-1.5 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [search, setSearch] = useState('');
  const [productModal, setProductModal] = useState(null);
  const [recordModal, setRecordModal] = useState(null);
  const [historyForProduct, setHistoryForProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);

  const { data: productsData, isLoading: prodLoading } = useMaintenanceProducts({
    search: search || undefined,
  });
  const { data: recordsData, isLoading: recLoading } = useMaintenanceRecords();
  const deleteProductMutation = useDeleteProduct();
  const deleteRecordMutation = useDeleteRecord();

  const products = productsData?.data || [];
  const records = recordsData?.data || [];

  // ── Stats ──
  const stats = useMemo(() => {
    let overdue = 0, dueSoon = 0, ok = 0, totalSpend = 0;
    products.forEach((p) => {
      const d = daysUntil(p.nextMaintenanceDate);
      if (d === null) return;
      if (d < 0) overdue += 1;
      else if (d <= 7) dueSoon += 1;
      else ok += 1;
    });
    records.forEach((r) => { totalSpend += r.cost || 0; });

    // Cost this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonthCost = records
      .filter((r) => new Date(r.date) >= monthStart)
      .reduce((s, r) => s + (r.cost || 0), 0);

    return { overdue, dueSoon, ok, totalSpend, thisMonthCost, totalRecords: records.length };
  }, [products, records]);

  // ── Cost by Category ──
  const costByCategory = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const cat = r.product?.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + (r.cost || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // ── Filtered records (history for one product or all) ──
  const visibleRecords = useMemo(() => {
    if (!historyForProduct) return records;
    return records.filter((r) => r.product?._id === historyForProduct._id);
  }, [records, historyForProduct]);

  const handleDeleteProduct = async (p) => {
    if (!confirm(`Delete "${p.name}" and all its maintenance records?`)) return;
    try {
      await deleteProductMutation.mutateAsync(p._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDeleteRecord = async (r) => {
    if (!confirm('Delete this maintenance record?')) return;
    try {
      await deleteRecordMutation.mutateAsync(r._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (!records.length) return toast.error('No history to export');
    exportCSV(
      'maintenance-history.csv',
      ['Date', 'Product', 'Category', 'Location', 'Work Done', 'Cost', 'Service Person', 'Contact', 'Next Due', 'Notes'],
      records.map((r) => [
        formatDate(r.date),
        r.product?.name || '',
        r.product?.category || '',
        r.product?.location || '',
        r.workDone || '',
        r.cost || 0,
        r.servicePersonName || '',
        r.servicePersonContact || '',
        r.nextDueDate ? formatDate(r.nextDueDate) : '',
        r.notes || '',
      ])
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Wrench className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track office products, schedules, and service history</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setRecordModal('create')}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            disabled={products.length === 0}
            title={products.length === 0 ? 'Add a product first' : 'Record a maintenance service'}
          >
            <History className="h-4 w-4" />
            Add Service Record
          </button>
          <button
            onClick={() => setProductModal('create')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Total Products</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{products.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-700 font-medium uppercase">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium uppercase">Due Soon (≤ 7d)</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.dueSoon}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium uppercase">On Track</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.ok}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-700 font-medium uppercase">Spent This Month</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.thisMonthCost)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total: {formatCurrency(stats.totalSpend)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, category, or location..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Products to Maintain</h2>
        </div>
        {prodLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Wrench className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm font-medium">No products yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-3">Add the office equipment you want to maintain</p>
            <button
              onClick={() => setProductModal('create')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Last Serviced</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Next Due</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total Spent</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 w-56">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {products.map((p) => {
                  const status = statusFromDue(p.nextMaintenanceDate);
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setDetailProduct(p)}
                          className="text-left group"
                          title="Click to view full history"
                        >
                          <p className="text-sm font-medium text-blue-600 group-hover:text-blue-800 group-hover:underline">{p.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {p.category && <span className="inline-flex items-center gap-0.5"><Tag className="w-3 h-3" />{p.category}</span>}
                            {p.serialNumber && <span>· {p.serialNumber}</span>}
                            {!p.isActive && <span className="text-red-500">· Inactive</span>}
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        {p.location ? (
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{p.location}</span>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {p.lastServicedDate ? (
                          <>
                            <p>{formatDate(p.lastServicedDate)}</p>
                            <p className="text-xs text-gray-400">{p.serviceCount} record{p.serviceCount === 1 ? '' : 's'}</p>
                          </>
                        ) : <span className="text-gray-400">Never</span>}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {p.nextMaintenanceDate ? (
                          <>
                            <p className="text-gray-900">{formatDate(p.nextMaintenanceDate)}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full mt-0.5 ${status.cls}`}>
                              {status.label}
                            </span>
                          </>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(p.totalSpent)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setRecordModal({ defaultProductId: p._id })}
                            className="rounded-md p-1.5 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                            title="Add maintenance record"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDetailProduct(p)}
                            className="rounded-md p-1.5 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                            title="View full history"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setProductModal(p)}
                            className="rounded-md p-1.5 bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors"
                            title="Edit product"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="rounded-md p-1.5 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                            title="Delete product"
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
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
              Maintenance History
              {historyForProduct && (
                <span className="text-blue-600 normal-case ml-2">— {historyForProduct.name}</span>
              )}
            </h2>
            <span className="text-xs text-gray-400">({visibleRecords.length})</span>
          </div>
          {historyForProduct && (
            <button
              onClick={() => setHistoryForProduct(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Show all history
            </button>
          )}
        </div>
        {recLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <History className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm">No maintenance records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Work Done</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Service Person</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cost</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Next Due</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {visibleRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-2.5 text-sm whitespace-nowrap text-gray-900">{formatDate(r.date)}</td>
                    <td className="px-5 py-2.5 text-sm whitespace-nowrap">
                      <p className="font-medium text-gray-900">{r.product?.name || '-'}</p>
                      {r.product?.category && <p className="text-xs text-gray-500">{r.product.category}</p>}
                    </td>
                    <td className="px-5 py-2.5 text-sm text-gray-700 max-w-xs">
                      <p className="truncate" title={r.workDone}>{r.workDone || '-'}</p>
                      {r.notes && <p className="text-xs text-gray-400 truncate" title={r.notes}>{r.notes}</p>}
                    </td>
                    <td className="px-5 py-2.5 text-sm whitespace-nowrap">
                      {r.servicePersonName ? (
                        <>
                          <p className="text-gray-900 inline-flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{r.servicePersonName}</p>
                          {r.servicePersonContact && <p className="text-xs text-gray-500">{r.servicePersonContact}</p>}
                        </>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-medium text-gray-900 whitespace-nowrap">{formatCurrency(r.cost)}</td>
                    <td className="px-5 py-2.5 text-sm whitespace-nowrap text-gray-600">
                      {r.nextDueDate ? formatDate(r.nextDueDate) : '-'}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.servicePersonContact && (
                          <button
                            onClick={() => openWhatsApp(r.servicePersonName, r.servicePersonContact)}
                            className="rounded-md p-1.5 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                            title="WhatsApp service person"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setRecordModal(r)}
                          className="rounded-md p-1.5 bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(r)}
                          className="rounded-md p-1.5 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-5 py-2.5 text-sm font-bold text-gray-900">TOTAL</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(visibleRecords.reduce((s, r) => s + (r.cost || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cost by Category */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Cost by Category</h3>
          </div>
          {costByCategory.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No maintenance recorded yet</p>
          ) : (
            <div className="space-y-3">
              {costByCategory.map(([cat, cost]) => {
                const pct = stats.totalSpend > 0 ? (cost / stats.totalSpend) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{cat}</span>
                      <span className="text-sm">
                        <span className="font-semibold text-gray-900">{formatCurrency(cost)}</span>
                        <span className="text-xs text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Upcoming Schedule</h3>
          </div>
          {products.filter((p) => p.nextMaintenanceDate).length === 0 ? (
            <p className="text-sm text-gray-400 italic">No products scheduled</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {[...products]
                .filter((p) => p.nextMaintenanceDate)
                .sort((a, b) => new Date(a.nextMaintenanceDate) - new Date(b.nextMaintenanceDate))
                .slice(0, 8)
                .map((p) => {
                  const status = statusFromDue(p.nextMaintenanceDate);
                  return (
                    <div key={p._id} className="py-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(p.nextMaintenanceDate)}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${status.cls} shrink-0 ml-2`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {productModal && (
        <ProductFormModal
          product={productModal === 'create' ? null : productModal}
          onClose={() => setProductModal(null)}
        />
      )}
      {recordModal && (
        <RecordFormModal
          record={recordModal === 'create' || recordModal?.defaultProductId ? null : recordModal}
          defaultProductId={recordModal?.defaultProductId}
          products={products}
          onClose={() => setRecordModal(null)}
        />
      )}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          records={records}
          onClose={() => setDetailProduct(null)}
          onAddRecord={(productId) => {
            setDetailProduct(null);
            setRecordModal({ defaultProductId: productId });
          }}
          onEditProduct={(p) => {
            setDetailProduct(null);
            setProductModal(p);
          }}
          onEditRecord={(r) => {
            setDetailProduct(null);
            setRecordModal(r);
          }}
          onDeleteRecord={handleDeleteRecord}
        />
      )}
    </div>
  );
}
