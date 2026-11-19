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

export function TrashBlogsSkeleton() {
  return <SkeletonStatus label="Loading deleted posts">
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-4 border-b border-gray-100 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_6rem] dark:border-gray-800">
        <SkeletonBlock className="h-3 w-20 max-w-full" />
        <SkeletonBlock className="hidden h-3 w-16 sm:block" />
        <SkeletonBlock className="hidden h-3 w-24 sm:block" />
        <SkeletonBlock className="h-3 w-16 max-w-full" />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_6rem]">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBlock className="h-10 w-10 shrink-0" rounded="rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2"><SkeletonBlock className="h-3.5 w-2/3" /><SkeletonBlock className="h-2.5 w-1/2" /></div>
          </div>
          <SkeletonBlock className="hidden h-6 w-20 sm:block" rounded="rounded-full" />
          <SkeletonBlock className="hidden h-3 w-24 sm:block" />
          <SkeletonBlock className="h-9 w-20 max-w-full" rounded="rounded-xl" />
        </div>)}
      </div>
    </div>
  </SkeletonStatus>
}

