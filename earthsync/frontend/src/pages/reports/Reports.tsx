import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState, PageLoader, Pagination } from '../../components/common/index';
import { MapView } from '../../components/maps/MapComponents';
import { 
  Search, 
  MapPin, 
  Plus, 
  Grid, 
  Map as MapIcon, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Truck,
  Upload
} from 'lucide-react';
import api from '../../services/api';
import type { 
  EnvironmentalReport, 
  ReportCategory, 
  ReportPriority, 
  ReportStatus, 
  User as UserType 
} from '../../types';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [providers, setProviders] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EnvironmentalReport | null>(null);

  // AI Classification State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'ILLEGAL_DUMPING' as ReportCategory,
    priority: 'MEDIUM' as ReportPriority,
    location: 'Mission Dolores Park Plaza, San Francisco, CA',
    latitude: 37.7596,
    longitude: -122.4269,
    imageUrl: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploadingImage(true);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.data?.url;
      if (url) {
        setCreateForm(prev => ({ ...prev, imageUrl: url }));
        success('Incident photo uploaded to Cloudinary!');
      }
    } catch (err: any) {
      showError('Upload Failed', err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingImage(false);
    }
  };

  // Provider assignment & status transition in Detail modal
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [statusActionSubmitting, setStatusActionSubmitting] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch Reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/reports', { params });
      setReports(res.data?.data || []);
    } catch (err: any) {
      showError('Failed to load reports', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Providers (for Admin or Assignment)
  const fetchProviders = async () => {
    if (user?.role === 'ADMIN') {
      try {
        const res = await api.get('/admin/providers');
        setProviders(res.data?.data || []);
      } catch {
        // Ignore if provider fetch not permitted
      }
    }
  };

  useEffect(() => {
    fetchReports();
  }, [categoryFilter, priorityFilter, statusFilter]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchProviders();
    }
  }, [user]);

  // Filter in Memory
  const filteredReports = useMemo(() => {
    let result = [...reports];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        r => r.title.toLowerCase().includes(q) ||
             r.description.toLowerCase().includes(q) ||
             r.location.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, searchQuery]);

  // Paginated records
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, page, pageSize]);

  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;

  // AI Classification Trigger (Pre-Save)
  const handleAiClassify = async () => {
    if (!createForm.title || !createForm.description) {
      showError('Input Required', 'Please enter a title and description before running AI analysis.');
      return;
    }
    try {
      setAiAnalyzing(true);
      const res = await api.post('/reports/classify-pre-save', {
        title: createForm.title,
        description: createForm.description,
      });

      const classification = res.data?.data;
      if (classification) {
        setAiResult(classification);
        setCreateForm(prev => ({
          ...prev,
          category: classification.suggestedCategory || classification.category || prev.category,
          priority: classification.suggestedPriority || classification.priority || prev.priority,
        }));
        success('AI Classification Complete', `Assigned: ${classification.suggestedCategory || classification.category} (${classification.suggestedPriority || classification.priority})`);
      }
    } catch (err: any) {
      showError('AI Assist Failed', err.response?.data?.error || 'Unable to classify report automatically.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Multimodal AI Photo Analysis Trigger
  const handleAnalyzePhoto = async () => {
    if (!createForm.imageUrl) {
      showError('Photo Required', 'Please upload an image file or enter an image URL to analyze with AI vision.');
      return;
    }
    try {
      setPhotoAnalyzing(true);
      const res = await api.post('/reports/analyze-photo', {
        imageUrl: createForm.imageUrl,
        title: createForm.title,
        description: createForm.description,
      });

      const analysis = res.data?.data;
      if (analysis) {
        setAiResult(analysis);
        setCreateForm(prev => ({
          ...prev,
          title: prev.title.trim() ? prev.title : (analysis.suggestedTitle || prev.title),
          description: analysis.suggestedDescription || prev.description,
          category: analysis.category || prev.category,
          priority: analysis.priority || prev.priority,
        }));
        success(
          'Photo Analyzed with AI Vision!',
          `Detected: ${analysis.category} (${analysis.priority} Priority, ${Math.round((analysis.confidenceScore || 0.95) * 100)}% confidence)`
        );
      }
    } catch (err: any) {
      showError('Photo Analysis Failed', err.response?.data?.error || 'Unable to analyze photo with AI vision.');
    } finally {
      setPhotoAnalyzing(false);
    }
  };

  // Create Report Submit
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showError('Please sign in to submit incident reports');
      return;
    }
    try {
      setCreateSubmitting(true);
      const payload = {
        title: createForm.title,
        description: createForm.description,
        category: createForm.category,
        priority: createForm.priority,
        location: createForm.location,
        latitude: createForm.latitude,
        longitude: createForm.longitude,
        imageUrls: createForm.imageUrl ? [createForm.imageUrl] : [],
      };

      await api.post('/reports', payload);
      success('Incident report submitted successfully!');
      setCreateModalOpen(false);
      setAiResult(null);
      setCreateForm({
        title: '',
        description: '',
        category: 'ILLEGAL_DUMPING',
        priority: 'MEDIUM',
        location: 'Mission Dolores Park Plaza, San Francisco, CA',
        latitude: 37.7596,
        longitude: -122.4269,
        imageUrl: '',
      });
      fetchReports();
    } catch (err: any) {
      showError('Submission Failed', err.response?.data?.error || err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Detail Modal
  const openDetailModal = (report: EnvironmentalReport) => {
    setSelectedReport(report);
    setSelectedProviderId('');
    setResolutionNotes('');
    setDetailModalOpen(true);
  };

  // Admin Assign Provider
  const handleAssignProvider = async () => {
    if (!selectedReport || !selectedProviderId) return;
    try {
      setStatusActionSubmitting(true);
      await api.post('/admin/assign-provider', {
        reportId: selectedReport.id,
        providerId: selectedProviderId,
        notes: 'Assigned via EarthSync dispatch portal',
      });
      success('Provider assigned successfully');
      setDetailModalOpen(false);
      fetchReports();
    } catch (err: any) {
      showError('Assignment Failed', err.response?.data?.error || 'Failed to assign provider');
    } finally {
      setStatusActionSubmitting(false);
    }
  };

  // Provider / Admin Update Status
  const handleUpdateStatus = async (newStatus: ReportStatus) => {
    if (!selectedReport) return;
    try {
      setStatusActionSubmitting(true);
      await api.patch(`/reports/${selectedReport.id}/status`, {
        status: newStatus,
        notes: resolutionNotes,
      });
      success(`Report status updated to ${newStatus}`);
      setDetailModalOpen(false);
      fetchReports();
    } catch (err: any) {
      showError('Status Update Failed', err.response?.data?.error || 'Failed to update report status');
    } finally {
      setStatusActionSubmitting(false);
    }
  };

  // Priority color helper
  const getPriorityColor = (priority: ReportPriority) => {
    switch (priority) {
      case 'CRITICAL': return '#dc2626'; // Red
      case 'HIGH': return '#ea580c';     // Orange
      case 'MEDIUM': return '#d97706';   // Amber
      case 'LOW': return '#2563eb';      // Blue
    }
  };

  // Map markers
  const mapMarkers = useMemo(() => {
    return filteredReports.map(r => ({
      id: r.id,
      latitude: r.latitude || 37.7749,
      longitude: r.longitude || -122.4194,
      title: r.title,
      subtitle: `${r.category} • Priority: ${r.priority}`,
      badge: r.status,
      badgeColor: getPriorityColor(r.priority),
      color: getPriorityColor(r.priority),
      onClick: () => openDetailModal(r),
    }));
  }, [filteredReports]);

  // Stepper helper
  const statusSteps: ReportStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Environmental Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Log hazards, water leaks, illegal dumping, and energy surge alerts with AI risk analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid size={15} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon size={15} />
              <span>Map View</span>
            </button>
          </div>

          {user && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} />
              <span>Report Hazard</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search incidents by title, description, or street..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="WASTE">Waste & Debris</option>
              <option value="WATER_LEAKAGE">Water Leakage</option>
              <option value="POLLUTION">Pollution & Air</option>
              <option value="ILLEGAL_DUMPING">Illegal Dumping</option>
              <option value="ENERGY">Energy & Grid</option>
              <option value="OTHER">Other Issues</option>
            </select>

            {/* Priority Select */}
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical Severity</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <PageLoader message="Loading environmental reports..." />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title="No reports match your filters"
          description="Adjust your search criteria or report a new environmental issue."
          action={
            user ? (
              <Button onClick={() => setCreateModalOpen(true)}>File a Report</Button>
            ) : undefined
          }
        />
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <MapView
            markers={mapMarkers}
            height="550px"
            zoom={12}
          />
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-800">Priority Legend:</span>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600"></span> Critical</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-600"></span> High</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-600"></span> Medium</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600"></span> Low</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {paginatedReports.map((rep) => {
              const parsedAi = rep.aiClassificationResult 
                ? (() => { try { return JSON.parse(rep.aiClassificationResult); } catch { return null; } })() 
                : null;

              return (
                <Card
                  key={rep.id}
                  className="overflow-hidden border-slate-200 flex flex-col hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => openDetailModal(rep)}
                >
                  {/* Photo or Header */}
                  <div className="h-40 bg-slate-100 relative overflow-hidden">
                    {rep.imageUrls && rep.imageUrls.length > 0 ? (
                      <img
                        src={rep.imageUrls[0]}
                        alt={rep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 font-bold text-xs uppercase">
                        {rep.category}
                      </div>
                    )}

                    {/* Status badge pill */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={rep.status} />
                    </div>

                    {/* Priority badge pill */}
                    <div
                      className="absolute top-3 right-3 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs"
                      style={{ backgroundColor: getPriorityColor(rep.priority) }}
                    >
                      {rep.priority}
                    </div>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                        <span>{rep.category.replace('_', ' ')}</span>
                        {parsedAi && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-semibold">
                            <Sparkles size={10} /> AI Classified
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {rep.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {rep.description}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1 truncate" title={rep.location}>
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate">{rep.location}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock size={12} />
                          <span>Reported {new Date(rep.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600 group-hover:underline">
                        View Progress &rarr;
                      </span>
                      {rep.assignments && rep.assignments.length > 0 && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                          <Truck size={11} /> Dispatched
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* REPORT SUBMISSION MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Report an Environmental Issue"
        size="lg"
      >
        <form onSubmit={handleCreateReport} className="space-y-4">
          <Input
            label="Issue Title"
            placeholder="e.g. Hazardous chemical dumping, Broken water pipe flooding street..."
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            required
          />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-700">
                Detailed Description
              </label>
              <button
                type="button"
                onClick={handleAiClassify}
                disabled={aiAnalyzing}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60 cursor-pointer transition-colors"
              >
                <Sparkles size={13} className="text-emerald-600" />
                <span>{aiAnalyzing ? 'Analyzing with AI...' : '✨ Auto-Classify with AI'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Provide exact details: volume, materials involved, hazards, nearby drains or waterways..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              required
            />
          </div>

          {/* AI Feedback Banner if classified */}
          {aiResult && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 rounded-xl text-xs space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-slate-900">AI Vision Inspection Complete</span>
                    <span className="text-[11px] font-normal text-emerald-700">
                      Model: Google Gemini Vision • Confidence: {Math.round(((aiResult.confidenceScore || aiResult.confidence) || 0.95) * 100)}%
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                  {aiResult.priority || 'MEDIUM'} PRIORITY
                </span>
              </div>

              {aiResult.detectedIssue && (
                <div className="text-slate-800 bg-white/90 p-2.5 rounded-lg border border-emerald-100">
                  <span className="font-bold text-emerald-950 block mb-0.5">Identified Issue:</span>
                  <p className="text-slate-700 leading-relaxed">{aiResult.detectedIssue}</p>
                </div>
              )}

              {aiResult.visualEvidence && (
                <div className="text-slate-700 bg-white/90 p-2.5 rounded-lg border border-emerald-100">
                  <span className="font-bold text-emerald-950 block mb-0.5">Visual Observations:</span>
                  <p className="text-slate-600 leading-relaxed">{aiResult.visualEvidence}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500">Category: </span>
                  <strong className="text-emerald-800 font-semibold">{aiResult.category || aiResult.suggestedCategory}</strong>
                  {aiResult.suggestedProviderType && (
                    <>
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="text-slate-500">Suggested Dispatch: </span>
                      <strong className="text-slate-800 font-semibold">{aiResult.suggestedProviderType}</strong>
                    </>
                  )}
                </div>
              </div>

              {aiResult.riskFactors && aiResult.riskFactors.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ecological & Safety Risk Factors</span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.riskFactors.map((r: string) => (
                      <span key={r} className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as ReportCategory })}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ILLEGAL_DUMPING">Illegal Dumping</option>
                <option value="WATER_LEAKAGE">Water Leakage</option>
                <option value="WASTE">Waste & Debris</option>
                <option value="POLLUTION">Pollution</option>
                <option value="ENERGY">Energy & Grid</option>
                <option value="OTHER">Other Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Severity / Priority
              </label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as ReportPriority })}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="LOW">Low (Minimal impact)</option>
                <option value="MEDIUM">Medium (Neighborhood hazard)</option>
                <option value="HIGH">High (Immediate environmental loss)</option>
                <option value="CRITICAL">Critical (Toxicity / Hazardous runoff)</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Photo Evidence / Image (Cloudinary CDN)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors">
                  <Upload size={14} className="text-emerald-600" />
                  <span>{uploadingImage ? 'Uploading to Cloudinary...' : 'Upload Image File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-400">or direct URL:</span>
                <input
                  type="text"
                  placeholder="https://..."
                  value={createForm.imageUrl}
                  onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {createForm.imageUrl && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200/80 rounded-xl space-y-2 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={createForm.imageUrl}
                        alt="Preview"
                        className="w-14 h-14 object-cover rounded-lg border border-emerald-200 shadow-xs"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Photo Attached</span>
                        <span className="text-slate-500 text-[11px] truncate max-w-[220px] block">{createForm.imageUrl}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAnalyzePhoto}
                      isLoading={photoAnalyzing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs shrink-0"
                    >
                      <Sparkles size={13} className="mr-1.5" />
                      {photoAnalyzing ? 'Analyzing Photo with AI...' : '✨ Analyze Photo with AI Vision'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Street Address / Location Description"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                required
              />
            </div>

            {/* Click-to-Pin Map Location */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Incident Location Pin (Click map to adjust location)
              </label>
              <MapView
                height="190px"
                center={[createForm.latitude, createForm.longitude]}
                selectedLocation={[createForm.latitude, createForm.longitude]}
                onLocationSelect={(lat, lng) => {
                  setCreateForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                }}
              />
              <span className="text-[11px] text-slate-400">
                Coordinates: {createForm.latitude.toFixed(4)}, {createForm.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* REPORT DETAILS MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Incident Resolution & Tracking"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-5">
            {/* Top Stepper */}
            <div className="py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Lifecycle Status Tracker
              </p>
              <div className="flex items-center justify-between text-xs font-semibold">
                {statusSteps.map((s, idx) => {
                  const currentIdx = statusSteps.indexOf(selectedReport.status);
                  const isPassed = currentIdx >= idx;
                  const isCurrent = selectedReport.status === s;

                  return (
                    <div key={s} className="flex flex-col items-center flex-1 relative">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mb-1 transition-colors ${
                          isCurrent
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 font-bold'
                            : isPassed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>
                      <span className={`text-[10px] text-center uppercase tracking-tighter ${
                        isCurrent ? 'text-emerald-700 font-bold' : 'text-slate-400'
                      }`}>
                        {s.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Incident Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  {selectedReport.category.replace('_', ' ')}
                </span>
                <span
                  className="text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs"
                  style={{ backgroundColor: getPriorityColor(selectedReport.priority) }}
                >
                  {selectedReport.priority} Priority
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{selectedReport.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedReport.description}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span>{selectedReport.location}</span>
              </div>
            </div>

            {/* AI Classification Findings (if present) */}
            {selectedReport.aiClassificationResult && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Sparkles size={14} className="text-emerald-600" />
                  <span>AI Diagnostic Assessment</span>
                </div>
                {(() => {
                  try {
                    const parsed = JSON.parse(selectedReport.aiClassificationResult);
                    return (
                      <div className="space-y-1 text-slate-600">
                        {parsed.recommendedAction && (
                          <p><strong>Recommended Action:</strong> {parsed.recommendedAction}</p>
                        )}
                        {parsed.riskFactors && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {parsed.riskFactors.map((rf: string) => (
                              <span key={rf} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-medium">
                                {rf}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } catch {
                    return <p className="text-slate-500">{selectedReport.aiClassificationResult}</p>;
                  }
                })()}
              </div>
            )}

            {/* Provider Actions Section */}
            {(user?.role === 'PROVIDER' || user?.role === 'ADMIN') && (
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Truck size={14} /> Service Provider & Admin Control
                </h4>

                {/* If Admin: Option to assign provider */}
                {user?.role === 'ADMIN' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Assign Qualified Service Provider:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedProviderId}
                        onChange={(e) => setSelectedProviderId(e.target.value)}
                        className="flex-1 h-9 px-3 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="">-- Choose Provider --</option>
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={handleAssignProvider}
                        disabled={!selectedProviderId || statusActionSubmitting}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Transitions */}
                <div className="space-y-2 pt-2 border-t border-emerald-200/50">
                  <label className="block text-xs font-semibold text-slate-700">
                    Resolution Notes / Work Update:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter dispatch notes, equipment deployed, or resolution verification..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus('IN_PROGRESS')}
                      disabled={statusActionSubmitting}
                    >
                      Mark In Progress
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white"
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      disabled={statusActionSubmitting}
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
