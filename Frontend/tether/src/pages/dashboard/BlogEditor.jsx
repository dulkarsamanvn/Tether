import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import api from '../../api/api'
import TimezonePicker from '../../components/ui/TimezonePicker'
import { useAuth } from '../../hooks/useAuth'
import { useEditorAutosave } from '../../hooks/useEditorAutosave'
import { blogSnapshot, listEditorDrafts, removeEditorDraft, snapshotKey } from '../../utils/editorDrafts'
import { defaultTimeZone, formatScheduledTime, scheduleToUtc } from '../../utils/scheduling'
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
  const { id } = useParams()
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated || !user?.id) return <Navigate to="/login" replace />
  return <BlogEditorSession key={`${user.id}:${id ?? 'new'}`} id={id} userId={user.id} />
}

function BlogEditorSession({ id, userId }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [saveMsg,  setSaveMsg]  = useState(null)
  const [loaded, setLoaded] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [storageError, setStorageError] = useState(false)
  const [baseline, setBaseline] = useState(null)
  const [recoveryChoices, setRecoveryChoices] = useState([])
  const [recovering, setRecovering] = useState(false)
  const [serverStatus, setServerStatus] = useState('draft')
  const [serverSchedule, setServerSchedule] = useState(null)
  const [form, setForm] = useState(() => blogSnapshot().form)
  const [content, setContent] = useState('')

  // Image: File object for new upload, string path for existing (from server)
  const [imageFile,     setImageFile]    = useState(null)   // File | null
  const [existingImage, setExistingImage] = useState('')    // server path string

  // Categories & Tags
  const [allCategories, setAllCategories] = useState([])
  const [allTags, setAllTags] = useState([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [newTagName, setNewTagName] = useState('')

  const [imagePreview, setImagePreview] = useState('')
  useEffect(() => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const previewUrl = imageFile
    ? imagePreview
    : existingImage
      ? `${api.defaults.baseURL.replace(/\/api\/?$/, '')}/storage/${existingImage}`
      : null

  const snapshot = useMemo(() => ({
    form, content, imageFile, existingImage,
    categoryIds: selectedCategoryIds, tagIds: selectedTagIds, newTagName,
  }), [form, content, imageFile, existingImage, selectedCategoryIds, selectedTagIds, newTagName])
  const autosave = useEditorAutosave({
    userId, blogId: id, snapshot, baseline,
    enabled: !loading && !loadError && !saving && recoveryChoices.length === 0,
  })

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
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
  })

  const applySnapshot = useCallback((value) => {
    editor.commands.setContent(value.content, { emitUpdate: false })
    const normalized = { ...value, form: { ...blogSnapshot().form, ...value.form }, content: editor.getHTML() }
    setForm(normalized.form)
    setContent(normalized.content)
    setImageFile(normalized.imageFile ?? null)
    setExistingImage(normalized.existingImage ?? '')
    setSelectedCategoryIds(normalized.categoryIds ?? [])
    setSelectedTagIds(normalized.tagIds ?? [])
    setNewTagName(normalized.newTagName ?? '')
    return normalized
  }, [editor])

  useEffect(() => {
    let cancelled = false
    const drafts = listEditorDrafts(userId, id).catch(() => {
      if (!cancelled) setStorageError(true)
      return []
    })
    Promise.all([isEdit ? api.get(`/my-blogs/${id}`) : Promise.resolve({ data: {} }), drafts])
      .then(([{ data }, drafts]) => {
        if (!cancelled) setLoaded({ blog: data, drafts })
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.response?.status === 404
          ? 'Blog not found or you do not have permission to edit it.'
          : 'Could not load the blog. Your recovery copies have been kept. Please try again.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [isEdit, id, userId])

  // ── Effect: fetch categories & tags ────────────────────────────────────
  useEffect(() => {
    api.get('/categories').then(({ data }) => setAllCategories(data)).catch(() => {})
    api.get('/tags').then(({ data }) => setAllTags(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!editor || !loaded) return
    const initial = applySnapshot(blogSnapshot(loaded.blog))
    const initialKey = snapshotKey(initial)
    setBaseline(initialKey)
    setServerStatus(loaded.blog.status ?? 'draft')
    setServerSchedule(loaded.blog.scheduled_at ?? null)
    setRecoveryChoices(loaded.drafts.filter((draft) => {
      if (snapshotKey(draft.snapshot) !== initialKey) return true
      // Remove obsolete copies that already match the saved post.
      removeEditorDraft(draft.id, draft.savedAt).catch(() => {})
      return false
    }))
    setLoading(false)
  }, [editor, loaded, applySnapshot])

  useEffect(() => {
    editor?.setEditable(!loading && !saving && !recovering && recoveryChoices.length === 0 && autosave.navigation.state !== 'blocked', false)
  }, [editor, loading, saving, recovering, recoveryChoices.length, autosave.navigation.state])

  const recoverDraft = async (draft) => {
    setRecovering(true)
    setError(null)
    const recovered = applySnapshot(draft.snapshot)
    try {
      // Fork the recovered copy so other open editors cannot overwrite this session.
      await autosave.saveNow(recovered)
      await removeEditorDraft(draft.id, draft.savedAt)
      setSaveMsg('Recovered your writing, including any selected cover image.')
    } catch {
      setError('Your writing is recovered in the editor, but the recovery copy could not be updated. Use Save Draft or retry autosave.')
    } finally {
      setRecoveryChoices([])
      setRecovering(false)
    }
  }

  const discardDraft = async (draft) => {
    setRecovering(true)
    try {
      if (!await removeEditorDraft(draft.id, draft.savedAt)) {
        setError('This recovery copy changed in another tab. Reload the page to see the latest writing.')
        return
      }
      setRecoveryChoices((drafts) => drafts.filter((item) => item.id !== draft.id))
    } catch {
      setError('Could not discard this recovery copy. Please try again.')
    } finally {
      setRecovering(false)
    }
  }

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async (overrideStatus) => {
    if (saving || !editor || recoveryChoices.length > 0) return
    const status  = overrideStatus ?? form.status
    // Saving an unpublished revision must never unpublish or modify the live post.
    if (status === 'draft' && isEdit && ['published', 'scheduled'].includes(serverStatus)) {
      setSaving(true)
      setError(null)
      try {
        await autosave.saveNow()
        setSaveMsg(serverStatus === 'published' ? 'Draft saved. Your published post is unchanged.' : 'Draft saved. Use Update schedule to apply these edits to the scheduled post.')
      } catch {
        setError('Could not save this draft. Keep this page open and retry autosave.')
      } finally {
        setSaving(false)
      }
      return
    }

    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!content || content === '<p></p>') { setError('Content cannot be empty.'); return }

    let scheduledAt
    if (status === 'scheduled') {
      try {
        scheduledAt = scheduleToUtc(form.scheduled_for, form.schedule_timezone)
        if (new Date(scheduledAt).getTime() <= Date.now()) throw new Error('Choose a publication time in the future.')
      } catch (err) {
        setError(err.message)
        return
      }
    }

    setSaving(true)
    setError(null)
    setSaveMsg(null)
    editor.setEditable(false, false)

    // Build FormData — required because featured_image is a file upload
    const fd = new FormData()
    fd.append('title',            form.title)
    fd.append('excerpt',          form.excerpt)
    fd.append('content',          content)
    fd.append('status',           status)
    if (status === 'scheduled') {
      fd.append('scheduled_at', scheduledAt)
      fd.append('scheduled_timezone', form.schedule_timezone)
    }
    fd.append('meta_title',       form.meta_title)
    fd.append('meta_description', form.meta_description)
    fd.append('is_featured',      form.is_featured   ? '1' : '0')
    fd.append('allow_comments',   form.allow_comments ? '1' : '0')

    // Only append file if a new one was picked
    if (imageFile) {
      fd.append('featured_image', imageFile)
    } else if (isEdit && !existingImage) {
      fd.append('remove_featured_image', '1')
    }

    // Append category and tag IDs
    selectedCategoryIds.forEach(id => fd.append('category_ids[]', id))
    selectedTagIds.forEach(id => fd.append('tag_ids[]', id))
    if (selectedCategoryIds.length === 0) fd.append('category_ids', '')
    if (selectedTagIds.length === 0) fd.append('tag_ids', '')

    try {
      // Keep the recovery copy if the network request fails.
      await autosave.saveNow().catch(() => {})
      let response
      if (isEdit) {
        // Laravel can't parse multipart/form-data on PUT — use POST + _method spoofing
        fd.append('_method', 'PUT')
        response = await api.post(`/blogs/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        response = await api.post('/blogs', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      const committed = applySnapshot(blogSnapshot(response.data.blog))
      setBaseline(snapshotKey(committed))
      setServerStatus(response.data.blog.status)
      setServerSchedule(response.data.blog.scheduled_at ?? null)
      await autosave.markCommitted(committed).catch(() => {
        setError('Your post was saved, but an older recovery copy could not be removed.')
      })
      setSaveMsg(status === 'scheduled'
        ? `Scheduled for ${formatScheduledTime(response.data.blog.scheduled_at, response.data.blog.scheduled_timezone)}.`
        : status === 'published' ? 'Published!' : 'Draft saved to My Blogs.')
      if (!isEdit) navigate(`/dashboard/blogs/${response.data.blog.id}/edit`, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to save. Please try again.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const cancelSchedule = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      // Preserve unsaved editor content while cancelling only the saved schedule.
      await autosave.saveNow().catch(() => {})
      const { data } = await api.delete(`/blogs/${id}/schedule`)
      setServerStatus(data.blog.status)
      setServerSchedule(null)
      setForm((previous) => ({ ...previous, status: 'draft', scheduled_for: '' }))
      setBaseline(snapshotKey(blogSnapshot(data.blog)))
      setSaveMsg('Schedule cancelled. The saved post is now a draft; your current edits are kept in the editor.')
    } catch (err) {
      setError(err.response?.status === 404
        ? 'This post is no longer scheduled. Reload the editor to see its current status.'
        : 'Could not cancel the schedule. Please try again.')
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

  if (loadError) return (
    <div className="max-w-5xl mx-auto rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-gray-900">
      <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{loadError}</p>
      <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-bordo px-4 py-2 font-semibold text-green">Try again</button>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">

      {autosave.navigation.state === 'blocked' && (
        <section role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-gray-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-gray-200">
          <p>{autosave.status.phase === 'error' ? 'Your latest changes could not be saved. Stay in the editor to keep them, or retry before leaving.' : 'Saving your writing before leaving…'}</p>
          <div className="mt-3 flex flex-wrap gap-4 font-semibold">
            <button type="button" onClick={() => autosave.navigation.reset()} className="underline">Stay in editor</button>
            {autosave.status.phase === 'error' && <>
              <button type="button" onClick={async () => {
                try { await autosave.flush(); autosave.navigation.proceed() } catch { /* The warning remains visible. */ }
              }} className="underline">Retry save and leave</button>
              <button type="button" onClick={() => autosave.navigation.proceed()} className="text-red-600 underline dark:text-red-400">Leave without saving</button>
            </>}
          </div>
        </section>
      )}

      {/* ── Top bar ── */}
      <motion.div
        className="flex flex-wrap items-center justify-between gap-4 mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/blogs')}
            disabled={saving || recovering || autosave.navigation.state === 'blocked'}
            aria-label="Back to My Blogs"
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
            disabled={saving || recovering || recoveryChoices.length > 0 || autosave.navigation.state === 'blocked'}
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
            disabled={saving || recovering || recoveryChoices.length > 0 || autosave.navigation.state === 'blocked'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
              shadow-lg shadow-bordo/25 disabled:opacity-50 transition-all"
            style={{ background: '#E89951', color: '#18190F' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 12l5 5L20 7"/>
            </svg>
            {saving ? 'Saving…' : serverStatus === 'published' ? 'Publish changes' : serverStatus === 'scheduled' ? 'Publish now' : 'Publish'}
          </motion.button>
        </div>
      </motion.div>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <p role="status">
          {autosave.status.phase === 'error' || (storageError && autosave.status.phase === 'idle')
            ? 'Autosave is unavailable. Keep this page open and save your work before leaving.'
            : autosave.status.phase === 'pending' || autosave.status.phase === 'saving'
              ? 'Saving…'
              : autosave.status.phase === 'saved'
                ? `Last saved at ${new Date(autosave.status.savedAt).toLocaleTimeString()}`
                : 'Autosave is enabled.'}
        </p>
        {(autosave.status.phase === 'error' || (storageError && autosave.status.phase !== 'saved')) && recoveryChoices.length === 0 && (
          <button type="button" disabled={saving} className="font-semibold underline" onClick={async () => {
            try { await autosave.saveNow(); setStorageError(false) } catch { setError('Autosave could not save your writing. Keep this page open and try Save Draft.') }
          }}>Retry autosave</button>
        )}
      </div>

      {recoveryChoices.length > 0 && (
        <section aria-label="Draft recovery" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
          <h2 className="font-bold text-gray-900 dark:text-white">Recover unfinished writing?</h2>
          <p className="mt-1 mb-4 text-sm text-gray-600 dark:text-gray-300">
            Recover a saved draft to continue writing. Only Publish changes what readers see.
          </p>
          <div className="space-y-3">
            {recoveryChoices.map((draft) => (
              <div key={draft.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 dark:bg-gray-900">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">{draft.snapshot.form.title || 'Untitled draft'}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Saved {new Date(draft.savedAt).toLocaleString()}{draft.snapshot.imageFile ? ' · Includes cover image' : ''}
                  </p>
                  {loaded.blog.updated_at && new Date(loaded.blog.updated_at).getTime() > draft.savedAt && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">The saved post has changed since this draft. Review it before publishing.</p>
                  )}
                </div>
                <div className="flex gap-3 text-sm font-semibold">
                  <button type="button" disabled={recovering} onClick={() => recoverDraft(draft)} className="rounded-xl bg-bordo px-4 py-2 text-green disabled:opacity-50">Recover draft</button>
                  <button type="button" disabled={recovering} onClick={() => discardDraft(draft)} className="px-3 py-2 text-gray-500 underline disabled:opacity-50">Discard</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" disabled={recovering} onClick={() => setRecoveryChoices([])} className="mt-4 text-sm font-semibold text-gray-600 underline disabled:opacity-50 dark:text-gray-300">
            {isEdit ? 'Continue with the saved post' : 'Start a new post'} (keep recovery copies)
          </button>
        </section>
      )}

      {/* ── Feedback banners ── */}
      {error && (
        <motion.div
          role="alert"
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
          role="status"
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
      <fieldset disabled={saving || recovering || recoveryChoices.length > 0 || autosave.navigation.state === 'blocked'} className="flex min-w-0 flex-col gap-5 items-start lg:flex-row">

        {/* ── LEFT — Editor ── */}
        <motion.div
          className="w-full flex-1 min-w-0"
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
          className="w-full lg:w-72 shrink-0 space-y-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >

          {/* Publish settings */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Settings
            </p>

            <Field label="Post status" hint={serverStatus === 'published'
              ? 'Your published post stays unchanged until you publish these edits.'
              : serverStatus === 'scheduled' ? 'Only the saved scheduled version will publish. Use Update schedule to apply your edits.' : 'Publish now or choose a publication time below.'}>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{serverStatus === 'published' ? 'Published' : serverStatus === 'scheduled' ? 'Scheduled' : 'Draft'}</p>
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

          {serverStatus !== 'published' && (
            <section aria-label="Schedule publication" className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Schedule publication</h2>
              {serverSchedule && <p className="text-xs text-gray-600 dark:text-gray-300">Currently scheduled: {formatScheduledTime(serverSchedule, form.schedule_timezone ?? defaultTimeZone())}</p>}
              <Field label="Publication date and time">
                <input type="datetime-local" aria-label="Publication date and time" step="60" value={form.scheduled_for ?? ''}
                  onChange={(event) => setField('scheduled_for', event.target.value)}
                  className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </Field>
              <Field label="Timezone">
                <TimezonePicker
                  value={form.schedule_timezone ?? defaultTimeZone()}
                  onChange={(zone) => setField('schedule_timezone', zone)}
                  disabled={saving || recovering || recoveryChoices.length > 0 || autosave.navigation.state === 'blocked'}
                />
              </Field>
              <button type="button" onClick={() => handleSave('scheduled')} className="w-full rounded-xl bg-bordo px-4 py-2.5 text-sm font-bold text-green disabled:opacity-50">
                {saving ? 'Saving…' : serverStatus === 'scheduled' ? 'Update schedule' : 'Schedule post'}
              </button>
              {serverStatus === 'scheduled' && <button type="button" onClick={cancelSchedule} className="w-full text-sm font-semibold text-gray-500 underline dark:text-gray-400">Cancel schedule</button>}
              <p className="text-xs text-gray-500 dark:text-gray-400">The post will publish automatically when its scheduled time arrives.</p>
            </section>
          )}

          {/* Categories & Tags */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Organize
            </p>

            <Field label="Categories">
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {allCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => {
                        setSelectedCategoryIds((prev) =>
                          prev.includes(cat.id)
                            ? prev.filter((id) => id !== cat.id)
                            : [...prev, cat.id]
                        )
                      }}
                      className="w-4 h-4 rounded border-2 border-gray-200 dark:border-gray-700
                        text-bordo focus:ring-bordo/30 bg-gray-50 dark:bg-gray-800"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                      {cat.name}
                    </span>
                  </label>
                ))}
                {allCategories.length === 0 && (
                  <p className="text-xs text-gray-300 dark:text-gray-600">No categories available</p>
                )}
              </div>
            </Field>

            <Field label="Tags">
              {/* Selected tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allTags.filter(t => selectedTagIds.includes(t.id)).map((tag) => (
                  <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
                    bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {tag.name}
                    <button type="button" onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tag.id))}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-0.5">✕</button>
                  </span>
                ))}
              </div>
              {/* Tag input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key !== 'Enter' || !newTagName.trim()) return
                    e.preventDefault()
                    const existing = allTags.find(t => t.name.toLowerCase() === newTagName.trim().toLowerCase())
                    if (existing) {
                      if (!selectedTagIds.includes(existing.id)) {
                        setSelectedTagIds(prev => [...prev, existing.id])
                      }
                    } else {
                      try {
                        const { data } = await api.post('/tags', { name: newTagName.trim() })
                        setAllTags(prev => [...prev, data])
                        setSelectedTagIds(prev => [...prev, data.id])
                      } catch { /* tag may already exist */ }
                    }
                    setNewTagName('')
                  }}
                  placeholder="Type & press Enter…"
                  className="flex-1 min-w-0 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl
                    border-2 border-gray-100 dark:border-gray-800 px-3 py-2
                    text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600
                    outline-none focus:border-sage dark:focus:border-sage focus:ring-2 focus:ring-sage/15
                    transition-all duration-200"
                />
              </div>
              {/* Existing tags dropdown */}
              {allTags.filter(t => !selectedTagIds.includes(t.id)).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {allTags.filter(t => !selectedTagIds.includes(t.id)).map(tag => (
                    <button key={tag.id} type="button"
                      onClick={() => setSelectedTagIds(prev => [...prev, tag.id])}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium
                        border border-gray-200 dark:border-gray-700
                        text-gray-400 dark:text-gray-500
                        hover:border-sage hover:text-sage
                        transition-all duration-150">
                      + {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </Field>
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
                  if (saving || recovering || recoveryChoices.length > 0 || autosave.navigation.state === 'blocked') return
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
      </fieldset>
    </div>
  )
}
