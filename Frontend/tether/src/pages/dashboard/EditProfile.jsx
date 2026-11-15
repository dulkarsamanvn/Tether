import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../../api/api'
import Avatar from '../../components/ui/Avatar'
import { useAuth } from '../../hooks/useAuth'

const inputClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bordo focus:ring-2 focus:ring-bordo/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white'

export default function EditProfile() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <ProfileForm key={user?.id} />
}

function ProfileForm() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [preview, setPreview] = useState('')
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.get('/profile').then(({ data }) => {
      if (cancelled) return
      setProfile(data); setName(data.name); setBio(data.bio ?? '')
    }).catch(() => { if (!cancelled) setError('Could not load your profile. Please try again.') })
    return () => { cancelled = true }
  }, [version])

  useEffect(() => {
    if (!avatar) return
    const url = URL.createObjectURL(avatar)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatar])

  async function save(event) {
    event.preventDefault()
    if (saving) return
    if (!name.trim()) { setError('Enter your display name.'); return }
    setSaving(true); setError(null); setNotice(null)
    const data = new FormData()
    data.append('_method', 'PUT')
    data.append('name', name.trim())
    data.append('bio', bio)
    if (avatar) data.append('avatar', avatar)
    else if (removeAvatar) data.append('remove_avatar', '1')
    try {
      const response = await api.post('/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setProfile(response.data.user)
      setName(response.data.user.name)
      setBio(response.data.user.bio ?? '')
      setAvatar(null); setRemoveAvatar(false)
      updateUser(response.data.user)
      setNotice('Profile updated.')
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : 'Could not save your profile. Please try again.')
    } finally { setSaving(false) }
  }

  if (!profile) return <div className="mx-auto max-w-3xl py-12 text-center">{error ? <><p role="alert" className="mb-4 text-red-500">{error}</p><button type="button" onClick={() => { setError(null); setVersion((value) => value + 1) }} className="font-semibold text-bordo underline">Try again</button></> : <p role="status" className="text-gray-500">Loading your profile…</p>}</div>
  const avatarUrl = avatar ? preview : removeAvatar ? null : profile.avatar_url
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">My Profile</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Introduce yourself to your readers.</p></div>
        <Link to={`/dashboard/authors/${user.id}`} className="text-sm font-semibold text-bordo underline">View public profile</Link>
      </div>
      <form onSubmit={save} className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl bg-sage/15 p-4 text-sm text-green dark:text-sage">{notice}</p>}
        <fieldset disabled={saving} className="space-y-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar user={{ name, avatar_url: avatarUrl }} className="h-20 w-20 text-3xl" />
            <div className="min-w-0 space-y-2">
              <label htmlFor="profile-avatar" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Profile photo</label>
              <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" className="block max-w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-bordo/15 file:px-3 file:py-2 file:font-semibold file:text-green dark:text-gray-400 dark:file:text-bordo" onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP image up to 2 MB.'); event.target.value = ''; return }
                setAvatar(file); setRemoveAvatar(false); setError(null); setNotice(null); event.target.value = ''
              }} />
              <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or WebP, up to 2 MB.</p>
              {avatarUrl && <button type="button" onClick={() => { setAvatar(null); setRemoveAvatar(true) }} className="text-xs font-semibold text-red-500 underline">Remove photo</button>}
            </div>
          </div>
          <div><label htmlFor="profile-name" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Display name</label><input id="profile-name" value={name} required maxLength={255} onChange={(event) => { setName(event.target.value); setNotice(null) }} className={inputClass} /></div>
          <div><label htmlFor="profile-bio" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Bio</label><textarea id="profile-bio" value={bio} maxLength={1000} rows={5} onChange={(event) => { setBio(event.target.value); setNotice(null) }} placeholder="What do you write about?" className={`${inputClass} resize-y`} /><p className="mt-1 text-right text-xs text-gray-400">{bio.length}/1000</p></div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Your name, photo, bio, and published posts appear on your public profile.</p>
          <button type="submit" className="rounded-xl bg-bordo px-5 py-2.5 text-sm font-bold text-green disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
        </fieldset>
      </form>
    </div>
  )
}
