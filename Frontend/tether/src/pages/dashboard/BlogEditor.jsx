import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/api'
import '../../styles/editor.css'

// ── Toolbar button ─────────────────────────────────────────────────────────
function ToolBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded-lg text-sm transition-all duration-150 font-medium
        ${active
          ? 'text-green shadow-sm'
          : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
      `}
      style={active ? { background: '#E89951' } : {}}
    >
      {children}
    </button>
  )
}

// ── Editor Toolbar ─────────────────────────────────────────────────────────
function Toolbar({ editor }) {
  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('Enter URL')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-4 py-2.5
      border-b border-gray-100 dark:border-gray-800
      bg-gray-50/60 dark:bg-gray-800/40 sticky top-0 z-10 rounded-t-2xl">

      {/* Headings */}
      {[1, 2, 3].map((level) => (
        <ToolBtn
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          active={editor.isActive('heading', { level })}
          title={`Heading ${level}`}
        >
          H{level}
        </ToolBtn>
      ))}

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Inline marks */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}   active={editor.isActive('bold')}   title="Bold">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 010 8H6zm0 8h9a4 4 0 010 8H6z"/></svg>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="19" y1="4" x2="14" y2="4"/><line x1="10" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()}   active={editor.isActive('code')}   title="Inline code">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </ToolBtn>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Lists */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet list">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4H4zm0 6h1v4H4zm0 6h1v4H4z"/></svg>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 9l-3 3 3 3M16 9l3 3-3 3"/></svg>
      </ToolBtn>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Link */}
      <ToolBtn onClick={addLink} active={editor.isActive('link')} title="Add link">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" strokeWidth={2} strokeLinecap="round"/></svg>
      </ToolBtn>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Undo / Redo */}
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"/></svg>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6M21 10l-6-6"/></svg>
      </ToolBtn>

      {/* Word count */}
      <div className="ml-auto text-xs text-gray-300 dark:text-gray-600 pr-1 select-none">
        {editor.storage.characterCount.words()} words
      </div>
    </div>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-300 dark:text-gray-600">{hint}</p>}
    </div>
  )
}

// ── Main Editor Page ───────────────────────────────────────────────────────
export default function BlogEditor() {
  const { id }   = useParams()          // defined → edit mode
  const isEdit   = Boolean(id)
  const navigate = useNavigate()

  const [loading,  setLoading]  = useState(isEdit)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [saveMsg,  setSaveMsg]  = useState(null)

  const [form, setForm] = useState({
    title:            '',
    excerpt:          '',
    status:           'draft',
    meta_title:       '',
    meta_description: '',
    is_featured:      false,
    allow_comments:   true,
  })

  // Image: File object for new upload, string path for existing (from server)
  const [imageFile,     setImageFile]    = useState(null)   // File | null
  const [existingImage, setExistingImage] = useState('')    // server path string

  // Derive the preview URL shown in the UI
  const previewUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : existingImage
      ? `http://localhost:8000/storage/${existingImage}`
      : null

  // Store fetched content separately so we can push it into the editor
  // once TipTap finishes initialising (editor starts as null)
  const [fetchedContent, setFetchedContent] = useState(null)

  // ── TipTap editor ─────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your story…' }),
      CharacterCount,
      Link.configure({ openOnClick: false }),
    ],
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  })

  // ── Effect 1: fetch blog data (runs once — no editor dependency) ──────
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false

    const fetchBlog = async () => {
      try {
        // Protected endpoint: loads any status, never increments view_count
        const { data } = await api.get(`/my-blogs/${id}`)
        if (cancelled) return
        setForm({
          title:            data.title            ?? '',
          excerpt:          data.excerpt          ?? '',
          status:           data.status           ?? 'draft',
          meta_title:       data.meta_title       ?? '',
          meta_description: data.meta_description ?? '',
          is_featured:      data.is_featured      ?? false,
          allow_comments:   data.allow_comments   ?? true,
        })
        // Store server path — shown as existing image preview
        setExistingImage(data.featured_image ?? '')
        // Store content — Effect 2 will push it into the editor when ready
        setFetchedContent(data.content ?? '')
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 404) {
          setError('Blog not found or you do not have permission to edit it.')
        } else {
          setError('Could not load blog. Please try again.')
        }
        setLoading(false)
      }
    }

    fetchBlog()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id])

  // ── Effect 2: push content into editor once both are ready ────────────
  // Runs when editor initialises (null → instance) AND fetchedContent is set.
  // Keeps editor out of Effect 1 so the fetch never runs twice.
  useEffect(() => {
    if (!editor || fetchedContent === null) return
    editor.commands.setContent(fetchedContent)
    setLoading(false)
  }, [editor, fetchedContent])

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async (overrideStatus) => {
    const status  = overrideStatus ?? form.status
    const content = editor?.getHTML() ?? ''

    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!content || content === '<p></p>') { setError('Content cannot be empty.'); return }

    setSaving(true)
    setError(null)
    setSaveMsg(null)

    // Build FormData — required because featured_image is a file upload
    const fd = new FormData()
    fd.append('title',            form.title)
    fd.append('excerpt',          form.excerpt)
    fd.append('content',          content)
    fd.append('status',           status)
    fd.append('meta_title',       form.meta_title)
    fd.append('meta_description', form.meta_description)
    fd.append('is_featured',      form.is_featured   ? '1' : '0')
    fd.append('allow_comments',   form.allow_comments ? '1' : '0')

    // Only append file if a new one was picked
    if (imageFile) {
      fd.append('featured_image', imageFile)
    }

    try {
      if (isEdit) {
        // Laravel can't parse multipart/form-data on PUT — use POST + _method spoofing
        fd.append('_method', 'PUT')
        await api.post(`/blogs/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setSaveMsg(status === 'published' ? 'Published!' : 'Draft saved.')
      } else {
        const { data } = await api.post('/blogs', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setSaveMsg(status === 'published' ? 'Published!' : 'Draft saved.')
        setTimeout(() => navigate(`/dashboard/blogs/${data.blog.id}/edit`, { replace: true }), 800)
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to save. Please try again.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-4 pt-4">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl w-2/3" />
        <div className="h-4  bg-gray-100 dark:bg-gray-800 rounded-lg w-1/3" />
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Top bar ── */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/blogs')}
            className="p-2 rounded-xl border-2 border-gray-100 dark:border-gray-800
              text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
              hover:border-gray-200 dark:hover:border-gray-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Blog' : 'New Blog'}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isEdit ? `Editing ID #${id}` : 'Create a new post'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save draft */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700
              text-gray-600 dark:text-gray-300 text-sm font-semibold
              hover:border-gray-300 dark:hover:border-gray-600
              disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </motion.button>

          {/* Publish */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSave('published')}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
              shadow-lg shadow-bordo/25 disabled:opacity-50 transition-all"
            style={{ background: '#E89951', color: '#18190F' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 12l5 5L20 7"/>
            </svg>
            {saving ? 'Publishing…' : 'Publish'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Feedback banners ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl
            bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
            text-red-600 dark:text-red-400 text-sm"
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </motion.div>
      )}
      {saveMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border text-sm"
          style={{ background: 'rgba(165,207,131,0.12)', borderColor: 'rgba(165,207,131,0.4)', color: '#3d7a24' }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7"/>
          </svg>
          {saveMsg}
        </motion.div>
      )}

      {/* ── Main two-column layout ── */}
      <div className="flex gap-5 items-start">

        {/* ── LEFT — Editor ── */}
        <motion.div
          className="flex-1 min-w-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          {/* Title */}
          <div className="mb-4">
            <textarea
              rows={2}
              maxLength={255}
              placeholder="Post title…"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              className="w-full resize-none text-3xl font-extrabold
                bg-transparent border-none outline-none
                text-gray-900 dark:text-white
                placeholder-gray-200 dark:placeholder-gray-700
                leading-tight"
            />
            <div className="h-px bg-gray-100 dark:bg-gray-800 mt-1" />
          </div>

          {/* Rich-text editor card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <Toolbar editor={editor} />
            <div className="px-6 py-5">
              <EditorContent editor={editor} />
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT — Settings sidebar ── */}
        <motion.div
          className="w-72 shrink-0 space-y-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >

          {/* Publish settings */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Settings
            </p>

            <Field label="Status">
              <div className="flex gap-2">
                {['draft', 'published'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField('status', s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-150
                      ${form.status === s
                        ? 'border-transparent text-green dark:text-green shadow-md shadow-bordo/25'
                        : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'}`}
                    style={form.status === s ? { background: '#E89951' } : {}}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            {/* Toggles */}
            {[
              { key: 'is_featured',    label: 'Featured post' },
              { key: 'allow_comments', label: 'Allow comments' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                <button
                  type="button"
                  onClick={() => setField(key, !form[key])}
                  className={`relative w-10 h-5.5 rounded-full transition-all duration-200 shrink-0`}
                  style={{ background: form[key] ? '#E89951' : '#e5e5e0' }}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
                      ${form[key] ? 'left-5' : 'left-0.5'}`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Excerpt */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Content</p>

            <Field label="Excerpt" hint="Short summary shown in listings">
              <textarea
                rows={3}
                value={form.excerpt}
                onChange={(e) => setField('excerpt', e.target.value)}
                placeholder="Brief description…"
                className="w-full resize-none text-sm bg-gray-50 dark:bg-gray-800 rounded-xl
                  border-2 border-gray-100 dark:border-gray-800 px-3 py-2.5
                  text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600
                  outline-none focus:border-sage dark:focus:border-sage focus:ring-2 focus:ring-sage/15
                  transition-all duration-200"
              />
            </Field>

            <Field label="Cover Image" hint="JPG, PNG or WebP · max 2 MB">
              {/* Drop zone */}
              <label
                htmlFor="cover-image-input"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file && file.type.startsWith('image/')) setImageFile(file)
                }}
                className="flex flex-col items-center justify-center gap-2 w-full
                  rounded-xl border-2 border-dashed cursor-pointer
                  border-gray-200 dark:border-gray-700
                  hover:border-sage dark:hover:border-sage
                  bg-gray-50 dark:bg-gray-800/60
                  py-5 px-3 text-center
                  transition-all duration-200 group"
              >
                <svg className="w-7 h-7 text-gray-300 dark:text-gray-600 group-hover:text-sage transition-colors"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {imageFile ? imageFile.name : 'Click to upload or drag & drop'}
                </span>
                <input
                  id="cover-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setImageFile(file)
                  }}
                />
              </label>

              {/* Preview */}
              {previewUrl && (
                <div className="relative mt-2 h-28 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 group/img">
                  <img
                    src={previewUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setExistingImage('') }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full
                      bg-black/60 text-white flex items-center justify-center
                      opacity-0 group-hover/img:opacity-100 transition-opacity text-xs"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              )}
            </Field>
          </div>

          {/* SEO */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">SEO</p>

            <Field label="Meta Title">
              <input
                type="text"
                value={form.meta_title}
                onChange={(e) => setField('meta_title', e.target.value)}
                placeholder={form.title || 'SEO title…'}
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl
                  border-2 border-gray-100 dark:border-gray-800 px-3 py-2.5
                  text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600
                  outline-none focus:border-sage dark:focus:border-sage focus:ring-2 focus:ring-sage/15
                  transition-all duration-200"
              />
            </Field>

            <Field label="Meta Description">
              <textarea
                rows={2}
                value={form.meta_description}
                onChange={(e) => setField('meta_description', e.target.value)}
                placeholder="SEO description…"
                className="w-full resize-none text-sm bg-gray-50 dark:bg-gray-800 rounded-xl
                  border-2 border-gray-100 dark:border-gray-800 px-3 py-2.5
                  text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600
                  outline-none focus:border-sage dark:focus:border-sage focus:ring-2 focus:ring-sage/15
                  transition-all duration-200"
              />
            </Field>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
