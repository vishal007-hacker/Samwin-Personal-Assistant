import { useState, useRef, useEffect } from 'react';
import {
  Plus, X, Trash2, Edit3, Search, Loader2, Gift, Sparkles, Trophy,
  RotateCcw, MessageCircle, Users, Hash, Phone, ShoppingBag, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useParticipants, useCreateParticipant, useUpdateParticipant,
  useDeleteParticipant, useDrawWinner, useResetWins,
} from './luckyDrawApi';
import { useDebounce } from '../../hooks/useDebounce';
import { exportCSV } from '../../lib/utils';

// ── Wheel section colors (cycled) ───────────────────────────────────────────

const WHEEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
];

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Participant Form ────────────────────────────────────────────────────────

function ParticipantFormModal({ entry, onClose }) {
  const isEdit = !!entry;
  const create = useCreateParticipant();
  const update = useUpdateParticipant();
  const [form, setForm] = useState({
    name: entry?.name || '',
    phone: entry?.phone || '',
    purchaseDetails: entry?.purchaseDetails || '',
    notes: entry?.notes || '',
  });
  const mutation = isEdit ? update : create;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none';

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone are required');
    try {
      if (isEdit) await mutation.mutateAsync({ id: entry._id, ...form });
      else await mutation.mutateAsync(form);
      toast.success(isEdit ? 'Updated' : `Added (Serial #${(create.data?.data?.serialNo) || 'auto'})`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Participant' : 'Add Participant'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {isEdit && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-purple-700 font-medium">Serial No: <span className="font-mono text-base font-bold">#{entry.serialNo}</span></span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={set('name')} required placeholder="Full name" className={inputCls} autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
          <input type="tel" value={form.phone} onChange={set('phone')} required placeholder="Mobile number" className={inputCls + ' font-mono'} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Details</label>
          <textarea value={form.purchaseDetails} onChange={set('purchaseDetails')} rows={2} placeholder="What did they buy? e.g. Mobile worth ₹15000, AEPS service..." className={inputCls + ' resize-none'} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input type="text" value={form.notes} onChange={set('notes')} placeholder="Any additional notes" className={inputCls} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Participant'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Spinning Wheel ──────────────────────────────────────────────────────────

function SpinningWheel({ participants, isSpinning, finalRotation }) {
  const size = 360;
  const radius = size / 2;
  const n = participants.length;
  const sliceAngle = n > 0 ? 360 / n : 360;

  // Build the conic-gradient string for sector colors.
  // `from 0deg` means slice 0 starts at the top (12 o'clock) and slices go
  // clockwise. This matches what the pointer expects.
  const slicePct = n > 0 ? 100 / n : 100;
  const segments = participants.map((_, i) => {
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
    const start = (i * slicePct).toFixed(2);
    const end = ((i + 1) * slicePct).toFixed(2);
    return `${color} ${start}% ${end}%`;
  }).join(', ');
  const wheelBg = n > 0
    ? `conic-gradient(from 0deg, ${segments})`
    : 'conic-gradient(from 0deg, #e5e7eb 0% 100%)';

  return (
    <div className="relative inline-block">
      {/* Pointer (top, pointing down) */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 w-0 h-0"
        style={{
          borderLeft: '16px solid transparent',
          borderRight: '16px solid transparent',
          borderTop: '28px solid #1f2937',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      />

      {/* Wheel */}
      <div
        className="rounded-full shadow-2xl"
        style={{
          width: size,
          height: size,
          background: wheelBg,
          transform: `rotate(${finalRotation}deg)`,
          transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          border: '8px solid #1f2937',
        }}
      >
        {/* Labels on each slice.
            With gradient `from 0deg`, slice i center is at compass angle
            (i * sliceAngle + sliceAngle/2), where 0deg = top (12 o'clock).
            CSS `transform: rotate(0deg)` makes the label extend to the East
            (3 o'clock) — so to point in a given compass direction we subtract
            90deg from the compass angle. */}
        {n > 0 && participants.map((p, i) => {
          const centerCompass = sliceAngle * i + sliceAngle / 2;
          const labelRotate = centerCompass - 90;
          return (
            <div
              key={p._id}
              className="absolute top-1/2 left-1/2 origin-left text-white font-bold text-xs select-none"
              style={{
                transform: `rotate(${labelRotate}deg) translateX(${radius * 0.35}px)`,
                whiteSpace: 'nowrap',
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }}
            >
              <span className="font-mono">#{p.serialNo}</span>
              {n <= 12 && <span className="ml-1">{p.name.slice(0, 10)}</span>}
            </div>
          );
        })}
      </div>

      {/* Hub */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white border-4 border-gray-800 flex items-center justify-center shadow-lg"
      >
        <Gift className="w-6 h-6 text-purple-600" />
      </div>
    </div>
  );
}

// ── WhatsApp helper ─────────────────────────────────────────────────────────

function notifyWinner(winner) {
  const digits = (winner.phone || '').replace(/\D/g, '');
  if (!digits) {
    toast.error('No phone number');
    return;
  }
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const message = [
    `🎉 *Congratulations ${winner.name}!*`,
    ``,
    `You are the lucky winner of our draw at *Samwin Infotech*!`,
    ``,
    `Your Serial No: *#${winner.serialNo}*`,
    ``,
    `Please visit our shop to collect your prize. Show this message at the counter.`,
    ``,
    `Thank you for shopping with us! 🙏`,
    ``,
    `— *Samwin Infotech*`,
    `Ph: +91 9566181510`,
  ].join('\n');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function LuckyDrawPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useParticipants({ search: debouncedSearch || undefined });
  const participants = data?.data || [];
  const eligible = participants.filter((p) => !p.isWinner);
  const previousWinners = participants.filter((p) => p.isWinner);

  const [formModal, setFormModal] = useState(null);
  const deleteMutation = useDeleteParticipant();
  const drawMutation = useDrawWinner();
  const resetMutation = useResetWins();

  // Spinning state
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const [excludePrev, setExcludePrev] = useState(true);

  const handleSpin = async () => {
    if (eligible.length === 0 && excludePrev) {
      toast.error('No eligible participants left. Reset wins to draw again.');
      return;
    }
    if (participants.length === 0) {
      toast.error('Add participants first');
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    try {
      const result = await drawMutation.mutateAsync(excludePrev);
      const won = result.data?.winner;
      // Compute final rotation to land on the winner.
      // Find the winner's index in the rendered participants list.
      const idx = participants.findIndex((p) => p._id === won._id);
      const n = participants.length;
      const sliceAngle = 360 / n;
      // Center of the winner's slice (degrees) from start (0deg = right)
      // The wheel's '-90deg' start means 0% is at top. We need to rotate so
      // that the winner's slice center aligns with the top pointer.
      const winnerAngle = idx * sliceAngle + sliceAngle / 2;
      const targetRotation = 360 * 6 - winnerAngle; // 6 full spins + land
      setRotation(rotation + targetRotation);

      // Reveal after the CSS transition finishes (5s)
      setTimeout(() => {
        setWinner(won);
        setIsSpinning(false);
      }, 5200);
    } catch (err) {
      setIsSpinning(false);
      toast.error(err.response?.data?.message || 'Draw failed');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all previous wins? All participants will be eligible again.')) return;
    try {
      const result = await resetMutation.mutateAsync();
      toast.success(`Reset ${result.data?.reset || 0} participant(s)`);
      setWinner(null);
      setRotation(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Remove ${p.name} (#${p.serialNo}) from the draw?`)) return;
    try {
      await deleteMutation.mutateAsync(p._id);
      toast.success('Removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (!participants.length) return toast.error('Nothing to export');
    exportCSV(
      'lucky-draw-participants.csv',
      ['Serial No', 'Name', 'Phone', 'Purchase Details', 'Notes', 'Winner?', 'Drawn At'],
      participants.map((p) => [
        p.serialNo, p.name, p.phone, p.purchaseDetails || '', p.notes || '',
        p.isWinner ? 'YES' : '', p.drawnAt ? new Date(p.drawnAt).toLocaleString('en-IN') : '',
      ])
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Gift className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lucky Draw</h1>
            <p className="text-sm text-gray-500 mt-0.5">Add participants and spin the wheel to pick a winner</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 bg-white rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handleReset} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">
            <RotateCcw className="w-4 h-4" /> Reset Wins
          </button>
          <button onClick={() => setFormModal('create')} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Plus className="w-4 h-4" /> Add Participant
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500 font-medium uppercase">Total</span></div>
          <p className="text-2xl font-bold text-blue-600">{participants.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500 font-medium uppercase">Eligible</span></div>
          <p className="text-2xl font-bold text-green-600">{eligible.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-amber-500" /><span className="text-xs text-gray-500 font-medium uppercase">Winners</span></div>
          <p className="text-2xl font-bold text-amber-600">{previousWinners.length}</p>
        </div>
      </div>

      {/* Wheel + Winner */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6 mb-6 flex flex-col items-center">
        <SpinningWheel participants={participants} isSpinning={isSpinning} finalRotation={rotation} />

        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-md">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={excludePrev}
              onChange={(e) => setExcludePrev(e.target.checked)}
              disabled={isSpinning}
              className="w-4 h-4"
            />
            Exclude previous winners
          </label>

          <button
            onClick={handleSpin}
            disabled={isSpinning || participants.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
          >
            {isSpinning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
            {isSpinning ? 'Spinning...' : '🎲 Spin the Wheel'}
          </button>

          {/* Winner reveal */}
          {winner && !isSpinning && (
            <div className="w-full mt-4 bg-white rounded-xl border-2 border-amber-400 shadow-lg p-5 text-center animate-bounce-once">
              <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
                <Trophy className="w-6 h-6" />
                <p className="text-sm font-bold uppercase tracking-wider">Winner!</p>
                <Trophy className="w-6 h-6" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">{winner.name}</p>
              <p className="text-sm text-gray-500 mb-2">Serial #{winner.serialNo} · {winner.phone}</p>
              {winner.purchaseDetails && <p className="text-xs text-gray-400 mb-3 italic">"{winner.purchaseDetails}"</p>}
              <button
                onClick={() => notifyWinner(winner)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4" /> Send Winner Message on WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search + Participants table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or purchase..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
        ) : participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Gift className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No participants yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Add at least one to spin the wheel</p>
            <button onClick={() => setFormModal('create')} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Add First Participant
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs"><Hash className="w-3.5 h-3.5 inline mr-1" />Serial</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs"><Phone className="w-3.5 h-3.5 inline mr-1" />Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs"><ShoppingBag className="w-3.5 h-3.5 inline mr-1" />Purchase</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map((p) => (
                  <tr key={p._id} className={`transition-colors ${p.isWinner ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 font-mono font-bold text-purple-700">#{p.serialNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{p.phone}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      <p className="truncate" title={p.purchaseDetails}>{p.purchaseDetails || '-'}</p>
                      {p.notes && <p className="text-xs text-gray-400 truncate" title={p.notes}>{p.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {p.isWinner ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-200 text-amber-800">
                          <Trophy className="w-3 h-3" /> Winner
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Eligible</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.isWinner && (
                          <button onClick={() => notifyWinner(p)} className="rounded-md p-1.5 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-colors" title="WhatsApp winner">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setFormModal(p)} className="rounded-md p-1.5 bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p)} className="rounded-md p-1.5 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formModal && (
        <ParticipantFormModal entry={formModal === 'create' ? null : formModal} onClose={() => setFormModal(null)} />
      )}
    </div>
  );
}
