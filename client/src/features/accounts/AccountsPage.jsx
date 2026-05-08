import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Plus, Trash2, Check, X, Edit3, Wallet, Smartphone, Building2, IndianRupee, Banknote, Download, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount,
} from './accountApi';
import { formatCurrency, exportCSV } from '../../lib/utils';

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

      {/* ── Report Section ── */}
      <ReportPanel
        sections={SECTIONS}
        grouped={grouped}
        sectionTotals={sectionTotals}
        grandTotal={grandTotal}
      />
    </div>
  );
}

// ── Report Panel (in-page report) ───────────────────────────────────────────

function ReportPanel({ sections, grouped, sectionTotals, grandTotal }) {
  const allAccounts = sections.flatMap((s) =>
    (grouped[s.key] || []).map((a) => ({ ...a, sectionLabel: s.label, sectionColor: s.color }))
  );
  const ranked = [...allAccounts].sort((a, b) => (b.balance || 0) - (a.balance || 0));
  const nonZero = ranked.filter((a) => (a.balance || 0) > 0);
  const zeros = ranked.filter((a) => (a.balance || 0) === 0);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-bold text-gray-900">Accounts Report</h2>
        <span className="text-xs text-gray-400">— live summary based on current balances</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribution by Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Distribution by Section</h3>
          {grandTotal === 0 ? (
            <p className="text-sm text-gray-400 italic">Enter balances to see distribution</p>
          ) : (
            <div className="space-y-4">
              {sections.map((s) => {
                const total = sectionTotals[s.key] || 0;
                const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                const colors = COLOR_MAP[s.color];
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${colors.text}`}>{s.label}</span>
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{formatCurrency(total)}</span>
                        <span className="text-xs text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors.total} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Accounts by Balance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Top Accounts by Balance</h3>
          {nonZero.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No accounts with a balance yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {nonZero.slice(0, 8).map((a, idx) => {
                const colors = COLOR_MAP[a.sectionColor];
                const pct = grandTotal > 0 ? ((a.balance || 0) / grandTotal) * 100 : 0;
                return (
                  <div key={a._id} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 font-mono w-5">#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{a.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{a.sectionLabel}</span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(a.balance)}</span>
                      <span className="text-xs text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-5 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">All Accounts ({allAccounts.length})</h3>
          {zeros.length > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              {zeros.length} with zero balance
            </span>
          )}
        </div>
        {allAccounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No accounts yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Section</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Account</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Balance</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {ranked.map((a) => {
                  const colors = COLOR_MAP[a.sectionColor];
                  const pct = grandTotal > 0 ? ((a.balance || 0) / grandTotal) * 100 : 0;
                  return (
                    <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-2 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{a.sectionLabel}</span>
                      </td>
                      <td className="px-5 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">{a.name}</td>
                      <td className={`px-5 py-2 text-right text-sm whitespace-nowrap ${(a.balance || 0) > 0 ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                        {formatCurrency(a.balance)}
                      </td>
                      <td className="px-5 py-2 text-right text-xs text-gray-500 whitespace-nowrap">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-5 py-2.5 text-sm font-bold text-gray-900">GRAND TOTAL</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-gray-900">{formatCurrency(grandTotal)}</td>
                  <td className="px-5 py-2.5 text-right text-sm font-medium text-gray-500">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
