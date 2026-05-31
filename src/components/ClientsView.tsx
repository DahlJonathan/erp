import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'

import type { Client, NewClient } from '../types/types'

type ClientsViewProps = {
    clients: Client[]
    onCreateClient: (client: NewClient) => Promise<Client>
    onUpdateClient: (clientId: string, data: NewClient) => Promise<void>
    onDeleteClient: (clientId: string) => Promise<void>
}

const CLIENTS_PAGE_SIZE = 10

type ClientFormState = {
    name: string
    businessId: string
    email: string
    billingEmail: string
    contactPerson: string
    billingAddress: string
    postalCode: string
    city: string
}

const emptyForm: ClientFormState = {
    name: '',
    businessId: '',
    email: '',
    billingEmail: '',
    contactPerson: '',
    billingAddress: '',
    postalCode: '',
    city: '',
}

function clientToForm(client: Client): ClientFormState {
    return {
        name: client.name,
        businessId: client.businessId,
        email: client.email,
        billingEmail: client.billingEmail ?? '',
        contactPerson: client.contactPerson ?? '',
        billingAddress: client.billingAddress ?? '',
        postalCode: client.postalCode ?? '',
        city: client.city ?? '',
    }
}

export function ClientsView({ clients, onCreateClient, onUpdateClient, onDeleteClient }: ClientsViewProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [addForm, setAddForm] = useState<ClientFormState>(emptyForm)
    const [addError, setAddError] = useState<string | null>(null)
    const [isSavingAdd, setIsSavingAdd] = useState(false)

    const [editClientId, setEditClientId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<ClientFormState>(emptyForm)
    const [editError, setEditError] = useState<string | null>(null)
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    const [confirmDeleteClient, setConfirmDeleteClient] = useState<Client | null>(null)
    const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [clientsPage, setClientsPage] = useState(1)

    const totalClientPages = Math.max(1, Math.ceil(clients.length / CLIENTS_PAGE_SIZE))
    const pagedClients = useMemo(() => {
        const from = (clientsPage - 1) * CLIENTS_PAGE_SIZE
        return clients.slice(from, from + CLIENTS_PAGE_SIZE)
    }, [clients, clientsPage])

    useEffect(() => {
        setClientsPage((currentPage) => Math.min(currentPage, totalClientPages))
    }, [totalClientPages])

    function handleAddFieldChange(field: keyof ClientFormState, value: string) {
        setAddForm((s) => ({ ...s, [field]: value }))
    }

    function handleEditFieldChange(field: keyof ClientFormState, value: string) {
        setEditForm((s) => ({ ...s, [field]: value }))
    }

    function openEdit(client: Client) {
        setEditClientId(client.id)
        setEditForm(clientToForm(client))
        setEditError(null)
    }

    function closeEdit() {
        setEditClientId(null)
        setEditError(null)
    }

    async function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!addForm.name.trim() || !addForm.businessId.trim() || !addForm.email.trim()) {
            setAddError('Nimi, Y-tunnus ja sähköposti ovat pakollisia.')
            return
        }

        setIsSavingAdd(true)
        setAddError(null)

        try {
            await onCreateClient({
                name: addForm.name.trim(),
                businessId: addForm.businessId.trim(),
                email: addForm.email.trim(),
                billingEmail: addForm.billingEmail.trim() || addForm.email.trim(),
                contactPerson: addForm.contactPerson.trim() || null,
                billingAddress: addForm.billingAddress.trim() || null,
                postalCode: addForm.postalCode.trim() || null,
                city: addForm.city.trim() || null,
            })
            setAddForm(emptyForm)
            setIsAddOpen(false)
        } catch (error) {
            setAddError(error instanceof Error ? error.message : 'Asiakkaan lisäys epäonnistui.')
        } finally {
            setIsSavingAdd(false)
        }
    }

    async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!editClientId) return

        if (!editForm.name.trim() || !editForm.businessId.trim() || !editForm.email.trim()) {
            setEditError('Nimi, Y-tunnus ja sähköposti ovat pakollisia.')
            return
        }

        setIsSavingEdit(true)
        setEditError(null)

        try {
            await onUpdateClient(editClientId, {
                name: editForm.name.trim(),
                businessId: editForm.businessId.trim(),
                email: editForm.email.trim(),
                billingEmail: editForm.billingEmail.trim() || editForm.email.trim(),
                contactPerson: editForm.contactPerson.trim() || null,
                billingAddress: editForm.billingAddress.trim() || null,
                postalCode: editForm.postalCode.trim() || null,
                city: editForm.city.trim() || null,
            })
            closeEdit()
        } catch (error) {
            setEditError(error instanceof Error ? error.message : 'Päivittäminen epäonnistui.')
        } finally {
            setIsSavingEdit(false)
        }
    }

    async function handleDeleteConfirm() {
        if (!confirmDeleteClient) return

        const client = confirmDeleteClient
        setConfirmDeleteClient(null)
        setDeletingClientId(client.id)
        setDeleteError(null)

        try {
            await onDeleteClient(client.id)
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Poistaminen epäonnistui.')
        } finally {
            setDeletingClientId(null)
        }
    }

    return (
        <>
            <section className="rounded-3xl border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b-2 border-slate-400 pb-6">
                    <div>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Asiakashallinta</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                            Hallitse laskutusasiakkaita, heidän yhteystietojaan ja laskutusosoitteitaan.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => { setIsAddOpen((v) => !v); setAddError(null) }}
                            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            {isAddOpen ? 'Sulje' : 'Lisää asiakas'}
                        </button>
                    </div>
                </div>

                {/* Add form */}
                {isAddOpen && (
                    <form
                        onSubmit={handleAddSubmit}
                        className="mt-6 rounded-2xl border-2 border-slate-400 bg-slate-50 p-5"
                    >
                        <h3 className="mb-4 text-lg font-semibold text-slate-950">Uusi asiakas</h3>
                        <ClientFormFields
                            form={addForm}
                            onChange={handleAddFieldChange}
                            disabled={isSavingAdd}
                        />
                        {addError && (
                            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{addError}</p>
                        )}
                        <div className="mt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingAdd}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Check size={16} />
                                {isSavingAdd ? 'Tallennetaan...' : 'Tallenna asiakas'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Error */}
                {deleteError && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{deleteError}</div>
                )}

                {/* Client list */}
                <div className="mt-6 space-y-3">
                    {clients.length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-slate-400 bg-slate-50 p-6 text-center text-sm text-slate-600">
                            Ei asiakkaita vielä. Lisää ensimmäinen asiakas yllä.
                        </div>
                    )}

                    {pagedClients.map((client) => {
                        const isEditing = editClientId === client.id
                        const isDeleting = deletingClientId === client.id

                        return (
                            <article
                                key={client.id}
                                className="rounded-2xl border-2 border-slate-300 bg-slate-50 overflow-hidden"
                            >
                                {/* Row */}
                                <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                                    <div>
                                        <p className="font-semibold text-slate-950">{client.name}</p>
                                        <p className="mt-0.5 text-sm text-slate-500">Y-tunnus: {client.businessId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Sähköposti</p>
                                        <p className="mt-1 text-sm text-slate-700 truncate">{client.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Paikkakunta</p>
                                        <p className="mt-1 text-sm text-slate-700">
                                            {[client.postalCode, client.city].filter(Boolean).join(' ') || '—'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => isEditing ? closeEdit() : openEdit(client)}
                                            disabled={isDeleting}
                                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
                                        >
                                            {isEditing ? <X size={15} /> : <Pencil size={15} />}
                                            {isEditing ? 'Peruuta' : 'Muokkaa'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeleteClient(client)}
                                            disabled={isDeleting}
                                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                        >
                                            <Trash2 size={15} />
                                            {isDeleting ? 'Poistetaan...' : 'Poista'}
                                        </button>
                                    </div>
                                </div>

                                {/* Inline edit form */}
                                {isEditing && (
                                    <form
                                        onSubmit={handleEditSubmit}
                                        className="border-t-2 border-slate-300 bg-white px-5 py-5"
                                    >
                                        <ClientFormFields
                                            form={editForm}
                                            onChange={handleEditFieldChange}
                                            disabled={isSavingEdit}
                                        />
                                        {editError && (
                                            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{editError}</p>
                                        )}
                                        <div className="mt-4 flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={closeEdit}
                                                className="rounded-xl border-2 border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                            >
                                                Peruuta
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSavingEdit}
                                                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                            >
                                                <Check size={15} />
                                                {isSavingEdit ? 'Tallennetaan...' : 'Tallenna muutokset'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </article>
                        )
                    })}
                </div>

                {totalClientPages > 1 && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-medium text-slate-700">
                            Sivu {clientsPage}/{totalClientPages} &middot; {clients.length} asiakasta
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setClientsPage((currentPage) => Math.max(1, currentPage - 1))}
                                disabled={clientsPage === 1}
                                className="rounded-xl border-2 border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Edellinen
                            </button>
                            <button
                                type="button"
                                onClick={() => setClientsPage((currentPage) => Math.min(totalClientPages, currentPage + 1))}
                                disabled={clientsPage === totalClientPages}
                                className="rounded-xl border-2 border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Seuraava
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Delete confirm modal */}
            {confirmDeleteClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
                    <div className="w-full max-w-md rounded-2xl border-2 border-slate-400 bg-white p-6 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-rose-200 bg-rose-50">
                                <Trash2 size={20} className="text-rose-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-950">Poista asiakas</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    Oletko varma, että haluat poistaa asiakkaan{' '}
                                    <span className="font-semibold text-slate-950">{confirmDeleteClient.name}</span>?
                                </p>
                                <p className="mt-2 text-sm text-rose-600">
                                    Toimintoa ei voi peruuttaa.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteClient(null)}
                                className="rounded-xl border-2 border-slate-400 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                                Peruuta
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="rounded-xl border-2 border-rose-600 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                                Poista asiakas
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

type ClientFormFieldsProps = {
    form: ClientFormState
    onChange: (field: keyof ClientFormState, value: string) => void
    disabled: boolean
}

function ClientFormFields({ form, onChange, disabled }: ClientFormFieldsProps) {
    const fieldClass = 'w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:bg-slate-100 disabled:cursor-not-allowed'
    const labelClass = 'mb-1 block text-sm font-medium text-slate-700'

    return (
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <label className="block">
                <span className={labelClass}>Asiakkaan nimi <span className="text-rose-500">*</span></span>
                <input type="text" value={form.name} onChange={(e) => onChange('name', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
            <label className="block">
                <span className={labelClass}>Y-tunnus <span className="text-rose-500">*</span></span>
                <input type="text" value={form.businessId} onChange={(e) => onChange('businessId', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
            <label className="block">
                <span className={labelClass}>Sähköposti <span className="text-rose-500">*</span></span>
                <input type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
            <label className="block">
                <span className={labelClass}>Laskutussähköposti</span>
                <input type="email" value={form.billingEmail} onChange={(e) => onChange('billingEmail', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
            <label className="block">
                <span className={labelClass}>Yhteyshenkilö</span>
                <input type="text" value={form.contactPerson} onChange={(e) => onChange('contactPerson', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
            <label className="block">
                <span className={labelClass}>Laskutusosoite</span>
                <input type="text" value={form.billingAddress} onChange={(e) => onChange('billingAddress', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
            <label className="block">
                <span className={labelClass}>Postinumero</span>
                <input type="text" value={form.postalCode} onChange={(e) => onChange('postalCode', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
            <label className="block">
                <span className={labelClass}>Kaupunki</span>
                <input type="text" value={form.city} onChange={(e) => onChange('city', e.target.value)} disabled={disabled} className={fieldClass} />
            </label>
        </div>
    )
}
