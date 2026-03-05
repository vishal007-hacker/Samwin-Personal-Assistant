import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Check } from 'lucide-react';
import api from '../../lib/axios';
import { timeAgo } from '../../lib/utils';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const queryClient = useQueryClient();

  // ── Fetch Notifications ──

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { limit: 10 } });
      return data;
    },
    refetchInterval: 60000,
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  // ── Mark Single as Read ──

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.put(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // ── Mark All as Read ──

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // ── Click Outside to Close ──

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ── Handlers ──

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white min-w-[18px] h-[18px] px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Mark All Read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li key={notification._id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                        notification.isRead
                          ? 'hover:bg-gray-50'
                          : 'bg-blue-50/40 hover:bg-blue-50/70'
                      }`}
                    >
                      {/* Unread Dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        {!notification.isRead ? (
                          <span className="block h-2 w-2 rounded-full bg-blue-500" />
                        ) : (
                          <span className="block h-2 w-2 rounded-full bg-transparent" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-snug ${
                            notification.isRead
                              ? 'text-gray-600'
                              : 'text-gray-900 font-medium'
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2">
              <p className="text-center text-xs text-gray-400">
                Showing latest {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
