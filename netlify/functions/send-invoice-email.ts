import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const apiKey = process.env.BREVO_API_KEY
    const senderEmail = process.env.BREVO_SENDER_EMAIL
    const senderName = process.env.BREVO_SENDER_NAME ?? 'Iisiduuni'

    if (!apiKey || !senderEmail) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Brevo credentials not configured' }) }
    }

    let body: {
        recipientEmail?: string
        recipientName?: string
        subject?: string
        htmlContent?: string
        attachmentName?: string
        attachmentContent?: string
    }

    try {
        body = JSON.parse(event.body ?? '{}')
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
    }

    const { recipientEmail, recipientName, subject, htmlContent, attachmentName, attachmentContent } = body

    if (!recipientEmail || !subject || !htmlContent) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) }
    }

    const payload: Record<string, unknown> = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: recipientName ?? recipientEmail }],
        subject,
        htmlContent,
    }

    if (attachmentName && attachmentContent) {
        payload.attachment = [{ name: attachmentName, content: attachmentContent }]
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify(payload),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: (data as { message?: string }).message ?? 'Brevo error' }),
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: true }),
        }
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
        }
    }
}
