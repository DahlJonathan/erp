import { useEffect, useRef } from 'react'

import { addDaysToIsoDate, formatFinnishDate } from '../utils/date'

import type { Client, CompanySettings, Invoice } from '../types/types'

export type InvoicePrintLine = {
    entryId: string
    projectName: string
    description: string
    duration: number
    hourlyRate: number
    lineTotal: number
}

type InvoicePrintViewProps = {
    invoice: Invoice
    client: Client
    lines: InvoicePrintLine[]
    logoSrc: string
    companySettings: CompanySettings
    onReady?: () => void
}

const pageStyle = {
    width: '210mm',
    minHeight: '297mm',
    margin: '0 auto',
    padding: '16mm 14mm',
    boxSizing: 'border-box' as const,
    color: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: '"Segoe UI", Arial, sans-serif',
}

export function InvoicePrintView({ invoice, client, lines, logoSrc, companySettings, onReady }: InvoicePrintViewProps) {
    const companyInfo = companySettings
    const logoRef = useRef<HTMLImageElement | null>(null)
    const hasNotifiedRef = useRef(false)

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
    const taxAmount = subtotal * 0.255
    const grandTotal = subtotal + taxAmount
    const dueDate = addDaysToIsoDate(invoice.date, 14)

    useEffect(() => {
        const readyCallback = onReady ?? null

        if (readyCallback === null) {
            return
        }

        function notifyReady() {
            if (hasNotifiedRef.current || readyCallback === null) {
                return
            }

            hasNotifiedRef.current = true
            readyCallback()
        }

        const timeoutId = setTimeout(notifyReady, 300)
        const logoImage = logoRef.current

        if (!logoImage || logoImage.complete) {
            notifyReady()

            return () => {
                clearTimeout(timeoutId)
            }
        }

        logoImage.addEventListener('load', notifyReady)
        logoImage.addEventListener('error', notifyReady)

        return () => {
            clearTimeout(timeoutId)
            logoImage.removeEventListener('load', notifyReady)
            logoImage.removeEventListener('error', notifyReady)
        }
    }, [onReady])

    return (
        <main style={pageStyle}>
            <header
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                    paddingBottom: '12mm',
                    borderBottom: '1px solid #000000',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {logoSrc ? (
                        <img
                            ref={logoRef}
                            src={logoSrc}
                            alt="Logo"
                            style={{ width: '150px', height: 'auto', objectFit: 'contain' }}
                        />
                    ) : null}
                    <div style={{ fontSize: '13px', lineHeight: 1.55 }}>
                        <div style={{ fontWeight: 700, fontSize: '18px' }}>{companyInfo.name}</div>
                        <div>Y-tunnus: {companyInfo.businessId}</div>
                        <div>{companyInfo.street}</div>
                        <div>{companyInfo.city}</div>
                        <div>{companyInfo.email}</div>
                        <div>{companyInfo.phone}</div>
                    </div>
                </div>

                <div style={{ minWidth: '78mm', textAlign: 'right' }}>
                    <div style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '0.08em' }}>LASKU</div>
                    <div
                        style={{
                            marginTop: '10px',
                            border: '1px solid #000000',
                            padding: '10px 12px',
                            fontSize: '13px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ fontWeight: 700 }}>Laskun numero</span>
                            <span>{invoice.invoiceNumber}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px' }}>
                            <span style={{ fontWeight: 700 }}>Päiväys</span>
                            <span>{formatFinnishDate(invoice.date)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px' }}>
                            <span style={{ fontWeight: 700 }}>Eräpäivä</span>
                            <span>{formatFinnishDate(dueDate)}</span>
                        </div>
                    </div>
                </div>
            </header>

            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12mm',
                    padding: '12mm 0',
                }}
            >
                <div style={{ border: '1px solid #000000', padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>Laskuttaja</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700 }}>{companyInfo.name}</div>
                        <div>{companyInfo.street}</div>
                        <div>{companyInfo.city}</div>
                        <div>{companyInfo.email}</div>
                        <div>Y-tunnus: {companyInfo.businessId}</div>
                    </div>
                </div>

                <div style={{ border: '1px solid #000000', padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>Asiakas</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700 }}>{client.name}</div>
                        <div>Y-tunnus: {client.businessId}</div>
                        <div>{client.contactPerson ?? 'Yhteyshenkilö puuttuu'}</div>
                        <div>{client.billingAddress ?? 'Laskutusosoite puuttuu'}</div>
                        <div>{[client.postalCode, client.city].filter(Boolean).join(' ') || 'Postiosoite puuttuu'}</div>
                        <div>{client.billingEmail ?? client.email}</div>
                    </div>
                </div>
            </section>

            <section style={{ paddingBottom: '10mm' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '8px',
                        marginBottom: '10mm',
                    }}
                >
                    <div style={{ border: '1px solid #000000', padding: '10px 12px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 700 }}>Maksuehto</div>
                        <div style={{ marginTop: '6px' }}>{companyInfo.paymentTerms}</div>
                    </div>
                    <div style={{ border: '1px solid #000000', padding: '10px 12px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 700 }}>Viitenumero</div>
                        <div style={{ marginTop: '6px' }}>{invoice.invoiceNumber}</div>
                    </div>
                    <div style={{ border: '1px solid #000000', padding: '10px 12px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 700 }}>Tilille</div>
                        <div style={{ marginTop: '6px' }}>{companyInfo.iban}</div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'left', fontWeight: 800 }}>Kuvaus</th>
                            <th style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>Tunnit</th>
                            <th style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>Hinta</th>
                            <th style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>ALV 25,5 %</th>
                            <th style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>Yhteensä</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => {
                            const lineVat = line.lineTotal * 0.255
                            const lineGrandTotal = line.lineTotal + lineVat

                            return (
                                <tr key={line.entryId}>
                                    <td style={{ border: '1px solid #000000', padding: '10px 8px', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: 700 }}>{line.projectName}</div>
                                        <div style={{ marginTop: '4px' }}>{line.description}</div>
                                    </td>
                                    <td style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                                        {line.duration.toFixed(1)} h
                                    </td>
                                    <td style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                                        {line.hourlyRate.toFixed(2)} EUR
                                    </td>
                                    <td style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                                        {lineVat.toFixed(2)} EUR
                                    </td>
                                    <td style={{ border: '1px solid #000000', padding: '10px 8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>
                                        {lineGrandTotal.toFixed(2)} EUR
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </section>

            <footer
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 82mm',
                    gap: '12mm',
                    borderTop: '1px solid #000000',
                    paddingTop: '10mm',
                }}
            >
                <div style={{ fontSize: '13px', lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 800, marginBottom: '8px' }}>Maksutiedot</div>
                    <div><span style={{ fontWeight: 700 }}>Tilille:</span> {companyInfo.iban}</div>
                    <div><span style={{ fontWeight: 700 }}>BIC:</span> {companyInfo.bic}</div>
                    <div><span style={{ fontWeight: 700 }}>Maksuehto:</span> {companyInfo.paymentTerms}</div>
                    <div><span style={{ fontWeight: 700 }}>Viitenumero:</span> {invoice.invoiceNumber}</div>
                </div>

                <div style={{ border: '1px solid #000000' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #000000', fontSize: '13px' }}>
                        <span style={{ fontWeight: 700 }}>Veroton summa</span>
                        <span>{subtotal.toFixed(2)} EUR</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #000000', fontSize: '13px' }}>
                        <span style={{ fontWeight: 700 }}>ALV 25,5 %</span>
                        <span>{taxAmount.toFixed(2)} EUR</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', fontSize: '15px', fontWeight: 800 }}>
                        <span>Maksettavaa</span>
                        <span>{grandTotal.toFixed(2)} EUR</span>
                    </div>
                </div>
            </footer>
        </main>
    )
}