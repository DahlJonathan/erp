import { useMemo } from 'react'

import type { Project, TimeEntry } from '../types/types'
import { getCurrentMonthKey } from '../utils/date'

type DashboardProps = {
    projects: Project[]
    timeEntries: TimeEntry[]
}

export function Dashboard({ projects, timeEntries }: DashboardProps) {
    const currentMonth = getCurrentMonthKey()
    const projectById = useMemo(
        () => new Map(projects.map((project) => [project.id, project])),
        [projects],
    )

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.duration, 0)
    const billableHours = timeEntries.reduce(
        (sum, entry) => sum + (entry.isBillable ? entry.duration : 0),
        0,
    )
    const utilizationRate = totalHours === 0 ? 0 : (billableHours / totalHours) * 100

    const monthlyRevenue = timeEntries.reduce((sum, entry) => {
        if (!entry.isBillable || !entry.date.startsWith(currentMonth)) {
            return sum
        }

        const project = projectById.get(entry.projectId)
        if (!project) {
            return sum
        }

        return sum + entry.duration * project.hourlyRate
    }, 0)

    const burnDownProjects = projects.map((project) => {
        const usedHours = timeEntries
            .filter((entry) => entry.projectId === project.id)
            .reduce((sum, entry) => sum + entry.duration, 0)
        const progress = project.budgetHours === 0 ? 0 : (usedHours / project.budgetHours) * 100

        return {
            ...project,
            usedHours,
            progress: Math.min(progress, 100),
            overBudget: usedHours > project.budgetHours,
        }
    })

    return (
        <section className="rounded-[2rem] border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                        Yhteenveto
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        Liiketoiminnan tilanne yhdellä silmäyksellä
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Seuraa laskutettavan työn osuutta, projektien budjettikulutusta ja kuluvan kuukauden tulovirtaa ilman raskaita raportteja.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Käyttöaste</p>
                        <p className="mt-2 text-2xl font-semibold">{utilizationRate.toFixed(0)} %</p>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-400 bg-slate-50 px-5 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Laskutettavat tunnit</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{billableHours.toFixed(1)} h</p>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-400 bg-slate-50 px-5 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Kuukauden liikevaihto</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{monthlyRevenue.toFixed(2)} EUR</p>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
                <article className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Käyttöaste
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-slate-950">
                                Laskutettava vs. kokonaisaika
                            </h3>
                        </div>
                        <span className="rounded-full border border-emerald-400 bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                            {billableHours.toFixed(1)} / {totalHours.toFixed(1)} h
                        </span>
                    </div>

                    <div className="mt-8 flex items-center gap-5">
                        <div className="relative h-32 w-32 shrink-0">
                            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                                <circle cx="60" cy="60" r="46" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="46"
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(utilizationRate / 100) * 289} 289`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-semibold text-slate-950">
                                    {utilizationRate.toFixed(0)}%
                                </span>
                                <span className="text-xs uppercase tracking-[0.18em] text-slate-900">
                                    Laskutettava
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                                    <span>Laskutettava</span>
                                    <span>{billableHours.toFixed(1)} h</span>
                                </div>
                                <div className="h-3 rounded-full bg-slate-200">
                                    <div
                                        className="h-3 rounded-full bg-emerald-500"
                                        style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                                    <span>Muu työ</span>
                                    <span>{Math.max(totalHours - billableHours, 0).toFixed(1)} h</span>
                                </div>
                                <div className="h-3 rounded-full bg-slate-200">
                                    <div
                                        className="h-3 rounded-full bg-slate-500"
                                        style={{ width: `${Math.max(100 - utilizationRate, 0)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                <article className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Kuukausilaskutus
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        Laskutettava työ kuluvassa kuussa
                    </h3>

                    <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-sm text-slate-400">Jakso</p>
                                <p className="mt-1 text-lg font-medium">{currentMonth.slice(5, 7)}/{currentMonth.slice(0, 4)}</p>
                            </div>
                            <p className="text-3xl font-semibold">{monthlyRevenue.toFixed(2)} EUR</p>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white/5 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    Laskutettavat kirjaukset
                                </p>
                                <p className="mt-2 text-xl font-semibold text-white">
                                    {
                                        timeEntries.filter(
                                            (entry) => entry.isBillable && entry.date.startsWith(currentMonth),
                                        ).length
                                    }
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    Tunnit tässä kuussa
                                </p>
                                <p className="mt-2 text-xl font-semibold text-white">
                                    {
                                        timeEntries
                                            .filter((entry) => entry.date.startsWith(currentMonth))
                                            .reduce((sum, entry) => sum + entry.duration, 0)
                                            .toFixed(1)
                                    } h
                                </p>
                            </div>
                        </div>
                    </div>
                </article>
            </div>

            <article className="mt-6 rounded-3xl border-2 border-slate-400 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Projektien kulutus
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                    Käytetyt tunnit vs. budjetti
                </h3>

                <div className="mt-6 space-y-4">
                    {burnDownProjects.map((project) => (
                        <div key={project.id} className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-base font-semibold text-slate-950">{project.name}</p>
                                    <p className="text-sm text-slate-600">
                                        {project.usedHours.toFixed(1)} h käytetty / {project.budgetHours.toFixed(1)} h budjetoitu
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full border px-3 py-1 text-sm font-medium ${project.overBudget
                                        ? 'border-rose-400 bg-rose-100 text-rose-800'
                                        : 'border-sky-400 bg-sky-100 text-sky-800'
                                        }`}
                                >
                                    {project.overBudget ? 'Yli budjetin' : `${project.progress.toFixed(0)} % käytetty`}
                                </span>
                            </div>

                            <div className="mt-4 h-3 rounded-full bg-slate-200">
                                <div
                                    className={`h-3 rounded-full ${project.overBudget ? 'bg-rose-500' : 'bg-sky-500'
                                        }`}
                                    style={{ width: `${project.progress}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </article>
        </section>
    )
}