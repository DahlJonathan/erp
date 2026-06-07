import { useMemo, useState } from 'react'
import { Check, FileText, PackageCheck, Paperclip, Plus, Send, Trash2, X } from 'lucide-react'

import type { NewPurchase, Purchase, PurchaseStatus } from '../types/types'
import { formatFinnishDate, getTodayIsoDate } from '../utils/date'

type PurchasesViewProps = {
    purchases: Purchase[]
    currentUserName: string
    onCreatePurchase: (purchase: NewPurchase) => Promise<Purchase>
    onUpdatePurchase: (purchaseId: string, data: Partial<NewPurchase>) => Promise<void>
    onDeletePurchase: (purchaseId: string) => Promise<void>
}

type PurchaseFormState = {
    supplierName: string
    title: string
    description: string
    requestedBy: string
    orderNumber: string
    amount: string
    expectedDate: string
}

const emptyForm: PurchaseFormState = {
    supplierName: '',
    title: '',
    description: '',
    requestedBy: '',
    orderNumber: '',
    amount: '',
    expectedDate: '',
}

const statusSteps: Array<{
    status: PurchaseStatus
    label: string
    hint: string
    icon: typeof FileText
}> = [
    {
        status: 'draft',
        label: 'Luonnos / Ehdotus',
        hint: 'Ostopyyntö on luotu ja odottaa vahvistusta.',
        icon: FileText,
    },
    {
        status: 'ordered',
        label: 'Tilattu',
        hint: 'PO on lähetetty toimittajalle.',
        icon: Send,
    },
    {
        status: 'received',
        label: 'Vastaanotettu / Toimitettu',
        hint: 'Tavara, palvelu tai lisenssi on otettu käyttöön.',
        icon: PackageCheck,
    },
    {
        status: 'paid',
        label: 'Maksettu',
        hint: 'Ostolasku on linkitetty ja maksu kuitattu.',
        icon: Check,
    },
]

const statusLabels: Record<PurchaseStatus, string> = Object.fromEntries(
    statusSteps.map((step) => [step.status, step.label]),
) as Record<PurchaseStatus, string>

function getStatusIndex(status: PurchaseStatus) {
    return statusSteps.findIndex((step) => step.status === status)
}

function getNextStatus(status: PurchaseStatus): PurchaseStatus | null {
    const nextStep = statusSteps[getStatusIndex(status) + 1]
    return nextStep?.status ?? null
}

export function PurchasesView({
    purchases,
    currentUserName,
    onCreatePurchase,
    onUpdatePurchase,
    onDeletePurchase,
}: PurchasesViewProps) {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [form, setForm] = useState<PurchaseFormState>({ ...emptyForm, requestedBy: currentUserName })
    const [formError, setFormError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [busyPurchaseId, setBusyPurchaseId] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [invoiceModalPurchase, setInvoiceModalPurchase] = useState<Purchase | null>(null)
    const [invoiceModalMarksPaid, setInvoiceModalMarksPaid] = useState(false)
    const [invoiceReferenceInput, setInvoiceReferenceInput] = useState('')
    const [invoiceAttachmentName, setInvoiceAttachmentName] = useState('')
    const [invoiceAttachmentDataUrl, setInvoiceAttachmentDataUrl] = useState<string | null>(null)

    const orderedPurchases = useMemo(
        () => [...purchases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        [purchases],
    )

    const totalsByStatus = useMemo(() => {
        return statusSteps.reduce((totals, step) => {
            totals[step.status] = purchases.filter((purchase) => purchase.status === step.status).length
            return totals
        }, {} as Record<PurchaseStatus, number>)
    }, [purchases])

    const openAmount = purchases
        .filter((purchase) => purchase.status !== 'paid')
        .reduce((sum, purchase) => sum + purchase.amount, 0)

    function updateFormField(field: keyof PurchaseFormState, value: string) {
        setForm((current) => ({ ...current, [field]: value }))
    }

    async function handleCreatePurchase(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!form.supplierName.trim() || !form.title.trim()) {
            setFormError('Toimittaja ja ostopyynnön otsikko ovat pakollisia.')
            return
        }

        const amount = Number(form.amount.replace(',', '.')) || 0

        setIsSaving(true)
        setFormError(null)

        try {
            await onCreatePurchase({
                supplierName: form.supplierName.trim(),
                title: form.title.trim(),
                description: form.description.trim(),
                requestedBy: form.requestedBy.trim() || currentUserName,
                orderNumber: form.orderNumber.trim() || null,
                amount,
                status: 'draft',
                expectedDate: form.expectedDate || null,
                receivedDate: null,
                invoiceReference: null,
                invoiceAttachmentName: null,
                invoiceAttachmentDataUrl: null,
            })
            setForm({ ...emptyForm, requestedBy: currentUserName })
            setIsFormOpen(false)
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Ostopyynnön tallennus epäonnistui.')
        } finally {
            setIsSaving(false)
        }
    }

    async function advancePurchase(purchase: Purchase) {
        const nextStatus = getNextStatus(purchase.status)
        if (!nextStatus) return

        if (nextStatus === 'paid') {
            openInvoiceModal(purchase, true)
            return
        }

        setBusyPurchaseId(purchase.id)
        setActionError(null)
        try {
            await onUpdatePurchase(purchase.id, {
                status: nextStatus,
                receivedDate: nextStatus === 'received' ? getTodayIsoDate() : purchase.receivedDate,
                invoiceReference: purchase.invoiceReference,
                invoiceAttachmentName: purchase.invoiceAttachmentName,
                invoiceAttachmentDataUrl: purchase.invoiceAttachmentDataUrl,
            })
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Oston tilan päivitys epäonnistui.')
        } finally {
            setBusyPurchaseId(null)
        }
    }

    function openInvoiceModal(purchase: Purchase, marksPaid: boolean) {
        setInvoiceModalPurchase(purchase)
        setInvoiceModalMarksPaid(marksPaid)
        setInvoiceReferenceInput(purchase.invoiceReference ?? '')
        setInvoiceAttachmentName(purchase.invoiceAttachmentName ?? '')
        setInvoiceAttachmentDataUrl(purchase.invoiceAttachmentDataUrl ?? null)
        setActionError(null)
    }

    function closeInvoiceModal() {
        setInvoiceModalPurchase(null)
        setInvoiceModalMarksPaid(false)
        setInvoiceReferenceInput('')
        setInvoiceAttachmentName('')
        setInvoiceAttachmentDataUrl(null)
        setActionError(null)
    }

    async function confirmInvoiceReference(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!invoiceModalPurchase) return

        const trimmedInvoiceReference = invoiceReferenceInput.trim()

        if (invoiceModalMarksPaid && !trimmedInvoiceReference) {
            setActionError('Lisää laskuviite ennen kuin merkitset ostoksen maksetuksi.')
            return
        }

        setBusyPurchaseId(invoiceModalPurchase.id)
        setActionError(null)
        try {
            await onUpdatePurchase(invoiceModalPurchase.id, {
                status: invoiceModalMarksPaid ? 'paid' : invoiceModalPurchase.status,
                invoiceReference: trimmedInvoiceReference || null,
                invoiceAttachmentName: invoiceAttachmentName || null,
                invoiceAttachmentDataUrl: invoiceAttachmentDataUrl,
            })
            closeInvoiceModal()
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Oston tilan päivitys epäonnistui.')
        } finally {
            setBusyPurchaseId(null)
        }
    }

    function handleInvoiceAttachmentChange(file: File | null) {
        if (!file) return

        if (file.size > 3 * 1024 * 1024) {
            setActionError('Liite voi olla enintään 3 Mt.')
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                setActionError('Liitteen lukeminen epäonnistui.')
                return
            }

            setInvoiceAttachmentName(file.name)
            setInvoiceAttachmentDataUrl(reader.result)
            setActionError(null)
        }
        reader.onerror = () => setActionError('Liitteen lukeminen epäonnistui.')
        reader.readAsDataURL(file)
    }

    function clearInvoiceAttachment() {
        setInvoiceAttachmentName('')
        setInvoiceAttachmentDataUrl(null)
    }

    async function deletePurchase(purchaseId: string) {
        setBusyPurchaseId(purchaseId)
        setActionError(null)
        try {
            await onDeletePurchase(purchaseId)
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Oston poisto epäonnistui.')
        } finally {
            setBusyPurchaseId(null)
        }
    }

    return (
        <section className="rounded-3xl border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <div className="flex flex-col gap-6 border-b-2 border-slate-400 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Ostohallinta</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        Hankinnat ja tilausseuranta
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Seuraa hankinnan etenemistä pyynnöstä PO-tilaukseen, vastaanottoon ja maksettuun ostolaskuun.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="rounded-2xl border-2 border-slate-400 bg-slate-50 px-5 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Avoin ostosumma</p>
                        <p className="mt-1 text-xl font-semibold text-slate-950">{openAmount.toFixed(2)} EUR</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsFormOpen((open) => !open)
                            setFormError(null)
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        <Plus size={17} />
                        {isFormOpen ? 'Sulje' : 'Uusi hankinta'}
                    </button>
                </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
                {statusSteps.map((step) => {
                    const Icon = step.icon
                    return (
                        <div key={step.status} className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <Icon size={18} className="text-slate-600" />
                                <span className="text-2xl font-semibold text-slate-950">{totalsByStatus[step.status]}</span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-slate-950">{step.label}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{step.hint}</p>
                        </div>
                    )
                })}
            </div>

            {isFormOpen ? (
                <form onSubmit={handleCreatePurchase} className="mt-6 rounded-2xl border-2 border-slate-400 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-950">Uusi hankinta</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <FormInput label="Toimittaja *" value={form.supplierName} onChange={(value) => updateFormField('supplierName', value)} disabled={isSaving} />
                        <FormInput label="Hankinta *" value={form.title} onChange={(value) => updateFormField('title', value)} disabled={isSaving} />
                        <FormInput label="Pyytäjä" value={form.requestedBy} onChange={(value) => updateFormField('requestedBy', value)} disabled={isSaving} />
                        <FormInput label="PO-numero" value={form.orderNumber} onChange={(value) => updateFormField('orderNumber', value)} disabled={isSaving} />
                        <FormInput label="Arvioitu summa" value={form.amount} onChange={(value) => updateFormField('amount', value)} disabled={isSaving} inputMode="decimal" />
                        <FormInput label="Odotettu toimitus" value={form.expectedDate} onChange={(value) => updateFormField('expectedDate', value)} disabled={isSaving} type="date" />
                        <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-slate-700">Kuvaus</span>
                            <textarea
                                value={form.description}
                                onChange={(event) => updateFormField('description', event.target.value)}
                                disabled={isSaving}
                                rows={3}
                                className="w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </label>
                    </div>
                    {formError ? (
                        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{formError}</p>
                    ) : null}
                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Check size={16} />
                            {isSaving ? 'Tallennetaan...' : 'Tallenna hankinta'}
                        </button>
                    </div>
                </form>
            ) : null}

            {actionError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>
            ) : null}

            <div className="mt-6 space-y-4">
                {orderedPurchases.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-400 bg-slate-50 p-6 text-center text-sm text-slate-600">
                        Ei hankintoja vielä. Luo ensimmäinen hankinta ylhäältä.
                    </div>
                ) : (
                    orderedPurchases.map((purchase) => {
                        const nextStatus = getNextStatus(purchase.status)
                        const isBusy = busyPurchaseId === purchase.id
                        const activeIndex = getStatusIndex(purchase.status)

                        return (
                            <article key={purchase.id} className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-lg font-semibold text-slate-950">{purchase.title}</p>
                                            <span className="rounded-full border border-slate-400 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                                {statusLabels[purchase.status]}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {purchase.supplierName} • {purchase.requestedBy || 'Pyytäjä puuttuu'} • {formatFinnishDate(purchase.createdAt.slice(0, 10))}
                                        </p>
                                        {purchase.description ? (
                                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">{purchase.description}</p>
                                        ) : null}
                                    </div>

                                    <div className="text-left lg:text-right">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Summa</p>
                                        <p className="mt-1 text-2xl font-semibold text-slate-950">{purchase.amount.toFixed(2)} EUR</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-4">
                                    {statusSteps.map((step, index) => {
                                        const isDone = index <= activeIndex
                                        const Icon = step.icon
                                        return (
                                            <div
                                                key={step.status}
                                                className={`rounded-2xl border-2 p-3 ${
                                                    isDone
                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                                        : 'border-slate-300 bg-white text-slate-500'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon size={16} />
                                                    <p className="text-sm font-semibold">{step.label}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <dl className="mt-5 grid gap-3 border-t-2 border-slate-300 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                                    <PurchaseDetail label="PO-numero" value={purchase.orderNumber ?? '-'} />
                                    <PurchaseDetail label="Odotettu toimitus" value={purchase.expectedDate ? formatFinnishDate(purchase.expectedDate) : '-'} />
                                    <PurchaseDetail label="Vastaanotettu" value={purchase.receivedDate ? formatFinnishDate(purchase.receivedDate) : '-'} />
                                    <PurchaseDetail label="Laskuviite" value={purchase.invoiceReference ?? '-'} />
                                </dl>

                                <div className="mt-5 flex flex-wrap justify-end gap-2">
                                    {purchase.invoiceAttachmentDataUrl ? (
                                        <a
                                            href={purchase.invoiceAttachmentDataUrl}
                                            download={purchase.invoiceAttachmentName ?? 'ostolasku'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                        >
                                            <Paperclip size={15} />
                                            Avaa lasku
                                        </a>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => openInvoiceModal(purchase, false)}
                                        disabled={isBusy}
                                        className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        <Paperclip size={15} />
                                        {purchase.invoiceAttachmentDataUrl ? 'Vaihda lasku' : 'Liitä lasku'}
                                    </button>
                                    {nextStatus ? (
                                        <button
                                            type="button"
                                            onClick={() => void advancePurchase(purchase)}
                                            disabled={isBusy}
                                            className="rounded-xl border-2 border-emerald-400 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {isBusy ? 'Tallennetaan...' : `Siirrä tilaan: ${statusLabels[nextStatus]}`}
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => void deletePurchase(purchase.id)}
                                        disabled={isBusy}
                                        className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        <Trash2 size={15} />
                                        Poista
                                    </button>
                                </div>
                            </article>
                        )
                    })
                )}
            </div>

            {invoiceModalPurchase ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
                    <form
                        onSubmit={confirmInvoiceReference}
                        className="w-full max-w-lg rounded-2xl border-2 border-slate-400 bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-50">
                                <Check size={22} className="text-emerald-700" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {invoiceModalMarksPaid ? 'Maksettu' : 'Ostolasku'}
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                                    {invoiceModalMarksPaid ? 'Lisää ostolaskun viite' : 'Liitä lasku ostoon'}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {invoiceModalMarksPaid
                                        ? 'Viite yhdistää ostolaskun tilaukseen ja siirtää oston maksetuksi.'
                                        : 'Voit lisätä tai vaihtaa ostolaskun liitteen myös jälkikäteen.'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                            <p className="text-sm font-semibold text-slate-950">{invoiceModalPurchase.title}</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {invoiceModalPurchase.supplierName} • {invoiceModalPurchase.amount.toFixed(2)} EUR
                            </p>
                        </div>

                        <label className="mt-5 block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                                Laskuviite tai laskunumero
                            </span>
                            <input
                                type="text"
                                value={invoiceReferenceInput}
                                onChange={(event) => setInvoiceReferenceInput(event.target.value)}
                                disabled={busyPurchaseId === invoiceModalPurchase.id}
                                autoFocus
                                placeholder="Esim. OSTO-2026-1042"
                                className="w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-wait disabled:bg-slate-100"
                            />
                        </label>

                        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-400 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-950">Ostolaskun liite</p>
                                    <p className="mt-1 text-xs text-slate-600">PDF, kuva tai muu laskutiedosto. Enintään 3 Mt.</p>
                                </div>
                                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                                    <Paperclip size={15} />
                                    Valitse tiedosto
                                    <input
                                        type="file"
                                        accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                                        disabled={busyPurchaseId === invoiceModalPurchase.id}
                                        onChange={(event) => handleInvoiceAttachmentChange(event.target.files?.[0] ?? null)}
                                        className="sr-only"
                                    />
                                </label>
                            </div>

                            {invoiceAttachmentDataUrl ? (
                                <div className="mt-4 flex flex-col gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-emerald-900">{invoiceAttachmentName}</p>
                                        <p className="mt-1 text-xs text-emerald-700">Liite tallennetaan ostoon.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearInvoiceAttachment}
                                        disabled={busyPurchaseId === invoiceModalPurchase.id}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-400 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        <X size={15} />
                                        Poista liite
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {actionError ? (
                            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                                {actionError}
                            </p>
                        ) : null}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeInvoiceModal}
                                disabled={busyPurchaseId === invoiceModalPurchase.id}
                                className="rounded-xl border-2 border-slate-400 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                            >
                                Peruuta
                            </button>
                            <button
                                type="submit"
                                disabled={busyPurchaseId === invoiceModalPurchase.id}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
                            >
                                <Check size={16} />
                                {busyPurchaseId === invoiceModalPurchase.id
                                    ? 'Tallennetaan...'
                                    : invoiceModalMarksPaid
                                        ? 'Merkitse maksetuksi'
                                        : 'Tallenna lasku'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}
        </section>
    )
}

type FormInputProps = {
    label: string
    value: string
    onChange: (value: string) => void
    disabled: boolean
    type?: string
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}

function FormInput({ label, value, onChange, disabled, type = 'text', inputMode }: FormInputProps) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
            <input
                type={type}
                value={value}
                inputMode={inputMode}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className="w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
        </label>
    )
}

function PurchaseDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
        </div>
    )
}
