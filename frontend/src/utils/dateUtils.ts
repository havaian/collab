export type DateInput = Date | string | undefined | null

/**
 * Safely converts various date inputs to a Date object
 */
export const toDate = (date: DateInput): Date | null => {
  if (!date) return null
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return isNaN(dateObj.getTime()) ? null : dateObj
}

/**
 * Format date as relative time (e.g., "2 days ago", "in 3 hours")
 */
export const formatRelativeTime = (date: DateInput): string => {
  const dateObj = toDate(date)
  
  if (!dateObj) return 'Unknown'
  
  try {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'Unknown'
  }
}

/**
 * Format date as a long readable format (e.g., "January 15, 2024")
 */
export const formatLongDate = (date: DateInput): string => {
  const dateObj = toDate(date)
  
  if (!dateObj) return 'Unknown'
  
  try {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting long date:', error)
    return 'Unknown'
  }
}

/**
 * Format date and time (e.g., "Jan 15, 2024 at 3:30 PM")
 */
export const formatDateTime = (date: DateInput): string => {
  const dateObj = toDate(date)
  
  if (!dateObj) return 'Unknown'
  
  try {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date time:', error)
    return 'Unknown'
  }
}

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Check if a date is today
 */
export const isToday = (date: DateInput): boolean => {
  const dateObj = toDate(date)
  if (!dateObj) return false
  
  const today = new Date()
  return dateObj.toDateString() === today.toDateString()
}

/**
 * Check if a date is within the last week
 */
export const isWithinLastWeek = (date: DateInput): boolean => {
  const dateObj = toDate(date)
  if (!dateObj) return false
  
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return dateObj > weekAgo
}