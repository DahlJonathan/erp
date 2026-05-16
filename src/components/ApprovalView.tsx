import { useMemo, useState } from 'react'

import type { Client, Project, TimeEntry } from '../types/types'
import { formatFinnishDate } from '../utils/date'

type ApprovalViewProps = {
    clients: Client[]
    projects: Project[]
    timeEntries: TimeEntry[]
    onApproveEntries: (entryIds: string[]) => Promise<void>
}

export function ApprovalView({
    clients,
    projects,
    timeEntries,
    onApproveEntries,
}: ApprovalViewProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const projectById = useMemo(
        () => new Map(projects.map((project) => [project.id, project])),
        [projects],
    )
    const clientById = useMemo(
        () => new Map(clients.map((client) => [client.id, client])),
        [clients],
    )

    const draftEntries = useMemo(
        () => timeEntries.filter((entry) => entry.status === 'draft'),
        [timeEntries],
    )

    const allSelected = draftEntries.length > 0 && selectedIds.length === draftEntries.length

    function toggleEntry(entryId: string) {
        setSelectedIds((currentSelectedIds) =>
            currentSelectedIds.includes(entryId)
                ? currentSelectedIds.filter((id) => id !== entryId)
                : [...currentSelectedIds, entryId],
        )
    }

    function toggleAllEntries() {
        setSelectedIds(allSelected ? [] : draftEntries.map((entry) => entry.id))
    }

    async function handleApprove() {
        if (selectedIds.length === 0) {
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            await onApproveEntries(selectedIds)
            setSelectedIds([])
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Hyväksyntä epäonnistui.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className="rounded-3xl border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <div className="flex flex-col gap-4 border-b-2 border-slate-400 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                        Hyväksyntä
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                        Luonnostilassa olevat tuntikirjaukset
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={selectedIds.length === 0 || isSaving}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                    {isSaving ? 'Tallennetaan...' : `Merkitse hyväksytyksi (${selectedIds.length})`}
                </button>
            </div>

            {saveError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {saveError}
                </div>
            ) : null}

            {draftEntries.length === 0 ? (
                <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-500 bg-slate-50 p-5 text-sm text-slate-700">
                    Ei odottavia tuntikirjauksia.
                </div>
            ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border-2 border-slate-400">
                    <div className="grid grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_90px_120px] gap-4 border-b-2 border-slate-400 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleAllEntries}
                                className="h-4 w-4 rounded border-2 border-slate-500 text-emerald-600 focus:ring-emerald-500"
                            />
                        </label>
                        <span>Kuvaus</span>
                        <span>Asiakas / projekti</span>
                        <span>Tunnit</span>
                        <span>Päivämäärä</span>
                    </div>

                    <div className="divide-y-2 divide-slate-300 bg-white">
                        {draftEntries.map((entry) => {
                            const project = projectById.get(entry.projectId)
                            const client = project ? clientById.get(project.clientId) : undefined

                            return (
                                <article
                                    key={entry.id}
                                    className={`grid grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_90px_120px] gap-4 px-4 py-4 text-sm text-slate-700 ${
                                        entry.isBillable ? '' : 'bg-slate-50'
                                    }`}
                                >
                                    <label className="flex items-start pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(entry.id)}
                                            onChange={() => toggleEntry(entry.id)}
                                            className="h-4 w-4 rounded border-2 border-slate-500 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </label>

                                    <div>
                                        <p className={`font-medium ${entry.isBillable ? 'text-slate-900' : 'text-slate-500'}`}>
                                            {entry.description}
                                        </p>
                                        {entry.isBillable ? (
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-amber-700">
                                                Odottaa hyväksyntää
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                                                Muu työ
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <p className={`font-medium ${entry.isBillable ? 'text-slate-900' : 'text-slate-500'}`}>
                                            {entry.isBillable ? (client?.name ?? 'Tuntematon asiakas') : '–'}
                                        </p>
                                        <p className="text-slate-600">{entry.isBillable ? (project?.name ?? 'Tuntematon projekti') : ''}</p>
                                    </div>

                                    <p className={`font-medium ${entry.isBillable ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {entry.duration.toFixed(1)} h
                                    </p>
                                    <p className="text-slate-700">{formatFinnishDate(entry.date)}</p>
                                </article>
                            )
                        })}
                    </div>
                </div>
            )}
        </section>
    )
}