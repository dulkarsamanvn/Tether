import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../hooks/useAuth'

const inputClass = 'w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bordo focus:ring-2 focus:ring-bordo/15 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white'
const buttonClass = 'rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300'

export default function LlmConfiguration() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <ConfigurationSession key={user.id} />
}

function ConfigurationSession() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [operation, setOperation] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const deleteDialog = useRef(null)
  const formContainer = useRef(null)

  useEffect(() => {
    if (showForm) formContainer.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [showForm, editing?.id])

  useEffect(() => {
    const controller = new AbortController()
    api.get('/llm-configurations', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) { setData(data); setError(null) } })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load your LLM configuration. Please try again.') })
    return () => controller.abort()
  }, [version])

  async function mutate(action, agent, values) {
    if (operation) return
    setOperation({ action, id: agent?.id }); setError(null); setNotice(null)
    try {
      const url = `/llm-configurations${agent ? `/${agent.id}` : ''}`
      const response = action === 'save'
        ? agent ? await api.put(url, values) : await api.post(url, values)
        : action === 'delete' ? await api.delete(url) : await api.post(`${url}/${action}`, {}, { timeout: 40000 })
      setData(response.data); setNotice(response.data.message)
      if (action === 'save') { setShowForm(false); setEditing(null) }
      if (action === 'delete') { deleteDialog.current.close(); if (editing?.id === agent.id) { setEditing(null); setShowForm(false) } }
    } catch (failure) {
      const response = failure.response?.data
      if (Array.isArray(response?.configurations)) setData(response)
      const validation = response?.errors
      setError(validation ? Object.values(validation).flat().join(' ') : failure.response?.status === 429 ? 'You have reached the connection test limit. Please try again later.' : response?.message ?? 'Could not update your agent. Please try again.')
    } finally { setOperation(null) }
  }

  if (!data) return <div className="mx-auto max-w-6xl py-12 text-center">{error ? <><p role="alert" className="mb-4 text-red-500">{error}</p><button type="button" onClick={() => { setError(null); setVersion((value) => value + 1) }} className={buttonClass}>Try again</button></> : <p role="status" className="text-gray-500">Loading LLM configuration…</p>}</div>
  const active = data.configurations.find((agent) => agent.is_active)
  const formVisible = showForm || data.configurations.length === 0
  const busy = Boolean(operation)

  return <div className="mx-auto max-w-6xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">LLM Configuration</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Connect an AI agent for title and excerpt suggestions.</p></div>
      <button type="button" disabled={busy || data.configurations.length >= 10} onClick={() => { setEditing(null); setShowForm(true); setError(null); setNotice(null) }} className="rounded-xl bg-bordo px-4 py-2.5 text-sm font-bold text-green disabled:opacity-50">Add agent</button>
    </div>

    <section aria-label="Active AI agent" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-bordo/25 bg-bordo/5 p-5 dark:bg-bordo/10">
      <div className="min-w-0"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-bordo">{active ? 'Connected for suggestions' : 'No connected agent'}</p><h2 className="break-words font-bold text-gray-900 dark:text-white">{active?.name ?? 'Choose the model that works for you'}</h2><p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400">{active ? `${active.provider_name} · ${active.model}` : 'Save an agent below, then connect it to start using AI in the editor.'}</p></div>
      {active && <Link to="/dashboard/write" className={buttonClass}>Open editor</Link>}
    </section>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl bg-sage/15 p-4 text-sm text-gray-700 dark:text-gray-300">{notice}</p>}

    {formVisible && <div ref={formContainer}><AgentForm key={editing?.id ?? 'new'} agent={editing} providers={data.providers} busy={busy} onSave={(values) => mutate('save', editing, values)} onCancel={data.configurations.length ? () => { setShowForm(false); setEditing(null) } : null} /></div>}

    <section aria-labelledby="saved-agents-heading" className="mt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="saved-agents-heading" className="text-lg font-bold text-gray-900 dark:text-white">Your agents <span className="ml-1 text-sm font-medium text-gray-400">{data.configurations.length}/10</span></h2><button type="button" disabled={busy} onClick={() => setVersion((value) => value + 1)} className={buttonClass}>Refresh</button></div>
      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">Connect verifies the saved key and model with a short sample request, then selects that agent for suggestions. The test may use provider credits. Keys are encrypted and private to your account.</p>
      {data.configurations.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Your saved agents will appear here.</p> : <div className="grid gap-5 md:grid-cols-2">
        {data.configurations.map((agent) => <article key={agent.id} aria-label={agent.name} className={`flex min-w-0 flex-col rounded-2xl border bg-white p-5 dark:bg-gray-900 ${agent.is_active ? 'border-bordo/50' : 'border-gray-100 dark:border-gray-800'}`}>
          <div className="mb-3 flex items-start justify-between gap-3"><h3 className="min-w-0 break-words font-bold text-gray-900 dark:text-white">{agent.name}</h3><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${agent.is_active ? 'bg-sage/20 text-gray-700 dark:text-sage' : agent.status === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{agent.is_active ? 'Connected' : agent.status === 'connected' ? 'Ready' : agent.status === 'error' ? 'Connection failed' : 'Not connected'}</span></div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{agent.provider_name}</p><p className="mt-1 break-all font-mono text-xs text-gray-400">{agent.model}</p>
          {agent.instructions && <p className="mt-3 line-clamp-2 break-words text-xs text-gray-500 dark:text-gray-400">{agent.instructions}</p>}
          <p className="mt-4 text-xs text-gray-400">{agent.has_api_key ? 'API key saved' : 'API key missing'}{agent.tested_at ? ` · Tested ${new Date(agent.tested_at).toLocaleString()}` : ''}</p>
          {agent.last_error && <p className="mt-3 text-xs text-red-500">{agent.last_error}</p>}
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <button type="button" disabled={busy} onClick={() => mutate('connect', agent)} className="rounded-xl bg-bordo px-4 py-2 text-sm font-bold text-green disabled:opacity-50">{operation?.id === agent.id && operation.action === 'connect' ? 'Connecting…' : agent.is_active ? 'Test connection' : 'Connect'}</button>
            {agent.is_active && <button type="button" disabled={busy} onClick={() => mutate('disconnect', agent)} className={buttonClass}>Disconnect</button>}
            <button type="button" disabled={busy} onClick={() => { setEditing(agent); setShowForm(true); setError(null); setNotice(null) }} className={buttonClass}>Edit</button>
            <button type="button" disabled={busy} onClick={() => { setError(null); setDeleting(agent); deleteDialog.current.showModal() }} className="rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 focus-visible:outline-bordo disabled:opacity-50 dark:hover:bg-red-950/20">Delete</button>
          </div>
        </article>)}
      </div>}
    </section>

    <dialog ref={deleteDialog} aria-labelledby="delete-agent-heading" onClose={() => setDeleting(null)} onCancel={(event) => { if (busy) event.preventDefault() }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl backdrop:bg-black/40 dark:border-gray-800 dark:bg-gray-900">
      <h2 id="delete-agent-heading" className="break-words text-lg font-bold text-gray-900 dark:text-white">Delete {deleting?.name}?</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This removes the saved key and agent settings.{deleting?.is_active ? ' Connect another agent to continue using AI suggestions.' : ''}</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" autoFocus disabled={busy} onClick={() => deleteDialog.current.close()} className={buttonClass}>Cancel</button><button type="button" disabled={busy} onClick={() => mutate('delete', deleting)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Deleting…' : 'Delete agent'}</button></div>
    </dialog>
  </div>
}

function AgentForm({ agent, providers, busy, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({ name: agent?.name ?? '', provider: agent?.provider ?? providers[0].id, model: agent?.model ?? providers[0].default_model, instructions: agent?.instructions ?? '', api_key: '' }))
  const [showKey, setShowKey] = useState(false)
  const needsKey = !agent || values.provider !== agent.provider
  const setField = (key, value) => setValues((previous) => ({ ...previous, [key]: value }))
  return <form aria-label={agent ? 'Edit AI agent' : 'Add AI agent'} onSubmit={(event) => { event.preventDefault(); onSave(values) }} className="mb-7 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
    <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{agent ? 'Edit agent' : 'Add an agent'}</h2>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <fieldset><legend className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Provider</legend><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{providers.map((provider) => <label key={provider.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${values.provider === provider.id ? 'border-bordo bg-bordo/10 text-gray-900 dark:text-white' : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'}`}><input type="radio" name="llm-provider" value={provider.id} checked={values.provider === provider.id} onChange={() => { setValues((previous) => ({ ...previous, provider: provider.id, model: provider.default_model, api_key: '' })); setShowKey(false) }} className="accent-bordo" />{provider.label}</label>)}</div></fieldset>
      <div className="grid min-w-0 gap-5 md:grid-cols-2">
        <div><label htmlFor="agent-name" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Agent name</label><input id="agent-name" value={values.name} required maxLength={80} onChange={(event) => setField('name', event.target.value)} placeholder="My writing assistant" className={inputClass} /></div>
        <div><label htmlFor="agent-model" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Model ID</label><input id="agent-model" value={values.model} required maxLength={100} onChange={(event) => setField('model', event.target.value)} className={`${inputClass} font-mono`} /><p className="mt-1 text-xs text-gray-400">Use a text model with structured JSON output support.</p></div>
      </div>
      <div><label htmlFor="agent-api-key" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">API key</label><div className="flex gap-2"><input id="agent-api-key" type={showKey ? 'text' : 'password'} value={values.api_key} required={needsKey} minLength={10} maxLength={4096} onChange={(event) => setField('api_key', event.target.value)} placeholder={needsKey ? 'Enter the provider API key' : 'Leave blank to keep the saved key'} autoComplete="off" autoCapitalize="none" spellCheck={false} className={inputClass} /><button type="button" aria-label={showKey ? 'Hide API key' : 'Show API key'} onClick={() => setShowKey((value) => !value)} className={buttonClass}>{showKey ? 'Hide' : 'Show'}</button></div><p className="mt-1 text-xs text-gray-400">Saved keys are never displayed again. Changing the provider, model, or key requires reconnecting.</p></div>
      <div><label htmlFor="agent-instructions" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Writing style <span className="font-normal text-gray-400">(optional)</span></label><textarea id="agent-instructions" value={values.instructions} maxLength={1000} rows={3} onChange={(event) => setField('instructions', event.target.value)} placeholder="Use a friendly tone and clear, concise language." className={inputClass} /></div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">{onCancel && <button type="button" onClick={onCancel} className={buttonClass}>Cancel</button>}<button type="submit" className="rounded-xl bg-bordo px-5 py-2.5 text-sm font-bold text-green disabled:opacity-50">{busy ? 'Saving…' : 'Save agent'}</button></div>
    </fieldset>
  </form>
}
