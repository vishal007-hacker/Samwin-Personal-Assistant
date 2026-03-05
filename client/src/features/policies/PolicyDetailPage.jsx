import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Shield,
  Heart,
  FileText,
  Plus,
  X,
  Loader2,
  MessageCircle,
  Download,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  statusColors,
  frequencyLabel,
  generateWhatsAppLink,
  getDaysUntil,
} from '../../lib/utils';
import { usePolicy } from './policyApi';
import { usePolicyPayments, useCreatePayment } from '../payments/paymentApi';

// ─── Record Payment Modal ───────────────────────────────────────────────────

function RecordPaymentModal({ policy, onClose }) {
  const createPaymentMutation = useCreatePayment();

  const [formData, setFormData] = useState({
    amount: policy?.premiumAmount || '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'cash',
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
        policy: policy._id,
        customer: policy.customer?._id || policy.customer,
        amount: Number(formData.amount),
        paymentDate: formData.paymentDate,
        method: formData.method,
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
              value={formData.method}
              onChange={(e) => handleChange('method', e.target.value)}
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

// ─── Info Card Component ────────────────────────────────────────────────────

function InfoCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '-'}</span>
    </div>
  );
}

// ─── Main Detail Page ───────────────────────────────────────────────────────

export default function PolicyDetailPage() {
  const { id } = useParams();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: policyData, isLoading, isError } = usePolicy(id);
  const policy = policyData?.data;

  const { data: paymentsData, isLoading: paymentsLoading } = usePolicyPayments(id);
  const payments = paymentsData?.data || [];

  const handleWhatsAppReminder = () => {
    if (!policy?.customer?.phone) {
      toast.error('Customer phone number not available');
      return;
    }
    const message = `Dear ${policy.customer.name}, this is a reminder for your insurance policy ${policy.policyNumber}. Your premium of ${formatCurrency(policy.premiumAmount)} is due. Please make the payment at your earliest convenience. Thank you.`;
    const link = generateWhatsAppLink(policy.customer.phone, message);
    window.open(link, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">Failed to load policy details.</p>
        <Link to="/policies" className="text-blue-600 hover:underline">
          Back to Policies
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/policies"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{policy.policyNumber}</h1>
            <span
              className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                statusColors[policy.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {policy.status?.charAt(0).toUpperCase() + policy.status?.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleWhatsAppReminder}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-green-300 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Send WhatsApp Reminder
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Policy Details */}
        <InfoCard title="Policy Details" icon={FileText}>
          <div className="divide-y divide-gray-100">
            <InfoRow label="Policy Number" value={policy.policyNumber} />
            <InfoRow label="Start Date" value={formatDate(policy.startDate)} />
            <InfoRow label="Maturity Date" value={formatDate(policy.maturityDate)} />
            <InfoRow label="Premium Amount" value={formatCurrency(policy.premiumAmount)} />
            <InfoRow
              label="Frequency"
              value={frequencyLabel[policy.premiumFrequency] || policy.premiumFrequency}
            />
            <InfoRow label="Sum Assured" value={formatCurrency(policy.sumAssured)} />
            <InfoRow label="Next Due Date" value={formatDate(policy.nextDueDate)} />
            {policy.nextDueDate && (
              <InfoRow
                label="Days Until Due"
                value={(() => {
                  const days = getDaysUntil(policy.nextDueDate);
                  if (days === null) return '-';
                  if (days < 0) return `${Math.abs(days)} days overdue`;
                  if (days === 0) return 'Due today';
                  return `${days} days`;
                })()}
              />
            )}
          </div>
        </InfoCard>

        {/* Customer Info */}
        <InfoCard title="Customer Information" icon={User}>
          <div className="divide-y divide-gray-100">
            <InfoRow label="Name" value={policy.customer?.name} />
            <InfoRow label="Phone" value={policy.customer?.phone} />
            <InfoRow label="Email" value={policy.customer?.email} />
            {policy.customer?.address && (
              <InfoRow
                label="Address"
                value={[
                  policy.customer.address.street,
                  policy.customer.address.city,
                  policy.customer.address.state,
                ]
                  .filter(Boolean)
                  .join(', ')}
              />
            )}
          </div>
        </InfoCard>

        {/* Scheme Info */}
        <InfoCard title="Scheme Information" icon={Shield}>
          <div className="divide-y divide-gray-100">
            <InfoRow label="Scheme Name" value={policy.scheme?.name} />
            <InfoRow
              label="Type"
              value={
                policy.scheme?.type
                  ? policy.scheme.type.charAt(0).toUpperCase() + policy.scheme.type.slice(1)
                  : '-'
              }
            />
            <InfoRow label="Company" value={policy.scheme?.company} />
          </div>
        </InfoCard>

        {/* Nominee Info */}
        <InfoCard title="Nominee Information" icon={Heart}>
          {policy.nominee?.name ? (
            <div className="divide-y divide-gray-100">
              <InfoRow label="Name" value={policy.nominee.name} />
              <InfoRow label="Relationship" value={policy.nominee.relationship} />
              <InfoRow label="Phone" value={policy.nominee.phone} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">No nominee information</p>
          )}
        </InfoCard>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" /> Payment History
          </h3>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-4 h-4" /> Add Payment
          </button>
        </div>

        {paymentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No payment records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                      {payment.method?.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payment.referenceNumber || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Documents
          </h3>
        </div>

        {policy.documents && policy.documents.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {policy.documents.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{doc.name || doc.filename}</p>
                    {doc.uploadedAt && (
                      <p className="text-xs text-gray-400">Uploaded {formatDate(doc.uploadedAt)}</p>
                    )}
                  </div>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-gray-400">No documents uploaded</div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal policy={policy} onClose={() => setShowPaymentModal(false)} />
      )}
    </div>
  );
}
