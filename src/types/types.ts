export interface Client {
    id: string
    name: string
    businessId: string
    email: string
    billingEmail?: string | null
    contactPerson?: string | null
    billingAddress?: string | null
    postalCode?: string | null
    city?: string | null
}

export type NewClient = Omit<Client, 'id'>

export interface ClientRow {
    id: string
    name: string
    business_id: string
    email: string
    billing_email?: string | null
    contact_person?: string | null
    billing_address?: string | null
    postal_code?: string | null
    city?: string | null
}

export type ProjectStatus = 'planned' | 'active' | 'on-hold' | 'completed' | 'archived'

export interface Project {
    id: string
    clientId: string
    name: string
    hourlyRate: number
    budgetHours: number
    status: ProjectStatus
}

export type NewProject = Omit<Project, 'id'>

export interface ProjectRow {
    id: string
    client_id: string
    name: string
    hourly_rate: number
    budget_hours: number
    status: ProjectStatus
}

export type TimeEntryStatus = 'draft' | 'approved' | 'invoiced'

export interface TimeEntry {
    id: string
    projectId: string
    userId?: string | null
    date: string
    duration: number
    description: string
    isBillable: boolean
    status: TimeEntryStatus
    invoiceId?: string | null
}

export interface TimeEntryRow {
    id: string
    project_id: string
    user_id?: string | null
    date: string
    duration: number
    description: string
    is_billable: boolean
    status: TimeEntryStatus
    invoice_id?: string | null
}

export type NewTimeEntry = Omit<TimeEntry, 'id'>

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface Invoice {
    id: string
    clientId: string
    invoiceNumber: string
    date: string
    totalAmount: number
    status: InvoiceStatus
}

export interface InvoiceRow {
    id: string
    client_id: string
    invoice_number: string
    date?: string
    created_at?: string
    total_amount: number
    status: InvoiceStatus
}