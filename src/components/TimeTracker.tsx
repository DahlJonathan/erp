import { useMemo, useState } from 'react'

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
}

export function TimeTracker({ clients, projects, entries, onAddEntry }: TimeTrackerProps) {
    const today = getTodayIsoDate()
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [formState, setFormState] = useState<TimeEntryFormState>({
        projectId: projects[0]?.id ?? '',
        description: '',
        duration: '',
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
        if (!formState.projectId || !formState.description.trim() || duration <= 0) {
            return
        }

        const newEntry: NewTimeEntry = {
            projectId: formState.projectId,
            date: today,
            duration,
            description: formState.description.trim(),
            isBillable: true,
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
            }))
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

                    <div className="mt-6 space-y-3">
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
                                        className="rounded-2xl border-2 border-slate-600 bg-white/[0.04] p-4"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-base font-semibold text-white">
                                                    {project?.name ?? 'Tuntematon projekti'}
                                                </p>
                                                <p className="text-sm text-slate-300">
                                                    {client?.name ?? 'Tuntematon asiakas'}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-slate-100">
                                                {entry.duration.toFixed(1)} h
                                            </span>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-slate-300">
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
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-200">
                                Projekti
                            </span>
                            <select
                                value={formState.projectId}
                                onChange={(event) => handleFieldChange('projectId', event.target.value)}
                                className="w-full rounded-2xl border-2 border-slate-400 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/30"
                            >
                                {projects.map((project) => {
                                    const client = clientById.get(project.clientId)

                                    return (
                                        <option key={project.id} value={project.id}>
                                            {client?.name ?? 'Tuntematon asiakas'} / {project.name}
                                        </option>
                                    )
                                })}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-200">
                                Kuvaus
                            </span>
                            <textarea
                                rows={4}
                                value={formState.description}
                                onChange={(event) => handleFieldChange('description', event.target.value)}
                                placeholder="Mitä teit tänään?"
                                className="w-full rounded-2xl border-2 border-slate-400 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/30"
                            />
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
                                className="w-full rounded-2xl border-2 border-slate-400 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/30"
                            />
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