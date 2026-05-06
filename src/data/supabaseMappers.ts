import type {
    Client,
    ClientRow,
    Invoice,
    InvoiceRow,
    NewClient,
    NewProject,
    NewTimeEntry,
    Project,
    ProjectRow,
    TimeEntry,
    TimeEntryRow,
} from '../types/types'
import { getTodayIsoDate } from '../utils/date'

export function mapClientRow(row: ClientRow): Client {
    return {
        id: row.id,
        name: row.name,
        businessId: row.business_id,
        email: row.email,
        billingEmail: row.billing_email ?? row.email,
        contactPerson: row.contact_person ?? null,
        billingAddress: row.billing_address ?? null,
        postalCode: row.postal_code ?? null,
        city: row.city ?? null,
    }
}

export function toClientInsert(client: NewClient) {
    return {
        name: client.name,
        business_id: client.businessId,
        email: client.email,
        billing_email: client.billingEmail,
        contact_person: client.contactPerson,
        billing_address: client.billingAddress,
        postal_code: client.postalCode,
        city: client.city,
    }
}

export function mapProjectRow(row: ProjectRow): Project {
    return {
        id: row.id,
        clientId: row.client_id,
        name: row.name,
        hourlyRate: row.hourly_rate,
        budgetHours: row.budget_hours,
        status: row.status,
    }
}

export function toProjectInsert(project: NewProject) {
    return {
        client_id: project.clientId,
        name: project.name,
        hourly_rate: project.hourlyRate,
        budget_hours: project.budgetHours,
        status: project.status,
    }
}

export function mapTimeEntryRow(row: TimeEntryRow): TimeEntry {
    return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        date: row.date,
        duration: row.duration,
        description: row.description,
        isBillable: row.is_billable,
        status: row.status,
        invoiceId: row.invoice_id ?? null,
    }
}

export function mapInvoiceRow(row: InvoiceRow): Invoice {
    return {
        id: row.id,
        clientId: row.client_id,
        invoiceNumber: row.invoice_number,
        date: row.date ?? row.created_at?.slice(0, 10) ?? getTodayIsoDate(),
        totalAmount: row.total_amount,
        status: row.status,
    }
}

export function toTimeEntryInsert(entry: NewTimeEntry) {
    return {
        project_id: entry.projectId,
        date: entry.date,
        duration: entry.duration,
        description: entry.description,
        is_billable: entry.isBillable,
        status: entry.status,
    }
}

export function toInvoiceInsert(invoice: Omit<Invoice, 'id'>) {
    return {
        client_id: invoice.clientId,
        invoice_number: invoice.invoiceNumber,
        total_amount: invoice.totalAmount,
        status: invoice.status,
    }
}