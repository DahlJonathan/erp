import { useEffect, useState } from 'react'

import type { Client, Project, ProjectStatus } from '../types/types'

type ProjectListProps = {
    clients: Client[]
    projects: Project[]
    isLoading?: boolean
    errorMessage?: string | null
}

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
    projects,
    isLoading = false,
    errorMessage = null,
}: ProjectListProps) {
    const [isProjectListLoading, setIsProjectListLoading] = useState(isLoading)
    const [projectListError, setProjectListError] = useState<string | null>(errorMessage)

    useEffect(() => {
        setIsProjectListLoading(isLoading)
    }, [isLoading])

    useEffect(() => {
        setProjectListError(errorMessage)
    }, [errorMessage])

    const clientById = new Map(clients.map((client) => [client.id, client]))

    return (
        <section className="rounded-3xl border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                        Projektit
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                        Kaikki asiakasprojektit
                    </h2>
                </div>
                <div className="rounded-2xl border-2 border-slate-400 bg-slate-100 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Yhteensä
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{projects.length}</p>
                </div>
            </div>

            {projectListError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    Virhe projektien latauksessa: {projectListError}
                </div>
            ) : null}

            {isProjectListLoading && projects.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-500 bg-slate-50 p-5 text-sm text-slate-700">
                    Ladataan projekteja...
                </div>
            ) : (
                <div className="space-y-4">
                    {projects.map((project) => {
                        const client = clientById.get(project.clientId)
                        const status = statusConfig[project.status]

                        return (
                            <article
                                key={project.id}
                                className="grid gap-4 rounded-2xl border-2 border-slate-400 bg-slate-50 p-5 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] md:items-center"
                            >
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
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}