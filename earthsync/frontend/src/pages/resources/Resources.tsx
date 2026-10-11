import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Trash2, 
  Clock,
  Upload,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import type { Resource, ResourceCategory } from '../../types';

export const Resources: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [searchParams] = useSearchParams();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('AVAILABLE');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'FOOD' as ResourceCategory,
    quantity: 1,
    unit: 'kg',
    condition: 'Good',
    location: '742 Evergreen Terrace, San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    imageUrl: '',
    expiryDate: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [aiResourceResult, setAiResourceResult] = useState<any>(null);

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
        success('Photo uploaded to Cloudinary CDN!');
      }
    } catch (err: any) {
      showError('Upload Failed', err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingImage(false);
    }
  };

  // AI Multimodal Resource Photo Analysis
  const handleAnalyzePhoto = async () => {
    if (!createForm.imageUrl) {
      showError('Photo Required', 'Please upload or enter a photo URL first to analyze with AI vision.');
      return;
    }
    try {
      setPhotoAnalyzing(true);
      const res = await api.post('/resources/analyze-photo', {
        imageUrl: createForm.imageUrl,
      });
      const data = res.data?.data;
      if (data) {
        setAiResourceResult(data);
        setCreateForm(prev => ({
          ...prev,
          title: data.suggestedTitle || prev.title,
          description: data.suggestedDescription || prev.description,
          category: data.category || prev.category,
          quantity: data.estimatedQuantity || prev.quantity,
          unit: data.suggestedUnit || prev.unit,
          condition: data.condition || prev.condition,
        }));
        success(
          'Resource Details Auto-Filled by AI!',
          `Identified: ${data.suggestedTitle} (${data.category}, condition: ${data.condition})`
        );
      }
    } catch (err: any) {
      showError('AI Analysis Failed', err.response?.data?.error || 'Unable to analyze resource photo.');
    } finally {
      setPhotoAnalyzing(false);
    }
  };

  // Request Form State
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Fetch Resources
  const fetchResources = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedCategory && selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/resources', { params });
      setResources(res.data?.data || []);
    } catch (err: any) {
      showError('Failed to load resources', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  // Filter and Sort in Memory
  const filteredAndSortedResources = useMemo(() => {
    let result = [...resources];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        r => r.title.toLowerCase().includes(q) ||
             r.description.toLowerCase().includes(q) ||
             r.location.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'quantityDesc') {
      result.sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === 'quantityAsc') {
      result.sort((a, b) => a.quantity - b.quantity);
    }

    return result;
  }, [resources, searchQuery, sortBy]);

  // Paginated records
  const paginatedResources = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedResources.slice(start, start + pageSize);
  }, [filteredAndSortedResources, page, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedResources.length / pageSize) || 1;

  // Handle Create Resource
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showError('Please sign in to publish resources');
      return;
    }
    try {
      setCreateSubmitting(true);
      const payload = {
        title: createForm.title,
        description: createForm.description,
        category: createForm.category,
        quantity: Number(createForm.quantity),
        unit: createForm.unit,
        condition: createForm.condition,
        location: createForm.location,
        latitude: createForm.latitude,
        longitude: createForm.longitude,
        imageUrls: createForm.imageUrl ? [createForm.imageUrl] : [],
        expiryDate: createForm.expiryDate ? new Date(createForm.expiryDate).toISOString() : null,
      };

      await api.post('/resources', payload);
      success('Resource published successfully!');
      setCreateModalOpen(false);
      setCreateForm({
        title: '',
        description: '',
        category: 'FOOD',
        quantity: 1,
        unit: 'kg',
        condition: 'Good',
        location: '742 Evergreen Terrace, San Francisco, CA',
        latitude: 37.7749,
        longitude: -122.4194,
        imageUrl: '',
        expiryDate: '',
      });
      fetchResources();
    } catch (err: any) {
      showError('Failed to publish resource', err.response?.data?.error || err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Request Modal
  const openRequestModal = (resource: Resource) => {
    if (!user) {
      showError('Authentication Required', 'Please sign in to claim or request resources');
      return;
    }
    setSelectedResource(resource);
    setRequestQuantity(1);
    setRequestMessage('');
    setRequestModalOpen(true);
  };

  // Submit Resource Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;
    try {
      setRequestSubmitting(true);
      await api.post('/requests', {
        resourceId: selectedResource.id,
        quantityRequested: Number(requestQuantity),
        message: requestMessage,
      });
      success('Request submitted!', 'The donor will be notified of your request.');
      setRequestModalOpen(false);
      fetchResources();
    } catch (err: any) {
      showError('Request Failed', err.response?.data?.error || 'Unable to submit request');
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Deactivate Resource (Owner/Admin)
  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate or remove this listing?')) return;
    try {
      await api.delete(`/resources/${id}`);
      success('Listing updated');
      fetchResources();
    } catch (err: any) {
      showError('Action Failed', err.response?.data?.error || 'Unable to deactivate resource');
    }
  };

  // Map markers
  const mapMarkers = useMemo(() => {
    return filteredAndSortedResources.map(r => ({
      id: r.id,
      latitude: r.latitude || 37.7749,
      longitude: r.longitude || -122.4194,
      title: r.title,
      subtitle: `${r.quantity} ${r.unit} • ${r.location}`,
      badge: r.category,
      badgeColor: '#16a34a',
      color: '#16a34a',
      onClick: () => openRequestModal(r),
    }));
  }, [filteredAndSortedResources]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Resource Marketplace</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Share and claim surplus foods, recyclables, electronics, and reusable equipment.
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
              title="Grid View"
            >
              <Grid size={15} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Map View"
            >
              <MapIcon size={15} />
              <span>Map</span>
            </button>
          </div>

          {user && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} />
              <span>List Resource</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources by title, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="FOOD">Food Surplus</option>
              <option value="CLOTHING">Apparel & Textiles</option>
              <option value="ELECTRONICS">Electronics & Tech</option>
              <option value="FURNITURE">Furniture & Household</option>
              <option value="RECYCLABLES">Recyclables & Packaging</option>
              <option value="WATER">Clean Water</option>
              <option value="OTHER">Other Goods</option>
            </select>

            {/* Status Select */}
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="COMPLETED">Completed / Claimed</option>
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="quantityDesc">Quantity: High to Low</option>
              <option value="quantityAsc">Quantity: Low to High</option>
            </select>

            <Button type="submit" variant="secondary" size="sm" className="whitespace-nowrap">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <PageLoader message="Loading available resources..." />
      ) : filteredAndSortedResources.length === 0 ? (
        <EmptyState
          title="No resources found"
          description="Try broadening your search query or selecting a different category filter."
          action={
            user ? (
              <Button onClick={() => setCreateModalOpen(true)}>List the First Item</Button>
            ) : undefined
          }
        />
      ) : viewMode === 'map' ? (
        /* Map View */
        <div className="space-y-4">
          <MapView
            markers={mapMarkers}
            height="550px"
            zoom={12}
          />
          <p className="text-xs text-slate-500 text-center">
            Click on any green pin to view resource details and submit a claim request.
          </p>
        </div>
      ) : (
        /* Grid View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {paginatedResources.map((res) => {
              const isOwner = user && user.id === res.ownerId;
              const isAdmin = user && user.role === 'ADMIN';

              return (
                <Card
                  key={res.id}
                  className="overflow-hidden border-slate-200 flex flex-col hover:shadow-md transition-shadow group"
                >
                  {/* Photo or Category Image Header */}
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    {res.imageUrls && res.imageUrls.length > 0 ? (
                      <img
                        src={res.imageUrls[0]}
                        alt={res.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 font-bold text-sm">
                        {res.category}
                      </div>
                    )}

                    {/* Status badge pill */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={res.status} />
                    </div>

                    {/* Category pill */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {res.category}
                    </div>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {res.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {res.description}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between items-center font-medium">
                          <span>Quantity:</span>
                          <span className="font-bold text-emerald-700">
                            {res.quantity} {res.unit}
                          </span>
                        </div>

                        {res.condition && (
                          <div className="flex justify-between items-center">
                            <span>Condition:</span>
                            <span className="text-slate-800">{res.condition}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-slate-500 truncate" title={res.location}>
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate">{res.location}</span>
                        </div>

                        {res.expiryDate && (
                          <div className="flex items-center gap-1 text-amber-600 text-[11px] font-medium">
                            <Clock size={12} />
                            <span>Expires: {new Date(res.expiryDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isOwner || isAdmin ? (
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            {isOwner ? 'Your Listing' : 'Admin'}
                          </span>
                          <button
                            onClick={() => handleDeactivate(res.id)}
                            className="ml-auto text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Deactivate listing"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openRequestModal(res)}
                          disabled={res.status !== 'AVAILABLE'}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2"
                        >
                          {res.status === 'AVAILABLE' ? 'Request Resource' : 'Unavailable'}
                        </Button>
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

      {/* CREATE RESOURCE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="List a Surplus Resource"
        size="lg"
      >
        <form onSubmit={handleCreateResource} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Resource Title"
                placeholder="e.g. 50 kg Organic Apples, Surplus ThinkPads..."
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Describe freshness, condition, source, or pickup notes..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as ResourceCategory })}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="FOOD">Food</option>
                <option value="CLOTHING">Clothing</option>
                <option value="ELECTRONICS">Electronics</option>
                <option value="FURNITURE">Furniture</option>
                <option value="RECYCLABLES">Recyclables</option>
                <option value="WATER">Water</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Condition
              </label>
              <input
                type="text"
                placeholder="e.g. Fresh, Refurbished, Gently Used"
                value={createForm.condition}
                onChange={(e) => setCreateForm({ ...createForm, condition: e.target.value })}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="w-28">
                <Input
                  label="Unit"
                  placeholder="kg, units..."
                  value={createForm.unit}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Input
                label="Expiry Date (if applicable)"
                type="date"
                value={createForm.expiryDate}
                onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
              />
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
                <span className="text-xs text-slate-400">or paste direct image URL:</span>
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
                        <span className="font-bold text-slate-800 block">Listing Image Attached</span>
                        <span className="text-slate-500 text-[11px] truncate max-w-[200px] block">{createForm.imageUrl}</span>
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
                      {photoAnalyzing ? 'Analyzing Item Photo...' : '✨ Auto-Fill Details from Photo'}
                    </Button>
                  </div>

                  {aiResourceResult && (
                    <div className="pt-2 border-t border-emerald-200/60 text-xs text-slate-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <Sparkles size={12} className="text-emerald-600" />
                          AI Visual Recognition Verified
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                          {Math.round((aiResourceResult.confidenceScore || 0.9) * 100)}% Confidence
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {aiResourceResult.detectedItems?.map((item: string) => (
                          <span key={item} className="bg-white text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-medium">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Pickup Address / Location"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                required
              />
            </div>

            {/* Click-to-Pick Map Location */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Pin Location on Map (Click map to adjust pin)
              </label>
              <MapView
                height="200px"
                center={[createForm.latitude, createForm.longitude]}
                selectedLocation={[createForm.latitude, createForm.longitude]}
                onLocationSelect={(lat, lng) => {
                  setCreateForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                }}
              />
              <span className="text-[11px] text-slate-400">
                GPS: {createForm.latitude.toFixed(4)}, {createForm.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Publish Listing
            </Button>
          </div>
        </form>
      </Modal>

      {/* REQUEST RESOURCE MODAL */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={`Request: ${selectedResource?.title}`}
      >
        {selectedResource && (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs space-y-1">
              <p className="font-semibold text-emerald-900">Resource Information:</p>
              <p className="text-slate-600">Available: <strong>{selectedResource.quantity} {selectedResource.unit}</strong></p>
              <p className="text-slate-600">Location: {selectedResource.location}</p>
            </div>

            <Input
              label={`Quantity to Request (Max: ${selectedResource.quantity})`}
              type="number"
              min={1}
              max={selectedResource.quantity}
              value={requestQuantity}
              onChange={(e) => setRequestQuantity(Number(e.target.value))}
              required
            />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Message to Donor / Reason for Request
              </label>
              <textarea
                rows={3}
                placeholder="Explain who this will help, intended distribution date, or transportation arrangements..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={() => setRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={requestSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
