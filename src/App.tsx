import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { AuthView } from './components/AuthView'
import { Dashboard } from './components/Dashboard'
import { Historia } from './components/Historia'
import { ApprovalView } from './components/ApprovalView'
import { ClientsView } from './components/ClientsView'
import { SettingsView } from './components/SettingsView'
import { InvoicingView } from './components/InvoicingView'
import { NewProjectForm } from './components/NewProjectForm'
import { ProjectList } from './components/ProjectList'
import { PurchasesView } from './components/PurchasesView'
import { TimeTracker } from './components/TimeTracker'
import {
  mapClientRow,
  mapInvoiceRow,
  mapProjectRow,
  mapPurchaseRow,
  mapTaskRow,
  mapTimeEntryRow,
  mapUserSettingsRow,
  toClientInsert,
  toInvoiceInsert,
  toProjectInsert,
  toPurchaseInsert,
  toTimeEntryInsert,
} from './data/supabaseMappers'
import { supabase } from './supabaseClient'
import { getTodayIsoDate } from './utils/date'

import type {
  Client,
  ClientRow,
  CompanySettings,
  Invoice,
  InvoiceRow,
  InvoiceStatus,
  NewClient,
  NewProject,
  NewPurchase,
  NewTimeEntry,
  Project,
  ProjectRow,
  Purchase,
  PurchaseRow,
  Task,
  TaskRow,
  TimeEntry,
  TimeEntryRow,
  UserSettingsRow,
} from './types/types'
import { defaultCompanySettings } from './types/types'

type AppView = 'dashboard' | 'tracker' | 'management' | 'purchases' | 'history' | 'clients' | 'settings'

const appViews: AppView[] = ['dashboard', 'tracker', 'management', 'purchases', 'history', 'clients', 'settings']
const activeViewStorageKey = 'erp-active-view'

function getInitialActiveView(): AppView {
  const storedView = window.localStorage.getItem(activeViewStorageKey)
  return appViews.includes(storedView as AppView) ? storedView as AppView : 'dashboard'
}

function getNextInvoiceNumber(existingInvoices: Invoice[], invoiceDate: string) {
  const year = invoiceDate.slice(0, 4)
  const yearPrefix = `${year}-`

  const latestSequence = existingInvoices.reduce((maxSequence, invoice) => {
    if (!invoice.invoiceNumber.startsWith(yearPrefix)) {
      return maxSequence
    }

    const sequencePart = invoice.invoiceNumber.slice(yearPrefix.length)
    const parsedSequence = Number(sequencePart)

    if (!Number.isInteger(parsedSequence) || parsedSequence < 0) {
      return maxSequence
    }

    return Math.max(maxSequence, parsedSequence)
  }, 0)

  return `${yearPrefix}${String(latestSequence + 1).padStart(3, '0')}`
}

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [activeView, setActiveView] = useState<AppView>(getInitialActiveView)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings)
  const [logoSrc, setLogoSrc] = useState<string>('')
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [projectListRefreshTrigger, setProjectListRefreshTrigger] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Only update session on actual sign-in/sign-out, not on token refresh
      // This prevents re-fetching all data when returning to the tab
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setSession(newSession)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const sessionUserId = session?.user?.id ?? null

  useEffect(() => {
    if (!sessionUserId) return
    let isActive = true

    async function loadData() {
      setIsDataLoading(true)

      const [clientsResponse, projectsResponse, timeEntriesResponse, invoicesResponse, purchasesResponse, settingsResponse, tasksResponse] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('time_entries').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('user_settings').select('*').maybeSingle(),
        supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
      ])

      const firstError =
        clientsResponse.error ??
        projectsResponse.error ??
        timeEntriesResponse.error ??
        invoicesResponse.error ??
        purchasesResponse.error ??
        settingsResponse.error ??
        tasksResponse.error

      if (firstError) {
        if (isActive) {
          setDataError(firstError.message)
          setIsDataLoading(false)
        }

        return
      }

      if (!isActive) {
        return
      }

      setClients((clientsResponse.data as ClientRow[]).map(mapClientRow))
      setProjects((projectsResponse.data as ProjectRow[]).map(mapProjectRow))
      setTimeEntries((timeEntriesResponse.data as TimeEntryRow[]).map(mapTimeEntryRow))
      setInvoices((invoicesResponse.data as InvoiceRow[]).map(mapInvoiceRow))
      setPurchases((purchasesResponse.data as PurchaseRow[]).map(mapPurchaseRow))
      setTasks((tasksResponse.data as TaskRow[]).map(mapTaskRow))

      if (settingsResponse.data) {
        const { settings, logoSrc: loadedLogoSrc } = mapUserSettingsRow(settingsResponse.data as UserSettingsRow)
        setCompanySettings(settings)
        setLogoSrc(loadedLogoSrc)
      }
      setDataError(null)
      setIsDataLoading(false)
    }

    void loadData()

    return () => {
      isActive = false
    }
  }, [sessionUserId])

  useEffect(() => {
    window.localStorage.setItem(activeViewStorageKey, activeView)
  }, [activeView])


  const draftCount = timeEntries.filter((entry) => entry.status === 'draft').length
  const approvedCount = timeEntries.filter((entry) => entry.status === 'approved').length
  const openPurchaseCount = purchases.filter((purchase) => purchase.status !== 'paid').length

  const navigationItems: Array<{ id: AppView; label: string; hint: string }> = [
    { id: 'dashboard', label: 'Yhteenveto', hint: 'Raportit ja KPI:t' },
    { id: 'tracker', label: 'Seuranta', hint: 'Projektit ja tunnit' },
    { id: 'management', label: 'Hallinta', hint: 'Hyväksyntä ja laskutus' },
    { id: 'history', label: 'Historia', hint: 'Projektit ja laskut' },
  ]

  const sidebarItems: Array<{ id: AppView; label: string; hint: string }> = [
    { id: 'dashboard', label: 'Laskutus ja projektinhallinta', hint: 'Takaisin päänäkymään' },
    { id: 'purchases', label: 'Hankinnat', hint: 'Hankinnat ja PO:t' },
    { id: 'clients', label: 'Asiakkaat', hint: 'Asiakashallinta' },
    { id: 'settings', label: 'Asetukset', hint: 'Yritystiedot ja logo' },
  ]

  async function handleAddTimeEntry(entry: NewTimeEntry) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert([toTimeEntryInsert(entry)])
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    setTimeEntries((currentEntries) => [mapTimeEntryRow(data as TimeEntryRow), ...currentEntries])
  }

  async function handleAddProject(project: NewProject) {
    const { data, error } = await supabase
      .from('projects')
      .insert([toProjectInsert(project)])
      .select('*')
      .single()

    if (error) {
      throw error
    }

    setProjects((currentProjects) => [mapProjectRow(data as ProjectRow), ...currentProjects])
    setProjectListRefreshTrigger((n) => n + 1)
  }

  async function handleUpdateProject(
    projectId: string,
    updatedData: Pick<Project, 'name' | 'hourlyRate' | 'budgetHours' | 'status' | 'dueDate'>,
  ) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updatedData.name,
        hourly_rate: updatedData.hourlyRate,
        budget_hours: updatedData.budgetHours,
        status: updatedData.status,
        due_date: updatedData.dueDate ?? null,
      })
      .eq('id', projectId)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const updatedProject = mapProjectRow(data as ProjectRow)
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId ? updatedProject : project,
      ),
    )
  }

  async function handleDeleteProject(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      throw new Error(error.message)
    }

    setProjects((currentProjects) =>
      currentProjects.filter((project) => project.id !== projectId),
    )
    setTimeEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.projectId !== projectId),
    )
  }

  function handleTaskChange(action: 'created' | 'updated' | 'deleted', task: Task) {
    setTasks((prev) => {
      if (action === 'created') return [...prev, task]
      if (action === 'updated') return prev.map((t) => (t.id === task.id ? task : t))
      return prev.filter((t) => t.id !== task.id)
    })
  }

  async function handleAddClient(client: NewClient) {
    const { data, error } = await supabase
      .from('clients')
      .insert([toClientInsert(client)])
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const createdClient = mapClientRow(data as ClientRow)
    setClients((currentClients) => [createdClient, ...currentClients])
    return createdClient
  }

  async function handleUpdateClient(clientId: string, updatedData: NewClient) {
    const { data, error } = await supabase
      .from('clients')
      .update(toClientInsert(updatedData))
      .eq('id', clientId)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const updatedClient = mapClientRow(data as ClientRow)
    setClients((currentClients) =>
      currentClients.map((c) => (c.id === clientId ? updatedClient : c)),
    )
  }

  async function handleDeleteClient(clientId: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) {
      throw new Error(error.message)
    }

    setClients((currentClients) => currentClients.filter((c) => c.id !== clientId))
  }

  async function handleApproveEntries(entryIds: string[]) {
    const selectedIds = new Set(entryIds)

    const responses = await Promise.all(
      entryIds.map((id) => {
        const entry = timeEntries.find((e) => e.id === id)
        const newStatus = entry?.isBillable === false ? 'invoiced' : 'approved'
        return supabase
          .from('time_entries')
          .update({ status: newStatus })
          .eq('id', id)
      }),
    )

    const failedResponse = responses.find((response) => response.error)
    if (failedResponse?.error) {
      throw failedResponse.error
    }

    setTimeEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (!selectedIds.has(entry.id)) return entry
        return { ...entry, status: entry.isBillable === false ? 'invoiced' : 'approved' }
      }),
    )
  }

  async function handleGenerateInvoice(clientId: string, entryIds: string[], totalAmount: number) {
    const invoiceDate = getTodayIsoDate()

    const invoiceDraft: Omit<Invoice, 'id'> = {
      clientId,
      invoiceNumber: getNextInvoiceNumber(invoices, invoiceDate),
      date: invoiceDate,
      totalAmount,
      status: 'draft',
    }

    const selectedIds = new Set(entryIds)

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([toInvoiceInsert(invoiceDraft)])
      .select('*')
      .single()

    if (invoiceError) {
      throw new Error(invoiceError.message)
    }

    const invoice = mapInvoiceRow(invoiceData as InvoiceRow)

    const { error: updateError } = await supabase
      .from('time_entries')
      .update({ status: 'invoiced', invoice_id: invoice.id })
      .in('id', entryIds)

    if (updateError) {
      throw new Error(updateError.message)
    }

    setInvoices((currentInvoices) => [invoice, ...currentInvoices])
    setTimeEntries((currentEntries) =>
      currentEntries.map((entry) =>
        selectedIds.has(entry.id) ? { ...entry, status: 'invoiced', invoiceId: invoice.id } : entry,
      ),
    )

    return invoice
  }

  async function handleUpdateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const updatedInvoice = mapInvoiceRow(data as InvoiceRow)
    setInvoices((current) =>
      current.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
    )
  }

  async function handleCreatePurchase(purchase: NewPurchase) {
    const { data, error } = await supabase
      .from('purchases')
      .insert([toPurchaseInsert(purchase)])
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const createdPurchase = mapPurchaseRow(data as PurchaseRow)
    setPurchases((currentPurchases) => [createdPurchase, ...currentPurchases])
    return createdPurchase
  }

  async function handleUpdatePurchase(purchaseId: string, data: Partial<NewPurchase>) {
    const updateData: Record<string, string | number | null> = {}

    if (data.supplierName !== undefined) updateData.supplier_name = data.supplierName
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.requestedBy !== undefined) updateData.requested_by = data.requestedBy
    if (data.orderNumber !== undefined) updateData.order_number = data.orderNumber
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.status !== undefined) updateData.status = data.status
    if (data.expectedDate !== undefined) updateData.expected_date = data.expectedDate
    if (data.receivedDate !== undefined) updateData.received_date = data.receivedDate
    if (data.invoiceReference !== undefined) updateData.invoice_reference = data.invoiceReference
    if (data.invoiceAttachmentName !== undefined) updateData.invoice_attachment_name = data.invoiceAttachmentName
    if (data.invoiceAttachmentDataUrl !== undefined) updateData.invoice_attachment_data_url = data.invoiceAttachmentDataUrl

    const { data: updatedData, error } = await supabase
      .from('purchases')
      .update(updateData)
      .eq('id', purchaseId)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const updatedPurchase = mapPurchaseRow(updatedData as PurchaseRow)
    setPurchases((currentPurchases) =>
      currentPurchases.map((purchase) => (purchase.id === purchaseId ? updatedPurchase : purchase)),
    )
  }

  async function handleDeletePurchase(purchaseId: string) {
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', purchaseId)

    if (error) {
      throw new Error(error.message)
    }

    setPurchases((currentPurchases) => currentPurchases.filter((purchase) => purchase.id !== purchaseId))
  }

  function renderActiveView() {
    if (activeView === 'settings') {
      return (
        <SettingsView
          userId={userId}
          initialSettings={companySettings}
          initialLogoSrc={logoSrc}
          onSaved={(newSettings, newLogoSrc) => {
            setCompanySettings(newSettings)
            setLogoSrc(newLogoSrc)
          }}
        />
      )
    }

    if (activeView === 'dashboard') {
      return <Dashboard projects={projects} timeEntries={timeEntries} tasks={tasks} />
    }

    if (activeView === 'tracker') {
      return (
        <div className="flex flex-col gap-8">
          <NewProjectForm
            clients={clients}
            onCreateProject={handleAddProject}
          />
          <TimeTracker
            clients={clients}
            projects={projects}
            entries={timeEntries}
            onAddEntry={handleAddTimeEntry}
          />
          <ProjectList
            clients={clients}
            userId={userId}
            refreshTrigger={projectListRefreshTrigger}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onTaskChange={handleTaskChange}
          />
        </div>
      )
    }

    if (activeView === 'purchases') {
      return (
        <PurchasesView
          purchases={purchases}
          currentUserName={session?.user.user_metadata?.name ?? session?.user.email ?? ''}
          onCreatePurchase={handleCreatePurchase}
          onUpdatePurchase={handleUpdatePurchase}
          onDeletePurchase={handleDeletePurchase}
        />
      )
    }

    if (activeView === 'history') {
      return (
        <Historia
          clients={clients}
          invoices={invoices}
          projects={projects}
          timeEntries={timeEntries}
          logoSrc={logoSrc}
          companySettings={companySettings}
        />
      )
    }

    if (activeView === 'clients') {
      return (
        <ClientsView
          clients={clients}
          onCreateClient={handleAddClient}
          onUpdateClient={handleUpdateClient}
          onDeleteClient={handleDeleteClient}
        />
      )
    }

    return (
      <div className="flex flex-col gap-8">
        <ApprovalView
          clients={clients}
          projects={projects}
          timeEntries={timeEntries}
          onApproveEntries={handleApproveEntries}
        />

        <InvoicingView
          clients={clients}
          invoices={invoices}
          projects={projects}
          timeEntries={timeEntries}
          logoSrc={logoSrc}
          companySettings={companySettings}
          onGenerateInvoice={handleGenerateInvoice}
          onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
        />
      </div>
    )
  }

  if (session === undefined) {
    return null
  }

  if (!session) {
    return <AuthView />
  }

  const userId = session.user.id

  const isSideView = activeView === 'clients' || activeView === 'purchases' || activeView === 'settings'

  const sidebarDrawer = (
    <>
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-2xl border-2 border-slate-400 bg-white px-3 py-2 text-slate-900 shadow-sm transition hover:bg-slate-100"
        aria-label="Avaa valikko"
      >
        ☰
      </button>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex justify-start">
          <div
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-50 flex h-full w-64 flex-col gap-2 bg-white px-4 py-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Valikko</p>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl border-2 border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            {sidebarItems.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setActiveView(item.id); setSidebarOpen(false) }}
                  className={`rounded-2xl px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-2 border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10'
                      : 'border-2 border-slate-400 bg-white text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={`block text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                    {item.hint}
                  </span>
                </button>
              )
            })}
          </aside>
        </div>
      )}
    </>
  )

  const sideViewTitle =
    activeView === 'clients'
      ? 'Asiakkaat'
      : activeView === 'purchases'
        ? 'Hankinnat'
        : 'Asetukset'
  const sideViewHint =
    activeView === 'clients'
      ? 'Asiakashallinta'
      : activeView === 'purchases'
        ? 'Hankinnat ja PO:t'
        : 'Yritystiedot ja logo'

  if (isSideView) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        {sidebarDrawer}
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <header className="rounded-[2rem] border-2 border-slate-400 bg-white/90 px-6 py-8 shadow-sm shadow-slate-300/70 backdrop-blur sm:px-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {sideViewTitle}
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                  {sideViewHint}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-700">
                  {session.user.user_metadata?.name ?? session.user.email}
                </span>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-2xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Kirjaudu ulos
                </button>
              </div>
            </div>
          </header>
          {isDataLoading ? (
            <div className="flex items-center justify-center rounded-3xl border-2 border-slate-400 bg-white/95 p-16 shadow-sm shadow-slate-300/60">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
                <p className="text-sm font-medium text-slate-500">Ladataan tietoja...</p>
              </div>
            </div>
          ) : (
            renderActiveView()
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      {sidebarDrawer}
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border-2 border-slate-400 bg-white/90 px-6 py-8 shadow-sm shadow-slate-300/70 backdrop-blur sm:px-8">
          <div className="flex items-center justify-between">
            <span />
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">
                {session.user.user_metadata?.name ?? session.user.email}
              </span>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="rounded-2xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Kirjaudu ulos
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Laskutus ja projektinhallinta
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                Hallitse asiakasprojektit ja päivittäiset tuntikirjaukset yhdestä kevyestä käyttöliittymästä.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-950 px-5 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Asiakkaat</p>
                <p className="mt-2 text-2xl font-semibold">{clients.length}</p>
              </div>
              <div className="rounded-2xl border-2 border-slate-400 bg-white px-5 py-4 text-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projektit</p>
                <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
              </div>
              <div className="rounded-2xl border-2 border-slate-400 bg-white px-5 py-4 text-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Laskut</p>
                <p className="mt-2 text-2xl font-semibold">{invoices.length}</p>
              </div>
              <div className="rounded-2xl border-2 border-slate-400 bg-white px-5 py-4 text-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Avoimet hankinnat</p>
                <p className="mt-2 text-2xl font-semibold">{openPurchaseCount}</p>
              </div>
            </div>
          </div>

          {dataError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {dataError}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-4 border-t-2 border-slate-400 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap gap-3" aria-label="Päänavigaatio">
              {navigationItems.map((item) => {
                const isActive = activeView === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`rounded-2xl px-4 py-3 text-left transition ${isActive
                      ? 'border-2 border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10'
                      : 'border-2 border-slate-400 bg-white text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`block text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.hint}
                    </span>
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Luonnokset</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{draftCount}</p>
                </div>
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Hyväksytyt</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{approvedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {isDataLoading ? (
          <div className="flex items-center justify-center rounded-3xl border-2 border-slate-400 bg-white/95 p-16 shadow-sm shadow-slate-300/60">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
              <p className="text-sm font-medium text-slate-500">Ladataan tietoja...</p>
            </div>
          </div>
        ) : (
          renderActiveView()
        )}
      </div>
    </main>
  )
}

export default App
