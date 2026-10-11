import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Leaf, Menu, X, LogOut, Bell, Check, User, ShieldCheck, HeartHandshake, Truck } from 'lucide-react';
import { Button } from '../common/Button';
import api from '../../services/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      const items: NotificationItem[] = res.data?.data || [];
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.isRead).length);
    } catch {
      // Background notifications failure should fail gracefully
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      error('Failed to mark notification as read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      success('All notifications marked as read');
    } catch {
      error('Failed to mark all as read');
    }
  };

  const handleLogout = () => {
    logout();
    success('Logged out successfully');
    navigate('/login');
  };

  const getRoleIcon = () => {
    if (!user) return null;
    switch (user.role) {
      case 'ADMIN': return <ShieldCheck className="w-3.5 h-3.5 text-red-500" />;
      case 'DONOR': return <Leaf className="w-3.5 h-3.5 text-emerald-500" />;
      case 'RECIPIENT': return <HeartHandshake className="w-3.5 h-3.5 text-blue-500" />;
      case 'PROVIDER': return <Truck className="w-3.5 h-3.5 text-amber-500" />;
      default: return <User className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Leaf className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">EarthSync</span>
              <span className="block text-[10px] text-emerald-600 font-semibold uppercase tracking-wider -mt-1">Eco Management</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/resources" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">
            Resources
          </Link>
          <Link to="/reports" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">
            Reports & Hazards
          </Link>
          <Link to="/impact" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">
            Impact Metrics
          </Link>

          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popup */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-slide-up">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                      <span className="font-semibold text-slate-900 text-sm">Notifications ({unreadCount} unread)</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition-colors flex gap-2 items-start ${
                              n.isRead ? 'bg-white opacity-70' : 'bg-emerald-50/50'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">{n.title}</p>
                              <p className="text-slate-600 mt-0.5">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!n.isRead && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Pill & Quick Links */}
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100/60 transition-colors"
              >
                {getRoleIcon()}
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">{user.name}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">{user.role}</span>
                </div>
              </Link>

              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-red-600">
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate('/register')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Get Started
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <Link to="/dashboard" className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded">
              {user.role}
            </Link>
          )}
          <button
            className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
          <Link to="/resources" className="block text-sm font-semibold text-slate-700 py-1" onClick={() => setIsOpen(false)}>
            Resources Marketplace
          </Link>
          <Link to="/reports" className="block text-sm font-semibold text-slate-700 py-1" onClick={() => setIsOpen(false)}>
            Reports & Hazards
          </Link>
          <Link to="/impact" className="block text-sm font-semibold text-slate-700 py-1" onClick={() => setIsOpen(false)}>
            Impact Metrics
          </Link>

          {user ? (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <Link to="/dashboard" className="block text-sm font-bold text-emerald-600 py-1" onClick={() => setIsOpen(false)}>
                Dashboard ({user.name})
              </Link>
              <Link to="/profile" className="block text-sm text-slate-600 py-1" onClick={() => setIsOpen(false)}>
                Profile & Settings
              </Link>
              <button
                onClick={() => { setIsOpen(false); handleLogout(); }}
                className="block text-sm font-medium text-red-600 py-1 w-full text-left cursor-pointer"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" className="w-full justify-center" onClick={() => { navigate('/login'); setIsOpen(false); }}>
                Log in
              </Button>
              <Button className="w-full justify-center bg-emerald-600 text-white" onClick={() => { navigate('/register'); setIsOpen(false); }}>
                Sign up
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
