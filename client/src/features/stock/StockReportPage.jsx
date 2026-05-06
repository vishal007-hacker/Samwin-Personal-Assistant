import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Package,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Filter,
} from 'lucide-react';
import { useStockReport, useBrands } from './stockApi';
import { formatCurrency, formatDate } from '../../lib/utils';

const CATEGORY_LABELS = {
  mobile: 'Mobile Stock',
  phone_accessory: 'Phone Accessories',
  computer_accessory: 'Computer Accessories',
};

export default function StockReportPage() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'mobile';
  const isMobile = category === 'mobile';
  const backPath = category === 'phone_accessory' ? '/stock/phone-accessories'
    : category === 'computer_accessory' ? '/stock/computer-accessories'
    : '/stock';

  const [filters, setFilters] = useState({ from: '', to: '', brand: '', status: '' });
  const { data, isLoading } = useStockReport(
    Object.fromEntries(Object.entries({ ...filters, category }).filter(([_, v]) => v))
  );
  const { data: brandsData } = useBrands(category);

  const report = data?.data || {};
  const items = report.items || [];
  const summary = report.summary || {};
  const brands = brandsData?.data || [];

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to={backPath} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to {CATEGORY_LABELS[category]}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{CATEGORY_LABELS[category]} Report</h1>
        <p className="text-sm text-gray-500 mt-1">Purchase and sales overview</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input type="date" value={filters.from} onChange={set('from')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input type="date" value={filters.to} onChange={set('to')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Brand</label>
            <select value={filters.brand} onChange={set('brand')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
              <option value="">All Brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={set('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
              <option value="">All</option>
              <option value="in_stock">In Stock</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Total Items</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{summary.totalItems || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">In Stock</span>
          </div>
          <p className="text-xl font-bold text-green-600">{summary.inStockCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500 font-medium">Sold</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{summary.soldCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500 font-medium">Total Purchase</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.totalPurchase || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            {(summary.totalProfit || 0) >= 0
              ? <TrendingUp className="w-4 h-4 text-green-500" />
              : <TrendingDown className="w-4 h-4 text-red-500" />
            }
            <span className="text-xs text-gray-500 font-medium">Profit / Loss</span>
          </div>
          <p className={`text-lg font-bold ${(summary.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.totalProfit || 0)}
          </p>
          <p className="text-xs text-gray-400">Sales: {formatCurrency(summary.totalSold || 0)}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">No items match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                  {isMobile && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Specs</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Final Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const profit = item.status === 'sold' && item.soldTo
                    ? (item.soldTo.finalPrice || 0) - item.purchasePrice
                    : null;
                  return (
                    <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{item.brand}</p>
                        <p className="text-xs text-gray-500">{item.model}</p>
                      </td>
                      {isMobile && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.ram} / {item.storage}
                          {item.displaySize && <span className="text-gray-400"> | {item.displaySize}</span>}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(item.purchasePrice)}</p>
                        {item.purchasedFrom && <p className="text-xs text-gray-400">{item.purchasedFrom}</p>}
                        <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                          item.status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status === 'in_stock' ? 'In Stock' : 'Sold'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.soldTo ? (
                          <>
                            <p className="font-medium">{item.soldTo.customerName}</p>
                            <p className="text-xs text-gray-400">{item.soldTo.contactNumber}</p>
                            {item.soldAt && <p className="text-xs text-gray-400">{formatDate(item.soldAt)}</p>}
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.soldTo ? formatCurrency(item.soldTo.finalPrice) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {profit !== null ? (
                          <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
