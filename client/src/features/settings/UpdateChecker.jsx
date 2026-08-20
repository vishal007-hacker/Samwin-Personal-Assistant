import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export default function UpdateChecker() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only admins should check for updates
    if (user?.role !== 'admin') return;

    let toastId = null;

    const checkUpdate = async () => {
      try {
        const res = await api.get('/system/check-update');
        if (res.data.updateAvailable) {
          // If we already showed a toast, don't show another one
          if (toastId) return;

          toastId = toast(
            (t) => (
              <div className="flex flex-col gap-2">
                <p className="font-medium text-gray-900">System Update Available!</p>
                <p className="text-sm text-gray-600">
                  You are {res.data.commitsBehind} commit(s) behind the main branch.
                </p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      toastId = null;
                      navigate('/settings');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    View & Install
                  </button>
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      toastId = null;
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            ),
            { duration: Infinity, position: 'bottom-right' }
          );
        }
      } catch (error) {
        console.error('[UpdateChecker] Failed to check for updates:', error);
      }
    };

    // Check once shortly after load
    const initialTimer = setTimeout(checkUpdate, 5000);

    // Then check periodically
    const interval = setInterval(checkUpdate, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, [user?.role, navigate]);

  return null; // Does not render UI directly
}
