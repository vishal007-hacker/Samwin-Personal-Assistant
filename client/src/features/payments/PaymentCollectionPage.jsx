import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Clock,
  X,
  Loader2,
  MessageCircle,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import api from '../../lib/axios';
import { formatCurrency, formatDate, generateWhatsAppLink, getDaysUntil } from '../../lib/utils';
import { useCreatePayment } from './paymentApi';

// ─── Data Fetchers ──────────────────────────────────────────────────────────

function useOverduePayments() {
  return useQuery({
    queryKey: ['dashboard', 'overdue'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/overdue');
      return data;
    },
  });
}

function useUpcomingReminders(days = 30) {
  return useQuery({
    queryKey: ['dashboard', 'upcoming-reminders', days],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/upcoming-reminders', { params: { days } });
      return data;
    },
  });
}

// ─── Record Payment Modal ───────────────────────────────────────────────────

function RecordPaymentModal({ item, onClose }) {
  const createPaymentMutation = useCreatePayment();

  const policyId = item?.policy?._id || item?.policyId || item?._id;
  const customerId = item?.customer?._id || item?.customerId;
  const defaultAmount = item?.policy?.premiumAmount || item?.premiumAmount || item?.amountDue || '';

  const [formData, setFormData] = useState({
    amount: defaultAmount,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPaymentMutation.mutateAsync({
        policy: policyId,
        customer: customerId,
        amount: Number(formData.amount),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
      });
      toast.success('Payment recorded successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <p className="text-gray-600">
            <span className="font-medium text-gray-800">
              {item?.customer?.name || item?.customerName || 'Customer'}
            </span>{' '}
            - Policy: {item?.policy?.policyNumber || item?.policyNumber || '-'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => handleChange('paymentDate', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => handleChange('paymentMethod', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) => handleChange('referenceNumber', e.target.value)}
              placeholder="e.g. cheque number, UPI ref"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPaymentMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {createPaymentMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PaymentCollectionPage() {
  const [paymentModalItem, setPaymentModalItem] = useState(null);

  const { data: overdueData, isLoading: overdueLoading } = useOverduePayments();
  const { data: upcomingData, isLoading: upcomingLoading } = useUpcomingReminders(30);

  const overdueItems = overdueData?.data || [];
  const upcomingItems = upcomingData?.data || [];

  const handleWhatsApp = (item) => {
    const phone = item?.customer?.phone || item?.customerPhone;
    const customerName = item?.customer?.name || item?.customerName || 'Customer';
    const policyNumber = item?.policy?.policyNumber || item?.policyNumber || '';
    const amount = item?.policy?.premiumAmount || item?.premiumAmount || item?.amountDue || 0;

    if (!phone) {
      toast.error('Customer phone number not available');
      return;
    }

    const message = `Dear ${customerName}, your insurance premium of ${formatCurrency(amount)} for policy ${policyNumber} is due. Please make the payment at your earliest convenience. Thank you.`;
    const link = generateWhatsAppLink(phone, message);
    window.open(link, '_blank');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Collection</h1>

      {/* Overdue Payments Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-2 p-5 border-b border-gray-200">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="font-semibold text-gray-800">Overdue Payments</h2>
          {overdueItems.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
              {overdueItems.length}
            </span>
          )}
        </div>

        {overdueLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-500">Loading...</span>
          </div>
        ) : overdueItems.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No overdue payments</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Policy No
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Scheme
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Days Overdue
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueItems.map((item, idx) => {
                  const dueDate = item.nextDueDate || item.dueDate;
                  const daysOverdue = dueDate ? Math.abs(getDaysUntil(dueDate)) : '-';

                  return (
                    <tr key={item._id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.customer?.name || item.customerName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.policy?.policyNumber || item.policyNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.scheme?.name || item.schemeName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(
                          item.amountDue || item.policy?.premiumAmount || item.premiumAmount
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(dueDate)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                          {daysOverdue} days
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPaymentModalItem(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Record Payment
                          </button>
                          <button
                            onClick={() => handleWhatsApp(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
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

      {/* Upcoming Payments Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 p-5 border-b border-gray-200">
          <Clock className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-800">Upcoming Payments (Next 30 Days)</h2>
          {upcomingItems.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
              {upcomingItems.length}
            </span>
          )}
        </div>

        {upcomingLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-500">Loading...</span>
          </div>
        ) : upcomingItems.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No upcoming payments in the next 30 days
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Policy No
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Scheme
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Days Until Due
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingItems.map((item, idx) => {
                  const dueDate = item.nextDueDate || item.dueDate;
                  const daysUntil = dueDate ? getDaysUntil(dueDate) : '-';

                  return (
                    <tr key={item._id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.customer?.name || item.customerName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.policy?.policyNumber || item.policyNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.scheme?.name || item.schemeName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(
                          item.amountDue || item.policy?.premiumAmount || item.premiumAmount
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(dueDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                            daysUntil <= 7
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {daysUntil} days
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPaymentModalItem(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Record Payment
                          </button>
                          <button
                            onClick={() => handleWhatsApp(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
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

      {/* Payment Modal */}
      {paymentModalItem && (
        <RecordPaymentModal item={paymentModalItem} onClose={() => setPaymentModalItem(null)} />
      )}
    </div>
  );
}
