import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/index';
import { 
  Users, 
  PackageSearch, 
  ClipboardList, 
  Activity, 
  BarChart3, 
  ShieldCheck, 
  Search, 
  CheckCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '../../services/api';
import type { User as UserType, Resource, EnvironmentalReport, Role } from '../../types';

export const Admin: React.FC = () => {
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'resources' | 'reports' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalResources: 0,
    totalReports: 0,
    resolvedReports: 0,
    activeListings: 0,
  });

  // Data lists
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [resourcesList, setResourcesList] = useState<Resource[]>([]);
  const [reportsList, setReportsList] = useState<EnvironmentalReport[]>([]);
  const [providersList, setProvidersList] = useState<UserType[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search/Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, resRes, repRes, provRes, logsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { data: {} } })),
        api.get('/admin/users').catch(() => ({ data: { data: [] } })),
        api.get('/admin/resources').catch(() => ({ data: { data: [] } })),
        api.get('/admin/reports').catch(() => ({ data: { data: [] } })),
        api.get('/admin/providers').catch(() => ({ data: { data: [] } })),
        api.get('/admin/audit-logs').catch(() => ({ data: { data: [] } })),
      ]);

      setStats(statsRes.data?.data || {});
      setUsersList(usersRes.data?.data || []);
      setResourcesList(resRes.data?.data || []);
      setReportsList(repRes.data?.data || []);
      setProvidersList(provRes.data?.data || []);
      setAuditLogs(logsRes.data?.data || []);
    } catch (err: any) {
      showError('Failed to load admin management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Update User Status (ACTIVE / SUSPENDED)
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      success(`User account status updated to ${nextStatus}`);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, accountStatus: nextStatus as any } : u));
    } catch (err: any) {
      showError('Action Failed', err.response?.data?.error || 'Unable to update status');
    }
  };

  // Change User Role
  const handleChangeUserRole = async (userId: string, newRole: Role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      success(`User role changed to ${newRole}`);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      showError('Action Failed', err.response?.data?.error || 'Unable to update role');
    }
  };

  // Moderate Resource
  const handleModerateResource = async (resourceId: string, status: string) => {
    try {
      await api.patch(`/admin/resources/${resourceId}/moderate`, { status });
      success(`Resource status updated to ${status}`);
      setResourcesList(prev => prev.map(r => r.id === resourceId ? { ...r, status: status as any } : r));
    } catch (err: any) {
      showError('Moderation Failed', err.response?.data?.error || 'Unable to moderate resource');
    }
  };

  // Assign Provider to Report
  const handleAssignProvider = async (reportId: string, providerId: string) => {
    if (!providerId) return;
    try {
      await api.post('/admin/assign-provider', {
        reportId,
        providerId,
        notes: 'Assigned via admin control dashboard',
      });
      success('Provider dispatched to report');
      fetchAdminData();
    } catch (err: any) {
      showError('Assignment Failed', err.response?.data?.error || 'Unable to assign provider');
    }
  };

  // Filtered users
  const filteredUsers = React.useMemo(() => {
    return usersList.filter(u => {
      const matchSearch = userSearch === '' || 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [usersList, userSearch, userRoleFilter]);

  // Report Category Chart Data
  const reportsByCategory = React.useMemo(() => {
    const counts: Record<string, number> = {};
    reportsList.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name: name.replace('_', ' '), count }));
  }, [reportsList]);

  if (loading) {
    return <PageLoader message="Loading administrator dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            <span>Administrator Command Center</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Full governance of platform users, resource listings, incident triage, and audit history.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
            { id: 'users', label: 'Users', icon: <Users size={14} /> },
            { id: 'resources', label: 'Resources', icon: <PackageSearch size={14} /> },
            { id: 'reports', label: 'Reports Dispatch', icon: <ClipboardList size={14} /> },
            { id: 'logs', label: 'Audit Logs', icon: <BarChart3 size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === tab.id ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Users</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalUsers || usersList.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <PackageSearch className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Resources</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeListings || resourcesList.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reports</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalReports || reportsList.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved Hazards</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.resolvedReports || 12}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Incident Reports by Category</CardTitle>
                <p className="text-xs text-slate-500">Distribution of reported municipal hazards</p>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportsByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" name="Reports" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Recent Administrative Activity</CardTitle>
                <p className="text-xs text-slate-500">Live system events and state mutations</p>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100 text-xs">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <strong className="text-slate-800 font-bold block">{log.action}</strong>
                        <span className="text-slate-500 text-[11px]">{log.entityType} ({log.entityId.slice(0, 8)}...)</span>
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">User Accounts ({filteredUsers.length})</CardTitle>
              <p className="text-xs text-slate-500">Manage permissions, role assignments, and account standing</p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="ALL">All Roles</option>
                <option value="CITIZEN">Citizen</option>
                <option value="DONOR">Donor</option>
                <option value="RECIPIENT">Recipient</option>
                <option value="PROVIDER">Provider</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <strong className="block text-slate-900 font-semibold">{u.name}</strong>
                        <span className="text-slate-500 text-[11px]">{u.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value as Role)}
                          className="px-2 py-1 border border-slate-200 rounded text-xs bg-white font-medium text-slate-700"
                        >
                          <option value="CITIZEN">Citizen</option>
                          <option value="DONOR">Donor</option>
                          <option value="RECIPIENT">Recipient</option>
                          <option value="PROVIDER">Provider</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={u.accountStatus} />
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.accountStatus)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            u.accountStatus === 'ACTIVE'
                              ? 'text-red-700 bg-red-50 hover:bg-red-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {u.accountStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: RESOURCE MODERATION */}
      {activeTab === 'resources' && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Resource Listings Moderation ({resourcesList.length})</CardTitle>
            <p className="text-xs text-slate-500">Review, approve, or expire community items</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resourcesList.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 max-w-xs">
                        <strong className="block text-slate-900 font-semibold truncate">{res.title}</strong>
                        <span className="text-slate-500 text-[11px] truncate block">{res.location}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{res.category}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{res.quantity} {res.unit}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={res.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {res.status !== 'AVAILABLE' && (
                            <button
                              onClick={() => handleModerateResource(res.id, 'AVAILABLE')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 text-[11px] font-semibold"
                            >
                              Make Available
                            </button>
                          )}
                          {res.status !== 'EXPIRED' && (
                            <button
                              onClick={() => handleModerateResource(res.id, 'EXPIRED')}
                              className="px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 text-[11px] font-semibold"
                            >
                              Expire
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: REPORTS & PROVIDER DISPATCH */}
      {activeTab === 'reports' && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Incident Triage & Provider Dispatch ({reportsList.length})</CardTitle>
            <p className="text-xs text-slate-500">Assign certified service contractors to active environmental reports</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Incident</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assign Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportsList.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 max-w-sm">
                        <strong className="block text-slate-900 font-semibold">{rep.title}</strong>
                        <span className="text-slate-500 text-[11px]">{rep.category} • {rep.location}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={rep.priority} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={rep.status} />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          defaultValue=""
                          onChange={(e) => handleAssignProvider(rep.id, e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-700"
                        >
                          <option value="">-- Dispatch Provider --</option>
                          {providersList.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">System Audit Trail ({auditLogs.length})</CardTitle>
            <p className="text-xs text-slate-500">Immutable ledger of administrative actions and model predictions</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Actor ID</th>
                    <th className="py-3 px-4">Metadata</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-emerald-800 font-bold">{log.action}</td>
                      <td className="py-3 px-4 text-slate-700">{log.entityType} ({log.entityId.slice(0, 8)})</td>
                      <td className="py-3 px-4 text-slate-500">{log.actorId ? log.actorId.slice(0, 8) : 'SYSTEM'}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{log.metadata || '-'}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
