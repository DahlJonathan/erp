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
    dueDate: string | null
}

export type NewProject = Omit<Project, 'id'>

export interface ProjectRow {
    id: string
    client_id: string
    name: string
    hourly_rate: number
    budget_hours: number
    status: ProjectStatus
    due_date: string | null
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

export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'paid'

export interface Purchase {
    id: string
    supplierName: string
    title: string
    description: string
    requestedBy: string
    orderNumber: string | null
    amount: number
    status: PurchaseStatus
    expectedDate: string | null
    receivedDate: string | null
    invoiceReference: string | null
    invoiceAttachmentName: string | null
    invoiceAttachmentDataUrl: string | null
    createdAt: string
}

export type NewPurchase = Omit<Purchase, 'id' | 'createdAt'>

export interface PurchaseRow {
    id: string
    supplier_name: string
    title: string
    description: string
    requested_by: string
    order_number: string | null
    amount: number
    status: PurchaseStatus
    expected_date: string | null
    received_date: string | null
    invoice_reference: string | null
    invoice_attachment_name: string | null
    invoice_attachment_data_url: string | null
    created_at: string
}

export type CompanySettings = {
    name: string
    businessId: string
    email: string
    phone: string
    street: string
    city: string
    iban: string
    bic: string
    paymentTerms: string
}

export const defaultCompanySettings: CompanySettings = {
    name: '',
    businessId: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    iban: '',
    bic: '',
    paymentTerms: '',
}

export interface UserSettingsRow {
    user_id: string
    company_name: string
    business_id: string
    email: string
    phone: string
    street: string
    city: string
    iban: string
    bic: string
    payment_terms: string
    logo_data_url: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
    id: string
    projectId: string
    userId: string
    title: string
    description: string
    status: TaskStatus
    dueDate: string | null
    createdAt: string
}

export type NewTask = Omit<Task, 'id' | 'createdAt'>

export interface TaskRow {
    id: string
    project_id: string
    user_id: string
    title: string
    description: string
    status: TaskStatus
    due_date: string | null
    created_at: string
}
