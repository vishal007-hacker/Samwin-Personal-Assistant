import { useState, useRef } from 'react';
import {
  Search,
  Loader2,
  MessageCircle,
  Upload,
  X,
  FileText,
  Image,
  Film,
  Music,
  Send,
  CheckSquare,
  Square,
  Users,
  Paperclip,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Eye,
  Briefcase,
  HardHat,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomers } from '../customers/customerApi';
import {
  useUploadBroadcastFiles, useDeleteBroadcastFile,
  useBroadcastBotStatus, useBroadcastBotQR, useSendViaBot,
  usePreviewSummary, useSendSummary,
} from './broadcastApi';
import { useDebounce } from '../../hooks/useDebounce';
import { generateWhatsAppLink } from '../../lib/utils';

// ── File type icon helper ───────────────────────────────────────────────────

function getFileIcon(mimetype) {
  if (mimetype?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (mimetype?.startsWith('video/')) return <Film className="w-5 h-5 text-purple-500" />;
  if (mimetype?.startsWith('audio/')) return <Music className="w-5 h-5 text-orange-500" />;
  return <FileText className="w-5 h-5 text-gray-500" />;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function BroadcastPage() {
  // Customer list
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useCustomers({
    page,
    limit: 200,
    search: debouncedSearch || undefined,
  });
  const customers = data?.data || [];
  const pagination = data?.pagination || {};

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Message
  const [message, setMessage] = useState('');

  // File upload
  const fileInputRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const uploadMutation = useUploadBroadcastFiles();
  const deleteMutation = useDeleteBroadcastFile();

  // Base URL for file links
  const baseUrl = window.location.origin;

  // WhatsApp Bot integration
  const { data: botStatusData } = useBroadcastBotStatus();
  const botStatus = botStatusData?.data || { status: 'disconnected', ready: false };
  const showBotQR = botStatus.status === 'qr';
  const { data: qrData } = useBroadcastBotQR(showBotQR);
  const qrUrl = qrData?.data?.qrDataUrl;
  const sendViaBotMutation = useSendViaBot();
  const [botProgress, setBotProgress] = useState(null); // { sent, failed, total, errors }

  // Smart Summary state
  const [summaryAudience, setSummaryAudience] = useState('owners');
  const [summaryPreview, setSummaryPreview] = useState(null); // { recipients, total, skipped }
  const [ownerPhones, setOwnerPhones] = useState(() => localStorage.getItem('owner-phones') || '9944514911');
  const previewSummary = usePreviewSummary();
  const sendSummary = useSendSummary();
  const [summaryResult, setSummaryResult] = useState(null);

  // Parse comma/space-separated phone numbers into a clean array
  const parsedOwnerPhones = () =>
    ownerPhones
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 7);

  const handlePreviewSummary = async () => {
    try {
      const opts = { audience: summaryAudience };
      if (summaryAudience === 'owners') {
        const phones = parsedOwnerPhones();
        if (phones.length > 0) {
          opts.ownerPhones = phones;
          localStorage.setItem('owner-phones', ownerPhones);
        }
      }
      const result = await previewSummary.mutateAsync(opts);
      setSummaryPreview(result.data);
      setSummaryResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed');
    }
  };

  const handleSendSummary = async () => {
    if (!botStatus.ready) {
      toast.error('WhatsApp bot is not connected. Scan QR first.');
      return;
    }
    if (!summaryPreview || summaryPreview.total === 0) {
      toast.error('Click Preview first to see who will receive the message.');
      return;
    }
    const eta = Math.ceil(summaryPreview.total * 3);
    if (!confirm(`Send personalized summary to ${summaryPreview.total} ${summaryAudience}? This will take ~${eta}s (3s delay between messages).`)) return;

    setSummaryResult({ running: true });
    try {
      const opts = { audience: summaryAudience };
      if (summaryAudience === 'owners') {
        const phones = parsedOwnerPhones();
        if (phones.length > 0) opts.ownerPhones = phones;
      }
      const result = await sendSummary.mutateAsync(opts);
      setSummaryResult({ ...result.data, running: false });
      if (result.data?.failed > 0) {
        toast(`Sent ${result.data.sent}/${result.data.total}, ${result.data.failed} failed`, { icon: '⚠️' });
      } else {
        toast.success(`Sent to ${result.data.sent} ${summaryAudience}`);
      }
    } catch (err) {
      setSummaryResult(null);
      toast.error(err.response?.data?.message || 'Send failed');
    }
  };

  // ── Selection helpers ──

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const withPhone = customers.filter((c) => c.phone);
    if (selected.size === withPhone.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(withPhone.map((c) => c._id)));
    }
  };

  const selectedCustomers = customers.filter((c) => selected.has(c._id) && c.phone);

  // ── File handling ──

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setPendingFiles(files);
    try {
      const result = await uploadMutation.mutateAsync(files);
      setUploadedFiles((prev) => [...prev, ...result.data]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = async (file) => {
    try {
      await deleteMutation.mutateAsync(file.filename);
      setUploadedFiles((prev) => prev.filter((f) => f.filename !== file.filename));
    } catch {
      toast.error('Failed to remove file');
    }
  };

  // ── Build WhatsApp message ──

  const buildMessage = (customerName) => {
    let msg = message.replace('{name}', customerName || 'Customer');

    if (uploadedFiles.length > 0) {
      msg += '\n\n--- Attachments ---';
      uploadedFiles.forEach((f) => {
        msg += `\n${f.originalName}: ${baseUrl}${f.url}`;
      });
    }

    return msg;
  };

  // ── Send to single customer ──

  const handleSendSingle = (customer) => {
    if (!customer.phone) {
      toast.error('No phone number');
      return;
    }
    if (!message.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a message or upload files');
      return;
    }
    const msg = buildMessage(customer.name);
    window.open(generateWhatsAppLink(customer.phone, msg), '_blank');
  };

  // ── Send to all selected ──

  const handleSendAll = () => {
    if (selectedCustomers.length === 0) {
      toast.error('Select at least one customer');
      return;
    }
    if (!message.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a message or upload files');
      return;
    }

    selectedCustomers.forEach((customer, index) => {
      const msg = buildMessage(customer.name);
      const link = generateWhatsAppLink(customer.phone, msg);
      setTimeout(() => window.open(link, '_blank'), index * 800);
    });

    toast.success(`Opening WhatsApp for ${selectedCustomers.length} contact(s)...`);
  };

  // ── Send via bot (direct, no browser tabs) ──

  const handleSendViaBot = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Select at least one customer');
      return;
    }
    if (!message.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a message or upload files');
      return;
    }
    if (!botStatus.ready) {
      toast.error('WhatsApp bot is not connected. Scan the QR first.');
      return;
    }
    if (!confirm(`Send to ${selectedCustomers.length} contact(s) directly via the WhatsApp bot? This may take ~${Math.ceil(selectedCustomers.length * 1.5)}s.`)) return;

    setBotProgress({ sent: 0, failed: 0, total: selectedCustomers.length, errors: [], running: true });
    try {
      const recipients = selectedCustomers.map((c) => ({ phone: c.phone, name: c.name }));
      // The {name} replacement happens server-side per recipient, but we still
      // append the file links to the message text here (same as wa.me flow).
      const baseMessage = buildMessage('{name}');
      const result = await sendViaBotMutation.mutateAsync({ recipients, message: baseMessage });
      const data = result.data || {};
      setBotProgress({ ...data, running: false });
      if (data.failed === 0) {
        toast.success(`Sent to ${data.sent}/${data.total} contact(s) via bot`);
      } else {
        toast(`Sent ${data.sent}/${data.total}, ${data.failed} failed`, { icon: '⚠️' });
      }
    } catch (err) {
      setBotProgress(null);
      toast.error(err.response?.data?.message || 'Bot send failed');
    }
  };

  // ── Bot status display config ──
  const botCfg = botStatus.ready
    ? { label: 'Bot Connected', cls: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500', icon: CheckCircle2 }
    : botStatus.status === 'qr'
    ? { label: 'Scan QR to Connect', cls: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500', icon: AlertTriangle }
    : botStatus.status === 'initializing'
    ? { label: 'Starting Bot...', cls: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-500', icon: Loader2 }
    : { label: 'Bot Offline', cls: 'bg-gray-100 text-gray-500 border-gray-300', dot: 'bg-gray-400', icon: Bot };
  const BotIcon = botCfg.icon;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast</h1>
          <p className="text-sm text-gray-500 mt-1">Send WhatsApp messages to customers</p>
          {/* Bot status badge */}
          <div className="mt-2">
            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full border ${botCfg.cls}`}>
              <span className={`w-2 h-2 rounded-full ${botCfg.dot} ${botStatus.status === 'initializing' ? 'animate-pulse' : ''}`}></span>
              <BotIcon className={`w-3.5 h-3.5 ${botStatus.status === 'initializing' ? 'animate-spin' : ''}`} />
              {botCfg.label}
            </span>
            {botStatus.ready && (
              <span className="ml-2 text-xs text-gray-400">
                Direct sending available · {botStatus.outboundCount || 0} sent
              </span>
            )}
          </div>
        </div>
        {selectedCustomers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {botStatus.ready && (
              <button
                onClick={handleSendViaBot}
                disabled={sendViaBotMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                title="Send directly via WhatsApp bot — no browser tabs"
              >
                {sendViaBotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {sendViaBotMutation.isPending ? 'Sending...' : `Send via Bot (${selectedCustomers.length})`}
              </button>
            )}
            <button
              onClick={handleSendAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Open WhatsApp Web for each contact (one tab per customer)"
            >
              <Send className="w-4 h-4" />
              Open WhatsApp ({selectedCustomers.length})
            </button>
          </div>
        )}
      </div>

      {/* QR code panel (only when scan is needed) */}
      {showBotQR && qrUrl && (
        <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <img src={qrUrl} alt="WhatsApp QR" className="w-40 h-40 bg-white p-2 rounded-lg shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">Scan to connect the WhatsApp bot</p>
            <p className="text-sm text-amber-800">
              On your phone: WhatsApp → Settings → <b>Linked Devices</b> → <b>Link a Device</b> → scan this code.
            </p>
            <p className="text-xs text-amber-700 mt-2">
              Once connected, you can send broadcasts directly without opening browser tabs.
            </p>
          </div>
        </div>
      )}

      {/* Bot send progress */}
      {botProgress && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-semibold text-purple-900">
              {botProgress.running ? 'Sending via bot...' : 'Bot send complete'}
            </p>
            <button onClick={() => setBotProgress(null)} className="ml-auto p-1 text-purple-500 hover:text-purple-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-700"><b>{botProgress.sent}</b> sent</span>
            <span className="text-red-700"><b>{botProgress.failed}</b> failed</span>
            <span className="text-gray-500">of <b>{botProgress.total}</b> total</span>
          </div>
          {botProgress.errors?.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="text-red-700 cursor-pointer hover:underline">Show {botProgress.errors.length} error(s)</summary>
              <ul className="mt-1 ml-4 list-disc text-red-600 max-h-32 overflow-y-auto">
                {botProgress.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e.name || e.phone}: {e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* ── Smart Summary Panel ──────────────────────────────────────────── */}
      <div className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-purple-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-purple-900">Smart Summary</h2>
          <span className="text-xs text-purple-600">Auto-generated WhatsApp summaries from your live business data</span>
        </div>
        <div className="p-5 space-y-4">
          {/* Audience picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'owners', label: 'Owner / Admin', icon: Briefcase, desc: 'Daily sales, expenses, balances, alerts' },
              { value: 'workers', label: 'Workers / Staff', icon: HardHat, desc: 'Attendance, pending tasks, maintenance due' },
              { value: 'customers', label: 'Customers', icon: UserRound, desc: 'Credits, service status, expiring insurance' },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = summaryAudience === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { setSummaryAudience(opt.value); setSummaryPreview(null); setSummaryResult(null); }}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${active ? 'border-purple-500 bg-white shadow-sm' : 'border-transparent bg-white/50 hover:bg-white hover:border-purple-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${active ? 'text-purple-600' : 'text-gray-500'}`} />
                    <span className={`text-sm font-semibold ${active ? 'text-purple-900' : 'text-gray-700'}`}>{opt.label}</span>
                  </div>
                  <p className={`text-xs ${active ? 'text-purple-700' : 'text-gray-500'}`}>{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Owner phones input (only for owners audience) */}
          {summaryAudience === 'owners' && (
            <div className="bg-white border border-purple-200 rounded-lg p-3">
              <label className="block text-xs font-semibold text-purple-900 mb-1">
                Send to phone(s):
              </label>
              <input
                type="text"
                value={ownerPhones}
                onChange={(e) => { setOwnerPhones(e.target.value); setSummaryPreview(null); }}
                placeholder="e.g. 9566181510, 9944514911"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated. Saved in this browser. Leave empty to send to admin user(s) in the database.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePreviewSummary}
              disabled={previewSummary.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 transition-colors"
            >
              {previewSummary.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Preview
            </button>
            <button
              onClick={handleSendSummary}
              disabled={!botStatus.ready || sendSummary.isPending || !summaryPreview || summaryPreview.total === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
              title={!botStatus.ready ? 'Bot is not connected' : !summaryPreview ? 'Click Preview first' : ''}
            >
              {sendSummary.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Summary{summaryPreview?.total ? ` (${summaryPreview.total})` : ''}
            </button>
            {summaryPreview && (
              <span className="text-xs text-purple-700 ml-2">
                {summaryPreview.total} recipient{summaryPreview.total === 1 ? '' : 's'}
                {summaryPreview.skipped?.length > 0 && `, ${summaryPreview.skipped.length} skipped`}
              </span>
            )}
          </div>

          {/* Preview list */}
          {summaryPreview && summaryPreview.recipients?.length > 0 && (
            <div className="bg-white rounded-lg border border-purple-200 max-h-96 overflow-y-auto divide-y divide-gray-100">
              {summaryPreview.recipients.slice(0, 3).map((r, i) => (
                <div key={i} className="p-3">
                  <p className="text-xs font-semibold text-purple-700 mb-2">
                    → {r.name} <span className="text-gray-400 font-normal font-mono">{r.phone}</span>
                  </p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 p-2 rounded">{r.message}</pre>
                </div>
              ))}
              {summaryPreview.recipients.length > 3 && (
                <p className="p-3 text-xs text-gray-500 text-center">
                  ... and {summaryPreview.recipients.length - 3} more
                </p>
              )}
            </div>
          )}

          {summaryPreview && summaryPreview.total === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ No recipients match this audience. {summaryPreview.skipped?.[0]?.reason && `Reason: ${summaryPreview.skipped[0].reason}`}
            </div>
          )}

          {/* Send result */}
          {summaryResult && !summaryResult.running && (
            <div className="bg-white rounded-lg border border-green-200 p-3 text-sm">
              <p className="font-semibold text-green-800 mb-1">✓ Summary sent</p>
              <div className="flex gap-4 text-gray-700">
                <span>Sent: <b>{summaryResult.sent}</b></span>
                <span>Failed: <b>{summaryResult.failed}</b></span>
                <span>Total: <b>{summaryResult.total}</b></span>
              </div>
              {summaryResult.errors?.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="text-red-700 cursor-pointer">{summaryResult.errors.length} error(s)</summary>
                  <ul className="mt-1 ml-4 list-disc text-red-600 max-h-32 overflow-y-auto">
                    {summaryResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e.name || e.phone}: {e.error}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Message Composer */}
        <div className="lg:col-span-1 space-y-4">
          {/* Message input */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Message</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={'Dear {name},\n\nYour message here...\n\nThank you,\nSamwin Infotech'}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Use <span className="font-medium text-gray-500">{'{name}'}</span> to insert customer name
            </p>
          </div>

          {/* File upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Attachments</h2>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Images, Videos, Docs, Audio
                </>
              )}
            </button>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.filename}
                    className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    {getFileIcon(file.mimetype)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.originalName}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(file)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              Files are shared as download links in the WhatsApp message. Max 50MB per file.
            </p>
          </div>

          {/* Preview */}
          {(message.trim() || uploadedFiles.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Preview</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {buildMessage('John Doe')}
              </div>
            </div>
          )}
        </div>

        {/* Right: Customer List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Search + Select All bar */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search customers by name or phone..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {customers.filter((c) => c.phone).length > 0 &&
                  selected.size === customers.filter((c) => c.phone).length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Select All
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  {selected.size} of {customers.filter((c) => c.phone).length} selected
                </div>
              </div>
            </div>

            {/* Customer list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No customers found</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {customers.map((customer) => {
                  const hasPhone = !!customer.phone;
                  const isSelected = selected.has(customer._id);
                  return (
                    <div
                      key={customer._id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                      } ${!hasPhone ? 'opacity-50' : ''}`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(customer._id)}
                        disabled={!hasPhone}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {/* Avatar */}
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-xs shrink-0">
                        {customer.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.phone || 'No phone'}</p>
                      </div>

                      {/* Individual send button */}
                      {hasPhone && (
                        <button
                          onClick={() => handleSendSingle(customer)}
                          title="Send WhatsApp"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} customers)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
