import { useEffect, useState } from 'react'

import type { Client, NewClient, NewProject, ProjectStatus } from '../types/types'

type NewProjectFormProps = {
    clients: Client[]
    onCreateClient: (client: NewClient) => Promise<Client>
    onCreateProject: (project: NewProject) => Promise<void>
}

type ProjectFormState = {
    clientId: string
    name: string
    hourlyRate: string
    budgetHours: string
    status: ProjectStatus
}

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

const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
    { value: 'planned', label: 'Suunnitteilla' },
    { value: 'active', label: 'Aktiivinen' },
    { value: 'on-hold', label: 'Tauolla' },
    { value: 'completed', label: 'Valmistunut' },
    { value: 'archived', label: 'Arkistoitu' },
]

export function NewProjectForm({ clients, onCreateClient, onCreateProject }: NewProjectFormProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSavingProject, setIsSavingProject] = useState(false)
    const [isSavingClient, setIsSavingClient] = useState(false)
    const [projectErrorMessage, setProjectErrorMessage] = useState<string | null>(null)
    const [clientErrorMessage, setClientErrorMessage] = useState<string | null>(null)
    const [projectFormState, setProjectFormState] = useState<ProjectFormState>({
        clientId: '',
        name: '',
        hourlyRate: '',
        budgetHours: '',
        status: 'planned',
    })
    const [clientFormState, setClientFormState] = useState<ClientFormState>({
        name: '',
        businessId: '',
        email: '',
        billingEmail: '',
        contactPerson: '',
        billingAddress: '',
        postalCode: '',
        city: '',
    })

    useEffect(() => {
        if (!projectFormState.clientId && clients.length > 0) {
            setProjectFormState((currentState) => ({
                ...currentState,
                clientId: clients[0].id,
            }))
        }
    }, [clients, projectFormState.clientId])

    function handleProjectFieldChange(field: keyof ProjectFormState, value: string) {
        setProjectFormState((currentState) => ({
            ...currentState,
            [field]: value,
        }))
    }

    function handleClientFieldChange(field: keyof ClientFormState, value: string) {
        setClientFormState((currentState) => ({
            ...currentState,
            [field]: value,
        }))
    }

    async function handleProjectSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const hourlyRate = Number(projectFormState.hourlyRate)
        const budgetHours = Number(projectFormState.budgetHours)

        if (
            !projectFormState.clientId ||
            !projectFormState.name.trim() ||
            hourlyRate <= 0 ||
            budgetHours <= 0
        ) {
            setProjectErrorMessage('Täytä kaikki projektin tiedot oikein.')
            return
        }

        setIsSavingProject(true)
        setProjectErrorMessage(null)

        try {
            await onCreateProject({
                clientId: projectFormState.clientId,
                name: projectFormState.name.trim(),
                hourlyRate,
                budgetHours,
                status: projectFormState.status,
            })

            setProjectFormState({
                clientId: clients[0]?.id ?? '',
                name: '',
                hourlyRate: '',
                budgetHours: '',
                status: 'planned',
            })
            setIsOpen(false)
        } catch (error) {
            setProjectErrorMessage(
                error instanceof Error ? error.message : 'Projektin tallennus epäonnistui.',
            )
        } finally {
            setIsSavingProject(false)
        }
    }

    async function handleClientSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (
            !clientFormState.name.trim() ||
            !clientFormState.businessId.trim() ||
            !clientFormState.email.trim() ||
            !clientFormState.billingEmail.trim() ||
            !clientFormState.contactPerson.trim() ||
            !clientFormState.billingAddress.trim() ||
            !clientFormState.postalCode.trim() ||
            !clientFormState.city.trim()
        ) {
            setClientErrorMessage('Täytä kaikki asiakkaan tiedot.')
            return
        }

        setIsSavingClient(true)
        setClientErrorMessage(null)

        try {
            const createdClient = await onCreateClient({
                name: clientFormState.name.trim(),
                businessId: clientFormState.businessId.trim(),
                email: clientFormState.email.trim(),
                billingEmail: clientFormState.billingEmail.trim(),
                contactPerson: clientFormState.contactPerson.trim(),
                billingAddress: clientFormState.billingAddress.trim(),
                postalCode: clientFormState.postalCode.trim(),
                city: clientFormState.city.trim(),
            })

            setClientFormState({
                name: '',
                businessId: '',
                email: '',
                billingEmail: '',
                contactPerson: '',
                billingAddress: '',
                postalCode: '',
                city: '',
            })
            setProjectFormState((currentState) => ({
                ...currentState,
                clientId: createdClient.id,
            }))
        } catch (error) {
            setClientErrorMessage(
                error instanceof Error ? error.message : 'Asiakkaan tallennus epäonnistui.',
            )
        } finally {
            setIsSavingClient(false)
        }
    }

    return (
        <section className="rounded-3xl border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                        Uusi projekti
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                        Luo uusi asiakasprojekti
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen((currentValue) => !currentValue)}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    {isOpen ? 'Sulje' : 'Lisää projekti'}
                </button>
            </div>

            {isOpen ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <form
                        className="grid gap-5 rounded-3xl border-2 border-slate-400 bg-slate-50 p-5 md:grid-cols-2 self-start"
                        onSubmit={handleProjectSubmit}
                    >
                        <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Valitse asiakas
                            </span>
                            <select
                                value={projectFormState.clientId}
                                onChange={(event) => handleProjectFieldChange('clientId', event.target.value)}
                                disabled={isSavingProject || isSavingClient}
                                className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                                <option value="">Valitse asiakas</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Projektin nimi
                            </span>
                            <input
                                type="text"
                                value={projectFormState.name}
                                onChange={(event) => handleProjectFieldChange('name', event.target.value)}
                                disabled={isSavingProject}
                                className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Tuntihinta
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={projectFormState.hourlyRate}
                                onChange={(event) => handleProjectFieldChange('hourlyRate', event.target.value)}
                                disabled={isSavingProject}
                                className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Budjetoidut tunnit
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={projectFormState.budgetHours}
                                onChange={(event) => handleProjectFieldChange('budgetHours', event.target.value)}
                                disabled={isSavingProject}
                                className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Tila
                            </span>
                            <select
                                value={projectFormState.status}
                                onChange={(event) => handleProjectFieldChange('status', event.target.value as ProjectStatus)}
                                disabled={isSavingProject}
                                className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                                {projectStatusOptions.map((statusOption) => (
                                    <option key={statusOption.value} value={statusOption.value}>
                                        {statusOption.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {projectErrorMessage ? (
                            <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {projectErrorMessage}
                            </div>
                        ) : null}

                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingProject || isSavingClient || clients.length === 0}
                                className="inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                                {isSavingProject ? 'Tallennetaan...' : 'Tallenna projekti'}
                            </button>
                        </div>
                    </form>

                    <form
                        className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-5"
                        onSubmit={handleClientSubmit}
                    >
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                            Uusi asiakas
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                            Luo uusi asiakas
                        </h3>

                        <div className="mt-5 space-y-4">
                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                    Asiakkaan nimi
                                </span>
                                <input
                                    type="text"
                                    value={clientFormState.name}
                                    onChange={(event) => handleClientFieldChange('name', event.target.value)}
                                    disabled={isSavingClient}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                    Y-tunnus
                                </span>
                                <input
                                    type="text"
                                    value={clientFormState.businessId}
                                    onChange={(event) => handleClientFieldChange('businessId', event.target.value)}
                                    disabled={isSavingClient}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                    Sähköposti
                                </span>
                                <input
                                    type="email"
                                    value={clientFormState.email}
                                    onChange={(event) => handleClientFieldChange('email', event.target.value)}
                                    disabled={isSavingClient}
                                    className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                    Laskutussähköposti
                                </span>
                                <input
                                    type="email"
                                    value={clientFormState.billingEmail}
                                    onChange={(event) => handleClientFieldChange('billingEmail', event.target.value)}
                                    disabled={isSavingClient}
                                    className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                    Yhteyshenkilö
                                </span>
                                <input
                                    type="text"
                                    value={clientFormState.contactPerson}
                                    onChange={(event) => handleClientFieldChange('contactPerson', event.target.value)}
                                    disabled={isSavingClient}
                                    className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                    Laskutusosoite
                                </span>
                                <input
                                    type="text"
                                    value={clientFormState.billingAddress}
                                    onChange={(event) => handleClientFieldChange('billingAddress', event.target.value)}
                                    disabled={isSavingClient}
                                    className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700">
                                        Postinumero
                                    </span>
                                    <input
                                        type="text"
                                        value={clientFormState.postalCode}
                                        onChange={(event) => handleClientFieldChange('postalCode', event.target.value)}
                                        disabled={isSavingClient}
                                        className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700">
                                        Kaupunki
                                    </span>
                                    <input
                                        type="text"
                                        value={clientFormState.city}
                                        onChange={(event) => handleClientFieldChange('city', event.target.value)}
                                        disabled={isSavingClient}
                                        className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    />
                                </label>
                            </div>
                        </div>

                        {clientErrorMessage ? (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {clientErrorMessage}
                            </div>
                        ) : null}

                        <div className="mt-5 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingClient}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                                {isSavingClient ? 'Tallennetaan...' : 'Tallenna asiakas'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}
        </section>
    )
}