import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI API key not configured' }) }
    }

    let body: { systemPrompt?: string; userContent?: string }
    try {
        body = JSON.parse(event.body ?? '{}')
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
    }

    const { systemPrompt, userContent } = body
    if (!systemPrompt || !userContent) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing systemPrompt or userContent' }) }
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                ],
                max_tokens: 1200,
                temperature: 0.4,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: (data as { error?: { message?: string } }).error?.message ?? 'OpenAI error' }),
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
        }
    }
}
