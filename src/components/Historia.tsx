import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { InvoicePrintView } from './InvoicePrintView'
import { ProjectPrintView } from './ProjectPrintView'

import type { Client, Invoice, Project, ProjectStatus, TimeEntry } from '../types/types'
import { formatFinnishDate } from '../utils/date'

const printWindowStyles = `
    @page {
        size: A4;
        margin: 0;
    }

    html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
    }

    body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    * {
        box-sizing: border-box;
    }

    #print-toolbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: #0f172a;
        padding: 10px 20px;
        font-family: system-ui, sans-serif;
    }

    #print-toolbar span {
        color: #94a3b8;
        font-size: 13px;
        font-weight: 500;
    }

    #print-toolbar button {
        background: #10b981;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 8px 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        letter-spacing: 0.02em;
    }

    #print-toolbar button:hover {
        background: #059669;
    }

    #print-content {
        margin-top: 56px;
        background: #f1f5f9;
        padding: 24px 0;
    }

    @media print {
        #print-toolbar { display: none !important; }
        #print-content { margin-top: 0; padding: 0; background: #ffffff; }
        html, body { background: #ffffff; }
    }
`

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
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)

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
                .filter((entry) => entry.projectId === project.id && entry.isBillable)
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

    function handlePreviewProject(project: Project) {
        const previewClient = clientById.get(project.clientId)

        if (!previewClient) {
            return
        }

        const projectEntries = timeEntries.filter((e) => e.projectId === project.id)

        const printWindow = window.open('', '_blank', 'popup=yes,width=1080,height=900')

        if (!printWindow) {
            return
        }

        const activePrintWindow: Window = printWindow
        const printDocument = activePrintWindow.document

        printDocument.documentElement.lang = 'fi'
        printDocument.title = `Projektiyhteenveto – ${project.name}`
        printDocument.head.innerHTML = `<meta charset="utf-8" /><title>Projektiyhteenveto – ${project.name}</title><style>${printWindowStyles}</style>`
        printDocument.body.innerHTML = `
            <div id="print-toolbar">
                <span>Projektiyhteenveto \u2013 ${project.name}</span>
                <button onclick="window.print()">&#8595; Lataa PDF</button>
            </div>
            <div id="print-content"><div id="project-print-root"></div></div>
        `

        const printRootElement = printDocument.getElementById('project-print-root')

        if (!printRootElement) {
            activePrintWindow.close()
            return
        }

        const printRoot = createRoot(printRootElement)
        const logoSrc = localStorage.getItem('invoice_logo') ?? new URL('/lasku.png', window.location.origin).toString()

        printRoot.render(
            <ProjectPrintView
                project={project}
                client={previewClient}
                timeEntries={projectEntries}
                logoSrc={logoSrc}
            />,
        )
    }

    function handlePreviewInvoice(invoice: Invoice) {
        const previewClient = clientById.get(invoice.clientId)

        if (!previewClient) {
            return
        }

        const previewLines = timeEntries
            .filter((entry) => entry.invoiceId === invoice.id)
            .map((entry) => {
                const project = projectById.get(entry.projectId)
                if (!project) {
                    return null
                }

                return {
                    entryId: entry.id,
                    projectName: project.name,
                    description: entry.description,
                    duration: entry.duration,
                    hourlyRate: project.hourlyRate,
                    lineTotal: entry.duration * project.hourlyRate,
                }
            })
            .filter((line): line is NonNullable<typeof line> => line !== null)

        const printWindow = window.open('', '_blank', 'popup=yes,width=1080,height=900')

        if (!printWindow) {
            return
        }

        const activePrintWindow: Window = printWindow
        const printDocument = activePrintWindow.document

        printDocument.documentElement.lang = 'fi'
        printDocument.title = `Lasku ${invoice.invoiceNumber}`
        printDocument.head.innerHTML = `<meta charset="utf-8" /><title>Lasku ${invoice.invoiceNumber}</title><style>${printWindowStyles}</style>`
        printDocument.body.innerHTML = `
            <div id="print-toolbar">
                <span>Lasku ${invoice.invoiceNumber}</span>
                <button onclick="window.print()">&#8595; Lataa PDF</button>
            </div>
            <div id="print-content"><div id="invoice-print-root"></div></div>
        `

        const printRootElement = printDocument.getElementById('invoice-print-root')

        if (!printRootElement) {
            activePrintWindow.close()
            return
        }

        const printRoot = createRoot(printRootElement)
        const logoSrc = localStorage.getItem('invoice_logo') ?? new URL('/lasku.png', window.location.origin).toString()

        printRoot.render(
            <InvoicePrintView
                invoice={invoice}
                client={previewClient}
                lines={previewLines}
                logoSrc={logoSrc}
            />,
        )
    }

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

            <div className="mt-8 space-y-8">
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
                                const isExpanded = expandedProjectId === project.id
                                const projectEntries = timeEntries
                                    .filter((e) => e.projectId === project.id && e.isBillable)
                                    .sort((a, b) => a.date.localeCompare(b.date))
                                const billableHours = projectEntries
                                    .reduce((sum, e) => sum + e.duration, 0)

                                return (
                                    <div key={project.id}>
                                        {/* Project row */}
                                        <div
                                            className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_140px_140px_140px_auto] md:items-center cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                                        >
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
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handlePreviewProject(project)
                                                    }}
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border-2 border-slate-400 bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                >
                                                    Lataa
                                                </button>
                                                <span className="text-slate-400 select-none">{isExpanded ? '▲' : '▼'}</span>
                                            </div>
                                        </div>

                                        {/* Expanded time entries */}
                                        {isExpanded && (
                                            <div className="border-t-2 border-slate-200 bg-slate-50 px-5 py-4">
                                                <div className="mb-3 flex flex-wrap gap-4 text-sm">
                                                    <span className="text-slate-600">
                                                        <span className="font-semibold text-slate-950">{totalHours.toFixed(1)} h</span> yhteensä
                                                    </span>
                                                    <span className="text-slate-600">
                                                        <span className="font-semibold text-slate-950">{billableHours.toFixed(1)} h</span> laskutettavaa
                                                    </span>
                                                    <span className="text-slate-600">
                                                        <span className="font-semibold text-slate-950">
                                                            {(billableHours * project.hourlyRate).toFixed(2)} EUR
                                                        </span> laskutettava arvo
                                                    </span>
                                                    <span className="text-slate-600">
                                                        <span className="font-semibold text-slate-950">{project.hourlyRate.toFixed(2)} EUR/h</span> tuntihinta
                                                    </span>
                                                </div>

                                                {projectEntries.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic">Ei tuntikirjauksia.</p>
                                                ) : (
                                                    <div className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white">
                                                        <div className="hidden grid-cols-[110px_minmax(0,1fr)_90px_100px] gap-3 border-b-2 border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600 sm:grid">
                                                            <span>Päivä</span>
                                                            <span>Kuvaus</span>
                                                            <span className="text-right">Tunnit</span>
                                                            <span className="text-right">Laskutettava</span>
                                                        </div>
                                                        <div className="divide-y divide-slate-200">
                                                            {projectEntries.map((entry) => (
                                                                <div
                                                                    key={entry.id}
                                                                    className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[110px_minmax(0,1fr)_90px_100px] sm:items-center"
                                                                >
                                                                    <span className="text-slate-700 whitespace-nowrap">
                                                                        {formatFinnishDate(entry.date)}
                                                                    </span>
                                                                    <span className="text-slate-800">
                                                                        {entry.description || <em className="text-slate-400">Ei kuvausta</em>}
                                                                    </span>
                                                                    <span className="text-right font-medium text-slate-950 whitespace-nowrap">
                                                                        {entry.duration.toFixed(1)} h
                                                                    </span>
                                                                    <span className={`text-right text-xs font-medium ${entry.isBillable ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                                        {entry.isBillable ? 'Laskutettava' : 'Ei laskuteta'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                        <div className="mt-5 overflow-x-auto rounded-2xl border-2 border-slate-400 bg-white">
                            <div className="hidden min-w-[920px] gap-4 border-b-2 border-slate-400 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 lg:grid lg:grid-cols-[140px_minmax(220px,1fr)_120px_150px_110px_auto] lg:items-center">
                                <span className="whitespace-nowrap">Lasku</span>
                                <span className="whitespace-nowrap">Asiakas</span>
                                <span className="whitespace-nowrap">Päiväys</span>
                                <span className="whitespace-nowrap">Yhteensä sis. ALV</span>
                                <span className="whitespace-nowrap">Tila</span>
                                <span></span>
                            </div>

                            <div className="divide-y-2 divide-slate-300 bg-white">
                                {invoiceHistory.map(({ invoice, client, totalWithVat }) => (
                                    <article key={invoice.id} className="px-4 py-4 text-sm text-slate-800">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[920px] lg:grid-cols-[140px_minmax(220px,1fr)_120px_150px_110px_auto] lg:items-center">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">Lasku</p>
                                                <p className="mt-1 font-mono font-semibold text-slate-950 whitespace-nowrap lg:mt-0">{invoice.invoiceNumber}</p>
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">Asiakas</p>
                                                <p className="mt-1 truncate text-slate-800 whitespace-nowrap lg:mt-0" title={client?.name ?? 'Tuntematon asiakas'}>{client?.name ?? 'Tuntematon asiakas'}</p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">Päiväys</p>
                                                <p className="mt-1 whitespace-nowrap lg:mt-0">{formatFinnishDate(invoice.date)}</p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">Yhteensä sis. ALV</p>
                                                <p className="mt-1 font-medium text-slate-950 whitespace-nowrap lg:mt-0">{totalWithVat.toFixed(2)} EUR</p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">Tila</p>
                                                <p className="mt-1 whitespace-nowrap lg:mt-0">{invoiceStatusLabels[invoice.status]}</p>
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1 lg:text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePreviewInvoice(invoice)}
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border-2 border-slate-400 bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                >
                                                    Esikatsele
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}
                </article>
            </div>
        </section>
    )
}