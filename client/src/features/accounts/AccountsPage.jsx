import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Plus, Trash2, Check, X, Edit3, Wallet, Smartphone, Building2, IndianRupee, Banknote,
  Download, BarChart3, Save, Printer, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount,
  useAccountSnapshots, useSaveSnapshot, useDeleteSnapshot,
} from './accountApi';
import { formatCurrency, formatDate, exportCSV } from '../../lib/utils';

// ── Section Configuration ───────────────────────────────────────────────────

const SECTIONS = [
  { key: 'recharge', label: 'Recharge Accounts', icon: Smartphone, color: 'blue' },
  { key: 'banking', label: 'Banking Accounts', icon: Building2, color: 'green' },
  { key: 'aeps', label: 'AEPS Accounts', icon: Wallet, color: 'purple' },
  { key: 'cash', label: 'Available Cash', icon: Banknote, color: 'amber' },
];

const COLOR_MAP = {
  blue: { ring: 'ring-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', total: 'bg-blue-600' },
  green: { ring: 'ring-green-500', bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', total: 'bg-green-600' },
  purple: { ring: 'ring-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600', total: 'bg-purple-600' },
  amber: { ring: 'ring-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600', total: 'bg-amber-600' },
};

// ── Editable Balance Cell ───────────────────────────────────────────────────

function BalanceCell({ account, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(account.balance);

  useEffect(() => {
    setValue(account.balance);
  }, [account.balance]);

  const commit = async () => {
    const num = Number(value) || 0;
    if (num === account.balance) {
      setEditing(false);
      return;
    }
    try {
      await onSave({ id: account._id, balance: num });
      setEditing(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setValue(account.balance); setEditing(false); }
          }}
          autoFocus
          className="w-24 px-2 py-1 border border-blue-400 rounded text-right text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button onClick={commit} className="p-1 text-green-600 hover:bg-green-50 rounded">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setValue(account.balance); setEditing(false); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
    >
      <span className="font-semibold text-gray-900">{formatCurrency(account.balance)}</span>
      <Edit3 className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
    </button>
  );
}

// ── Add Item Row ────────────────────────────────────────────────────────────

function AddItemRow({ section, onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  const submit = async () => {
    if (!name.trim()) return toast.error('Enter a name');
    try {
      await onAdd({ section, name: name.trim(), balance: Number(balance) || 0 });
      setName('');
      setBalance('');
      setOpen(false);
    } catch {
      toast.error('Failed to add');
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add Item
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Account name"
        autoFocus
        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <input
        type="number"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        placeholder="0"
        className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <button onClick={submit} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => { setOpen(false); setName(''); setBalance(''); }} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ section, accounts, onUpdate, onDelete, onAdd }) {
  const colors = COLOR_MAP[section.color];
  const SectionIcon = section.icon;
  const total = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-200 ${colors.bg}`}>
        <SectionIcon className={`w-5 h-5 ${colors.icon}`} />
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${colors.text}`}>{section.label}</h2>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {accounts.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">No accounts yet</div>
        ) : (
          accounts.map((a) => (
            <div key={a._id} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors">
              <span className="text-sm font-medium text-gray-700">{a.name}</span>
              <div className="flex items-center gap-1">
                <BalanceCell account={a} onSave={onUpdate} />
                <button
                  onClick={() => {
                    if (confirm(`Delete "${a.name}"?`)) onDelete(a._id);
                  }}
                  className="p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
        <AddItemRow section={section.key} onAdd={onAdd} />
      </div>

      {/* Total */}
      <div className={`flex items-center justify-between px-5 py-3 ${colors.total} text-white`}>
        <span className="text-sm font-semibold uppercase tracking-wider">Total</span>
        <span className="text-lg font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { data, isLoading } = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const grouped = data?.data || { recharge: [], banking: [], aeps: [], cash: [] };

  const grandTotal = useMemo(() => {
    return Object.values(grouped).flat().reduce((s, a) => s + (a.balance || 0), 0);
  }, [grouped]);

  const sectionTotals = useMemo(() => {
    const result = {};
    SECTIONS.forEach((s) => {
      result[s.key] = (grouped[s.key] || []).reduce((sum, a) => sum + (a.balance || 0), 0);
    });
    return result;
  }, [grouped]);

  const handleUpdate = (payload) => updateMutation.mutateAsync(payload);
  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };
  const handleAdd = async (payload) => {
    await createMutation.mutateAsync(payload);
    toast.success('Added');
  };

  const handleExport = () => {
    const allAccounts = SECTIONS.flatMap((s) =>
      (grouped[s.key] || []).map((a) => ({ section: s.label, account: a }))
    );
    if (!allAccounts.length) return toast.error('No accounts to export');
    const rows = allAccounts.map(({ section, account }) => [section, account.name, account.balance || 0]);
    // Per-section totals
    SECTIONS.forEach((s) => {
      rows.push([s.label + ' — Total', '', sectionTotals[s.key]]);
    });
    rows.push(['GRAND TOTAL', '', grandTotal]);
    exportCSV('accounts.csv', ['Section', 'Account', 'Balance'], rows);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Wallet className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage balances across recharge, banking, AEPS, and cash</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Grand Total + Per-Section Totals */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-1 col-span-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 opacity-80" />
            <span className="text-xs uppercase tracking-wider opacity-80 font-medium">Grand Total</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
        </div>
        {SECTIONS.map((s) => {
          const colors = COLOR_MAP[s.color];
          const Icon = s.icon;
          return (
            <div key={s.key} className={`${colors.bg} rounded-xl p-4 border border-gray-200`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${colors.icon}`} />
                <span className={`text-xs uppercase tracking-wider font-medium ${colors.text}`}>{s.label}</span>
              </div>
              <p className={`text-xl font-bold ${colors.text}`}>{formatCurrency(sectionTotals[s.key])}</p>
              <p className="text-xs text-gray-400 mt-0.5">{(grouped[s.key] || []).length} items</p>
            </div>
          );
        })}
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {SECTIONS.map((s) => (
          <SectionCard
            key={s.key}
            section={s}
            accounts={grouped[s.key] || []}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
        ))}
      </div>

      {/* ── Date-wise Snapshot Report ── */}
      <SnapshotReport sectionTotals={sectionTotals} grandTotal={grandTotal} />
    </div>
  );
}

// ── Date-wise Snapshot Report ───────────────────────────────────────────────

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

function SnapshotReport({ sectionTotals, grandTotal }) {
  const [range, setRange] = useState(getDefaultDateRange);
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useAccountSnapshots(range);
  const saveMutation = useSaveSnapshot();
  const deleteMutation = useDeleteSnapshot();

  const snapshots = data?.data || [];

  const totals = useMemo(
    () =>
      snapshots.reduce(
        (acc, s) => ({
          recharge: acc.recharge + (s.recharge || 0),
          banking: acc.banking + (s.banking || 0),
          aeps: acc.aeps + (s.aeps || 0),
          cash: acc.cash + (s.cash || 0),
          total: acc.total + (s.total || 0),
        }),
        { recharge: 0, banking: 0, aeps: 0, cash: 0, total: 0 }
      ),
    [snapshots]
  );

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ date: snapshotDate });
      toast.success('Snapshot saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save snapshot');
    }
  };

  const handleDelete = async (snap) => {
    if (!confirm(`Delete snapshot for ${formatDate(snap.date)}?`)) return;
    try {
      await deleteMutation.mutateAsync(snap._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (!snapshots.length) return toast.error('No snapshots to export');
    const rows = snapshots.map((s) => [
      formatDate(s.date),
      s.recharge || 0,
      s.banking || 0,
      s.aeps || 0,
      s.cash || 0,
      s.total || 0,
    ]);
    rows.push(['TOTAL', totals.recharge, totals.banking, totals.aeps, totals.cash, totals.total]);
    exportCSV(
      'accounts-report.csv',
      ['Date', 'Recharge Accounts', 'Banking Accounts', 'AEPS Accounts', 'Available Cash', 'Total Value'],
      rows
    );
  };

  const handlePrint = () => {
    if (!snapshots.length) return toast.error('No snapshots to print');
    const rangeLabel =
      range.from && range.to
        ? `${formatDate(range.from)} to ${formatDate(range.to)}`
        : 'All dates';

    const win = window.open('', '_blank', 'width=1000,height=800');
    win.document.write(`<!DOCTYPE html><html><head><title>Accounts Report</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { color: #111; padding: 0; font-size: 11px; }
  .container { max-width: 210mm; margin: 0 auto; }
  .header { border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-bottom: 12px; }
  .company { font-size: 20px; font-weight: 800; color: #4f46e5; }
  .subtitle { font-size: 10px; color: #555; margin-top: 3px; }
  .title { font-size: 16px; font-weight: 700; margin-top: 10px; color: #1a1a1a; }
  .meta { font-size: 10px; color: #666; margin-top: 3px; }
  .row { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .row-date { font-size: 12px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; }
  .cards { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr; gap: 6px; }
  .card { border-radius: 6px; padding: 6px 9px; }
  .card-label { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.8; margin-bottom: 2px; }
  .card-value { font-size: 13px; font-weight: 800; }
  .grand { background: linear-gradient(135deg, #4f46e5, #9333ea); color: white; }
  .recharge { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
  .banking { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
  .aeps { background: #faf5ff; border: 1px solid #e9d5ff; color: #7e22ce; }
  .cash { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
  .totals-section { margin-top: 14px; padding-top: 12px; border-top: 2px solid #4f46e5; }
  .totals-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4f46e5; margin-bottom: 6px; letter-spacing: 0.5px; }
  .footer { margin-top: 14px; font-size: 9px; color: #888; text-align: center; }
</style></head><body><div class="container">
  <div class="header">
    <div class="company">Samwin Infotech</div>
    <div class="subtitle">14-5-10D, TVK Street, Near CSI Church, Sambavarvadakarai - 627856, Tenkasi · Ph: 9566181510, 9944514911</div>
  </div>
  <div class="title">Accounts Snapshot Report</div>
  <div class="meta">Date Range: ${rangeLabel} · Generated: ${new Date().toLocaleString('en-IN')}</div>

  <div style="margin-top: 10px;">
    ${snapshots
      .map(
        (s) => `<div class="row">
          <div class="row-date">${formatDate(s.date)}</div>
          <div class="cards">
            <div class="card grand">
              <div class="card-label">Grand Total</div>
              <div class="card-value">${formatCurrency(s.total || 0)}</div>
            </div>
            <div class="card recharge">
              <div class="card-label">Recharge Accounts</div>
              <div class="card-value">${formatCurrency(s.recharge || 0)}</div>
            </div>
            <div class="card banking">
              <div class="card-label">Banking Accounts</div>
              <div class="card-value">${formatCurrency(s.banking || 0)}</div>
            </div>
            <div class="card aeps">
              <div class="card-label">AEPS Accounts</div>
              <div class="card-value">${formatCurrency(s.aeps || 0)}</div>
            </div>
            <div class="card cash">
              <div class="card-label">Available Cash</div>
              <div class="card-value">${formatCurrency(s.cash || 0)}</div>
            </div>
          </div>
        </div>`
      )
      .join('')}
  </div>

  <div class="totals-section">
    <div class="totals-label">Period Totals (${snapshots.length} snapshots)</div>
    <div class="cards">
      <div class="card grand">
        <div class="card-label">Period Total</div>
        <div class="card-value">${formatCurrency(totals.total)}</div>
      </div>
      <div class="card recharge">
        <div class="card-label">Recharge Total</div>
        <div class="card-value">${formatCurrency(totals.recharge)}</div>
      </div>
      <div class="card banking">
        <div class="card-label">Banking Total</div>
        <div class="card-value">${formatCurrency(totals.banking)}</div>
      </div>
      <div class="card aeps">
        <div class="card-label">AEPS Total</div>
        <div class="card-value">${formatCurrency(totals.aeps)}</div>
      </div>
      <div class="card cash">
        <div class="card-label">Cash Total</div>
        <div class="card-value">${formatCurrency(totals.cash)}</div>
      </div>
    </div>
  </div>

  <div class="footer">Samwin Infotech Personal Assistant — Accounts Report</div>
</div>
<script>window.onload = () => { window.focus(); window.print(); };</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Accounts Report</h2>
          <span className="text-xs text-gray-400 hidden sm:inline">— date-wise snapshots</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Save Snapshot Bar */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Save className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-900">Save current balances as a snapshot</p>
            <p className="text-xs text-indigo-700 truncate">
              Current totals: Recharge {formatCurrency(sectionTotals.recharge)} · Banking {formatCurrency(sectionTotals.banking)} ·
              AEPS {formatCurrency(sectionTotals.aeps)} · Cash {formatCurrency(sectionTotals.cash)} ·
              Total {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          />
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'Saving...' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 mb-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => setRange({ from: '', to: '' })}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          Clear
        </button>
        <span className="text-xs text-gray-400 ml-auto">{snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'}</span>
      </div>

      {/* Snapshots — Card-row per Date */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">
          <Calendar className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm font-medium">No snapshots in this date range</p>
          <p className="text-xs text-gray-400 mt-1">Click "Save Snapshot" above to capture today's balances</p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((s) => (
            <SnapshotCardRow key={s._id} snapshot={s} onDelete={handleDelete} />
          ))}

          {/* Month-wide Totals Row */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t-2 border-indigo-200">
            <div className="lg:col-span-1 col-span-2 bg-gradient-to-br from-indigo-700 to-purple-700 text-white rounded-xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="w-4 h-4 opacity-80" />
                <span className="text-xs uppercase tracking-wider opacity-80 font-medium">Period Total</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totals.total)}</p>
              <p className="text-xs opacity-70 mt-0.5">{snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="text-xs uppercase tracking-wider font-medium text-blue-700">Recharge</span>
              </div>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(totals.recharge)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="text-xs uppercase tracking-wider font-medium text-green-700">Banking</span>
              </div>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totals.banking)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-purple-600" />
                <span className="text-xs uppercase tracking-wider font-medium text-purple-700">AEPS</span>
              </div>
              <p className="text-xl font-bold text-purple-700">{formatCurrency(totals.aeps)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="w-4 h-4 text-amber-600" />
                <span className="text-xs uppercase tracking-wider font-medium text-amber-700">Cash</span>
              </div>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(totals.cash)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single Snapshot Card-Row (matches top summary card style) ───────────────

function SnapshotCardRow({ snapshot, onDelete }) {
  const s = snapshot;
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all">
      {/* Date label */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-900">{formatDate(s.date)}</span>
        </div>
        <button
          onClick={() => onDelete(s)}
          className="p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete snapshot"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5-card row matching top summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="lg:col-span-1 col-span-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-lg px-3 py-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-0.5">
            <IndianRupee className="w-3.5 h-3.5 opacity-80" />
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-medium">Grand Total</span>
          </div>
          <p className="text-lg font-bold leading-tight">{formatCurrency(s.total || 0)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] uppercase tracking-wider font-medium text-blue-700">Recharge Accounts</span>
          </div>
          <p className="text-base font-bold text-blue-700 leading-tight">{formatCurrency(s.recharge || 0)}</p>
        </div>
        <div className="bg-green-50 rounded-lg px-3 py-2.5 border border-green-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Building2 className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[10px] uppercase tracking-wider font-medium text-green-700">Banking Accounts</span>
          </div>
          <p className="text-base font-bold text-green-700 leading-tight">{formatCurrency(s.banking || 0)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg px-3 py-2.5 border border-purple-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Wallet className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-[10px] uppercase tracking-wider font-medium text-purple-700">AEPS Accounts</span>
          </div>
          <p className="text-base font-bold text-purple-700 leading-tight">{formatCurrency(s.aeps || 0)}</p>
        </div>
        <div className="bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Banknote className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] uppercase tracking-wider font-medium text-amber-700">Available Cash</span>
          </div>
          <p className="text-base font-bold text-amber-700 leading-tight">{formatCurrency(s.cash || 0)}</p>
        </div>
      </div>
    </div>
  );
}
