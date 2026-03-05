import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  User,
  Phone,
  Mail,
  IndianRupee,
  ArrowUpCircle,
  XCircle,
  MessageCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCredit, useCreditsByCustomer, useTopupCredit, usePayCredit, useCloseCredit } from './creditApi';
import { formatCurrency, formatDate, getDaysUntil, generateWhatsAppLink } from '../../lib/utils';

// ── Transaction Type Config ──────────────────────────────────────────────────

const txnConfig = {
  credit: { label: 'Credit', bg: 'bg-blue-50', text: 'text-blue-700', sign: '+' },
  topup: { label: 'Top-up', bg: 'bg-purple-50', text: 'text-purple-700', sign: '+' },
  payment: { label: 'Payment', bg: 'bg-green-50', text: 'text-green-700', sign: '-' },
};

// ── Status Badge ─────────────────────────────────────────────────────────────

function CreditStatusBadge({ credit }) {
  if (credit.status === 'closed') {
    return <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">Closed</span>;
  }
  const daysUntil = getDaysUntil(credit.dueDate);
  if (daysUntil !== null && daysUntil < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        <AlertTriangle className="w-3 h-3" />{Math.abs(daysUntil)}d overdue
      </span>
    );
  }
  if (daysUntil !== null && daysUntil <= 7) {
    return <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">{daysUntil}d left</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Open</span>;
}

// ── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
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

// ── Topup Modal ──────────────────────────────────────────────────────────────

function TopupModal({ credit, onClose }) {
  const topupMutation = useTopupCredit();
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await topupMutation.mutateAsync({ id: credit._id, amount: Number(amount), dueDate, notes });
      toast.success('Credit topped up!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title="Top-up Credit" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={topupMutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {topupMutation.isPending ? 'Saving...' : 'Top-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ credit, onClose }) {
  const payMutation = usePayCredit();
  const [amount, setAmount] = useState(credit.balanceAmount || '');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await payMutation.mutateAsync({ id: credit._id, amount: Number(amount), notes });
      toast.success(Number(amount) >= credit.balanceAmount ? 'Credit closed!' : 'Payment recorded!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title="Collect Payment" onClose={onClose}>
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
        <p className="text-gray-600">Balance: <span className="font-semibold text-gray-900">{formatCurrency(credit.balanceAmount)}</span></p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" max={credit.balanceAmount}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          <p className="text-xs text-gray-400 mt-1">Max: {formatCurrency(credit.balanceAmount)}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={payMutation.isPending} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors">
            {payMutation.isPending ? 'Saving...' : 'Collect Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Single Credit Card (expandable) ──────────────────────────────────────────

function CreditCard({ credit, isCurrent, onCollect, onTopup, onClose, onWhatsApp }) {
  const [expanded, setExpanded] = useState(isCurrent);

  const daysUntil = getDaysUntil(credit.dueDate);
  const isOverdue = credit.status === 'open' && daysUntil !== null && daysUntil < 0;
  const totalCredits = credit.transactions.filter(t => t.type === 'credit' || t.type === 'topup').reduce((s, t) => s + t.amount, 0);
  const totalPayments = credit.transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

  return (
    <div className={`bg-white rounded-xl border ${isCurrent ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'} overflow-hidden`}>
      {/* Credit Header - always visible */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <CreditStatusBadge credit={credit} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{credit.reason}</p>
            <p className="text-xs text-gray-500">Due: {formatDate(credit.dueDate)} &middot; Created: {formatDate(credit.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{formatCurrency(credit.balanceAmount)}</p>
            <p className="text-xs text-gray-400">of {formatCurrency(credit.totalAmount)}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Action buttons */}
          {credit.status === 'open' && (
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); onCollect(credit); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <IndianRupee className="w-3.5 h-3.5" /> Collect Payment
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onTopup(credit); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> Top-up
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onWhatsApp(credit); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(credit); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Close
              </button>
            </div>
          )}

          {/* Transaction table */}
          {credit.transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...credit.transactions].reverse().map((txn, idx) => {
                    const config = txnConfig[txn.type] || txnConfig.credit;
                    const isChunk = txn.type === 'credit' || txn.type === 'topup';
                    const fullyPaid = isChunk && (txn.paidAmount || 0) >= txn.amount;
                    return (
                      <tr key={txn._id || idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-2.5 text-sm text-gray-700">{formatDate(txn.date)}</td>
                        <td className="px-5 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-sm font-semibold">
                          <span className={txn.type === 'payment' ? 'text-green-600' : 'text-blue-600'}>
                            {config.sign}{formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-sm text-gray-700">
                          {isChunk && txn.dueDate ? formatDate(txn.dueDate) : '-'}
                        </td>
                        <td className="px-5 py-2.5 text-sm">
                          {isChunk ? (
                            <span className={`font-medium ${fullyPaid ? 'text-green-600' : 'text-amber-600'}`}>
                              {formatCurrency(txn.paidAmount || 0)} / {formatCurrency(txn.amount)}
                              {fullyPaid && ' ✓'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-5 py-2.5 text-sm text-gray-500">{txn.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-2.5">
            <div className="flex flex-wrap gap-6 text-xs">
              <div>
                <span className="text-gray-500">Credits/Top-ups: </span>
                <span className="font-semibold text-blue-700">{formatCurrency(totalCredits)}</span>
              </div>
              <div>
                <span className="text-gray-500">Payments: </span>
                <span className="font-semibold text-green-700">{formatCurrency(totalPayments)}</span>
              </div>
              <div>
                <span className="text-gray-500">Outstanding: </span>
                <span className={`font-semibold ${credit.balanceAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatCurrency(credit.balanceAmount)}
                </span>
              </div>
              {credit.notes && (
                <div>
                  <span className="text-gray-500">Notes: </span>
                  <span className="text-gray-700">{credit.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Detail Page ─────────────────────────────────────────────────────────

export default function CreditDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useCredit(id);
  const closeMutation = useCloseCredit();

  const [modalCredit, setModalCredit] = useState(null);
  const [modalType, setModalType] = useState(null); // 'topup' | 'payment'

  const credit = data?.data;
  const customerId = credit?.customer?._id;

  // Fetch ALL credits for this customer
  const { data: allCreditsData } = useCreditsByCustomer(customerId);
  const allCredits = allCreditsData?.data || [];

  // Separate into open (sorted by earliest due date) and closed
  const openCredits = allCredits.filter(c => c.status === 'open').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const closedCredits = allCredits.filter(c => c.status === 'closed');

  // Grand totals across all credits
  const grandTotalCredit = allCredits.reduce((s, c) => s + c.totalAmount, 0);
  const grandTotalBalance = allCredits.reduce((s, c) => s + c.balanceAmount, 0);
  const grandTotalPaid = allCredits.reduce((s, c) => {
    return s + c.transactions.filter(t => t.type === 'payment').reduce((ps, t) => ps + t.amount, 0);
  }, 0);

  // Next due date = earliest open credit's due date
  const nextDueCredit = openCredits[0];

  const handleClose = async (creditItem) => {
    if (!confirm(`Close this credit? Remaining balance of ${formatCurrency(creditItem.balanceAmount)} will be written off.`)) return;
    try {
      await closeMutation.mutateAsync(creditItem._id);
      toast.success('Credit closed. Due date shifted to next credit.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleWhatsApp = (creditItem) => {
    const phone = creditItem.customer?.phone || credit?.customer?.phone;
    if (!phone) { toast.error('No phone number'); return; }
    const name = creditItem.customer?.name || credit?.customer?.name || 'Customer';
    const dueDate = creditItem.dueDate ? new Date(creditItem.dueDate).toLocaleDateString('en-IN') : 'N/A';
    const message = `Dear ${name},\n\nThis is a reminder about your credit of ${formatCurrency(creditItem.balanceAmount)} (Reason: ${creditItem.reason}) which was due on ${dueDate}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\nSamwin Infotech`;
    window.open(generateWhatsAppLink(phone, message), '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Loading credit details...</span>
      </div>
    );
  }

  if (isError || !credit) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">Credit not found or failed to load.</p>
        <Link to="/credits" className="text-blue-600 hover:underline mt-2 inline-block">Back to Credits</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back + Header */}
      <div className="mb-6">
        <Link to="/credits" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Credits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Customer Credit Report</h1>
        <p className="text-sm text-gray-500 mt-1">{credit.customer?.name}</p>
      </div>

      {/* Customer Info + Grand Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{credit.customer?.name || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{credit.customer?.phone || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{credit.customer?.email || '-'}</span>
            </div>
          </div>
        </div>

        {/* Grand Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Overall Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Credits</span>
              <span className="font-semibold text-blue-700">{formatCurrency(grandTotalCredit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-semibold text-green-700">{formatCurrency(grandTotalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Outstanding</span>
              <span className={`font-semibold ${grandTotalBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {formatCurrency(grandTotalBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Due Date Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Due Date Priority</h2>
          {openCredits.length === 0 ? (
            <p className="text-sm text-gray-500">No open credits</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Next Due</span>
                <span className="font-semibold text-gray-900">{formatDate(nextDueCredit.dueDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">{formatCurrency(nextDueCredit.balanceAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Open Credits</span>
                <span className="font-semibold text-gray-900">{openCredits.length}</span>
              </div>
              {nextDueCredit && getDaysUntil(nextDueCredit.dueDate) !== null && getDaysUntil(nextDueCredit.dueDate) < 0 && (
                <div className="flex items-center gap-1 text-xs font-semibold text-red-600 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {Math.abs(getDaysUntil(nextDueCredit.dueDate))} days overdue
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Open Credits */}
      {openCredits.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
            Open Credits ({openCredits.length})
            <span className="text-xs font-normal text-gray-400 ml-2">sorted by earliest due date</span>
          </h2>
          <div className="space-y-3">
            {openCredits.map((c, idx) => (
              <CreditCard
                key={c._id}
                credit={c}
                isCurrent={c._id === id}
                onCollect={(cr) => { setModalCredit(cr); setModalType('payment'); }}
                onTopup={(cr) => { setModalCredit(cr); setModalType('topup'); }}
                onClose={handleClose}
                onWhatsApp={handleWhatsApp}
              />
            ))}
          </div>
        </div>
      )}

      {/* Closed Credits */}
      {closedCredits.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
            Closed Credits ({closedCredits.length})
          </h2>
          <div className="space-y-3">
            {closedCredits.map((c) => (
              <CreditCard
                key={c._id}
                credit={c}
                isCurrent={c._id === id}
                onCollect={() => {}}
                onTopup={() => {}}
                onClose={() => {}}
                onWhatsApp={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {modalCredit && modalType === 'topup' && (
        <TopupModal credit={modalCredit} onClose={() => { setModalCredit(null); setModalType(null); }} />
      )}
      {modalCredit && modalType === 'payment' && (
        <PaymentModal credit={modalCredit} onClose={() => { setModalCredit(null); setModalType(null); }} />
      )}
    </div>
  );
}
