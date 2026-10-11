import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  PackageSearch, 
  MapPin, 
  ClipboardList, 
  Settings,
  BarChart3,
  ShieldAlert,
  Truck,
  HeartHandshake,
  Gift
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const citizenLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/resources', icon: <PackageSearch size={18} />, label: 'Marketplace' },
    { to: '/reports', icon: <MapPin size={18} />, label: 'Reports & Hazards' },
    { to: '/impact', icon: <BarChart3 size={18} />, label: 'Impact Metrics' },
  ];

  const donorLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Donor Dashboard' },
    { to: '/resources', icon: <Gift size={18} />, label: 'Marketplace' },
    { to: '/reports', icon: <MapPin size={18} />, label: 'Hazard Reports' },
    { to: '/impact', icon: <BarChart3 size={18} />, label: 'Donor Impact' },
  ];

  const recipientLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Recipient Dashboard' },
    { to: '/resources', icon: <HeartHandshake size={18} />, label: 'Claim Resources' },
    { to: '/reports', icon: <MapPin size={18} />, label: 'Hazard Reports' },
    { to: '/impact', icon: <BarChart3 size={18} />, label: 'Impact Metrics' },
  ];

  const providerLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Provider Queue' },
    { to: '/reports', icon: <Truck size={18} />, label: 'Incidents & Work' },
    { to: '/resources', icon: <PackageSearch size={18} />, label: 'Resources' },
    { to: '/impact', icon: <BarChart3 size={18} />, label: 'Service Impact' },
  ];

  const adminLinks = [
    { to: '/admin', icon: <ShieldAlert size={18} />, label: 'Admin Command' },
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Live Dashboard' },
    { to: '/resources', icon: <PackageSearch size={18} />, label: 'Resource Moderation' },
    { to: '/reports', icon: <ClipboardList size={18} />, label: 'All Reports' },
    { to: '/impact', icon: <BarChart3 size={18} />, label: 'Platform Analytics' },
  ];

  const getLinks = () => {
    switch (user.role) {
      case 'ADMIN': return adminLinks;
      case 'PROVIDER': return providerLinks;
      case 'DONOR': return donorLinks;
      case 'RECIPIENT': return recipientLinks;
      case 'CITIZEN':
      default:
        return citizenLinks;
    }
  };

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case 'ADMIN': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'PROVIDER': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DONOR': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'RECIPIENT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col shrink-0 border-r border-slate-800">
      {/* User summary card */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate text-sm">{user.name}</div>
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 ${getRoleBadgeColor()}`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
        {getLinks().map((link) => (
          <NavLink
            key={link.to + link.label}
            to={link.to}
            end={link.to === '/dashboard' || link.to === '/admin'}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer shortcut to Profile / Settings */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/20">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          <span>Profile & Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};
