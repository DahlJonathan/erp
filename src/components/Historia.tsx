import { useMemo, useState } from 'react'

import { InvoiceTemplate } from './InvoiceTemplate'

import type { Client, Invoice, Project, ProjectStatus, TimeEntry } from '../types/types'
import { formatFinnishDate } from '../utils/date'

type HistoriaProps = {
    clients: Client[]
    invoices: Invoice[]
    projects: Project[]
    timeEntries: TimeEntry[]
}

const projectStatusLabels: Record<ProjectStatus, string> = {
    planned: 'Suunnitteilla',
    active: 'Aktiivinen',
    'on-hold': 'Tauolla',
    completed: 'Valmistunut',
    archived: 'Arkistoitu',
}

const invoiceStatusLabels = {
    draft: 'Luonnos',
    sent: 'Lähetetty',
    paid: 'Maksettu',
    overdue: 'Myöhässä',
} as const

export function Historia({ clients, invoices, projects, timeEntries }: HistoriaProps) {
    const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(invoices[0]?.id ?? null)

    const clientById = useMemo(
        () => new Map(clients.map((client) => [client.id, client])),
        [clients],
    )
    const projectById = useMemo(
        () => new Map(projects.map((project) => [project.id, project])),
        [projects],
    )

    const historicalProjects = useMemo(
        () => projects.filter((project) => project.status === 'completed' || project.status === 'archived'),
        [projects],
    )

    const projectHistory = useMemo(
        () => historicalProjects.map((project) => {
            const totalHours = timeEntries
                .filter((entry) => entry.projectId === project.id)
                .reduce((sum, entry) => sum + entry.duration, 0)

            return {
                project,
                client: clientById.get(project.clientId),
                totalHours,
            }
        }),
        [clientById, historicalProjects, timeEntries],
    )

    const invoiceHistory = useMemo(
        () => invoices.map((invoice) => ({
            invoice,
            client: clientById.get(invoice.clientId),
            totalWithVat: invoice.totalAmount * 1.255,
        })),
        [clientById, invoices],
    )

    const previewInvoice = useMemo(
        () => invoices.find((invoice) => invoice.id === previewInvoiceId) ?? null,
        [invoices, previewInvoiceId],
    )

    const previewClient = previewInvoice ? clientById.get(previewInvoice.clientId) ?? null : null
    const previewLines = useMemo(() => {
        if (!previewInvoice) {
            return []
        }

        return timeEntries
            .filter((entry) => entry.invoiceId === previewInvoice.id)
            .map((entry) => {
                const project = projectById.get(entry.projectId)
                if (!project) {
                    return null
                }

                return {
                    entryId: entry.id,
                    description: `${project.name}: ${entry.description}`,
                    duration: entry.duration,
                    hourlyRate: project.hourlyRate,
                    lineTotal: entry.duration * project.hourlyRate,
                }
            })
            .filter((line): line is NonNullable<typeof line> => line !== null)
    }, [previewInvoice, projectById, timeEntries])

    return (
        <section className="rounded-3xl border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <div className="flex flex-col gap-3 border-b-2 border-slate-400 pb-6">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                    Historia
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    Projekti- ja laskuhistoria
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-700">
                    Näe päättyneet projektit, toteutuneet tunnit ja aiemmin tallennetut laskut yhdestä näkymästä.
                </p>
            </div>

            <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <div className="space-y-8">
                    <article className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5">
                        <div className="flex items-end justify-between gap-4 border-b-2 border-slate-300 pb-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Menneet projektit
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                                    Valmistuneet ja arkistoidut projektit
                                </h3>
                            </div>
                            <div className="rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-right">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projektit</p>
                                <p className="mt-1 text-2xl font-semibold text-slate-950">{projectHistory.length}</p>
                            </div>
                        </div>

                        {projectHistory.length === 0 ? (
                            <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-500 bg-white p-5 text-sm text-slate-700">
                                Ei vielä valmistuneita tai arkistoituja projekteja.
                            </div>
                        ) : (
                            <div className="mt-5 divide-y-2 divide-slate-300 overflow-hidden rounded-2xl border-2 border-slate-400 bg-white">
                                {projectHistory.map(({ project, client, totalHours }) => {
                                    const isOverBudget = totalHours > project.budgetHours

                                    return (
                                        <div key={project.id} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_140px_140px_140px] md:items-center">
                                            <div>
                                                <p className="text-base font-semibold text-slate-950">{project.name}</p>
                                                <p className="mt-1 text-sm text-slate-700">
                                                    {client?.name ?? 'Tuntematon asiakas'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tila</p>
                                                <p className="mt-1 font-medium text-slate-950">
                                                    {projectStatusLabels[project.status]}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tunnit / budjetti</p>
                                                <p className="mt-1 font-medium text-slate-950">
                                                    {totalHours.toFixed(1)} h / {project.budgetHours.toFixed(1)} h
                                                </p>
                                            </div>
                                            <div>
                                                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${isOverBudget
                                                    ? 'border-rose-400 bg-rose-100 text-rose-800'
                                                    : 'border-emerald-400 bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                    {isOverBudget ? 'Yli budjetin' : 'Budjetissa'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </article>

                    <article className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5">
                        <div className="flex items-end justify-between gap-4 border-b-2 border-slate-300 pb-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Laskuhistoria
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                                    Tallennetut laskut
                                </h3>
                            </div>
                            <div className="rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-right">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Laskut</p>
                                <p className="mt-1 text-2xl font-semibold text-slate-950">{invoiceHistory.length}</p>
                            </div>
                        </div>

                        {invoiceHistory.length === 0 ? (
                            <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-500 bg-white p-5 text-sm text-slate-700">
                                Laskuhistoria on vielä tyhjä.
                            </div>
                        ) : (
                            <div className="mt-5 overflow-hidden rounded-2xl border-2 border-slate-400">
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_150px_120px_120px] gap-4 border-b-2 border-slate-400 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                                    <span>Lasku</span>
                                    <span>Asiakas</span>
                                    <span>Päiväys</span>
                                    <span>Yhteensä sis. ALV</span>
                                    <span>Tila</span>
                                    <span></span>
                                </div>

                                <div className="divide-y-2 divide-slate-300 bg-white">
                                    {invoiceHistory.map(({ invoice, client, totalWithVat }) => (
                                        <div
                                            key={invoice.id}
                                            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_150px_120px_120px] gap-4 px-4 py-4 text-sm text-slate-800"
                                        >
                                            <p className="font-medium text-slate-950">{invoice.invoiceNumber}</p>
                                            <p>{client?.name ?? 'Tuntematon asiakas'}</p>
                                            <p>{formatFinnishDate(invoice.date)}</p>
                                            <p className="font-medium text-slate-950">{totalWithVat.toFixed(2)} EUR</p>
                                            <p>{invoiceStatusLabels[invoice.status]}</p>
                                            <div className="text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewInvoiceId(invoice.id)}
                                                    className="inline-flex items-center justify-center rounded-xl border-2 border-slate-400 bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                >
                                                    Esikatsele
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </article>
                </div>

                <aside className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5 shadow-sm shadow-slate-300/60">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Laskun esikatselu
                        </p>
                        {previewInvoice && previewClient ? (
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="screen-only inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Lataa PDF / tulosta
                            </button>
                        ) : null}
                    </div>

                    {previewInvoice && previewClient ? (
                        <div className="mt-5">
                            <InvoiceTemplate
                                invoice={previewInvoice}
                                client={previewClient}
                                lines={previewLines}
                            />
                        </div>
                    ) : (
                        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-500 bg-white p-5 text-sm text-slate-700">
                            Valitse lasku listalta, niin voit esikatsella sen uudelleen.
                        </div>
                    )}
                </aside>
            </div>
        </section>
    )
}