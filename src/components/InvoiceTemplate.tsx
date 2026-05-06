import { addDaysToIsoDate, formatFinnishDate } from '../utils/date'

import type { Client, Invoice } from '../types/types'

type InvoiceTemplateLine = {
    entryId: string
    description: string
    duration: number
    hourlyRate: number
    lineTotal: number
}

type InvoiceTemplateProps = {
    invoice: Invoice
    client: Client
    lines: InvoiceTemplateLine[]
}

const companyInfo = {
    name: 'Iisiduuni Oy',
    businessId: '3135307-9',
    email: 'info@iisiduuni.fi',
    street: 'Kalliokielontie 18 A 4',
    city: '94400 Keminmaa',
    iban: '[Lisää IBAN]',
    bic: '[Lisää BIC]',
}

export function InvoiceTemplate({ invoice, client, lines }: InvoiceTemplateProps) {
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
    const taxAmount = subtotal * 0.255
    const grandTotal = subtotal + taxAmount
    const dueDate = addDaysToIsoDate(invoice.date, 14)

    return (
        <article className="print-invoice-root rounded-[2rem] border-2 border-slate-400 bg-white p-8 text-slate-950 shadow-sm shadow-slate-300/60 print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <header className="flex flex-col gap-8 border-b-2 border-slate-400 pb-8 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2 text-sm leading-6">
                    <p className="text-2xl font-semibold text-slate-950">{companyInfo.name}</p>
                    <p>Y-tunnus {companyInfo.businessId}</p>
                    <p>{companyInfo.email}</p>
                    <p>{companyInfo.street}</p>
                    <p>{companyInfo.city}</p>
                </div>

                <div className="text-left md:text-right">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                        LASKU
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                        {invoice.invoiceNumber}
                    </p>
                </div>
            </header>

            <section className="grid gap-8 border-b-2 border-slate-400 py-8 md:grid-cols-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Laskutetaan
                    </p>
                    <div className="mt-3 space-y-1 text-sm leading-6 text-slate-700">
                        <p className="text-lg font-semibold text-slate-950">{client.name}</p>
                        <p>Y-tunnus {client.businessId}</p>
                        <p>{client.contactPerson ?? 'Yhteyshenkilö puuttuu'}</p>
                        <p>{client.billingEmail ?? client.email}</p>
                        <p>{client.billingAddress ?? 'Laskutusosoite puuttuu'}</p>
                        <p>
                            {client.postalCode ?? ''} {client.city ?? ''}
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border-2 border-slate-400 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Laskun numero</p>
                        <p className="mt-2 font-medium text-slate-950">{invoice.invoiceNumber}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-400 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Päiväys</p>
                        <p className="mt-2 font-medium text-slate-950">{formatFinnishDate(invoice.date)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-400 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Eräpäivä</p>
                        <p className="mt-2 font-medium text-slate-950">{formatFinnishDate(dueDate)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-400 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Viitenumero</p>
                        <p className="mt-2 font-medium text-slate-950">{invoice.invoiceNumber}</p>
                    </div>
                </div>
            </section>

            <section className="py-8">
                <div className="overflow-hidden rounded-3xl border-2 border-slate-400">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="border-b-2 border-slate-400 bg-slate-100 text-slate-700">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Kuvaus</th>
                                <th className="px-4 py-3 font-semibold">Tunnit</th>
                                <th className="px-4 py-3 font-semibold">Hinta (alv 0%)</th>
                                <th className="px-4 py-3 text-right font-semibold">Yhteensä</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-300 bg-white text-slate-700">
                            {lines.map((line) => (
                                <tr key={line.entryId}>
                                    <td className="px-4 py-4 align-top">
                                        <p className="font-medium text-slate-950">{line.description}</p>
                                    </td>
                                    <td className="px-4 py-4 align-top">{line.duration.toFixed(1)} h</td>
                                    <td className="px-4 py-4 align-top">{line.hourlyRate.toFixed(2)} EUR</td>
                                    <td className="px-4 py-4 text-right align-top font-medium text-slate-950">
                                        {line.lineTotal.toFixed(2)} EUR
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <footer className="grid gap-8 border-t-2 border-slate-400 pt-8 md:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4 text-sm leading-6 text-slate-700">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Maksutiedot</p>
                        <p className="mt-2">Tilinumero: {companyInfo.iban}</p>
                        <p>BIC: {companyInfo.bic}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Maksuehdot</p>
                        <p className="mt-2">Maksuehdot: 14 pv netto</p>
                    </div>
                </div>

                <div className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5">
                    <div className="flex items-center justify-between py-2 text-sm text-slate-700">
                        <span>Välisummaa</span>
                        <span>{subtotal.toFixed(2)} EUR</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-sm text-slate-700">
                        <span>ALV 25,5 %</span>
                        <span>{taxAmount.toFixed(2)} EUR</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t-2 border-slate-400 pt-4 text-base font-semibold text-slate-950">
                        <span>Maksettavaa</span>
                        <span>{grandTotal.toFixed(2)} EUR</span>
                    </div>
                </div>
            </footer>
        </article>
    )
}