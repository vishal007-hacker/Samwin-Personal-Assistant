import { useState } from 'react';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { RefreshCw, Download, Settings as SettingsIcon, Database, Archive, Upload, Github, Loader2, Bot, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // null | { available: boolean, commits: number }
  const [backingUp, setBackingUp] = useState(null); // 'data' | 'full' | null
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [gitPushing, setGitPushing] = useState(false);
  const queryClient = useQueryClient();

  if (user?.role?.toLowerCase() !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGitPush = async () => {
    if (!confirm('Export the database and push the new backup to GitHub?')) return;
    setGitPushing(true);
    try {
      const { data } = await api.post('/backup/git-push');
      if (data?.data?.pushed) {
        toast.success(`Pushed ${data.data.backupFolder} (${data.data.totalDocs} docs) to GitHub`);
      } else {
        toast(data?.data?.message || 'Nothing to push', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'GitHub push failed');
    } finally {
      setGitPushing(false);
    }
  };

  const downloadFromApi = async (path, fallbackName) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = 'Backup failed';
      try { msg = JSON.parse(text)?.message || msg; } catch { /* not JSON */ }
      throw new Error(msg);
    }
    const cd = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="?([^"]+)"?/i);
    const filename = match ? match[1] : fallbackName;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackupData = async () => {
    setBackingUp('data');
    try {
      await downloadFromApi('/backup/data', 'samwin-data-backup.json');
      toast.success('Data backup downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setBackingUp(null);
    }
  };

  const handleBackupFull = async () => {
    setBackingUp('full');
    try {
      await downloadFromApi('/backup/full', 'samwin-full-backup.zip');
      toast.success('Full backup downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setBackingUp(null);
    }
  };

  const handleRestoreFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setRestoreFile(file);
    e.target.value = ''; // allow re-selecting same file
  };

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const fd = new FormData();
      fd.append('file', restoreFile);
      const res = await fetch(`${baseUrl}/backup/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Restore failed');
      }
      const total = json.data?.totalDocs ?? 0;
      const errors = json.data?.errors ?? [];
      toast.success(`Restored ${total} documents${errors.length ? ` (${errors.length} errors)` : ''}`);
      if (errors.length) console.warn('Restore errors:', errors);
      setRestoreFile(null);
      queryClient.invalidateQueries(); // refresh all data on the page
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setRestoring(false);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setChecking(true);
      setUpdateStatus(null);
      const res = await api.get('/system/check-update');

      setUpdateStatus({
        available: res.data.updateAvailable,
        commits: res.data.commitsBehind,
        gitAvailable: res.data.gitAvailable !== false,
      });

      if (res.data.gitAvailable === false) {
        toast(res.data.message || 'Not available in the packaged desktop app.', { icon: 'ℹ️' });
      } else if (res.data.updateAvailable) {
        toast.success(`Update available! You are ${res.data.commitsBehind} commit(s) behind.`);
      } else {
        toast.success('Your system is up to date.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    try {
      setApplying(true);
      const res = await api.post('/system/apply-update');
      toast.success(res.data.message || 'Update applied successfully');
      setUpdateStatus({ available: false, commits: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply update');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-sm text-gray-500">Manage system settings and updates</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">System Updates</h2>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Check for the latest updates from the repository and apply them to your local system.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleCheckUpdate}
              disabled={checking || applying}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Check for Updates'}
            </button>
            
            {updateStatus && (
              <div className="flex items-center gap-2">
                {!updateStatus.gitAvailable ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                    Not applicable — this is the packaged desktop app (updates via GitHub Releases)
                  </span>
                ) : updateStatus.available ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      Update Available ({updateStatus.commits} new commits)
                    </span>
                    <button
                      onClick={handleApplyUpdate}
                      disabled={applying || checking}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors ml-4"
                    >
                      <Download className="h-4 w-4" />
                      {applying ? 'Applying...' : 'Install Update'}
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    System is up to date
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Data Management</h2>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Backup your database and source code securely. You can also restore data from a previous JSON backup.
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBackupData}
              disabled={backingUp !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {backingUp === 'data' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Backup Data
            </button>
            <button
              onClick={handleBackupFull}
              disabled={backingUp !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg font-medium hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {backingUp === 'full' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              Download Full Backup
            </button>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg font-medium hover:bg-amber-100 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Restore Backup
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFileSelect}
                className="hidden"
              />
            </label>
            {restoreFile && (
              <button
                onClick={handleRestoreConfirm}
                disabled={restoring}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-amber-500 text-white bg-amber-600 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Restore
              </button>
            )}
            <button
              onClick={handleGitPush}
              disabled={gitPushing}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-700 text-white bg-gray-900 rounded-lg font-medium hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {gitPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              {gitPushing ? 'Pushing...' : 'Push to GitHub'}
            </button>
          </div>
          {restoreFile && (
            <p className="mt-3 text-sm text-amber-700">
              Selected file: <span className="font-semibold">{restoreFile.name}</span>. Click confirm to replace all data.
            </p>
          )}
        </div>
      </div>

      {/* AI Assistant Info Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl shadow-sm border border-emerald-100 overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
          <Bot className="w-32 h-32 text-emerald-900" />
        </div>
        <div className="border-b border-emerald-100 bg-emerald-100/50 px-6 py-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-semibold text-emerald-900">AI Assistant</h2>
        </div>
        
        <div className="p-6 relative z-10">
          <h3 className="text-xl font-bold text-emerald-900 mb-2">WhatsApp bot powered by local Ollama LLM</h3>
          <p className="text-emerald-800 font-medium mb-4">
            A fully local, private AI assistant that integrates seamlessly with your WhatsApp.
          </p>
          
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-emerald-800"><strong>Query data</strong>: Get instant sales summaries, credit dues, and stock counts.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-emerald-800"><strong>Add records</strong>: Add sales, expenses, and update statuses directly from chat.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-emerald-800"><strong>Daily summaries</strong>: Receive automated morning reports on your business.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
