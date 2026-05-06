import { useMemo, useState } from 'react'

import { InvoiceTemplate } from './InvoiceTemplate'

import type { Client, Invoice, Project, TimeEntry } from '../types/types'
import { formatFinnishDate } from '../utils/date'

type InvoicePreview = {
    invoice: Invoice
    client: Client
    totalHours: number
    lines: Array<{
        entryId: string
        projectName: string
        description: string
        duration: number
        hourlyRate: number
        lineTotal: number
    }>
}

type InvoicingViewProps = {
    clients: Client[]
    invoices: Invoice[]
    projects: Project[]
    timeEntries: TimeEntry[]
    onGenerateInvoice: (clientId: string, entryIds: string[], totalAmount: number) => Promise<Invoice>
}

export function InvoicingView({
    clients,
    invoices,
    projects,
    timeEntries,
    onGenerateInvoice,
}: InvoicingViewProps) {
    const [invoicePreview, setInvoicePreview] = useState<InvoicePreview | null>(null)
    const [savingClientId, setSavingClientId] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)

    const projectById = useMemo(
        () => new Map(projects.map((project) => [project.id, project])),
        [projects],
    )
    const clientById = useMemo(
        () => new Map(clients.map((client) => [client.id, client])),
        [clients],
    )
    const invoiceById = useMemo(
        () => new Map(invoices.map((invoice) => [invoice.id, invoice])),
        [invoices],
    )

    const groups = useMemo(() => {
        const approvedEntries = timeEntries.filter((entry) => entry.status === 'approved')
        const groupedEntries = new Map<
            string,
            {
                client: Client
                totalHours: number
                totalAmount: number
                entries: Array<{
                    entry: TimeEntry
                    project: Project
                    lineTotal: number
                }>
            }
        >()

        for (const entry of approvedEntries) {
            const project = projectById.get(entry.projectId)
            if (!project) {
                continue
            }

            const client = clientById.get(project.clientId)
            if (!client) {
                continue
            }

            const lineTotal = entry.duration * project.hourlyRate
            const currentGroup = groupedEntries.get(client.id)

            if (currentGroup) {
                currentGroup.entries.push({ entry, project, lineTotal })
                currentGroup.totalHours += entry.duration
                currentGroup.totalAmount += lineTotal
                continue
            }

            groupedEntries.set(client.id, {
                client,
                totalHours: entry.duration,
                totalAmount: lineTotal,
                entries: [{ entry, project, lineTotal }],
            })
        }

        return Array.from(groupedEntries.values())
    }, [clientById, projectById, timeEntries])

    async function handleGenerateInvoice(clientId: string) {
        const group = groups.find((currentGroup) => currentGroup.client.id === clientId)
        if (!group) {
            return
        }

        setSavingClientId(clientId)
        setSaveError(null)

        try {
            const invoice = await onGenerateInvoice(
                clientId,
                group.entries.map(({ entry }) => entry.id),
                group.totalAmount,
            )

            setInvoicePreview({
                invoice,
                client: group.client,
                totalHours: group.totalHours,
                lines: group.entries.map(({ entry, project, lineTotal }) => ({
                    entryId: entry.id,
                    projectName: project.name,
                    description: entry.description,
                    duration: entry.duration,
                    hourlyRate: project.hourlyRate,
                    lineTotal,
                })),
            })
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Laskun luonti epäonnistui.')
        } finally {
            setSavingClientId(null)
        }
    }

    function handlePrintInvoice() {
        window.print()
    }

    const persistedPreview = useMemo(() => {
        if (!invoicePreview) {
            return null
        }

        const persistedInvoice = invoiceById.get(invoicePreview.invoice.id) ?? invoicePreview.invoice
        const persistedLines = timeEntries
            .filter((entry) => entry.invoiceId === persistedInvoice.id)
            .map((entry) => {
                const project = projectById.get(entry.projectId)

                return project
                    ? {
                        entryId: entry.id,
                        description: entry.description,
                        duration: entry.duration,
                        hourlyRate: project.hourlyRate,
                        lineTotal: entry.duration * project.hourlyRate,
                    }
                    : null
            })
            .filter((line): line is NonNullable<typeof line> => line !== null)

        return {
            invoice: persistedInvoice,
            client: invoicePreview.client,
            lines: persistedLines.length > 0 ? persistedLines : invoicePreview.lines,
        }
    }, [invoiceById, invoicePreview, projectById, timeEntries])

    return (
        <section className="rounded-3xl border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                <div className="screen-only">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                        Laskutus
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                        Hyväksytyt mutta laskuttamattomat tunnit
                    </h2>

                    {saveError ? (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {saveError}
                        </div>
                    ) : null}

                    <div className="mt-6 space-y-4">
                        {groups.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-slate-500 bg-slate-50 p-5 text-sm text-slate-700">
                                Ei laskutettavia tunteja juuri nyt.
                            </div>
                        ) : (
                            groups.map((group) => (
                                <article
                                    key={group.client.id}
                                    className="rounded-2xl border-2 border-slate-400 bg-slate-50 p-5"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <p className="text-lg font-semibold text-slate-900">
                                                {group.client.name}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">
                                                {group.entries.length} kirjausta • {group.totalHours.toFixed(1)} h
                                            </p>
                                        </div>

                                        <div className="text-left md:text-right">
                                            <p className="text-sm text-slate-500">Laskutettava summa</p>
                                            <p className="mt-1 text-2xl font-semibold text-slate-900">
                                                {(group.totalAmount * 1.255).toFixed(2)} EUR
                                            </p>
                                            <p className="mt-1 text-xs text-slate-600">Sisältää ALV 25,5 %</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3 border-t-2 border-slate-300 pt-4">
                                        {group.entries.map(({ entry, project, lineTotal }) => (
                                            <div
                                                key={entry.id}
                                                className="flex flex-col gap-2 rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900">{project.name}</p>
                                                    <p className="text-slate-700">{entry.description}</p>
                                                    <p className="text-xs text-slate-600">{formatFinnishDate(entry.date)}</p>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p>{entry.duration.toFixed(1)} h x {project.hourlyRate} EUR</p>
                                                    <p className="font-medium text-slate-900">
                                                        {lineTotal.toFixed(2)} EUR
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={savingClientId === group.client.id}
                                        onClick={() => void handleGenerateInvoice(group.client.id)}
                                        className="mt-5 inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
                                    >
                                        {savingClientId === group.client.id ? 'Tallennetaan...' : 'Luo lasku'}
                                    </button>
                                </article>
                            ))
                        )}
                    </div>
                </div>

                <aside className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5 shadow-sm shadow-slate-300/60">
                    <div className="screen-only flex items-center justify-between gap-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Laskun esikatselu
                        </p>
                        {persistedPreview ? (
                            <button
                                type="button"
                                onClick={handlePrintInvoice}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Lataa PDF / Tulosta
                            </button>
                        ) : null}
                    </div>

                    {persistedPreview ? (
                        <div className="mt-5">
                            <InvoiceTemplate
                                invoice={persistedPreview.invoice}
                                client={persistedPreview.client}
                                lines={persistedPreview.lines}
                            />
                        </div>
                    ) : (
                        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-500 bg-white p-5 text-sm text-slate-700">
                            Luo lasku asiakkaalle, niin esikatselu näytetään tässä.
                        </div>
                    )}
                </aside>
            </div>
        </section>
    )
}