import { useState } from 'react'

import { toUserSettingsUpsert } from '../data/supabaseMappers'
import { supabase } from '../supabaseClient'
import type { CompanySettings } from '../types/types'

const fields: Array<{ key: keyof CompanySettings; label: string; placeholder: string; colSpan?: boolean }> = [
    { key: 'name', label: 'Yrityksen nimi', placeholder: 'Esim. Iisiduuni Oy', colSpan: true },
    { key: 'businessId', label: 'Y-tunnus', placeholder: 'Esim. 1234567-8' },
    { key: 'email', label: 'Sähköposti', placeholder: 'info@yritys.fi' },
    { key: 'phone', label: 'Puhelinnumero', placeholder: '+358 40 000 0000' },
    { key: 'street', label: 'Katuosoite', placeholder: 'Esim. Esimerkkikatu 1' },
    { key: 'city', label: 'Postinumero ja kaupunki', placeholder: 'Esim. 00100 Helsinki' },
    { key: 'iban', label: 'IBAN-tilinumero', placeholder: 'FI12 3456 7890 1234 56' },
    { key: 'bic', label: 'BIC', placeholder: 'NDEAFIHH' },
    { key: 'paymentTerms', label: 'Maksuehdot', placeholder: '14 päivää netto', colSpan: true },
]

type SettingsViewProps = {
    userId: string
    initialSettings: CompanySettings
    initialLogoSrc: string
    onSaved: (settings: CompanySettings, logoSrc: string) => void
}

export function SettingsView({ userId, initialSettings, initialLogoSrc, onSaved }: SettingsViewProps) {
    const [settings, setSettings] = useState<CompanySettings>(initialSettings)
    const [logoSrc, setLogoSrc] = useState<string>(initialLogoSrc)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [logoError, setLogoError] = useState<string | null>(null)

    function handleChange(field: keyof CompanySettings, value: string) {
        setSettings((prev) => ({ ...prev, [field]: value }))
        setSaved(false)
    }

    async function handleSave() {
        setIsSaving(true)
        setSaveError(null)

        const { error } = await supabase
            .from('user_settings')
            .upsert([toUserSettingsUpsert(userId, settings, logoSrc)], { onConflict: 'user_id' })

        setIsSaving(false)

        if (error) {
            setSaveError(error.message)
            return
        }

        setSaved(true)
        onSaved(settings, logoSrc)
    }

    function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.size > 500_000) {
            setLogoError('Logo on liian suuri. Maksimikoko on 500 KB.')
            return
        }

        setLogoError(null)
        const reader = new FileReader()
        reader.onload = () => {
            setLogoSrc(reader.result as string)
            setSaved(false)
        }
        reader.readAsDataURL(file)
        event.target.value = ''
    }

    function handleLogoRemove() {
        setLogoSrc('')
        setSaved(false)
    }

    return (
        <section className="rounded-[2rem] border-2 border-slate-400 bg-white/95 p-6 shadow-sm shadow-slate-300/60">
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Omat tiedot</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Tallennetut tiedot lisätään automaattisesti laskuille ja muille asiakirjoille.
            </p>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
                <article className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Yritystiedot</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">Laskutustiedot</h3>

                    <div className="mt-6 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                        {fields.map(({ key, label, placeholder, colSpan }) => (
                            <label key={key} className={`block${colSpan ? ' sm:col-span-2' : ''}`}>
                                <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
                                <input
                                    type="text"
                                    value={settings[key]}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                                />
                            </label>
                        ))}
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={isSaving}
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isSaving ? 'Tallennetaan...' : 'Tallenna tiedot'}
                        </button>
                        {saved ? (
                            <span className="text-sm font-medium text-emerald-600">✓ Tallennettu!</span>
                        ) : null}
                        {saveError ? (
                            <span className="text-sm text-rose-600">{saveError}</span>
                        ) : null}
                    </div>
                </article>

                <article className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Laskun ulkoasu</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">Logo</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Logo näkyy laskun vasemmassa yläkulmassa yritystietojen yläpuolella.
                    </p>

                    {logoSrc ? (
                        <div className="mt-5 flex flex-col gap-3">
                            <img
                                src={logoSrc}
                                alt="Logo esikatselu"
                                className="h-16 max-w-[180px] rounded-xl border-2 border-slate-300 bg-white object-contain p-2"
                            />
                            <div className="flex gap-2">
                                <label className="inline-flex cursor-pointer items-center rounded-xl border-2 border-slate-400 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={handleLogoUpload}
                                    />
                                    Vaihda logo
                                </label>
                                <button
                                    type="button"
                                    onClick={handleLogoRemove}
                                    className="rounded-xl border-2 border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                                >
                                    Poista
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">Muista tallentaa tiedot logon vaihdon jälkeen.</p>
                        </div>
                    ) : (
                        <div className="mt-5 flex flex-col gap-3">
                            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                                Ei logoa — laskussa näytetään yrityksen nimi tekstinä.
                            </div>
                            <label className="inline-flex cursor-pointer items-center rounded-xl border-2 border-slate-400 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={handleLogoUpload}
                                />
                                Lataa logo
                            </label>
                        </div>
                    )}

                    {logoError ? (
                        <p className="mt-3 text-sm text-rose-600">{logoError}</p>
                    ) : null}

                    <p className="mt-3 text-xs text-slate-400">
                        PNG, JPG tai SVG · max 500 KB · suositeltu koko 400 × 150 px
                    </p>
                </article>
            </div>
        </section>
    )
}
