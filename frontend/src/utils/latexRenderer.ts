import katex from 'katex'

/**
 * Parses a text string and converts $$math$$ and $math$ into KaTeX rendered HTML.
 */
export function renderLatex(text?: string | null): string {
  if (!text) return ''
  
  let rendered = text
  
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

  return rendered
}
export default renderLatex
