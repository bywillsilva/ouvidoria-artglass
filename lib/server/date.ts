function cloneDate(date: Date) {
  return new Date(date.getTime())
}

export function addBusinessDays(baseDate: Date, amount: number) {
  const date = cloneDate(baseDate)
  let added = 0

  while (added < amount) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      added += 1
    }
  }

  return date
}

export function addHours(baseDate: Date, amount: number) {
  const date = cloneDate(baseDate)
  date.setHours(date.getHours() + amount)
  return date
}

export function startOfDay(date: Date) {
  const next = cloneDate(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function formatDateISO(date: Date) {
  return date.toISOString()
}

export function monthKey(dateString: string) {
  const date = new Date(dateString)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function diffInHours(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
}

export function diffInDays(start: string, end: string) {
  const startDate = startOfDay(new Date(start))
  const endDate = startOfDay(new Date(end))
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(dateString: string) {
  return new Date(dateString).getTime() < Date.now()
}
