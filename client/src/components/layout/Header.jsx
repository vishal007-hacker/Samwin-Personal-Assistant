import { Menu } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import NotificationBell from '../../features/notifications/NotificationBell';

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

      {/* Right: notifications + user info */}
      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell />

        {/* User avatar + role */}
        <div className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-gray-200">
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
