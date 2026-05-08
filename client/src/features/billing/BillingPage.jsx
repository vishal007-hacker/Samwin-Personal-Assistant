import { useState, useRef } from 'react';
import {
  Plus, Search, Loader2, Trash2, Eye, Edit3, Printer, X,
  FileText, Receipt, ClipboardList, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useBillings, useBilling, useNextNumber,
  useCreateBilling, useDeleteBilling,
} from './billingApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate, exportCSV } from '../../lib/utils';

// ── Company Details ─────────────────────────────────────────────────────────

const COMPANY = {
  name: 'Samwin Infotech',
  address: '14-5-10D, TVK Street, Near CSI Church,\nSambavarvadakarai - 627856, Tenkasi',
  phone1: '9566181510',
  phone2: '9944514911',
  gst: '33CQNPS0562L1ZM',
};

// ── Number to words (Indian) ────────────────────────────────────────────────

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100);
  let result = convert(whole) + ' Rupees';
  if (decimal > 0) result += ' and ' + convert(decimal) + ' Paise';
  result += ' Only';
  return result;
}

// ── Print-ready Invoice Component ───────────────────────────────────────────

function InvoicePrint({ billing, onClose }) {
  const printRef = useRef(null);
  const b = billing;
  const typeLabel = b.type === 'invoice' ? 'TAX INVOICE' : b.type === 'quotation' ? 'QUOTATION' : 'RECEIPT';

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`<!DOCTYPE html><html><head><title>${b.number} - ${typeLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 0; }
  @page { size: A4; margin: 10mm; }
  .invoice-container { max-width: 210mm; margin: 0 auto; padding: 16px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 12px; }
  .company-name { font-size: 22px; font-weight: 800; color: #1e40af; letter-spacing: 0.5px; }
  .company-details { font-size: 11px; color: #444; margin-top: 4px; line-height: 1.5; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { font-size: 18px; font-weight: 700; color: #1e40af; letter-spacing: 1px; }
  .invoice-title .number { font-size: 13px; font-weight: 600; color: #333; margin-top: 2px; }
  .invoice-title .date { font-size: 11px; color: #666; margin-top: 2px; }
  .gst-badge { display: inline-block; background: #1e40af; color: white; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; margin-top: 6px; }
  .billing-info { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 16px; }
  .billing-box { flex: 1; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
  .billing-box h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; font-weight: 600; }
  .billing-box p { font-size: 11px; line-height: 1.6; color: #334155; }
  .billing-box .name { font-weight: 700; font-size: 13px; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table thead th { background: #1e40af; color: white; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; text-align: left; }
  table thead th:first-child { border-radius: 4px 0 0 0; }
  table thead th:last-child { border-radius: 0 4px 0 0; text-align: right; }
  table thead th.right { text-align: right; }
  table thead th.center { text-align: center; }
  table tbody td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
  table tbody td.right { text-align: right; }
  table tbody td.center { text-align: center; }
  table tbody tr:nth-child(even) { background: #f9fafb; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  .totals-box { width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; color: #555; }
  .total-row.grand { border-top: 2px solid #1e40af; margin-top: 6px; padding-top: 8px; font-size: 14px; font-weight: 800; color: #1e40af; }
  .amount-words { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 8px 14px; margin-bottom: 16px; }
  .amount-words span { font-size: 10px; color: #6366f1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .amount-words p { font-size: 11px; color: #1e1b4b; font-weight: 500; margin-top: 2px; }
  .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 14px; margin-bottom: 16px; }
  .notes-box span { font-size: 10px; color: #d97706; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .notes-box p { font-size: 11px; color: #78350f; margin-top: 2px; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
  .footer-left { font-size: 10px; color: #999; }
  .footer-right { text-align: right; }
  .footer-right .sign-line { width: 180px; border-top: 1px solid #999; margin-bottom: 4px; margin-left: auto; }
  .footer-right p { font-size: 11px; color: #555; }
  .footer-right .company { font-weight: 700; color: #1e40af; }
  @media print { body { padding: 0; } .invoice-container { padding: 0; } }
</style></head><body>${printContent}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[850px] mx-4">
        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">Preview — {b.number}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Print content */}
        <div ref={printRef} className="p-6">
          <div className="invoice-container" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '12px', color: '#1a1a1a' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1e40af', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <img src="/logo.png" alt="Samwin Infotech" style={{ width: '52px', height: '52px', objectFit: 'contain', marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e40af', letterSpacing: '0.5px' }}>{COMPANY.name}</div>
                <div style={{ fontSize: '11px', color: '#444', marginTop: '4px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{COMPANY.address}</div>
                <div style={{ fontSize: '11px', color: '#444' }}>Ph: {COMPANY.phone1}, {COMPANY.phone2}</div>
                {b.type === 'invoice' && (
                  <div style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', marginTop: '6px' }}>
                    GSTIN: {COMPANY.gst}
                  </div>
                )}
              </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e40af', letterSpacing: '1px' }}>{typeLabel}</h2>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginTop: '2px' }}>{b.number}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Date: {formatDate(b.date)}</div>
              </div>
            </div>

            {/* Bill To */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Bill To</h4>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{b.customer?.name}</p>
                {b.customer?.address && <p style={{ fontSize: '11px', color: '#334155', whiteSpace: 'pre-line' }}>{b.customer.address}</p>}
                {b.customer?.phone && <p style={{ fontSize: '11px', color: '#334155' }}>Ph: {b.customer.phone}</p>}
                {b.type !== 'receipt' && b.customer?.gst && <p style={{ fontSize: '11px', color: '#334155' }}>GSTIN: {b.customer.gst}</p>}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1e40af', color: 'white', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'left', borderRadius: '4px 0 0 0' }}>#</th>
                  <th style={{ background: '#1e40af', color: 'white', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'left' }}>Description</th>
                  {b.type !== 'receipt' && <th style={{ background: '#1e40af', color: 'white', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'center' }}>HSN</th>}
                  <th style={{ background: '#1e40af', color: 'white', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'center' }}>Qty</th>
                  <th style={{ background: '#1e40af', color: 'white', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'right' }}>Price</th>
                  <th style={{ background: '#1e40af', color: 'white', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'right', borderRadius: '0 4px 0 0' }}>Taxable Value</th>
                </tr>
              </thead>
              <tbody>
                {(b.items || []).map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? '#f9fafb' : 'white' }}>
                    <td style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #e5e7eb' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #e5e7eb', fontWeight: 500 }}>{item.description}</td>
                    {b.type !== 'receipt' && <td style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>{item.hsn || '-'}</td>}
                    <td style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>{item.quantity} {item.unit || ''}</td>
                    <td style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                    <td style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.taxableValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <div style={{ width: '280px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '11px', color: '#555' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(b.subtotal)}</span>
                </div>
                {b.cgstAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '11px', color: '#555' }}>
                    <span>CGST ({b.cgstRate}%)</span>
                    <span>{formatCurrency(b.cgstAmount)}</span>
                  </div>
                )}
                {b.sgstAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '11px', color: '#555' }}>
                    <span>SGST ({b.sgstRate}%)</span>
                    <span>{formatCurrency(b.sgstAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1e40af', marginTop: '6px', paddingTop: '8px', fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>
                  <span>Total</span>
                  <span>{formatCurrency(b.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Amount in words */}
            <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '8px 14px', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount in Words</span>
              <p style={{ fontSize: '11px', color: '#1e1b4b', fontWeight: 500, marginTop: '2px' }}>{numberToWords(b.totalAmount)}</p>
            </div>

            {/* Notes */}
            {b.notes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 14px', marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</span>
                <p style={{ fontSize: '11px', color: '#78350f', marginTop: '2px', whiteSpace: 'pre-line' }}>{b.notes}</p>
              </div>
            )}

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ width: '180px', borderTop: '1px solid #999', marginBottom: '4px', marginLeft: 'auto' }}></div>
                <p style={{ fontSize: '11px', color: '#555' }}>Authorized Signatory</p>
                <p style={{ fontWeight: 700, color: '#1e40af', fontSize: '11px' }}>For {COMPANY.name}</p>
              </div>
            </div>

            {/* Footer — Services */}
            <div style={{ borderTop: '2px solid #1e40af', paddingTop: '10px', marginTop: '8px' }}>
              <p style={{ fontSize: '10px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Our Services</p>
              <p style={{ fontSize: '10px', color: '#555', lineHeight: 1.6 }}>
                Computers, Printers, Laptops, Mobiles, CCTV Cameras Sales and Service. Billing Software, Website Design, Mobile Application and all IT Related Hardware and Software Services.
              </p>
              <p style={{ fontSize: '9px', color: '#aaa', marginTop: '6px', textAlign: 'center' }}>Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Billing Form Modal ──────────────────────────────────────────────────────

function BillingFormModal({ type, onClose }) {
  const createMutation = useCreateBilling();
  const { data: nextData } = useNextNumber(type);
  const nextNumber = nextData?.data?.nextNumber || '...';

  const typeLabel = type === 'invoice' ? 'Invoice' : type === 'quotation' ? 'Quotation' : 'Receipt';

  const [customer, setCustomer] = useState({ name: '', address: '', phone: '', gst: '' });
  const [items, setItems] = useState([{ description: '', hsn: '', quantity: 1, unit: 'Nos', price: '', taxableValue: 0 }]);
  const [cgstRate, setCgstRate] = useState(type === 'invoice' ? 9 : 0);
  const [sgstRate, setSgstRate] = useState(type === 'invoice' ? 9 : 0);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const setCustomerField = (key) => (e) => setCustomer((c) => ({ ...c, [key]: e.target.value }));

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? Number(value) || 0 : Number(next[index].quantity) || 0;
        const price = field === 'price' ? Number(value) || 0 : Number(next[index].price) || 0;
        next[index].taxableValue = qty * price;
      }
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { description: '', hsn: '', quantity: 1, unit: 'Nos', price: '', taxableValue: 0 }]);
  const removeItem = (idx) => setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const subtotal = items.reduce((s, i) => s + (Number(i.taxableValue) || 0), 0);
  const cgstAmount = Math.round((subtotal * (Number(cgstRate) || 0)) / 100);
  const sgstAmount = Math.round((subtotal * (Number(sgstRate) || 0)) / 100);
  const totalAmount = subtotal + cgstAmount + sgstAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.name.trim()) return toast.error('Customer name is required');
    if (items.some((i) => !i.description.trim())) return toast.error('All items need a description');
    if (items.some((i) => !i.price || Number(i.price) <= 0)) return toast.error('All items need a valid price');

    try {
      const payload = {
        type,
        date,
        customer,
        showGst: type === 'invoice',
        items: items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          price: Number(i.price),
          taxableValue: Number(i.taxableValue),
        })),
        subtotal,
        cgstRate: Number(cgstRate),
        sgstRate: Number(sgstRate),
        cgstAmount,
        sgstAmount,
        totalAmount,
        notes,
      };

      await createMutation.mutateAsync(payload);
      toast.success(`${typeLabel} created successfully!`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New {typeLabel}</h2>
            <p className="text-sm text-gray-500">Next number: <span className="font-mono font-semibold text-blue-600">{nextNumber}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Date */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
          </div>

          {/* Customer Details */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Customer / Bill To</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input type="text" value={customer.name} onChange={setCustomerField('name')} required placeholder="Full name" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input type="text" value={customer.phone} onChange={setCustomerField('phone')} placeholder="Phone number" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={customer.address} onChange={setCustomerField('address')} rows={2} placeholder="Full address" className={inputCls + ' resize-none'} />
              </div>
              {type !== 'receipt' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input type="text" value={customer.gst} onChange={setCustomerField('gst')} placeholder="e.g. 33XXXXX1234X1ZX" className={inputCls + ' uppercase'} />
              </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Items</h3>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Product / Description *</th>
                    {type !== 'receipt' && <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-20">HSN</th>}
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600 w-16">Qty *</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Price *</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-32">Taxable Value</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} required placeholder="Product name"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                      </td>
                      {type !== 'receipt' && (
                      <td className="px-3 py-2">
                        <input type="text" value={item.hsn} onChange={(e) => updateItem(idx, 'hsn', e.target.value)} placeholder="HSN"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                      </td>
                      )}
                      <td className="px-3 py-2">
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} required min="1"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} required min="0" step="0.01"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatCurrency(item.taxableValue || 0)}
                      </td>
                      <td className="px-3 py-2">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax + Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>

              {type === 'invoice' && (
                <>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">CGST</span>
                      <input type="number" value={cgstRate} onChange={(e) => setCgstRate(e.target.value)} min="0" step="0.5"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                      <span className="text-gray-500">%</span>
                    </div>
                    <span className="text-gray-900">{formatCurrency(cgstAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">SGST</span>
                      <input type="number" value={sgstRate} onChange={(e) => setSgstRate(e.target.value)} min="0" step="0.5"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                      <span className="text-gray-500">%</span>
                    </div>
                    <span className="text-gray-900">{formatCurrency(sgstAmount)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-base font-bold text-blue-700 border-t-2 border-blue-600 pt-3">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Terms, conditions, or additional notes..."
              className={inputCls + ' resize-none'} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-200">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
              {createMutation.isPending ? 'Creating...' : `Create ${typeLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  invoice: { label: 'Invoice', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  quotation: { label: 'Quotation', icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
  receipt: { label: 'Receipt', icon: Receipt, color: 'text-green-600', bg: 'bg-green-50' },
};

// ── Main Page ───────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useBillings({
    page,
    limit: 20,
    type: typeFilter || undefined,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteBilling();

  const billings = data?.data || [];
  const pagination = data?.pagination || {};

  const [formType, setFormType] = useState(null);       // 'invoice' | 'quotation' | 'receipt'
  const [previewId, setPreviewId] = useState(null);

  // Fetch full billing for preview
  const { data: previewData } = useBilling(previewId);
  const previewBilling = previewData?.data;

  const handleDelete = async (item) => {
    if (!confirm(`Delete ${item.number}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(item._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (billings.length === 0) return toast.error('No data to export');
    const headers = ['Number', 'Type', 'Date', 'Customer', 'Phone', 'GST', 'Subtotal', 'Total Amount'];
    const rows = billings.map((b) => [
      b.number,
      b.type,
      formatDate(b.date),
      b.customer?.name,
      b.customer?.phone,
      b.customer?.gst,
      b.subtotal,
      b.totalAmount,
    ]);
    exportCSV('billing.csv', headers, rows);
  };

  const tabs = [
    { key: '', label: 'All' },
    { key: 'invoice', label: 'Invoices' },
    { key: 'quotation', label: 'Quotations' },
    { key: 'receipt', label: 'Receipts' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Create invoices, quotations, and receipts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => setFormType('quotation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors">
            <ClipboardList className="w-4 h-4" /> Quotation
          </button>
          <button onClick={() => setFormType('receipt')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors">
            <Receipt className="w-4 h-4" /> Receipt
          </button>
          <button onClick={() => setFormType('invoice')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FileText className="w-4 h-4" /> Invoice
          </button>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => { setTypeFilter(tab.key); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                typeFilter === tab.key
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by number, customer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Billing List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : billings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No billing records found</p>
            <p className="text-xs mt-1">Create your first invoice, quotation, or receipt</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Phone</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Amount</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billings.map((b) => {
                  const cfg = TYPE_CONFIG[b.type] || TYPE_CONFIG.invoice;
                  const Icon = cfg.icon;
                  return (
                    <tr key={b._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-600">{b.number}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(b.date)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{b.customer?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{b.customer?.phone || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(b.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setPreviewId(b._id)} title="View & Print"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                          <button onClick={() => handleDelete(b)} title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
            <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} records)</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {formType && <BillingFormModal type={formType} onClose={() => setFormType(null)} />}

      {/* Print Preview Modal */}
      {previewId && previewBilling && (
        <InvoicePrint billing={previewBilling} onClose={() => setPreviewId(null)} />
      )}
    </div>
  );
}
