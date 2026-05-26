import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Trash2 } from 'lucide-react'

import { ProjectTasks } from './ProjectTasks'
import { mapProjectRow } from '../data/supabaseMappers'
import { supabase } from '../supabaseClient'
import type { Client, Project, ProjectRow, ProjectStatus, Task } from '../types/types'

const PAGE_SIZE = 10

type ProjectListProps = {
    clients: Client[]
    userId: string
    refreshTrigger?: number
    onUpdateProject: (
        projectId: string,
        updatedData: Pick<Project, 'name' | 'hourlyRate' | 'budgetHours' | 'status' | 'dueDate'>,
    ) => Promise<void>
    onDeleteProject: (projectId: string) => Promise<void>
    onTaskChange?: (action: 'created' | 'updated' | 'deleted', task: Task) => void
}

type EditProjectFormState = {
    name: string
    hourlyRate: string
    budgetHours: string
    status: ProjectStatus
    dueDate: string
}

const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
    { value: 'planned', label: 'Suunnitteilla' },
    { value: 'active', label: 'Aktiivinen' },
    { value: 'on-hold', label: 'Tauolla' },
    { value: 'completed', label: 'Valmistunut' },
    { value: 'archived', label: 'Arkistoitu' },
]

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
    planned: {
        label: 'Suunnitteilla',
        className: 'border border-slate-400 bg-slate-100 text-slate-800',
    },
    active: {
        label: 'Aktiivinen',
        className: 'border border-emerald-400 bg-emerald-100 text-emerald-800',
    },
    'on-hold': {
        label: 'Tauolla',
        className: 'border border-amber-400 bg-amber-100 text-amber-900',
    },
    completed: {
        label: 'Valmistunut',
        className: 'border border-sky-400 bg-sky-100 text-sky-900',
    },
    archived: {
        label: 'Arkistoitu',
        className: 'border border-violet-400 bg-violet-100 text-violet-900',
    },
}

export function ProjectList({
    clients,
    userId,
    refreshTrigger,
    onUpdateProject,
    onDeleteProject,
    onTaskChange,
}: ProjectListProps) {
    const [pagedProjects, setPagedProjects] = useState<Project[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedClientId, setSelectedClientId] = useState<string>('all')
    const [isPageLoading, setIsPageLoading] = useState(true)
    const [pageError, setPageError] = useState<string | null>(null)

    const [editProjectId, setEditProjectId] = useState<string | null>(null)
    const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null)
    const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false)
    const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
    const [confirmDeleteProject, setConfirmDeleteProject] = useState<Project | null>(null)
    const [expandedTasksProjectId, setExpandedTasksProjectId] = useState<string | null>(null)
    const [editFormState, setEditFormState] = useState<EditProjectFormState>({
        name: '',
        hourlyRate: '',
        budgetHours: '',
        status: 'planned',
        dueDate: '',
    })

    const clientById = new Map(clients.map((client) => [client.id, client]))
    const editingProject = pagedProjects.find((project) => project.id === editProjectId) ?? null
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

    const fetchPage = useCallback(async (
        page: number,
        clientId: string,
        status: ProjectStatus | 'all',
    ) => {
        setIsPageLoading(true)
        setPageError(null)

        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let query = supabase
            .from('projects')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (clientId !== 'all') query = query.eq('client_id', clientId)
        if (status !== 'all') query = query.eq('status', status)

        const { data, error, count } = await query

        if (error) {
            setPageError(error.message)
            setIsPageLoading(false)
            return
        }

        setPagedProjects((data as ProjectRow[]).map(mapProjectRow))
        setTotalCount(count ?? 0)
        setIsPageLoading(false)
    }, [])

    useEffect(() => {
        setCurrentPage(1)
    }, [selectedClientId, filterStatus])

    useEffect(() => {
        void fetchPage(currentPage, selectedClientId, filterStatus)
    }, [currentPage, selectedClientId, filterStatus, refreshTrigger, fetchPage])

    function openEditModal(project: Project) {
        setEditProjectId(project.id)
        setEditErrorMessage(null)
        setIsStatusMenuOpen(false)
        setEditFormState({
            name: project.name,
            hourlyRate: String(project.hourlyRate),
            budgetHours: String(project.budgetHours),
            status: project.status,
            dueDate: project.dueDate ?? '',
        })
    }

    function closeEditModal() {
        setEditProjectId(null)
        setEditErrorMessage(null)
        setIsStatusMenuOpen(false)
    }

    function handleEditFieldChange(field: keyof EditProjectFormState, value: string) {
        setEditFormState((currentState) => ({
            ...currentState,
            [field]: value,
        }))
    }

    function handleStatusSelect(status: ProjectStatus) {
        handleEditFieldChange('status', status)
        setIsStatusMenuOpen(false)
    }

    async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!editProjectId) {
            return
        }

        const hourlyRate = Number(editFormState.hourlyRate)
        const budgetHours = Number(editFormState.budgetHours)

        if (!editFormState.name.trim() || hourlyRate <= 0 || budgetHours <= 0) {
            setEditErrorMessage('Täytä projektin tiedot oikein.')
            return
        }

        setIsSavingEdit(true)
        setEditErrorMessage(null)

        try {
            await onUpdateProject(editProjectId, {
                name: editFormState.name.trim(),
                hourlyRate,
                budgetHours,
                status: editFormState.status,
                dueDate: editFormState.dueDate || null,
            })
            closeEditModal()
            void fetchPage(currentPage, selectedClientId, filterStatus)
        } catch (error) {
            setEditErrorMessage(
                error instanceof Error ? error.message : 'Projektin päivittäminen epäonnistui.',
            )
        } finally {
            setIsSavingEdit(false)
        }
    }

    function handleDeleteClick(project: Project) {
        setConfirmDeleteProject(project)
    }

    async function handleDeleteConfirm() {
        if (!confirmDeleteProject) return

        const project = confirmDeleteProject
        setConfirmDeleteProject(null)
        setDeletingProjectId(project.id)
        setDeleteErrorMessage(null)

        try {
            await onDeleteProject(project.id)

            if (editProjectId === project.id) {
                closeEditModal()
            }

            // If we deleted the last item on a page, go back one
            const newPage = pagedProjects.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
            setCurrentPage(newPage)
            void fetchPage(newPage, selectedClientId, filterStatus)
        } catch (error) {
            setDeleteErrorMessage(
                error instanceof Error ? error.message : 'Projektin poistaminen epäonnistui.',
            )
        } finally {
            setDeletingProjectId(null)
        }
    }

    return (
        <>
            <section className="rounded-3xl border-2 border-gray-500 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                            Projektit
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                            Kaikki asiakasprojektit
                        </h2>
                    </div>
                    <div className="rounded-2xl border-2 border-gray-500 bg-slate-100 px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Yhteensä
                        </p>
                        <p className="text-2xl font-semibold text-slate-900">{totalCount}</p>
                    </div>
                </div>

                {/* Client filter */}
                <div className="mb-4">
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="rounded-xl border-2 border-gray-400 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-950"
                    >
                        <option value="all">Kaikki asiakkaat</option>
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                    {([{ value: 'all', label: 'Kaikki' }, ...projectStatusOptions] as Array<{ value: ProjectStatus | 'all'; label: string }>).map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setFilterStatus(option.value)}
                            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-semibold transition ${
                                filterStatus === option.value
                                    ? 'border-slate-950 bg-slate-950 text-white'
                                    : 'border-gray-400 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {pageError ? (
                    <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        Virhe projektien latauksessa: {pageError}
                    </div>
                ) : null}

                {deleteErrorMessage ? (
                    <div className="mt-4 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        Virhe projektin poistossa: {deleteErrorMessage}
                    </div>
                ) : null}

                {isPageLoading ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-500 bg-slate-50 p-5 text-sm text-slate-700">
                        Ladataan projekteja...
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pagedProjects.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-gray-400 bg-slate-50 p-5 text-sm text-slate-600">
                                Ei projekteja valituilla suodattimilla.
                            </div>
                        ) : null}
                        {pagedProjects.map((project) => {
                            const client = clientById.get(project.clientId)
                            const status = statusConfig[project.status]
                            const isDeleting = deletingProjectId === project.id

                            return (
                                <article
                                    key={project.id}
                                    className="rounded-2xl border-2 border-gray-500 bg-slate-50"
                                >
                                    <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] md:items-center">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                                Asiakas
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                                {client?.name ?? 'Tuntematon asiakas'}
                                            </p>
                                            <p className="text-sm text-slate-600">{project.name}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                                Tuntihinta
                                            </p>
                                            <p className="mt-2 text-base font-medium text-slate-900">
                                                {project.hourlyRate} EUR / h
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                                Budjetti
                                            </p>
                                            <p className="mt-2 text-base font-medium text-slate-900">
                                                {project.budgetHours} h
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                                Tila
                                            </p>
                                            <span
                                                className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${status.className}`}
                                            >
                                                {status.label}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap justify-start gap-3 md:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedTasksProjectId(
                                                    expandedTasksProjectId === project.id ? null : project.id
                                                )}
                                                className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${
                                                    expandedTasksProjectId === project.id
                                                        ? 'border-slate-950 bg-slate-950 text-white'
                                                        : 'border-gray-500 bg-white text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                <ClipboardList size={15} />
                                                Tehtävät
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(project)}
                                                disabled={isDeleting}
                                                className="rounded-xl border-2 border-gray-500 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Muokkaa
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(project)}
                                                disabled={isDeleting}
                                                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-500 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                aria-label={`Poista projekti ${project.name}`}
                                            >
                                                <Trash2 size={16} aria-hidden="true" />
                                                {isDeleting ? 'Poistetaan...' : 'Poista'}
                                            </button>
                                        </div>
                                    </div>

                                    {expandedTasksProjectId === project.id ? (
                                        <div className="border-t-2 border-slate-200 p-5 pt-4 md:col-span-5">
                                            <ProjectTasks projectId={project.id} userId={userId} onTaskChange={onTaskChange} />
                                        </div>
                                    ) : null}
                                </article>
                            )
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 ? (
                    <div className="mt-5 flex items-center justify-between gap-4">
                        <p className="text-sm text-slate-500">
                            Sivu {currentPage} / {totalPages} &middot; {totalCount} projektia
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || isPageLoading}
                                className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-400 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={15} />
                                Edellinen
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || isPageLoading}
                                className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-400 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Seuraava
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                ) : null}
            </section>
            {editingProject ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
                    <div className="w-full max-w-2xl rounded-xl border-2 border-gray-500 bg-white p-6 shadow-2xl shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                                    Projektin hallinta
                                </p>
                                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                                    Muokkaa projektia
                                </h3>
                                <p className="mt-2 text-sm text-slate-600">
                                    Asiakas: {clientById.get(editingProject.clientId)?.name ?? 'Tuntematon asiakas'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="rounded-xl border-2 border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                                Peruuta
                            </button>
                        </div>

                        {editErrorMessage ? (
                            <div className="mt-6 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {editErrorMessage}
                            </div>
                        ) : null}

                        <form className="mt-6 space-y-5" onSubmit={handleEditSubmit}>
                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="edit-project-name">
                                    Nimi
                                </label>
                                <input
                                    id="edit-project-name"
                                    type="text"
                                    value={editFormState.name}
                                    onChange={(event) => handleEditFieldChange('name', event.target.value)}
                                    className="mt-2 w-full rounded-xl border-2 border-gray-500 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="edit-project-hourly-rate">
                                        Tuntihinta
                                    </label>
                                    <input
                                        id="edit-project-hourly-rate"
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={editFormState.hourlyRate}
                                        onChange={(event) => handleEditFieldChange('hourlyRate', event.target.value)}
                                        className="mt-2 w-full rounded-xl border-2 border-gray-500 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="edit-project-budget-hours">
                                        Budjetoidut tunnit
                                    </label>
                                    <input
                                        id="edit-project-budget-hours"
                                        type="number"
                                        min="1"
                                        step="0.5"
                                        value={editFormState.budgetHours}
                                        onChange={(event) => handleEditFieldChange('budgetHours', event.target.value)}
                                        className="mt-2 w-full rounded-xl border-2 border-gray-500 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="edit-project-status">
                                    Status
                                </label>
                                <div className="relative mt-2">
                                    <button
                                        id="edit-project-status"
                                        type="button"
                                        onClick={() => setIsStatusMenuOpen((currentValue) => !currentValue)}
                                        className="flex w-full items-center justify-between rounded-xl border-2 border-gray-500 bg-slate-50 px-4 py-3 text-left text-slate-950 outline-none transition hover:bg-white focus:border-slate-950"
                                        aria-haspopup="listbox"
                                        aria-expanded={isStatusMenuOpen}
                                    >
                                        <span>{projectStatusOptions.find((statusOption) => statusOption.value === editFormState.status)?.label}</span>
                                        <ChevronDown
                                            size={18}
                                            aria-hidden="true"
                                            className={`text-slate-500 transition ${isStatusMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {isStatusMenuOpen ? (
                                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border-2 border-gray-500 bg-white p-2 shadow-lg shadow-slate-900/10">
                                            <div className="space-y-1" role="listbox" aria-label="Projektin status">
                                                {projectStatusOptions.map((statusOption) => {
                                                    const isSelected = editFormState.status === statusOption.value

                                                    return (
                                                        <button
                                                            key={statusOption.value}
                                                            type="button"
                                                            onClick={() => handleStatusSelect(statusOption.value)}
                                                            className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium transition ${isSelected
                                                                ? 'bg-slate-950 text-white'
                                                                : 'bg-white text-slate-900 hover:bg-slate-100'
                                                                }`}
                                                            role="option"
                                                            aria-selected={isSelected}
                                                        >
                                                            <span>{statusOption.label}</span>
                                                            {isSelected ? <Check size={16} aria-hidden="true" /> : null}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="edit-project-due-date">
                                    Määräaika
                                </label>
                                <input
                                    id="edit-project-due-date"
                                    type="date"
                                    value={editFormState.dueDate}
                                    onChange={(event) => handleEditFieldChange('dueDate', event.target.value)}
                                    className="mt-2 w-full rounded-xl border-2 border-gray-500 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                                />
                            </div>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="rounded-xl border-2 border-gray-500 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                                >
                                    Peruuta
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingEdit}
                                    className="rounded-xl border-2 border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSavingEdit ? 'Tallennetaan...' : 'Tallenna muutokset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {confirmDeleteProject ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
                    <div className="w-full max-w-md rounded-2xl border-2 border-gray-500 bg-white p-6 shadow-2xl shadow-slate-950/20">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-rose-200 bg-rose-50">
                                <Trash2 size={20} className="text-rose-600" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-950">Poista projekti</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    Oletko varma, että haluat poistaa projektin{' '}
                                    <span className="font-semibold text-slate-950">{confirmDeleteProject.name}</span>?
                                </p>
                                <p className="mt-2 text-sm text-rose-600">
                                    Tämä poistaa myös kaikki siihen liittyvät tuntikirjaukset. Toimintoa ei voi peruuttaa.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteProject(null)}
                                className="rounded-xl border-2 border-gray-400 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                                Peruuta
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="rounded-xl border-2 border-rose-600 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                                Poista projekti
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}