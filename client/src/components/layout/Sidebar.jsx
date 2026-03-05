import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  FileText,
  FilePlus,
  FolderOpen,
  CreditCard,
  Bell,
  BarChart3,
  Wallet,
  Megaphone,
  LogOut,
  X,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  {
    label: 'Insurance',
    icon: ShieldCheck,
    children: [
      { to: '/schemes', label: 'Schemes', icon: FileText },
      { to: '/policies/new', label: 'New Policy', icon: FilePlus },
      { to: '/policies', label: 'Policies', icon: FolderOpen },
      { to: '/reminders', label: 'Reminders', icon: Bell },
    ],
  },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/credits', label: 'Credit', icon: Wallet },
  { to: '/broadcast', label: 'Broadcast', icon: Megaphone },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

function NavItem({ item, onClose }) {
  const location = useLocation();
  const hasChildren = !!item.children;
  const isChildActive = hasChildren && item.children.some((c) => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(isChildActive);

  if (hasChildren) {
    const Icon = item.icon;
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isChildActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Icon
            className={`h-5 w-5 shrink-0 ${isChildActive ? 'text-blue-600' : 'text-gray-400'}`}
          />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            } ${isChildActive ? 'text-blue-500' : 'text-gray-400'}`}
          />
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-2">
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => {
                  const ChildIcon = child.icon;
                  return (
                    <>
                      <ChildIcon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-blue-600' : 'text-gray-400'
                        }`}
                      />
                      <span>{child.label}</span>
                    </>
                  );
                }}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {collapsed === false && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-white border-r border-gray-200 shadow-sm
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${collapsed ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              Samwin Infotech
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to || item.label} item={item} onClose={onClose} />
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-200 p-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
              {user?.name
                ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {user?.role || 'agent'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
