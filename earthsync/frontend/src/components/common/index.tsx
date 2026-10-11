import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <Loader2 size={size} className={`animate-spin text-green-600 ${className}`} />
);

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-64 gap-4">
    <LoadingSpinner size={32} />
    <p className="text-slate-500 text-sm">{message}</p>
  </div>
);

// Skeleton components
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 items-center py-3 border-b border-slate-100 last:border-0">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    ))}
  </div>
);

// Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    {icon && <div className="text-slate-300 mb-4">{icon}</div>}
    <h3 className="text-slate-700 font-semibold text-lg">{title}</h3>
    {description && <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

// Error State
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message = 'Something went wrong.', onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
      <span className="text-red-500 text-2xl">⚠</span>
    </div>
    <h3 className="text-slate-700 font-semibold text-lg">Error</h3>
    <p className="text-slate-500 text-sm mt-2 max-w-sm">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-6 text-green-700 font-medium text-sm hover:underline"
      >
        Try again
      </button>
    )}
  </div>
);

// Pagination
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  page, totalPages, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = [10, 20, 50]
}) => {
  const pages = [];
  const showMax = 5;
  let start = Math.max(1, page - Math.floor(showMax / 2));
  let end = Math.min(totalPages, start + showMax - 1);
  if (end - start + 1 < showMax) start = Math.max(1, end - showMax + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {onPageSizeChange && (
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
          aria-label="Items per page"
        >
          {pageSizeOptions.map(s => (
            <option key={s} value={s}>{s} per page</option>
          ))}
        </select>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            ← Prev
          </button>

          {start > 1 && (
            <>
              <button onClick={() => onPageChange(1)} className="w-8 h-8 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">1</button>
              {start > 2 && <span className="text-slate-400 px-1">…</span>}
            </>
          )}

          {pages.map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                p === page ? 'bg-green-700 text-white border-green-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="text-slate-400 px-1">…</span>}
              <button onClick={() => onPageChange(totalPages)} className="w-8 h-8 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">{totalPages}</button>
            </>
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// Avatar
interface AvatarProps {
  name: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };

export const Avatar: React.FC<AvatarProps> = ({ name, image, size = 'md', className = '' }) => {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['bg-green-700', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
  const colorIdx = name.charCodeAt(0) % colors.length;

  return (
    <div className={`${avatarSizes[size]} rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${colors[colorIdx]} text-white font-semibold`}>
          {initials}
        </div>
      )}
    </div>
  );
};

// Breadcrumbs
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
    {items.map((item, idx) => (
      <React.Fragment key={idx}>
        {idx > 0 && <span className="text-slate-300">/</span>}
        {item.href ? (
          <a href={item.href} className="text-slate-500 hover:text-slate-700 transition-colors">{item.label}</a>
        ) : (
          <span className="text-slate-800 font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);
