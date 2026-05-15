import { useState } from 'react';
import {
  Bot, Smartphone, CheckCircle2, AlertTriangle, Loader2, Plus, Trash2, X,
  Send, Bell, Users, MessageSquare, ArrowDownLeft, ArrowUpRight, Settings as SettingsIcon, Power, Clock, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAIStatus, useAIQR,
  useAllowedNumbers, useCreateAllowedNumber, useUpdateAllowedNumber, useDeleteAllowedNumber,
  useConversations, useTestPrompt, useTestNotification,
  useAISettings, useUpdateAISettings,
} from './aiAssistantApi';

// ── Status Badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ready:          { label: 'Connected',     cls: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500',  icon: CheckCircle2 },
  authenticated:  { label: 'Authenticated', cls: 'bg-blue-100 text-blue-700 border-blue-300',    dot: 'bg-blue-500',   icon: CheckCircle2 },
  qr:             { label: 'Scan QR',       cls: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500',  icon: AlertTriangle },
  initializing:   { label: 'Starting...',   cls: 'bg-gray-100 text-gray-700 border-gray-300',    dot: 'bg-gray-500',   icon: Loader2 },
  disconnected:   { label: 'Disconnected',  cls: 'bg-gray-100 text-gray-700 border-gray-300',    dot: 'bg-gray-500',   icon: Power },
  error:          { label: 'Error',         cls: 'bg-red-100 text-red-700 border-red-300',       dot: 'bg-red-500',    icon: AlertTriangle },
};

// ── Add/Edit Modal ──────────────────────────────────────────────────────────

function NumberModal({ entry, onClose }) {
  const isEdit = !!entry;
  const create = useCreateAllowedNumber();
  const update = useUpdateAllowedNumber();
  const mut = isEdit ? update : create;
  const [form, setForm] = useState({
    phone: entry?.phone || '',
    name: entry?.name || '',
    role: entry?.role || 'staff',
    isActive: entry?.isActive !== false,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none';

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) await mut.mutateAsync({ id: entry._id, ...form });
      else await mut.mutateAsync(form);
      toast.success(isEdit ? 'Updated' : 'Added');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Number' : 'Add Allowed Number'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
            <input type="tel" value={form.phone} onChange={set('phone')} required placeholder="9566181510" className={inputCls + ' font-mono'} />
            <p className="text-xs text-gray-400 mt-1">10-digit or with country code. Stored as digits only.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={set('name')} required placeholder="e.g. Admin, Ravi, Staff 1" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={set('role')} className={inputCls + ' bg-white'}>
              <option value="admin">Admin (receives daily summaries)</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
            Active
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
              {mut.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const { data: statusData } = useAIStatus();
  const status = statusData?.data || { status: 'disconnected' };
  const cfg = STATUS_CONFIG[status.status] || STATUS_CONFIG.disconnected;
  const StatusIcon = cfg.icon;

  const showQR = status.status === 'qr';
  const { data: qrData } = useAIQR(showQR);
  const qrUrl = qrData?.data?.qrDataUrl;

  const { data: whitelistData } = useAllowedNumbers();
  const allowedNumbers = whitelistData?.data || [];
  const deleteMutation = useDeleteAllowedNumber();
  const [editEntry, setEditEntry] = useState(null);

  const [convoFilter, setConvoFilter] = useState('');
  const { data: convosData } = useConversations(convoFilter ? { phone: convoFilter } : {});
  const conversations = convosData?.data || [];

  const [testInput, setTestInput] = useState('');
  const testMutation = useTestPrompt();
  const notifyMutation = useTestNotification();
  const [testReply, setTestReply] = useState('');

  // Settings
  const { data: settingsData } = useAISettings();
  const settings = settingsData?.data || {};
  const updateSettings = useUpdateAISettings();
  const [settingsForm, setSettingsForm] = useState(null);
  // Sync form when settings load
  if (settingsData && settingsForm === null) {
    setSettingsForm({
      dailySummaryEnabled: settings.dailySummaryEnabled ?? true,
      dailySummaryTime: settings.dailySummaryTime || '08:30',
      deviceReadyAutoNotify: settings.deviceReadyAutoNotify ?? false,
      deviceDeliveredAutoNotify: settings.deviceDeliveredAutoNotify ?? false,
      deviceMessageTone: settings.deviceMessageTone || 'friendly',
    });
  }
  const setSetting = (key, value) => setSettingsForm((s) => ({ ...s, [key]: value }));
  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(settingsForm);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (entry) => {
    if (!confirm(`Remove ${entry.name} (${entry.phone}) from whitelist?`)) return;
    try {
      await deleteMutation.mutateAsync(entry._id);
      toast.success('Removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleTest = async (e) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    setTestReply('');
    try {
      const result = await testMutation.mutateAsync(testInput);
      setTestReply(result.data?.reply || '(no reply)');
    } catch (err) {
      setTestReply('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Bot className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500 mt-0.5">WhatsApp bot powered by your local Ollama model</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full border ${cfg.cls}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status.status === 'initializing' ? 'animate-pulse' : ''}`}></span>
                {cfg.label}
              </span>
              <StatusIcon className={`w-4 h-4 text-gray-400 ${status.status === 'initializing' ? 'animate-spin' : ''}`} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs text-gray-600 mt-3">
              <div>
                <p className="text-gray-400 uppercase tracking-wider text-[10px]">Inbound</p>
                <p className="text-base font-semibold text-gray-900 flex items-center gap-1"><ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />{status.inboundCount || 0}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wider text-[10px]">Outbound</p>
                <p className="text-base font-semibold text-gray-900 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />{status.outboundCount || 0}</p>
              </div>
              {status.startedAt && (
                <div>
                  <p className="text-gray-400 uppercase tracking-wider text-[10px]">Started</p>
                  <p className="text-sm text-gray-700">{new Date(status.startedAt).toLocaleString('en-IN')}</p>
                </div>
              )}
              {status.lastError && (
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-gray-400 uppercase tracking-wider text-[10px]">Last Error</p>
                  <p className="text-xs text-red-600 truncate" title={status.lastError}>{status.lastError}</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code (only when scan needed) */}
          {showQR && qrUrl && (
            <div className="bg-white border-2 border-amber-300 rounded-lg p-3 shrink-0">
              <p className="text-xs font-semibold text-amber-700 mb-2 text-center">Scan with WhatsApp on your phone</p>
              <img src={qrUrl} alt="WhatsApp QR" className="w-48 h-48" />
              <p className="text-[10px] text-gray-500 mt-2 text-center max-w-[12rem]">
                Phone → Settings → Linked Devices → Link a Device
              </p>
            </div>
          )}
        </div>
        {status.status === 'disconnected' && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <p className="font-medium">WhatsApp bot is offline.</p>
            <p className="text-xs mt-1">Make sure <code className="font-mono bg-white px-1 rounded">ENABLE_WHATSAPP_BOT=true</code> in <code className="font-mono bg-white px-1 rounded">server/.env</code> and that Ollama is running (<code className="font-mono bg-white px-1 rounded">ollama serve</code>).</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Whitelist */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Allowed Numbers</h2>
              <span className="text-xs text-gray-400">({allowedNumbers.length})</span>
            </div>
            <button
              onClick={() => setEditEntry('create')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {allowedNumbers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <Smartphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No numbers yet. Add at least one admin phone to start.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {allowedNumbers.map((n) => (
                <div key={n._id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{n.name}</p>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${n.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{n.role}</span>
                      {!n.isActive && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{n.phone}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditEntry(n)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><SettingsIcon className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(n)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Prompt */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Test Prompt</h2>
          </div>
          <form onSubmit={handleTest} className="p-5 space-y-3">
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              rows={3}
              placeholder="Try: 'today sales' or 'how much stock' or 'add ₹500 cash sale under AEPS Commission'"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!testInput.trim() || testMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
              >
                {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testMutation.isPending ? 'Asking AI...' : 'Send to AI'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await notifyMutation.mutateAsync('daily-summary');
                    setTestReply(`📤 Daily summary sent to admins:\n\n${result.data?.message || ''}`);
                  } catch (err) {
                    setTestReply('Error: ' + (err.response?.data?.message || err.message));
                  }
                }}
                disabled={notifyMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title="Manually fire the daily summary notification"
              >
                {notifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                Test Daily Notification
              </button>
            </div>
            {testReply && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">AI Reply</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{testReply}</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Bot Settings</h2>
        </div>
        {!settingsForm ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Daily summary */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-600" /> Daily Summary
              </p>
              <div className="flex flex-wrap items-center gap-4 pl-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsForm.dailySummaryEnabled}
                    onChange={(e) => setSetting('dailySummaryEnabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Send time:
                  <input
                    type="time"
                    value={settingsForm.dailySummaryTime}
                    onChange={(e) => setSetting('dailySummaryTime', e.target.value)}
                    disabled={!settingsForm.dailySummaryEnabled}
                    className="px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  />
                </label>
                <p className="text-xs text-gray-400">Sent to all admin phones daily.</p>
              </div>
            </div>

            {/* Device service auto-notify */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600" /> Device Service — Auto WhatsApp the Customer
              </p>
              <div className="pl-6 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsForm.deviceReadyAutoNotify}
                    onChange={(e) => setSetting('deviceReadyAutoNotify', e.target.checked)}
                    className="w-4 h-4"
                  />
                  When status changes to <span className="font-mono px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Ready</span> — send "your device is ready for pickup"
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsForm.deviceDeliveredAutoNotify}
                    onChange={(e) => setSetting('deviceDeliveredAutoNotify', e.target.checked)}
                    className="w-4 h-4"
                  />
                  When status changes to <span className="font-mono px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Delivered</span> — send "thank you" follow-up
                </label>
                <div className="flex items-center gap-2 text-sm pt-1">
                  <span>Message tone:</span>
                  <select
                    value={settingsForm.deviceMessageTone}
                    onChange={(e) => setSetting('deviceMessageTone', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="short">Short</option>
                  </select>
                  <span className="text-xs text-gray-400">AI uses this style when composing the customer message.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300"
              >
                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
              <p className="text-xs text-gray-400 mt-2">Settings apply immediately. The cron will reschedule when you save.</p>
            </div>
          </div>
        )}
      </div>

      {/* Conversation log */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Recent Conversations</h2>
            <span className="text-xs text-gray-400">({conversations.length})</span>
          </div>
          <input
            type="text"
            value={convoFilter}
            onChange={(e) => setConvoFilter(e.target.value)}
            placeholder="Filter by phone..."
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
          />
        </div>
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No conversations yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
            {conversations.slice().reverse().map((c) => (
              <div key={c._id} className="px-5 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                    c.role === 'user' ? 'bg-blue-100 text-blue-700' :
                    c.role === 'assistant' ? 'bg-purple-100 text-purple-700' :
                    c.role === 'tool' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>{c.role}{c.toolName ? `: ${c.toolName}` : ''}</span>
                  <span className="text-xs text-gray-400 font-mono">{c.phone}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(c.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{c.content || JSON.stringify(c.toolResult || c.toolArgs || {})}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup hint */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-900">
        <p className="font-semibold mb-1">Setup steps</p>
        <ol className="list-decimal list-inside space-y-0.5 text-xs text-purple-800">
          <li>Install Ollama: <code className="font-mono bg-white px-1 rounded">winget install Ollama.Ollama</code></li>
          <li>Pull a model: <code className="font-mono bg-white px-1 rounded">ollama pull qwen2.5:7b</code> (~4.7 GB)</li>
          <li>Add yourself to the Allowed Numbers above as an Admin</li>
          <li>Status above should show "Scan QR" — scan it from your phone's WhatsApp → Linked Devices</li>
          <li>Send "today sales" from your phone — bot should reply</li>
        </ol>
      </div>

      {editEntry && (
        <NumberModal entry={editEntry === 'create' ? null : editEntry} onClose={() => setEditEntry(null)} />
      )}
    </div>
  );
}
