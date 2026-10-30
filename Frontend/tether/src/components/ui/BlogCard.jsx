import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { formatDate, truncate } from '../../utils/helpers'

const gradients = [
  'from-[#E89951]/80 to-[#18190F]/80',
  'from-[#A5CF83]/80 to-[#18190F]/80',
  'from-[#ECB65F]/70 to-[#E89951]/80',
  'from-[#18190F]/80 to-[#A5CF83]/60',
  'from-[#F0E76F]/60 to-[#ECB65F]/80',
]

export default function BlogCard({ blog, index = 0 }) {
  const gradient = gradients[index % gradients.length]
  const navigate = useNavigate()

  function handleClick() {
    navigate('/dashboard/blogs/' + blog.id + '/view')
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      onClick={handleClick}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-black/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Featured image / gradient fallback */}
      <div className="relative h-44 overflow-hidden shrink-0">
        {blog.featured_image ? (
          <img
            src={'http://localhost:8000/storage/' + blog.featured_image}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={'w-full h-full bg-gradient-to-br ' + gradient + ' flex items-center justify-center'}>
            <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}

        {/* Featured badge */}
        {blog.is_featured && (
          <span
            className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md"
            style={{ background: '#E89951', color: '#18190F' }}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5">

        {/* Title */}
        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug mb-2 group-hover:text-bordo dark:group-hover:text-bordo-light transition-colors duration-200">
          {blog.title}
        </h3>

        {/* Categories & Tags */}
        {((blog.categories && blog.categories.length > 0) || (blog.tags && blog.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(blog.categories || []).map(cat => (
              <span key={cat.id} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(232,153,81,0.15)', color: '#E89951' }}>
                {cat.name}
              </span>
            ))}
            {(blog.tags || []).map(tag => (
              <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium
                bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Excerpt */}
        <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed flex-1 mb-4">
          {blog.excerpt
            ? truncate(blog.excerpt, 110)
            : truncate((blog.content || '').replace(/<[^>]*>/g, ''), 110)}
        </p>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#A5CF83' }}>
              <span className="text-xs font-bold" style={{ color: '#18190F' }}>
                {blog.user && blog.user.name ? blog.user.name[0].toUpperCase() : 'A'}
              </span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
              {blog.user && blog.user.name ? blog.user.name : 'Author'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-400 dark:text-gray-600 text-xs">
            <span className="flex items-center gap-1" aria-label={`${blog.likes_count ?? 0} likes`}>
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
              </svg>
              {blog.likes_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {blog.view_count || 0}
            </span>
            <span>{formatDate(blog.published_at || blog.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
