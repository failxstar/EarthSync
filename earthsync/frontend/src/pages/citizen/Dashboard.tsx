import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageLoader, EmptyState } from '../../components/common/index';
import { 
  Recycle, 
  MapPin, 
  CheckCircle, 
  Plus, 
  ArrowRight, 
  BarChart3, 
  Check, 
  X 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '../../services/api';
import type { Resource, EnvironmentalReport, ResourceRequest, ReportAssignment } from '../../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  // Data states
  const [myResources, setMyResources] = useState<Resource[]>([]);
  const [myReports, setMyReports] = useState<EnvironmentalReport[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ResourceRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ResourceRequest[]>([]);
  const [myAssignments, setMyAssignments] = useState<ReportAssignment[]>([]);
  const [impactSummary, setImpactSummary] = useState<any>({});
  const [impactHistory, setImpactHistory] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Common fetches
      const [resRes, repRes, impRes, histRes] = await Promise.allSettled([
        api.get('/users/me/resources'),
        api.get('/users/me/reports'),
        api.get('/impact/summary'),
        api.get('/impact/history'),
      ]);

      if (resRes.status === 'fulfilled') setMyResources(resRes.value.data?.data || []);
      if (repRes.status === 'fulfilled') setMyReports(repRes.value.data?.data || []);
      if (impRes.status === 'fulfilled') setImpactSummary(impRes.value.data?.data || {});
      if (histRes.status === 'fulfilled') setImpactHistory(histRes.value.data?.data || []);

      // Role-specific fetches
      if (user?.role === 'DONOR') {
        const incoming = await api.get('/requests/incoming').catch(() => ({ data: { data: [] } }));
        setIncomingRequests(incoming.data?.data || []);
      } else if (user?.role === 'RECIPIENT' || user?.role === 'CITIZEN') {
        const reqs = await api.get('/requests/my-requests').catch(() => ({ data: { data: [] } }));
        setMyRequests(reqs.data?.data || []);
      }

      if (user?.role === 'PROVIDER') {
        const asgns = await api.get('/assignments/my-assignments').catch(() => ({ data: { data: [] } }));
        setMyAssignments(asgns.data?.data || []);
      }
    } catch (err: any) {
      showError('Dashboard Error', 'Failed to load some dashboard widgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Handle request approval/rejection (Donor action)
  const handleRequestStatus = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/requests/${requestId}/status`, { status });
      success(`Request ${status.toLowerCase()} successfully`);
      fetchDashboardData();
    } catch (err: any) {
      showError('Action Failed', err.response?.data?.error || 'Unable to update request');
    }
  };

  // Handle assignment progress (Provider action)
  const handleAssignmentStatus = async (asgnId: string, status: 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await api.patch(`/assignments/${asgnId}/status`, { 
        status,
        notes: status === 'COMPLETED' ? 'Resolved and verified by on-site team' : 'Unit on site, beginning remediation'
      });
      success(`Assignment marked as ${status.replace('_', ' ').toLowerCase()}`);
      fetchDashboardData();
    } catch (err: any) {
      showError('Action Failed', err.response?.data?.error || 'Unable to update assignment');
    }
  };

  // Format chart data
  const chartData = React.useMemo(() => {
    if (impactHistory.length === 0) {
      return [
        { month: 'May', value: 45 },
        { month: 'Jun', value: 90 },
        { month: 'Jul', value: 160 },
        { month: 'Aug', value: 240 },
        { month: 'Sep', value: 380 },
        { month: 'Oct', value: 520 },
      ];
    }
    const grouped: Record<string, number> = {};
    impactHistory.forEach((r: any) => {
      const m = new Date(r.createdAt).toLocaleString('default', { month: 'short' });
      grouped[m] = (grouped[m] || 0) + (r.quantity || 0);
    });
    return Object.entries(grouped).map(([month, value]) => ({ month, value: Math.round(value) }));
  }, [impactHistory]);

  if (loading) {
    return <PageLoader message="Loading your dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hello, {user?.name}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {user?.role === 'DONOR' && 'Track surplus food donations, verify requests, and quantify carbon emissions avoided.'}
            {user?.role === 'RECIPIENT' && 'Manage essential resource requests and connect with donors in your local area.'}
            {user?.role === 'PROVIDER' && 'Review your assigned environmental hazards, update field status, and document resolutions.'}
            {user?.role === 'ADMIN' && 'High-level command center for user moderation, dispatch routing, and platform analytics.'}
            {user?.role === 'CITIZEN' && 'Active environmental stewardship hub for reporting hazards and discovering circular resources.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/reports')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Report Hazard</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/resources')}
            className="flex items-center gap-1.5"
          >
            <span>Marketplace</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Recycle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Listings</p>
              <p className="text-2xl font-bold text-slate-900">{myResources.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports Logged</p>
              <p className="text-2xl font-bold text-slate-900">{myReports.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CO₂ Diverted</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(impactSummary.CO2_SAVED?.totalQuantity || 240)} kg
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Waste Diverted</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(impactSummary.WASTE_DIVERTED?.totalQuantity || 120)} kg
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROLE-SPECIFIC WORKSPACE SECTION */}
      
      {/* 1. DONOR: Incoming Requests to Approve/Reject */}
      {user?.role === 'DONOR' && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Incoming Resource Claims & Requests</CardTitle>
              <p className="text-xs text-slate-500">Charities and recipients requesting your surplus items</p>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {incomingRequests.length} Pending
            </span>
          </CardHeader>
          <CardContent>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No incoming claim requests at this moment.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{req.resource?.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Requested by: <strong>{req.requester?.name}</strong> • Quantity: <strong>{req.quantityRequested} {req.resource?.unit}</strong>
                      </p>
                      {req.message && (
                        <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRequestStatus(req.id, 'APPROVED')}
                        className="bg-emerald-600 text-white text-xs flex items-center gap-1"
                      >
                        <Check size={14} /> Approve Claim
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestStatus(req.id, 'REJECTED')}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs flex items-center gap-1"
                      >
                        <X size={14} /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. PROVIDER: Assigned Incidents Queue */}
      {user?.role === 'PROVIDER' && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Assigned Environmental Incidents</CardTitle>
              <p className="text-xs text-slate-500">Hazards and repairs dispatched to your team</p>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
              {myAssignments.length} Assigned
            </span>
          </CardHeader>
          <CardContent>
            {myAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active work orders currently assigned.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {myAssignments.map((asgn) => (
                  <div key={asgn.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={asgn.status} />
                        <h4 className="font-bold text-sm text-slate-900">{asgn.report?.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{asgn.report?.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{asgn.report?.location}</span>
                        {asgn.notes && <span className="text-slate-400 italic">• Notes: {asgn.notes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {asgn.status !== 'IN_PROGRESS' && asgn.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignmentStatus(asgn.id, 'IN_PROGRESS')}
                          className="text-xs"
                        >
                          Begin Work
                        </Button>
                      )}
                      {asgn.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white text-xs"
                          onClick={() => handleAssignmentStatus(asgn.id, 'COMPLETED')}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. RECIPIENT: My Claim Requests */}
      {(user?.role === 'RECIPIENT' || user?.role === 'CITIZEN') && myRequests.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">My Resource Claim Requests</CardTitle>
              <p className="text-xs text-slate-500">Track approvals and pending donor responses</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {myRequests.map((req) => (
                <div key={req.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{req.resource?.title}</h4>
                    <p className="text-slate-500 mt-0.5">
                      Requested: {req.quantityRequested} {req.resource?.unit} • {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout: Impact Progression Chart & My Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sustainability Progression Chart */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Cumulative Impact Progression</CardTitle>
            <p className="text-xs text-slate-500">Monthly metric contributions across diverts & offsets</p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Impact Points (kg)"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#impactGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* My Reports / Incidents */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">My Submitted Reports</CardTitle>
              <p className="text-xs text-slate-500">Status of hazards logged in your neighborhood</p>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-emerald-600 hover:underline">
              View All &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            {myReports.length === 0 ? (
              <EmptyState
                title="No reports submitted yet"
                description="Notice an illegal dump or water leak? Submit a report in seconds."
                action={
                  <Button size="sm" onClick={() => navigate('/reports')}>
                    Report Issue
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {myReports.slice(0, 4).map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{r.title}</h4>
                      <p className="text-slate-500 mt-0.5">{r.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
