import { useEffect, useRef } from 'react'

import { formatFinnishDate } from '../utils/date'

import type { Client, Project, TimeEntry } from '../types/types'

type ProjectPrintViewProps = {
    project: Project
    client: Client
    timeEntries: TimeEntry[]
    logoSrc: string
    onReady?: () => void
}

const companyInfo = {
    name: 'Iisiduuni Oy',
    businessId: '3135307-9',
    email: 'info@iisiduuni.fi',
    phone: '+358 40 000 0000',
    street: 'Kalliokielontie 18 A 4',
    city: '94400 Keminmaa',
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

const projectStatusLabels: Record<string, string> = {
    planned: 'Suunnitteilla',
    active: 'Aktiivinen',
    'on-hold': 'Tauolla',
    completed: 'Valmistunut',
    archived: 'Arkistoitu',
}

export function ProjectPrintView({ project, client, timeEntries, logoSrc, onReady }: ProjectPrintViewProps) {
    const logoRef = useRef<HTMLImageElement | null>(null)
    const hasNotifiedRef = useRef(false)

    const sorted = [...timeEntries].sort((a, b) => a.date.localeCompare(b.date))
    const totalHours = sorted.reduce((sum, e) => sum + e.duration, 0)
    const billableHours = sorted.filter((e) => e.isBillable).reduce((sum, e) => sum + e.duration, 0)
    const billableValue = billableHours * project.hourlyRate
    const budgetUsedPct = project.budgetHours > 0 ? (totalHours / project.budgetHours) * 100 : 0

    useEffect(() => {
        const readyCallback = onReady ?? null
        if (readyCallback === null) return

        function notifyReady() {
            if (hasNotifiedRef.current || readyCallback === null) return
            hasNotifiedRef.current = true
            readyCallback()
        }

        const timeoutId = setTimeout(notifyReady, 300)
        const logoImage = logoRef.current

        if (!logoImage || logoImage.complete) {
            notifyReady()
            return () => { clearTimeout(timeoutId) }
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
            {/* Header */}
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
                    <img
                        ref={logoRef}
                        src={logoSrc}
                        alt="Iisiduuni"
                        style={{ width: '150px', height: 'auto', objectFit: 'contain' }}
                    />
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
                    <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '0.08em' }}>PROJEKTIYHTEENVETO</div>
                    <div
                        style={{
                            marginTop: '10px',
                            border: '1px solid #000000',
                            padding: '10px 12px',
                            fontSize: '13px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ fontWeight: 700 }}>Projekti</span>
                            <span style={{ textAlign: 'right' }}>{project.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px' }}>
                            <span style={{ fontWeight: 700 }}>Asiakas</span>
                            <span style={{ textAlign: 'right' }}>{client.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px' }}>
                            <span style={{ fontWeight: 700 }}>Tila</span>
                            <span>{projectStatusLabels[project.status] ?? project.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px' }}>
                            <span style={{ fontWeight: 700 }}>Päiväys</span>
                            <span>{formatFinnishDate(new Date().toISOString().slice(0, 10))}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Summary boxes */}
            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    padding: '10mm 0 8mm',
                }}
            >
                {[
                    { label: 'Tunnit yhteensä', value: `${totalHours.toFixed(1)} h` },
                    { label: 'Laskutettavat tunnit', value: `${billableHours.toFixed(1)} h` },
                    { label: 'Budjetti', value: `${project.budgetHours.toFixed(1)} h` },
                    { label: 'Budjetin käyttö', value: `${budgetUsedPct.toFixed(0)} %` },
                ].map(({ label, value }) => (
                    <div key={label} style={{ border: '1px solid #000000', padding: '10px 12px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 700 }}>{label}</div>
                        <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 800 }}>{value}</div>
                    </div>
                ))}
            </section>

            {/* Rate & value */}
            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    paddingBottom: '10mm',
                }}
            >
                <div style={{ border: '1px solid #000000', padding: '10px 12px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 700 }}>Tuntihinta</div>
                    <div style={{ marginTop: '6px' }}>{project.hourlyRate.toFixed(2)} EUR / h</div>
                </div>
                <div style={{ border: '1px solid #000000', padding: '10px 12px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 700 }}>Laskutettava arvo (alv 0 %)</div>
                    <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 800 }}>{billableValue.toFixed(2)} EUR</div>
                </div>
            </section>

            {/* Time entries table */}
            <section>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Tuntikirjaukset
                </div>

                {/* Table header */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '90px 1fr 70px 80px',
                        gap: '8px',
                        borderTop: '2px solid #000000',
                        borderBottom: '1px solid #000000',
                        padding: '6px 0',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                    }}
                >
                    <span>Päivä</span>
                    <span>Kuvaus</span>
                    <span style={{ textAlign: 'right' }}>Tunnit</span>
                    <span style={{ textAlign: 'right' }}>Laskutettava</span>
                </div>

                {/* Rows */}
                {sorted.map((entry, idx) => (
                    <div
                        key={entry.id}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '90px 1fr 70px 80px',
                            gap: '8px',
                            padding: '5px 0',
                            fontSize: '12px',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                        }}
                    >
                        <span>{formatFinnishDate(entry.date)}</span>
                        <span>{entry.description || '—'}</span>
                        <span style={{ textAlign: 'right' }}>{entry.duration.toFixed(1)} h</span>
                        <span style={{ textAlign: 'right' }}>{entry.isBillable ? 'Kyllä' : 'Ei'}</span>
                    </div>
                ))}

                {sorted.length === 0 && (
                    <div style={{ padding: '12px 0', fontSize: '13px', color: '#6b7280' }}>
                        Ei tuntikirjauksia.
                    </div>
                )}

                {/* Totals */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '90px 1fr 70px 80px',
                        gap: '8px',
                        borderTop: '2px solid #000000',
                        padding: '8px 0',
                        fontSize: '13px',
                        fontWeight: 700,
                    }}
                >
                    <span>Yhteensä</span>
                    <span></span>
                    <span style={{ textAlign: 'right' }}>{totalHours.toFixed(1)} h</span>
                    <span style={{ textAlign: 'right' }}></span>
                </div>
            </section>
        </main>
    )
}
