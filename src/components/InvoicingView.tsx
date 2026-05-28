import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { pdf } from '@react-pdf/renderer'

import { InvoicePrintView } from './InvoicePrintView'
import { InvoicePdfDocument } from './InvoicePdfDocument'

import type { Client, CompanySettings, Invoice, InvoiceStatus, Project, TimeEntry } from '../types/types'
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
    logoSrc: string
    companySettings: CompanySettings
    onGenerateInvoice: (clientId: string, entryIds: string[], totalAmount: number) => Promise<Invoice>
    onUpdateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>
}

export function InvoicingView({
    clients,
    invoices,
    projects,
    timeEntries,
    logoSrc,
    companySettings,
    onGenerateInvoice,
    onUpdateInvoiceStatus,
}: InvoicingViewProps) {
    const [invoicePreview, setInvoicePreview] = useState<InvoicePreview | null>(null)
    const [savingClientId, setSavingClientId] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
    const [emailResult, setEmailResult] = useState<{ invoiceId: string; ok: boolean; msg: string } | null>(null)

    const OVERDUE_DAYS = 14
    const autoOverdueRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        const now = Date.now()
        for (const invoice of invoices) {
            if (invoice.status !== 'sent') continue
            if (autoOverdueRef.current.has(invoice.id)) continue
            const invoiceDate = new Date(invoice.date).getTime()
            if (now - invoiceDate > OVERDUE_DAYS * 24 * 60 * 60 * 1000) {
                autoOverdueRef.current.add(invoice.id)
                void onUpdateInvoiceStatus(invoice.id, 'overdue')
            }
        }
    }, [invoices, onUpdateInvoiceStatus])

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

    const managedInvoices = useMemo(
        () => invoices
            .filter((inv) => inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue')
            .sort((a, b) => b.date.localeCompare(a.date)),
        [invoices],
    )

    async function handleSendInvoiceEmail(invoice: Invoice) {
        const client = clientById.get(invoice.clientId)
        const recipientEmail = client?.billingEmail ?? client?.email
        if (!client || !recipientEmail) {
            setEmailResult({ invoiceId: invoice.id, ok: false, msg: 'Asiakkaalla ei ole sähköpostiosoitetta.' })
            return
        }

        const apiKey = import.meta.env.VITE_BREVO_API_KEY as string | undefined
        if (!apiKey) {
            setEmailResult({ invoiceId: invoice.id, ok: false, msg: 'Brevo API-avain puuttuu.' })
            return
        }

        const senderEmail = (import.meta.env.VITE_BREVO_SENDER_EMAIL as string | undefined) ?? 'info@iisiduuni.fi'
        const senderName = (import.meta.env.VITE_BREVO_SENDER_NAME as string | undefined) ?? 'Iisiduuni'

        const lines = timeEntries
            .filter((e) => e.invoiceId === invoice.id)
            .map((e) => {
                const project = projectById.get(e.projectId)
                if (!project) return null
                return {
                    projectName: project.name,
                    description: e.description,
                    date: e.date,
                    duration: e.duration,
                    hourlyRate: project.hourlyRate,
                    lineTotal: e.duration * project.hourlyRate,
                }
            })
            .filter((l): l is NonNullable<typeof l> => l !== null)

        const totalVat = invoice.totalAmount * 1.255

        setSendingEmailId(invoice.id)
        setEmailResult(null)
        try {
            // Generate PDF
            const pdfBlob = await pdf(
                <InvoicePdfDocument
                    invoice={invoice}
                    client={client}
                    lines={lines}
                    companySettings={companySettings}
                />
            ).toBlob()

            const arrayBuffer = await pdfBlob.arrayBuffer()
            const base64Pdf = btoa(
                Array.from(new Uint8Array(arrayBuffer))
                    .map((b) => String.fromCharCode(b))
                    .join('')
            )

            const htmlBody = `<!DOCTYPE html>
<html lang="fi">
<head><meta charset="utf-8"><title>Lasku ${invoice.invoiceNumber}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0f172a;padding:32px 40px">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">${senderName}</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">Lasku ${invoice.invoiceNumber}</p>
    </div>
    <div style="padding:32px 40px">
      <p style="margin:0;font-size:15px;color:#334155">Hei ${client.name},</p>
      <p style="margin:16px 0 0;font-size:14px;color:#475569">Liitteenä lasku <strong>${invoice.invoiceNumber}</strong> yhteissummaltaan <strong>${totalVat.toFixed(2)} €</strong> (sis. ALV 25,5&nbsp;%).</p>
      <p style="margin:12px 0 0;font-size:14px;color:#475569">Lasku on liitetty tähän viestiin PDF-muodossa.</p>
      <table style="width:100%;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:20px;border-collapse:collapse">
        <tr style="vertical-align:top">
          <td style="padding:4px 16px 4px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;white-space:nowrap">Viitenumero</td>
          <td style="padding:4px 0;font-size:14px;font-weight:700;color:#0f172a;letter-spacing:.12em">${invoice.invoiceNumber}</td>
        </tr>
        ${companySettings.iban ? `<tr style="vertical-align:top">
          <td style="padding:4px 16px 4px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;white-space:nowrap">IBAN</td>
          <td style="padding:4px 0;font-size:14px;color:#0f172a">${companySettings.iban}</td>
        </tr>` : ''}
        ${companySettings.bic ? `<tr style="vertical-align:top">
          <td style="padding:4px 16px 4px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;white-space:nowrap">BIC</td>
          <td style="padding:4px 0;font-size:14px;color:#0f172a">${companySettings.bic}</td>
        </tr>` : ''}
        ${companySettings.paymentTerms ? `<tr style="vertical-align:top">
          <td style="padding:4px 16px 4px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;white-space:nowrap">Maksuehto</td>
          <td style="padding:4px 0;font-size:14px;color:#0f172a">${companySettings.paymentTerms}</td>
        </tr>` : ''}
      </table>
      <p style="margin:32px 0 0;font-size:13px;color:#64748b">Ystävällisin terveisin,<br><strong style="color:#0f172a">${senderName}</strong></p>
    </div>
  </div>
</body>
</html>`

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey,
                },
                body: JSON.stringify({
                    sender: { name: senderName, email: senderEmail },
                    to: [{ email: recipientEmail, name: client.name }],
                    subject: `Lasku ${invoice.invoiceNumber} – ${senderName}`,
                    htmlContent: htmlBody,
                    attachment: [{
                        name: `lasku-${invoice.invoiceNumber}.pdf`,
                        content: base64Pdf,
                    }],
                }),
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error((err as { message?: string }).message ?? `HTTP ${response.status}`)
            }

            if (invoice.status === 'draft') {
                await onUpdateInvoiceStatus(invoice.id, 'sent')
            }
            setEmailResult({ invoiceId: invoice.id, ok: true, msg: `Lasku lähetetty PDF-liitteenä osoitteeseen ${recipientEmail}` })
        } catch (err) {
            setEmailResult({ invoiceId: invoice.id, ok: false, msg: err instanceof Error ? err.message : 'Lähetys epäonnistui.' })
        } finally {
            setSendingEmailId(null)
        }
    }

    async function handleStatusChange(invoiceId: string, status: InvoiceStatus) {
        setUpdatingStatusId(invoiceId)
        try {
            await onUpdateInvoiceStatus(invoiceId, status)
        } finally {
            setUpdatingStatusId(null)
        }
    }

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
        if (!persistedPreview) {
            return
        }

        const printWindow = window.open('', '_blank', 'popup=yes,width=1080,height=900')

        if (!printWindow) {
            setSaveError('Tulostusikkunan avaaminen estettiin selaimessa.')
            return
        }

        const activePrintWindow: Window = printWindow

        const printDocument = activePrintWindow.document
        printDocument.documentElement.lang = 'fi'
        printDocument.title = `Lasku ${persistedPreview.invoice.invoiceNumber}`
        printDocument.head.innerHTML = `<meta charset="utf-8" /><title>Lasku ${persistedPreview.invoice.invoiceNumber}</title><style>${printWindowStyles}</style>`
        printDocument.body.innerHTML = `
            <div id="print-toolbar">
                <span>Lasku ${persistedPreview.invoice.invoiceNumber}</span>
                <button onclick="window.print()">&#8595; Lataa PDF</button>
            </div>
            <div id="print-content"><div id="invoice-print-root"></div></div>
        `

        const printRootElement = printDocument.getElementById('invoice-print-root')

        if (!printRootElement) {
            setSaveError('Tulostusnäkymän luonti epäonnistui.')
            activePrintWindow.close()
            return
        }

        const printRoot = createRoot(printRootElement)

        printRoot.render(
            <InvoicePrintView
                invoice={persistedPreview.invoice}
                client={persistedPreview.client}
                lines={persistedPreview.lines}
                logoSrc={logoSrc}
                companySettings={companySettings}
            />,
        )
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
                        projectName: project.name,
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
            totalHours: invoicePreview.totalHours,
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
                            Laskun vienti
                        </p>
                        {persistedPreview ? (
                            <button
                                type="button"
                                onClick={handlePrintInvoice}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Lataa PDF
                            </button>
                        ) : null}
                    </div>

                    {persistedPreview ? (
                        <div className="mt-5 space-y-4 rounded-2xl border-2 border-slate-400 bg-white p-5 text-sm text-slate-700">
                            <div>
                                <p className="text-lg font-semibold text-slate-950">Lasku on valmis vietäväksi</p>
                                <p className="mt-1 text-slate-600">
                                    Lasku avataan uuteen ikkunaan A4-muodossa ja tulostus käynnistyy automaattisesti.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Laskun numero</p>
                                    <p className="mt-2 font-semibold text-slate-950">{persistedPreview.invoice.invoiceNumber}</p>
                                </div>
                                <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Päiväys</p>
                                    <p className="mt-2 font-semibold text-slate-950">{formatFinnishDate(persistedPreview.invoice.date)}</p>
                                </div>
                                <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Asiakas</p>
                                    <p className="mt-2 font-semibold text-slate-950">{persistedPreview.client.name}</p>
                                </div>
                                <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Laskutettava yhteensä</p>
                                    <p className="mt-2 font-semibold text-slate-950">{(persistedPreview.invoice.totalAmount * 1.255).toFixed(2)} EUR</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border-2 border-dashed border-slate-400 bg-slate-50 px-4 py-3 text-slate-700">
                                Dokumenttiin ei lisätä ERP-näkymän otsikoita, painikkeita tai muuta käyttöliittymää.
                            </div>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-500 bg-white p-5 text-sm text-slate-700">
                            Luo lasku asiakkaalle, niin PDF-vienti voidaan avata uuteen ikkunaan.
                        </div>
                    )}

                    <div className="mt-5 border-t-2 border-slate-300 pt-5">
                        <p className="text-sm text-slate-500">
                            Logo ja yritystiedot hallitaan{' '}
                            <span className="font-medium text-slate-700">Asetukset</span>-välilehdellä.
                        </p>
                    </div>
                </aside>
            </div>

            {/* Invoice management */}
            {managedInvoices.length > 0 && (
                <div className="mt-8 border-t-2 border-slate-300 pt-8">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Laskujen hallinta</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">Avoimet laskut</h3>
                    <p className="mt-1 text-sm text-slate-600">Merkitse lasku maksetuksi, jotta se siirtyy historiaan.</p>

                    <div className="mt-5 space-y-3">
                        {managedInvoices.map((invoice) => {
                            const client = clientById.get(invoice.clientId)
                            const isBusy = updatingStatusId === invoice.id
                            const isOverdue = invoice.status === 'overdue'
                            const isSent = invoice.status === 'sent'
                            const isDraft = invoice.status === 'draft'
                            return (
                                <div
                                    key={invoice.id}
                                    className={`flex flex-col gap-4 rounded-2xl border-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
                                        isOverdue
                                            ? 'border-rose-300 bg-rose-50'
                                            : 'border-slate-300 bg-slate-50'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                                            {isOverdue && (
                                                <span className="rounded-full border border-rose-400 bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                                    Myöhässä
                                                </span>
                                            )}
                                            {isSent && (
                                                <span className="rounded-full border border-sky-400 bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                                    Lähetetty
                                                </span>
                                            )}
                                            {isDraft && (
                                                <span className="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                                    Luonnos
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600">{client?.name ?? 'Tuntematon asiakas'} • {formatFinnishDate(invoice.date)}</p>
                                        <p className={`text-sm font-medium ${
                                            isOverdue ? 'text-rose-700' : 'text-slate-800'
                                        }`}>{(invoice.totalAmount * 1.255).toFixed(2)} EUR sis. ALV</p>
                                        {isOverdue && (
                                            <p className="mt-1 text-xs font-semibold text-rose-600">
                                                Maksuaika ylitetty — ota yhteytä asiakkaaseen
                                            </p>
                                        )}
                                        {emailResult?.invoiceId === invoice.id && (
                                            <p className={`mt-2 text-xs font-semibold ${emailResult.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                {emailResult.ok ? '✓ ' : '✗ '}{emailResult.msg}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={isBusy || sendingEmailId === invoice.id}
                                            onClick={() => void handleSendInvoiceEmail(invoice)}
                                            className="rounded-xl border-2 border-violet-400 bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-200 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {sendingEmailId === invoice.id ? 'Lähetetään...' : 'Lähetä sähköpostilla'}
                                        </button>
                                        {isDraft && (
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => void handleStatusChange(invoice.id, 'sent')}
                                                className="rounded-xl border-2 border-sky-400 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-200 disabled:cursor-wait disabled:opacity-60"
                                            >
                                                {isBusy ? 'Tallennetaan...' : 'Merkitse lähetetyksi'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => void handleStatusChange(invoice.id, 'paid')}
                                            className="rounded-xl border-2 border-emerald-400 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {isBusy ? 'Tallennetaan...' : 'Merkitse maksetuksi'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </section>
    )
}