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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomers } from '../customers/customerApi';
import { useUploadBroadcastFiles, useDeleteBroadcastFile } from './broadcastApi';
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast</h1>
          <p className="text-sm text-gray-500 mt-1">Send WhatsApp messages to customers</p>
        </div>
        {selectedCustomers.length > 0 && (
          <button
            onClick={handleSendAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send to All ({selectedCustomers.length})
          </button>
        )}
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
