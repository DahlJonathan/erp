import { useEffect, useMemo, useRef, useState } from 'react'

import type { Client, NewTimeEntry, Project, TimeEntry } from '../types/types'
import { formatFinnishDate, getTodayIsoDate } from '../utils/date'

type TimeTrackerProps = {
    clients: Client[]
    projects: Project[]
    entries: TimeEntry[]
    onAddEntry: (entry: NewTimeEntry) => Promise<void>
}

type TimeEntryFormState = {
    projectId: string
    description: string
    duration: string
    isBillable: boolean
}

function ProjectSelect({
    value,
    onChange,
    options,
    disabled,
}: {
    value: string
    onChange: (val: string) => void
    options: Array<{ value: string; label: string }>
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = options.find((o) => o.value === value)

    useEffect(() => {
        if (disabled) setOpen(false)
    }, [disabled])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left text-sm outline-none transition ${
                    disabled
                        ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'
                        : 'border-slate-400 bg-slate-900 text-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/30'
                }`}
            >
                <span className={value === '' ? 'text-slate-400' : ''}>
                    {selected ? selected.label : 'Valitse projekti...'}
                </span>
                <svg className="ml-2 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
            </button>
            {open && (
                <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border-2 border-slate-600 bg-slate-800 shadow-lg shadow-black/40">
                    {options.map((opt) => (
                        <li
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setOpen(false) }}
                            className={`cursor-pointer px-4 py-2.5 text-sm transition hover:bg-slate-700 ${
                                opt.value === value ? 'font-semibold text-emerald-300' : 'text-slate-100'
                            }`}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export function TimeTracker({ clients, projects, entries, onAddEntry }: TimeTrackerProps) {
    const today = getTodayIsoDate()
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TimeEntryFormState, string>>>({})
    const [formState, setFormState] = useState<TimeEntryFormState>({
        projectId: projects[0]?.id ?? '',
        description: '',
        duration: '',
        isBillable: true,
    })

    const projectById = useMemo(
        () => new Map(projects.map((project) => [project.id, project])),
        [projects],
    )
    const clientById = useMemo(
        () => new Map(clients.map((client) => [client.id, client])),
        [clients],
    )

    const todaysEntries = useMemo(
        () => entries.filter((entry) => entry.date === today),
        [entries],
    )

    const totalDuration = todaysEntries.reduce((sum, entry) => sum + entry.duration, 0)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const duration = Number(formState.duration)
        const errors: Partial<Record<keyof TimeEntryFormState, string>> = {}

        if (formState.isBillable && !formState.projectId) {
            errors.projectId = 'Valitse projekti.'
        }
        if (!formState.description.trim()) {
            errors.description = 'Kuvaus ei voi olla tyhjä.'
        }
        if (!formState.duration || duration <= 0) {
            errors.duration = 'Syötä tuntimäärä (esim. 7.5).'
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            return
        }

        setFieldErrors({})

        const newEntry: NewTimeEntry = {
            projectId: formState.projectId,
            date: today,
            duration,
            description: formState.description.trim(),
            isBillable: formState.isBillable,
            status: 'draft',
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            await onAddEntry(newEntry)
            setFormState((currentState) => ({
                ...currentState,
                description: '',
                duration: '',
                isBillable: true,
            }))
            setFieldErrors({})
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Tallennus epäonnistui.')
        } finally {
            setIsSaving(false)
        }
    }

    function handleFieldChange(field: keyof TimeEntryFormState, value: string) {
        setFormState((currentState) => ({
            ...currentState,
            [field]: value,
        }))
        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    return (
        <section className="rounded-3xl border-2 border-slate-700 bg-slate-950 p-6 text-slate-50 shadow-lg shadow-slate-900/10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                        Tuntikirjaus
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                        Päivän tunnit yhdessä näkymässä
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                        Kirjaa tehty työ projektille, tarkista päivän kertymä ja pidä laskutettava työ erillään luonnoksista.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border-2 border-slate-500 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Päivämäärä
                            </p>
                            <p className="mt-2 text-xl font-semibold text-white">{formatFinnishDate(today)}</p>
                        </div>
                        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-400/10 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">
                                Tunnit tänään
                            </p>
                            <p className="mt-2 text-xl font-semibold text-white">{totalDuration.toFixed(1)} h</p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-2 max-h-80 overflow-y-auto pr-1">
                        {todaysEntries.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-slate-500 bg-white/[0.03] p-5 text-sm text-slate-200">
                                Ei kirjauksia tälle päivälle.
                            </div>
                        ) : (
                            todaysEntries.map((entry) => {
                                const project = projectById.get(entry.projectId)
                                const client = project ? clientById.get(project.clientId) : undefined

                                return (
                                    <article
                                        key={entry.id}
                                        className={`rounded-xl border px-3 py-2.5 ${
                                            entry.isBillable
                                                ? 'border-slate-600 bg-white/[0.04]'
                                                : 'border-slate-700 bg-slate-800/40 opacity-70'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                {entry.isBillable ? (
                                                    <>
                                                        <p className="text-sm font-semibold text-white truncate">
                                                            {project?.name ?? 'Tuntematon projekti'}
                                                        </p>
                                                        <p className="text-xs text-slate-400 truncate">
                                                            {client?.name ?? 'Tuntematon asiakas'}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm font-semibold text-slate-400">
                                                        Muu työ
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-100">
                                                    {entry.duration.toFixed(1)} h
                                                </span>
                                                {!entry.isBillable ? (
                                                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                                                        Muu työ
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-5 text-slate-400 line-clamp-2">
                                            {entry.description}
                                        </p>
                                    </article>
                                )
                            })
                        )}
                    </div>
                </div>

                <form
                    className="rounded-3xl border-2 border-slate-500 bg-white/5 p-5 backdrop-blur"
                    onSubmit={handleSubmit}
                >
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Uusi kirjaus
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">Lisää työtunti</h3>
                    </div>

                    <div className="mt-6 space-y-5">
                        <div>
                            <span className="mb-2 block text-sm font-medium text-slate-200">
                                Projekti
                            </span>
                            <ProjectSelect
                                value={formState.projectId}
                                onChange={(val) => handleFieldChange('projectId', val)}
                                disabled={!formState.isBillable}
                                options={projects.map((project) => {
                                    const client = clientById.get(project.clientId)
                                    return {
                                        value: project.id,
                                        label: `${client?.name ?? 'Tuntematon asiakas'} / ${project.name}`,
                                    }
                                })}
                            />
                            {fieldErrors.projectId ? (
                                <p className="mt-1.5 text-xs font-medium text-rose-400">{fieldErrors.projectId}</p>
                            ) : null}
                        </div>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-200">
                                Kuvaus
                            </span>
                            <textarea
                                rows={4}
                                value={formState.description}
                                onChange={(event) => handleFieldChange('description', event.target.value)}
                                placeholder="Mitä teit tänään?"
                                className={`w-full rounded-2xl border-2 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                                    fieldErrors.description
                                        ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-400/30'
                                        : 'border-slate-400 focus:border-emerald-300 focus:ring-emerald-300/30'
                                }`}
                            />
                            {fieldErrors.description ? (
                                <p className="mt-1.5 text-xs font-medium text-rose-400">{fieldErrors.description}</p>
                            ) : null}
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-200">
                                Tunnit
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={formState.duration}
                                onChange={(event) => handleFieldChange('duration', event.target.value)}
                                placeholder="esim. 7.5"
                                className={`w-full rounded-2xl border-2 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                                    fieldErrors.duration
                                        ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-400/30'
                                        : 'border-slate-400 focus:border-emerald-300 focus:ring-emerald-300/30'
                                }`}
                            />
                            {fieldErrors.duration ? (
                                <p className="mt-1.5 text-xs font-medium text-rose-400">{fieldErrors.duration}</p>
                            ) : null}
                        </label>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-600 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.07]">
                            <input
                                type="checkbox"
                                checked={!formState.isBillable}
                                onChange={(event) =>
                                    setFormState((s) => ({ ...s, isBillable: !event.target.checked }))
                                }
                                className="h-4 w-4 rounded border-2 border-slate-500 accent-slate-400"
                            />
                            <div>
                                <span className="block text-sm font-medium text-slate-200">Muu työ</span>
                                <span className="block text-xs text-slate-400">Ei laskutettava</span>
                            </div>
                        </label>
                    </div>

                    {saveError ? (
                        <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50/10 px-4 py-3 text-sm text-rose-200">
                            {saveError}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
                    >
                        {isSaving ? 'Tallennetaan...' : 'Tallenna kirjaus'}
                    </button>
                </form>
            </div>
        </section>
    )
}