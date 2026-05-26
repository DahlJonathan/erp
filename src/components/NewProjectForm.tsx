import { useEffect, useRef, useState } from 'react'

import type { Client, NewProject, ProjectStatus } from '../types/types'

function CustomSelect<T extends string>({
    value,
    onChange,
    options,
    placeholder,
    disabled,
}: {
    value: T | ''
    onChange: (val: T | '') => void
    options: Array<{ value: T | ''; label: string }>
    placeholder?: string
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = options.find((o) => o.value === value)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-slate-400 bg-white px-4 py-2 text-left text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
                <span className={value === '' ? 'text-slate-400' : ''}>
                    {selected ? selected.label : (placeholder ?? 'Valitse...')}
                </span>
                <svg className="ml-2 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
            </button>
            {open && (
                <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-lg">
                    {options.map((opt) => (
                        <li
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setOpen(false) }}
                            className={`cursor-pointer px-4 py-2 text-sm transition hover:bg-emerald-50 ${
                                opt.value === value ? 'font-semibold text-emerald-700' : 'text-slate-800'
                            }`}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}


type NewProjectFormProps = {
    clients: Client[]
    onCreateProject: (project: NewProject) => Promise<void>
}

type ProjectFormState = {
    clientId: string
    name: string
    hourlyRate: string
    budgetHours: string
    status: ProjectStatus
    dueDate: string
}

const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
    { value: 'planned', label: 'Suunnitteilla' },
    { value: 'active', label: 'Aktiivinen' },
    { value: 'on-hold', label: 'Tauolla' },
    { value: 'completed', label: 'Valmistunut' },
    { value: 'archived', label: 'Arkistoitu' },
]

export function NewProjectForm({ clients, onCreateProject }: NewProjectFormProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSavingProject, setIsSavingProject] = useState(false)
    const [projectErrorMessage, setProjectErrorMessage] = useState<string | null>(null)
    const [projectFormState, setProjectFormState] = useState<ProjectFormState>({
        clientId: '',
        name: '',
        hourlyRate: '',
        budgetHours: '',
        status: 'planned',
        dueDate: '',
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
                dueDate: projectFormState.dueDate || null,
            })

            setProjectFormState({
                clientId: clients[0]?.id ?? '',
                name: '',
                hourlyRate: '',
                budgetHours: '',
                status: 'planned',
                dueDate: '',
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
                <form
                    className="mt-6 mx-auto grid gap-x-4 gap-y-3 rounded-3xl border-2 border-slate-400 bg-slate-50 p-5 sm:grid-cols-6"
                    onSubmit={handleProjectSubmit}
                >
                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Valitse asiakas
                        </span>
                        <CustomSelect
                                value={projectFormState.clientId}
                                onChange={(val) => handleProjectFieldChange('clientId', val)}
                                placeholder="Valitse asiakas"
                                disabled={isSavingProject}
                                options={[
                                    ...clients.map((c) => ({ value: c.id as string, label: c.name })),
                                ]}
                            />
                    </label>

                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Projektin nimi
                        </span>
                        <input
                            type="text"
                            value={projectFormState.name}
                            onChange={(event) => handleProjectFieldChange('name', event.target.value)}
                            disabled={isSavingProject}
                            className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </label>

                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Määräaika
                        </span>
                        <input
                            type="date"
                            value={projectFormState.dueDate}
                            onChange={(event) => handleProjectFieldChange('dueDate', event.target.value)}
                            disabled={isSavingProject}
                            className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </label>

                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Tuntihinta
                        </span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={projectFormState.hourlyRate}
                            onChange={(event) => handleProjectFieldChange('hourlyRate', event.target.value)}
                            disabled={isSavingProject}
                            className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </label>

                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Budjetoidut tunnit
                        </span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={projectFormState.budgetHours}
                            onChange={(event) => handleProjectFieldChange('budgetHours', event.target.value)}
                            disabled={isSavingProject}
                            className="w-full rounded-2xl border-2 border-slate-400 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </label>

                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Tila
                        </span>
                        <CustomSelect
                                value={projectFormState.status}
                                onChange={(val) => handleProjectFieldChange('status', val as ProjectStatus)}
                                disabled={isSavingProject}
                                options={projectStatusOptions}
                            />
                    </label>

                    {projectErrorMessage ? (
                        <div className="sm:col-span-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {projectErrorMessage}
                        </div>
                    ) : null}

                    <div className="sm:col-span-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSavingProject || clients.length === 0}
                            className="inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {isSavingProject ? 'Tallennetaan...' : 'Tallenna projekti'}
                        </button>
                    </div>
                </form>
            ) : null}
        </section>
    )
}