import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Loader2,
  Package,
  Edit3,
  Trash2,
  ShoppingCart,
  X,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStocks, useBrands, useCreateStock, useUpdateStock, useSellStock, useDeleteStock } from './stockApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency } from '../../lib/utils';

// ── Brand Options ───────────────────────────────────────────────────────────

const BRAND_OPTIONS = {
  mobile: [
    'Samsung', 'Apple', 'Xiaomi', 'Redmi', 'POCO', 'Realme', 'OnePlus', 'Vivo',
    'Oppo', 'Motorola', 'Nokia', 'Nothing', 'Google', 'iQOO', 'Tecno', 'Infinix', 'Other',
  ],
  phone_accessory: [
    'Samsung', 'Apple', 'Boat', 'JBL', 'Realme', 'OnePlus', 'MI', 'Anker',
    'Baseus', 'Spigen', 'Portronics', 'pTron', 'Ambrane', 'Other',
  ],
  computer_accessory: [
    'HP', 'Dell', 'Lenovo', 'Logitech', 'Asus', 'Acer', 'MSI', 'Corsair',
    'HyperX', 'TP-Link', 'D-Link', 'Seagate', 'Western Digital', 'Kingston', 'Other',
  ],
};

const CATEGORY_CONFIG = {
  mobile: { title: 'Mobile Stock', subtitle: 'Manage your mobile inventory', hasSpecs: true },
  phone_accessory: { title: 'Phone Accessories', subtitle: 'Manage phone accessories inventory', hasSpecs: false },
  computer_accessory: { title: 'Computer Accessories', subtitle: 'Manage computer accessories inventory', hasSpecs: false },
};

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} p-6 z-10 max-h-[90vh] overflow-y-auto`}>
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

// ── Stock Form (Create / Edit) ──────────────────────────────────────────────

function StockFormModal({ stock, brands, onClose, category = 'mobile' }) {
  const isEdit = !!stock;
  const createMutation = useCreateStock();
  const updateMutation = useUpdateStock();
  const config = CATEGORY_CONFIG[category];

  const [form, setForm] = useState({
    brand: stock?.brand || '',
    model: stock?.model || '',
    ram: stock?.ram || '',
    storage: stock?.storage || '',
    displaySize: stock?.displaySize || '',
    displayQuality: stock?.displayQuality || '',
    network: stock?.network || '',
    color: stock?.color || '',
    purchasePrice: stock?.purchasePrice || '',
    sellingPrice: stock?.sellingPrice || '',
    purchasedFrom: stock?.purchasedFrom || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        category,
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
      };
      if (!config.hasSpecs) {
        delete payload.ram;
        delete payload.storage;
        delete payload.displaySize;
        delete payload.displayQuality;
        delete payload.network;
        delete payload.color;
      }
      if (isEdit) {
        await mutation.mutateAsync({ id: stock._id, ...payload });
        toast.success('Stock updated!');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Stock added!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const defaultBrands = BRAND_OPTIONS[category] || BRAND_OPTIONS.mobile;
  const allBrands = [...new Set([...defaultBrands, ...(brands || [])])].sort();

  return (
    <Modal title={isEdit ? 'Edit Item' : 'Add New Item'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
            <select value={form.brand} onChange={set('brand')} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
              <option value="">Select Brand</option>
              {allBrands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{config.hasSpecs ? 'Model' : 'Item Name'} *</label>
            <input type="text" value={form.model} onChange={set('model')} required
              placeholder={config.hasSpecs ? 'e.g. Galaxy S24 Ultra' : 'e.g. USB Cable, Mouse Pad'}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          {config.hasSpecs && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAM *</label>
                <input type="text" value={form.ram} onChange={set('ram')} required placeholder="e.g. 8GB"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage *</label>
                <input type="text" value={form.storage} onChange={set('storage')} required placeholder="e.g. 256GB"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Size</label>
                <input type="text" value={form.displaySize} onChange={set('displaySize')} placeholder="e.g. 6.8 inch"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Quality</label>
                <input type="text" value={form.displayQuality} onChange={set('displayQuality')} placeholder="e.g. AMOLED, 120Hz"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                <select value={form.network} onChange={set('network')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                  <option value="">Select</option>
                  <option value="4G">4G</option>
                  <option value="5G">5G</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input type="text" value={form.color} onChange={set('color')} placeholder="e.g. Blue, Black"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price *</label>
            <input type="number" value={form.purchasePrice} onChange={set('purchasePrice')} required min="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
            <input type="number" value={form.sellingPrice} onChange={set('sellingPrice')} required min="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchased From</label>
            <input type="text" value={form.purchasedFrom} onChange={set('purchasedFrom')} placeholder="e.g. Distributor name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Sell Modal ───────────────────────────────────────────────────────────────

function SellModal({ stock, onClose }) {
  const sellMutation = useSellStock();
  const [form, setForm] = useState({
    customerName: '',
    contactNumber: '',
    finalPrice: stock?.sellingPrice || '',
    complements: '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await sellMutation.mutateAsync({
        id: stock._id,
        ...form,
        finalPrice: Number(form.finalPrice),
      });
      toast.success('Item sold successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const profit = form.finalPrice ? Number(form.finalPrice) - stock.purchasePrice : 0;

  return (
    <Modal title="Sell Item" onClose={onClose}>
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
        <p className="font-semibold text-gray-900">#{stock.uniqueCode} — {stock.brand} {stock.model}</p>
        <p className="text-gray-500">{stock.ram} / {stock.storage}</p>
        <p className="text-gray-500">Purchase: {formatCurrency(stock.purchasePrice)} | MRP: {formatCurrency(stock.sellingPrice)}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
          <input type="text" value={form.customerName} onChange={set('customerName')} required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
          <input type="text" value={form.contactNumber} onChange={set('contactNumber')} required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Final Price *</label>
          <input type="number" value={form.finalPrice} onChange={set('finalPrice')} required min="0"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          {form.finalPrice && (
            <p className={`text-xs mt-1 font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(profit))}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Complements</label>
          <textarea value={form.complements} onChange={set('complements')} rows={2} placeholder="Accessories, warranty info, etc."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={sellMutation.isPending} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors">
            {sellMutation.isPending ? 'Processing...' : 'Sell'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function StockListPage({ category = 'mobile' }) {
  const config = CATEGORY_CONFIG[category];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('in_stock');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useStocks({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    category,
  });
  const { data: brandsData } = useBrands(category);
  const deleteMutation = useDeleteStock();

  const stocks = data?.data || [];
  const pagination = data?.pagination || {};
  const brands = brandsData?.data || [];

  const [formModal, setFormModal] = useState(null);
  const [sellModal, setSellModal] = useState(null);

  const handleDelete = async (stock) => {
    if (!confirm(`Delete ${stock.brand} ${stock.model}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(stock._id);
      toast.success('Stock deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{config.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/stock/report?category=${category}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" /> Report
          </Link>
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Stock
          </button>
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
              placeholder="Search by brand or model..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'in_stock', label: 'In Stock' },
              { value: 'sold', label: 'Sold' },
              { value: '', label: 'All' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  statusFilter === opt.value
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

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No stock items found</p>
            <button
              onClick={() => setFormModal('create')}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Add your first item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{config.hasSpecs ? 'Brand & Model' : 'Brand & Item'}</th>
                  {config.hasSpecs && (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">RAM</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Network</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Color</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Selling</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchased</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold To</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stocks.map((item, idx) => {
                  const profit = item.status === 'sold' && item.soldTo
                    ? (item.soldTo.finalPrice || 0) - item.purchasePrice
                    : null;
                  return (
                    <tr key={item._id} className={`hover:bg-gray-50/50 transition-colors ${item.status === 'sold' ? 'bg-gray-50/30' : ''}`}>
                      {/* Code */}
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                        {item.uniqueCode}
                      </td>

                      {/* Brand & Model */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{item.brand}</p>
                        <p className="text-xs text-gray-500">{item.model}</p>
                      </td>

                      {/* RAM, Storage, Color (mobile only) */}
                      {config.hasSpecs && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.ram || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.storage || '-'}</td>
                          <td className="px-4 py-3">
                            {item.network ? (
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${item.network === '5G' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.network}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.color || '-'}</td>
                        </>
                      )}

                      {/* Purchase Price */}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(item.purchasePrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(item.sellingPrice)}
                      </td>

                      {/* Purchased From & Date */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{item.purchasedFrom || '-'}</p>
                        <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                          item.status === 'in_stock'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status === 'in_stock' ? 'In Stock' : 'Sold'}
                        </span>
                      </td>

                      {/* Sold To */}
                      <td className="px-4 py-3">
                        {item.status === 'sold' && item.soldTo ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.soldTo.customerName}</p>
                            <p className="text-xs text-gray-400">{item.soldTo.contactNumber}</p>
                            <p className="text-xs text-gray-500">Price: {formatCurrency(item.soldTo.finalPrice)}</p>
                            {profit !== null && (
                              <p className={`text-xs font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(profit))}
                              </p>
                            )}
                            {item.soldTo.complements && (
                              <p className="text-xs text-gray-400 truncate max-w-[150px]" title={item.soldTo.complements}>
                                {item.soldTo.complements}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'in_stock' && (
                            <>
                              <button
                                onClick={() => setSellModal(item)}
                                title="Sell"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" /> Sell
                              </button>
                              <button
                                onClick={() => setFormModal(item)}
                                title="Edit"
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(item)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
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
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} items)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {formModal && (
        <StockFormModal
          stock={formModal === 'create' ? null : formModal}
          brands={brands}
          category={category}
          onClose={() => setFormModal(null)}
        />
      )}
      {sellModal && (
        <SellModal stock={sellModal} onClose={() => setSellModal(null)} />
      )}
    </div>
  );
}
