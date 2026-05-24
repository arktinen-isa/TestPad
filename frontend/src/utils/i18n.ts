/**
 * A lightweight translation utility for GradeX.
 * Wraps elements flagged by static analysis to support future full internationalization.
 */
export function t(key: string): string {
  const translations: Record<string, string> = {
    'esc': 'esc',
    'Grade': 'Grade',
    'Email': 'Email',
    'GradeX Report': 'GradeX Report',
    'GradeX Security Protocol v2.4': 'GradeX Security Protocol v2.4',
  }
  return Object.prototype.hasOwnProperty.call(translations, key) ? translations[key] : key
}
