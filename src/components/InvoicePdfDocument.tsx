import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { Client, CompanySettings, Invoice } from '../types/types'

Font.register({
    family: 'Helvetica',
    fonts: [],
})

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        padding: 48,
        backgroundColor: '#ffffff',
        color: '#0f172a',
    },
    header: {
        backgroundColor: '#0f172a',
        borderRadius: 8,
        padding: 24,
        marginBottom: 28,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerCompany: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    headerSub: {
        fontSize: 9,
        color: '#94a3b8',
        marginTop: 4,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    headerRightLabel: {
        fontSize: 8,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    headerRightValue: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#10b981',
        marginTop: 2,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    metaBlock: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 8,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
        fontFamily: 'Helvetica-Bold',
    },
    metaValue: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
    },
    metaValueSub: {
        fontSize: 9,
        color: '#475569',
        marginTop: 2,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 4,
        paddingVertical: 7,
        paddingHorizontal: 8,
        marginBottom: 2,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc',
    },
    colDate: { width: '13%' },
    colProject: { width: '20%' },
    colDesc: { width: '32%' },
    colHours: { width: '12%', textAlign: 'right' },
    colRate: { width: '12%', textAlign: 'right' },
    colTotal: { width: '11%', textAlign: 'right' },
    cellHeader: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    cellBody: {
        fontSize: 9,
        color: '#334155',
    },
    cellBodyBold: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
    },
    totalsSection: {
        marginTop: 8,
        alignItems: 'flex-end',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 4,
        width: 220,
    },
    totalLabel: {
        fontSize: 9,
        color: '#475569',
        flex: 1,
    },
    totalValue: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        textAlign: 'right',
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        backgroundColor: '#0f172a',
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 10,
        width: 220,
        marginTop: 4,
    },
    grandTotalLabel: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        flex: 1,
    },
    grandTotalValue: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#10b981',
        textAlign: 'right',
    },
    bankSection: {
        marginTop: 28,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 16,
        flexDirection: 'row',
        gap: 24,
    },
    bankBlock: {
        flex: 1,
    },
    bankLabel: {
        fontSize: 8,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
    },
    bankValue: {
        fontSize: 9,
        color: '#0f172a',
    },
    footer: {
        marginTop: 28,
        fontSize: 8,
        color: '#94a3b8',
        textAlign: 'center',
    },
})

export type InvoicePdfLine = {
    projectName: string
    description: string
    date: string
    duration: number
    hourlyRate: number
    lineTotal: number
}

type Props = {
    invoice: Invoice
    client: Client
    lines: InvoicePdfLine[]
    companySettings: CompanySettings
}

export function InvoicePdfDocument({ invoice, client, lines, companySettings }: Props) {
    const totalVat = invoice.totalAmount * 1.255
    const vatAmount = invoice.totalAmount * 0.255

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerCompany}>{companySettings.name || 'Iisiduuni'}</Text>
                        <Text style={styles.headerSub}>Lasku {invoice.invoiceNumber}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.headerRightLabel}>Yhteensä sis. ALV</Text>
                        <Text style={styles.headerRightValue}>{totalVat.toFixed(2)} €</Text>
                    </View>
                </View>

                {/* Meta */}
                <View style={styles.metaRow}>
                    <View style={styles.metaBlock}>
                        <Text style={styles.metaLabel}>Asiakas</Text>
                        <Text style={styles.metaValue}>{client.name}</Text>
                        {client.billingAddress ? <Text style={styles.metaValueSub}>{client.billingAddress}</Text> : null}
                        {(client.postalCode || client.city) ? (
                            <Text style={styles.metaValueSub}>{[client.postalCode, client.city].filter(Boolean).join(' ')}</Text>
                        ) : null}
                        {client.businessId ? <Text style={styles.metaValueSub}>Y-tunnus: {client.businessId}</Text> : null}
                    </View>
                    <View style={[styles.metaBlock, { alignItems: 'flex-end' }]}>
                        <Text style={styles.metaLabel}>Päiväys</Text>
                        <Text style={styles.metaValue}>{invoice.date}</Text>
                        {companySettings.paymentTerms ? (
                            <>
                                <Text style={[styles.metaLabel, { marginTop: 10 }]}>Maksuehto</Text>
                                <Text style={styles.metaValue}>{companySettings.paymentTerms}</Text>
                            </>
                        ) : null}
                    </View>
                    <View style={[styles.metaBlock, { alignItems: 'flex-end' }]}>
                        <Text style={styles.metaLabel}>Lähettäjä</Text>
                        <Text style={styles.metaValue}>{companySettings.name || 'Iisiduuni'}</Text>
                        {companySettings.businessId ? <Text style={styles.metaValueSub}>Y-tunnus: {companySettings.businessId}</Text> : null}
                        {companySettings.email ? <Text style={styles.metaValueSub}>{companySettings.email}</Text> : null}
                        {companySettings.phone ? <Text style={styles.metaValueSub}>{companySettings.phone}</Text> : null}
                    </View>
                </View>

                {/* Table */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.cellHeader, styles.colDate]}>Päivä</Text>
                    <Text style={[styles.cellHeader, styles.colProject]}>Projekti</Text>
                    <Text style={[styles.cellHeader, styles.colDesc]}>Kuvaus</Text>
                    <Text style={[styles.cellHeader, styles.colHours]}>Tunnit</Text>
                    <Text style={[styles.cellHeader, styles.colRate]}>Hinta</Text>
                    <Text style={[styles.cellHeader, styles.colTotal]}>Yhteensä</Text>
                </View>

                {lines.map((line, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                        <Text style={[styles.cellBody, styles.colDate]}>{line.date}</Text>
                        <Text style={[styles.cellBody, styles.colProject]}>{line.projectName}</Text>
                        <Text style={[styles.cellBody, styles.colDesc]}>{line.description || ''}</Text>
                        <Text style={[styles.cellBody, styles.colHours]}>{line.duration.toFixed(1)} h</Text>
                        <Text style={[styles.cellBody, styles.colRate]}>{line.hourlyRate} €/h</Text>
                        <Text style={[styles.cellBodyBold, styles.colTotal]}>{line.lineTotal.toFixed(2)} €</Text>
                    </View>
                ))}

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Verollinen hinta</Text>
                        <Text style={styles.totalValue}>{invoice.totalAmount.toFixed(2)} €</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>ALV 25,5 %</Text>
                        <Text style={styles.totalValue}>{vatAmount.toFixed(2)} €</Text>
                    </View>
                    <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalLabel}>Yhteensä sis. ALV</Text>
                        <Text style={styles.grandTotalValue}>{totalVat.toFixed(2)} €</Text>
                    </View>
                </View>

                {/* Bank */}
                {(companySettings.iban || companySettings.bic) ? (
                    <View style={styles.bankSection}>
                        {companySettings.iban ? (
                            <View style={styles.bankBlock}>
                                <Text style={styles.bankLabel}>IBAN</Text>
                                <Text style={styles.bankValue}>{companySettings.iban}</Text>
                            </View>
                        ) : null}
                        {companySettings.bic ? (
                            <View style={styles.bankBlock}>
                                <Text style={styles.bankLabel}>BIC</Text>
                                <Text style={styles.bankValue}>{companySettings.bic}</Text>
                            </View>
                        ) : null}
                        <View style={styles.bankBlock}>
                            <Text style={styles.bankLabel}>Viitenumero</Text>
                            <Text style={[styles.bankValue, { fontFamily: 'Helvetica-Bold', letterSpacing: 2 }]}>{invoice.invoiceNumber}</Text>
                        </View>
                        {companySettings.street || companySettings.city ? (
                            <View style={styles.bankBlock}>
                                <Text style={styles.bankLabel}>Osoite</Text>
                                <Text style={styles.bankValue}>{[companySettings.street, companySettings.city].filter(Boolean).join(', ')}</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                <Text style={styles.footer}>
                    {companySettings.name || 'Iisiduuni'} — Lasku {invoice.invoiceNumber}
                </Text>
            </Page>
        </Document>
    )
}
