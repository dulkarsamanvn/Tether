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

function PageHeadingPlaceholder() {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
    <div className="min-w-0 space-y-2"><SkeletonBlock className="h-8 w-64 max-w-full" /><SkeletonBlock className="h-4 w-80 max-w-full" /></div>
    <SkeletonBlock className="h-10 w-28" rounded="rounded-xl" />
  </div>
}

export function LlmConfigurationSkeleton() {
  return <SkeletonStatus label="Loading LLM configuration" className="mx-auto max-w-6xl">
    <PageHeadingPlaceholder />
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-0 space-y-3"><SkeletonBlock className="h-3 w-44 max-w-full" /><SkeletonBlock className="h-5 w-48 max-w-full" /><SkeletonBlock className="h-4 w-72 max-w-full" /></div>
      <SkeletonBlock className="h-10 w-28" rounded="rounded-xl" />
    </div>
    <div className="mb-5 flex items-center justify-between gap-4"><SkeletonBlock className="h-6 w-40" /><SkeletonBlock className="h-10 w-24" rounded="rounded-xl" /></div>
    <div className="mb-5 space-y-2"><SkeletonBlock className="h-4 w-3/4" /><SkeletonBlock className="h-4 w-2/3" /></div>
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from({ length: 2 }, (_, index) => <div key={index} className="min-w-0 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3"><SkeletonBlock className="h-5 w-32" /><SkeletonBlock className="h-6 w-20" rounded="rounded-full" /></div>
        <div className="space-y-2"><SkeletonBlock className="h-4 w-32" /><SkeletonBlock className="h-3 w-48 max-w-full" /></div>
        <SkeletonBlock className="h-3 w-3/4" />
        <div className="flex flex-wrap gap-2 pt-2"><SkeletonBlock className="h-9 w-28" rounded="rounded-xl" /><SkeletonBlock className="h-9 w-20" rounded="rounded-xl" /><SkeletonBlock className="h-9 w-16" rounded="rounded-xl" /></div>
      </div>)}
    </div>
  </SkeletonStatus>
}

export function AuthorProfileSkeleton() {
  return <SkeletonStatus label="Loading author profile" className="mx-auto max-w-6xl">
    <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-5">
        <SkeletonBlock className="h-20 w-20 shrink-0" rounded="rounded-full" />
        <div className="min-w-0 flex-1 space-y-3"><SkeletonBlock className="h-3 w-32 max-w-full" /><SkeletonBlock className="h-8 w-48 max-w-full" /><SkeletonBlock className="h-4 w-40 max-w-full" /></div>
        <SkeletonBlock className="h-10 w-28" rounded="rounded-xl" />
      </div>
      <div className="mt-6 space-y-2"><SkeletonBlock className="h-4 w-3/4" /><SkeletonBlock className="h-4 w-1/2" /></div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">{Array.from({ length: 3 }, (_, index) => <SkeletonBlock key={index} className="h-4 w-28" />)}</div>
    </div>
    <SkeletonBlock className="mb-5 h-6 w-40" />
    <BlogCardPlaceholders count={3} />
  </SkeletonStatus>
}

export function EditProfileSkeleton() {
  return <SkeletonStatus label="Loading your profile" className="mx-auto w-full max-w-6xl">
    <PageHeadingPlaceholder />
    <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
      <div className="grid min-w-0 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="min-w-0 self-start space-y-5 rounded-2xl border border-gray-100 p-6 dark:border-gray-800">
          <SkeletonBlock className="mx-auto h-4 w-28" />
          <SkeletonBlock className="mx-auto h-24 w-24" rounded="rounded-full" />
          <SkeletonBlock className="h-9 w-full" rounded="rounded-xl" />
          <SkeletonBlock className="mx-auto h-3 w-3/4" />
        </div>
        <div className="min-w-0 space-y-6">
          <div className="space-y-2"><SkeletonBlock className="h-5 w-32" /><SkeletonBlock className="h-4 w-4/5" /></div>
          <div className="space-y-2"><SkeletonBlock className="h-4 w-28" /><SkeletonBlock className="h-11 w-full" rounded="rounded-xl" /></div>
          <div className="space-y-2"><SkeletonBlock className="h-4 w-12" /><SkeletonBlock className="h-32 w-full" rounded="rounded-xl" /><SkeletonBlock className="ml-auto h-3 w-14" /></div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-5 dark:border-gray-800"><SkeletonBlock className="h-3 w-64 max-w-full" /><SkeletonBlock className="h-10 w-32" rounded="rounded-xl" /></div>
        </div>
      </div>
    </div>
  </SkeletonStatus>
}
