// Aligned with Prisma schema

export type Role = 'CITIZEN' | 'DONOR' | 'RECIPIENT' | 'PROVIDER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  profileImage?: string;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ResourceCategory = 'FOOD' | 'CLOTHING' | 'ELECTRONICS' | 'FURNITURE' | 'RECYCLABLES' | 'WATER' | 'OTHER';
export type ResourceStatus = 'AVAILABLE' | 'RESERVED' | 'COMPLETED' | 'EXPIRED';
export type Condition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export interface Resource {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: ResourceCategory;
  quantity: number;
  unit: string;
  condition?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  imageUrls: string[];
  status: ResourceStatus;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string };
  requests?: ResourceRequest[];
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface ResourceRequest {
  id: string;
  resourceId: string;
  requesterId: string;
  quantityRequested: number;
  message?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  resource?: Resource;
  requester?: { id: string; name: string; email: string; phone?: string };
}

export type ReportCategory = 'WASTE' | 'WATER_LEAKAGE' | 'POLLUTION' | 'ILLEGAL_DUMPING' | 'ENERGY' | 'OTHER';
export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface EnvironmentalReport {
  id: string;
  reporterId: string;
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  location: string;
  latitude?: number;
  longitude?: number;
  imageUrls: string[];
  aiClassificationResult?: string;
  createdAt: string;
  updatedAt: string;
  reporter?: { id: string; name: string };
  assignments?: ReportAssignment[];
}

export type AssignmentStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ReportAssignment {
  id: string;
  reportId: string;
  providerId: string;
  assignedById?: string;
  status: AssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  report?: EnvironmentalReport;
  provider?: { id: string; name: string; email?: string };
  assignedBy?: { id: string; name: string };
}

export type NotificationType = 'SYSTEM' | 'RESOURCE_UPDATE' | 'REPORT_UPDATE' | 'MATCH_ALERT';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

export interface ImpactRecord {
  id: string;
  userId: string;
  resourceId?: string;
  reportId?: string;
  impactType: string;
  quantity: number;
  unit: string;
  calculationMethod?: string;
  originalMeasurement?: number;
  originalUnit?: string;
  conversionFactor?: number;
  isEstimated: boolean;
  factorSource?: string;
  verificationStatus: string;
  createdAt: string;
  resource?: { id: string; title: string; category: string };
  report?: { id: string; title: string; category: string };
}

export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string;
  createdAt: string;
  actor?: { id: string; name: string; email: string };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
}

export interface AIClassification {
  category: ReportCategory;
  priority: ReportPriority;
  summary: string;
  suggestedProviderType: string;
  confidenceScore: number;
  explanation: string;
}

export interface AdminStats {
  users: number;
  activeResources: number;
  availableResources: number;
  pendingRequests: number;
  openReports: number;
  unassignedReports: number;
  resolvedReports: number;
  completedExchanges: number;
}
