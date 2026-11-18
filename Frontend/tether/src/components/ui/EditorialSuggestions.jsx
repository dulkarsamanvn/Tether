import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/api'

const buttonClass = 'rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-bordo focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300'

export default function EditorialSuggestions({ text, title, excerpt, onApply, disabled = false }) {
  const [result, setResult] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [applied, setApplied] = useState('')
  const [configuration, setConfiguration] = useState(undefined)
  const [configurationError, setConfigurationError] = useState(false)
  const configurationRequest = useRef(null)
  const activeRequest = useRef(null)
  const draft = text.trim()
  const characters = Array.from(draft)
  const canGenerate = characters.length >= 80
  const stale = result && (result.source !== draft || result.configurationId !== configuration?.id || result.configurationRevision !== configuration?.revision)

  const loadConfiguration = useCallback(async () => {
    configurationRequest.current?.abort()
    const controller = new AbortController()
    configurationRequest.current = controller
    try {
      const { data } = await api.get('/llm-configurations/active', { signal: controller.signal })
      if (controller.signal.aborted) return
      setConfiguration(data.configuration); setConfigurationError(false)
    } catch {
      if (!controller.signal.aborted) setConfigurationError(true)
    }
  }, [])

  useEffect(() => {
    loadConfiguration()
    window.addEventListener('focus', loadConfiguration)
    return () => { window.removeEventListener('focus', loadConfiguration); configurationRequest.current?.abort(); activeRequest.current?.abort() }
  }, [loadConfiguration])

  async function generate() {
    if (disabled || generating || !canGenerate || !configuration || configurationError) return
    const controller = new AbortController()
    activeRequest.current = controller
    setGenerating(true); setError(null); setApplied('')
    try {
      const { data } = await api.post('/editor/suggestions', { title, content: characters.slice(0, 20000).join(''), configuration_id: configuration.id, configuration_revision: configuration.revision }, { signal: controller.signal, timeout: 40000 })
      if (activeRequest.current !== controller || controller.signal.aborted) return
      setResult({ ...data, source: draft, configurationId: configuration.id, configurationRevision: configuration.revision })
    } catch (failure) {
      if (activeRequest.current !== controller || controller.signal.aborted) return
      const status = failure.response?.status
      setError(status === 429
        ? 'You have reached the suggestion limit. Please try again later.'
        : failure.response?.data?.errors?.content?.[0] ?? failure.response?.data?.message ?? 'Could not generate suggestions. Please try again.')
      if (status === 409 || failure.response?.data?.code === 'ai_not_configured') loadConfiguration()
    } finally {
      if (activeRequest.current === controller) { activeRequest.current = null; setGenerating(false) }
    }
  }

  function cancel() {
    const controller = activeRequest.current
    activeRequest.current = null
    controller?.abort()
    setGenerating(false)
  }

  function apply(field, value) {
    if (disabled || stale || configurationError) return
    onApply(field, value)
    setApplied(`${field === 'title' ? 'Title' : 'Excerpt'} applied to your draft.`)
  }

  return (
    <section aria-labelledby="editorial-suggestions-heading" className="mb-5 rounded-2xl border border-bordo/25 bg-white p-5 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="editorial-suggestions-heading" className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
          <svg aria-hidden="true" className="h-4 w-4 text-bordo" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" strokeWidth={1.7} strokeLinejoin="round" /></svg>
          AI title &amp; excerpt
        </h2>
        <div className="flex flex-wrap gap-2">
          {generating && <button type="button" onClick={cancel} className={buttonClass}>Cancel</button>}
          <button type="button" onClick={generate} disabled={disabled || generating || !canGenerate || !configuration || configurationError} aria-busy={generating} className="rounded-lg bg-bordo px-3 py-2 text-xs font-bold text-green hover:bg-bordo-dark focus-visible:outline-bordo disabled:cursor-not-allowed disabled:opacity-50">{generating ? 'Generating…' : result ? 'Generate again' : 'Suggest with AI'}</button>
        </div>
      </div>
      {configurationError ? <p role="alert" className="mt-3 text-xs text-red-500">Could not load your connected agent. <button type="button" onClick={loadConfiguration} className="font-semibold underline">Try again</button></p>
        : configuration === undefined ? <p role="status" className="mt-2 text-xs text-gray-400">Loading your AI agent…</p>
          : configuration ? <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400"><p className="min-w-0 break-words"><span className="font-semibold">{configuration.name}</span> · {configuration.provider_name} · {configuration.model}</p><Link to="/dashboard/llm-configuration" className="rounded-md font-semibold text-bordo underline focus-visible:outline-bordo">Change agent</Link></div>
            : <p className="mt-3 text-xs text-gray-500 dark:text-gray-400"><Link to="/dashboard/llm-configuration" className="rounded-md font-semibold text-bordo underline focus-visible:outline-bordo">Configure an LLM</Link> to connect an agent for suggestions.</p>}
      {configuration && !configurationError && <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Sends your draft text to {configuration.provider_name} when clicked. Review the suggestions, then choose which to use.</p>}
      {!canGenerate && <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Write at least 80 characters to get suggestions.</p>}
      {characters.length > 20000 && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">For this long draft, suggestions use the first 20,000 characters.</p>}
      {generating && <p role="status" className="mt-3 text-xs text-gray-500 dark:text-gray-400">Creating ideas from your draft. You can keep writing.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</p>}
      {result && <div className="mt-4 space-y-4">
        {stale && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">Your draft text or connected agent changed. Generate new suggestions for the latest version.</p>}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Title ideas</h3>
          <ol className="space-y-2">
            {result.titles.map((suggestion, index) => <li key={index} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="min-w-0 flex-1 basis-48 break-words text-sm text-gray-800 dark:text-gray-200">{suggestion}</p>
              <button type="button" aria-label={`Use title suggestion ${index + 1}`} onClick={() => apply('title', suggestion)} disabled={disabled || stale || configurationError || title === suggestion} className={buttonClass}>{title === suggestion ? 'Current title' : 'Use title'}</button>
            </li>)}
          </ol>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Suggested excerpt</h3>
          <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300">{result.excerpt}</p>
          <button type="button" onClick={() => apply('excerpt', result.excerpt)} disabled={disabled || stale || configurationError || excerpt === result.excerpt} className={buttonClass}>{excerpt === result.excerpt ? 'Current excerpt' : 'Use excerpt'}</button>
        </div>
        {applied && <p role="status" className="text-xs font-medium text-gray-600 dark:text-gray-300">{applied}</p>}
      </div>}
    </section>
  )
}
