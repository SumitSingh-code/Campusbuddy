/** Validate & clean phone number. Returns 10 digits or null. */
export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2)
  if (digits.length === 10) return digits
  return null
}

/** Validate email format */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/** Validate password. Returns error string or null if valid. */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter'
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number'
  return null
}
