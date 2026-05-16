export function getTodayIsoDate() {
    return new Date().toISOString().slice(0, 10)
}

export function getCurrentMonthKey() {
    const [year, month] = getTodayIsoDate().slice(0, 7).split('-')
    return `${month}-${year}`
}

export function addDaysToIsoDate(isoDate: string, days: number) {
    const date = new Date(`${isoDate}T00:00:00`)
    date.setDate(date.getDate() + days)
    return date.toISOString().slice(0, 10)
}

export function formatFinnishDate(isoDate: string) {
    return new Intl.DateTimeFormat('fi-FI').format(new Date(`${isoDate}T00:00:00`))
}