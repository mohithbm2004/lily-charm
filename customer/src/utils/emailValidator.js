/**
 * Client-Side Email Validation & Domain Typo Detection Engine
 * STRICT ENFORCEMENT: Only @gmail.com email addresses are allowed.
 */

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

export function maskEmailForDisplay(email) {
  if (!email || !email.includes('@')) return email
  const [name, domain] = email.split('@')
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`
  }
  return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}@${domain}`
}

export function isValidEmailSyntax(email) {
  if (!email || typeof email !== 'string') return false
  const clean = email.trim()
  if (clean.length < 5 || clean.length > 254) return false
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return re.test(clean)
}

/**
 * Checks if the domain is not gmail.com and provides a suggestion to correct to gmail.com
 */
export function detectDomainTypo(email) {
  const clean = normalizeEmail(email)
  if (!clean.includes('@')) return null

  const parts = clean.split('@')
  if (parts.length !== 2) return null

  const [username, domain] = parts

  if (domain !== 'gmail.com') {
    const suggestedEmail = `${username}@gmail.com`
    return {
      originalDomain: domain,
      correctedDomain: 'gmail.com',
      suggestedEmail,
      suggestionMessage: `Did you mean ${suggestedEmail}?`,
    }
  }

  return null
}

export function validateAndNormalizeEmail(email) {
  const normalized = normalizeEmail(email)

  if (!normalized) {
    return {
      isValid: false,
      normalized: '',
      error: 'Email address is required.',
    }
  }

  if (!isValidEmailSyntax(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Please enter a valid email address format (e.g. customer@gmail.com).',
    }
  }

  const typoInfo = detectDomainTypo(normalized)

  if (typoInfo) {
    return {
      isValid: false,
      normalized,
      hasTypo: true,
      typoInfo,
      error: `Only @gmail.com email addresses are allowed. Did you mean ${typoInfo.suggestedEmail}?`,
    }
  }

  return {
    isValid: true,
    normalized,
    hasTypo: false,
    typoInfo: null,
    error: null,
  }
}

export default {
  normalizeEmail,
  maskEmailForDisplay,
  isValidEmailSyntax,
  detectDomainTypo,
  validateAndNormalizeEmail,
}
