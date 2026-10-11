import React from 'react';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'purple';

const variantClasses: Record<StatusVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-slate-100 text-slate-700',
  purple: 'bg-purple-100 text-purple-800',
};

const dotColors: Record<StatusVariant, string> = {
  success: 'bg-green-600',
  warning: 'bg-amber-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
  default: 'bg-slate-500',
  purple: 'bg-purple-600',
};

const statusMappings: Record<string, { label: string; variant: StatusVariant }> = {
  // Resources
  AVAILABLE: { label: 'Available', variant: 'success' },
  RESERVED: { label: 'Reserved', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'info' },
  EXPIRED: { label: 'Expired', variant: 'default' },

  // Requests
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'error' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },

  // Reports
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'warning' },
  ASSIGNED: { label: 'Assigned', variant: 'purple' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  RESOLVED: { label: 'Resolved', variant: 'success' },

  // Priority
  CRITICAL: { label: 'Critical', variant: 'error' },
  HIGH: { label: 'High Priority', variant: 'error' },
  MEDIUM: { label: 'Medium', variant: 'warning' },
  LOW: { label: 'Low Priority', variant: 'info' },

  // Account
  ACTIVE: { label: 'Active', variant: 'success' },
  SUSPENDED: { label: 'Suspended', variant: 'error' },

  // Assignments
  ACCEPTED: { label: 'Accepted', variant: 'purple' },
};

export interface StatusBadgeProps {
  status?: string;
  label?: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  label, 
  variant, 
  dot = true, 
  className = '' 
}) => {
  let displayLabel = label;
  let displayVariant = variant || 'default';

  if (status && statusMappings[status]) {
    displayLabel = label || statusMappings[status].label;
    displayVariant = variant || statusMappings[status].variant;
  } else if (status) {
    displayLabel = label || status.replace('_', ' ');
  }

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${variantClasses[displayVariant]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${dotColors[displayVariant]}`} />
      )}
      {displayLabel || 'Unknown'}
    </span>
  );
};

export const ResourceStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <StatusBadge status={status} />
);

export const ReportStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <StatusBadge status={status} />
);

export const RequestStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <StatusBadge status={status} />
);

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <StatusBadge status={priority} />
);
