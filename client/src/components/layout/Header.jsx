import { useState, useEffect } from 'react';
import { Menu, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import NotificationBell from '../../features/notifications/NotificationBell';

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-600">{dateStr}</span>
      </div>
      <div className="w-px h-4 bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-xs font-semibold text-gray-800 tabular-nums">{timeStr}</span>
        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1 py-0.5 rounded">IST</span>
      </div>
    </div>
  );
}

export default function Header({ onMenuToggle, title }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-200 shadow-sm">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
          {title || 'Dashboard'}
        </h1>
      </div>

      {/* Right: clock + notifications + user info */}
      <div className="flex items-center gap-2 sm:gap-3">
        <LiveClock />

        <NotificationBell />

        {/* User avatar + role */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-200">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'U'}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role || 'agent'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
