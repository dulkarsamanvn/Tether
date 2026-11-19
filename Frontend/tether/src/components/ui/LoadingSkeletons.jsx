function SkeletonBlock({ className = '', rounded = 'rounded-lg' }) {
  return <div className={`bg-gray-100 dark:bg-gray-800 ${rounded} ${className}`} />
}

function SkeletonStatus({ label, children, className = '' }) {
  return <div role="status" aria-label={label} className={className}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">{children}</div>
  </div>
}

function BlogCardPlaceholders({ count = 6 }) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <SkeletonBlock className="h-44" rounded="rounded-none" />
      <div className="space-y-3 p-5">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <SkeletonBlock className="h-3 w-20" rounded="rounded-full" />
          <SkeletonBlock className="h-3 w-16" rounded="rounded-full" />
        </div>
      </div>
    </div>)}
  </div>
}

export function SavedBlogsSkeleton() {
  return <SkeletonStatus label="Loading saved blogs"><BlogCardPlaceholders /></SkeletonStatus>
}

