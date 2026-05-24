import katex from 'katex'
import DOMPurify from 'dompurify'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Parses a text string and converts $$math$$ and $math$ into KaTeX rendered HTML.
 */
export function renderLatex(text?: string | null): string {
  if (!text) return ''
  
  let rendered = escapeHtml(text)
  
  // Replace block math $$...$$
  rendered = rendered.replace(/\$\$(.*?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false })
    } catch {
      return `$$${math}$$`
    }
  })

  // Replace inline math $...$
  rendered = rendered.replace(/\$(.*?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false })
    } catch {
      return `$${math}$`
    }
  })

  // Sanitize the final HTML string using DOMPurify to eliminate all XSS risk
  return DOMPurify.sanitize(rendered, {
    USE_PROFILES: { html: true, mathMl: true, svg: true }
  })
}
export default renderLatex
