import { useState } from 'react';
import {
  Plus, Search, Loader2, X, Edit3, Trash2, ExternalLink,
  GraduationCap, BookOpen, Copy, Eye, EyeOff, Link as LinkIcon, User, Lock, MessageSquare, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLMSEntries, useCreateLMS, useUpdateLMS, useDeleteLMS } from './lmsApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, exportCSV } from '../../lib/utils';

// ── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── LMS Form Modal ──────────────────────────────────────────────────────────

function LMSFormModal({ entry, onClose }) {
  const isEdit = !!entry;
  const createMutation = useCreateLMS();
  const updateMutation = useUpdateLMS();

  const [form, setForm] = useState({
    title: entry?.title || '',
    link: entry?.link || '',
    userId: entry?.userId || '',
    password: entry?.password || '',
    message: entry?.message || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');

    try {
      if (isEdit) {
        await mutation.mutateAsync({ id: entry._id, ...form });
        toast.success('Updated successfully!');
      } else {
        await mutation.mutateAsync(form);
        toast.success('Work entry added!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
    <Modal title={isEdit ? 'Edit Work Entry' : 'Add New Work'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.title} onChange={set('title')} required
            placeholder="e.g. How to create invoice, Printer setup guide"
            className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={form.link} onChange={set('link')}
              placeholder="https://example.com or any resource link"
              className={inputCls + ' pl-10'} />
          </div>
          <p className="text-xs text-gray-400 mt-1">URL to training material, video, document, etc.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.userId} onChange={set('userId')}
                placeholder="Login username"
                className={inputCls + ' pl-10'} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.password} onChange={set('password')}
                placeholder="Login password"
                className={inputCls + ' pl-10'} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message / Instructions</label>
          <textarea value={form.message} onChange={set('message')} rows={4}
            placeholder="Step-by-step instructions, notes, or any details the new worker should know..."
            className={inputCls + ' resize-none'} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Work'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Copy helper ─────────────────────────────────────────────────────────────

function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`${label} copied!`);
  }).catch(() => {
    toast.error('Failed to copy');
  });
}

// ── LMS Card ────────────────────────────────────────────────────────────────

function LMSCard({ entry, onEdit, onDelete }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white truncate">{entry.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button onClick={() => onEdit(entry)} title="Edit"
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(entry)} title="Delete"
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-3">
        {/* Link */}
        {entry.link && (
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <a href={entry.link} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate flex items-center gap-1">
              {entry.link}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        )}

        {/* Credentials */}
        {(entry.userId || entry.password) && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            {entry.userId && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">User ID:</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">{entry.userId}</span>
                </div>
                <button onClick={() => copyToClipboard(entry.userId, 'User ID')}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Copy">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {entry.password && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Password:</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {showPassword ? entry.password : '••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowPassword((v) => !v)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors" title={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => copyToClipboard(entry.password, 'Password')}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Copy">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {entry.message && (
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Instructions</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{entry.message}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">Added {formatDate(entry.createdAt)}</span>
          {entry.link && (
            <a href={entry.link} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Open Link
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function LMSPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useLMSEntries(debouncedSearch || undefined);
  const deleteMutation = useDeleteLMS();

  const entries = data?.data || [];

  const [formModal, setFormModal] = useState(null); // null | 'create' | entry object

  const handleDelete = async (entry) => {
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(entry._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (entries.length === 0) return toast.error('No data to export');
    const headers = ['Title', 'Link', 'User ID', 'Password', 'Notes'];
    const rows = entries.map((e) => [
      e.title,
      e.link,
      e.userId,
      e.password,
      e.message,
    ]);
    exportCSV('lms.csv', headers, rows);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LMS - Training</h1>
              <p className="text-sm text-gray-500 mt-0.5">Office work guides and training resources for new workers</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add New Work
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search training materials..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <GraduationCap className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">No training materials yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Add your first work entry so new workers can learn</p>
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New Work
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{entries.length} training {entries.length === 1 ? 'entry' : 'entries'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {entries.map((entry) => (
              <LMSCard
                key={entry._id}
                entry={entry}
                onEdit={(e) => setFormModal(e)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {formModal && (
        <LMSFormModal
          entry={formModal === 'create' ? null : formModal}
          onClose={() => setFormModal(null)}
        />
      )}
    </div>
  );
}
