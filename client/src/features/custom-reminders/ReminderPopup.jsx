import { useState, useEffect } from 'react';
import { BellRing, X } from 'lucide-react';
import { useDueReminders } from './customReminderApi';

// ── Beep sound using Web Audio API ──────────────────────────────────────────

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Play 3 beeps
    const beepTimes = [0, 0.3, 0.6];

    beepTimes.forEach((startTime) => {
      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5 note
      gain.gain.setValueAtTime(0.5, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + 0.2);

      // Higher harmonic for alerting feel
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1320; // E6 note
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + 0.15);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + startTime);
      osc2.stop(ctx.currentTime + startTime + 0.15);
    });

    // Close audio context after beeps finish
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio not supported, ignore silently
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ReminderPopup() {
  const [popups, setPopups] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  const { data } = useDueReminders(true);
  const dueReminders = data?.data || [];

  // When new due reminders arrive, show them as popups
  useEffect(() => {
    if (dueReminders.length > 0) {
      const newPopups = dueReminders.filter((r) => !dismissed.has(r._id));
      if (newPopups.length > 0) {
        setPopups(newPopups);
        playBeep();
      }
    }
  }, [dueReminders, dismissed]);

  const dismissOne = (id) => {
    setDismissed((prev) => new Set([...prev, id]));
    setPopups((prev) => prev.filter((p) => p._id !== id));
  };

  const dismissAll = () => {
    const ids = popups.map((p) => p._id);
    setDismissed((prev) => new Set([...prev, ...ids]));
    setPopups([]);
  };

  if (popups.length === 0) return null;

  return (
    <>
      {/* Popup overlay */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full animate-pulse">
                  <BellRing className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reminder!</h2>
                  <p className="text-sm text-white/80">{popups.length} reminder{popups.length > 1 ? 's' : ''} due</p>
                </div>
              </div>
              <button
                onClick={dismissAll}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reminder items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {popups.map((rem) => (
              <div key={rem._id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900">{rem.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Triggered {rem.triggerCount} time{rem.triggerCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissOne(rem._id)}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={dismissAll}
              className="w-full px-4 py-2.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Dismiss All
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.3s ease-out; }
      `}</style>
    </>
  );
}
