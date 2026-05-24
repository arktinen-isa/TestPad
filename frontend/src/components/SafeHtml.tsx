import React from 'react'
import DOMPurify from 'dompurify'

interface SafeHtmlProps {
  /** Pre-processed HTML string to sanitize and inject. Sanitized with DOMPurify before insertion. */
  html: string
  className?: string
}

function domNodeToReactElement(node: Node, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element
    const tagName = element.tagName.toLowerCase()

    const props: Record<string, any> = { key }
    Array.from(element.attributes).forEach(attr => {
      const name = attr.name === 'class' ? 'className' : attr.name
      Object.assign(props, { [name]: attr.value })
    })

    const children: React.ReactNode[] = Array.from(element.childNodes).map((childNode, index) =>
      domNodeToReactElement(childNode, `${key}-${index}`)
    )

    return React.createElement(tagName, props, ...children)
  }

  return null
}

/**
 * Renders sanitized HTML securely without dangerouslySetInnerHTML or innerHTML.
 * Sanitization is done via DOMPurify before parsing to React nodes.
 */
export default function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ADD_TAGS: [
      'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac',
      'mspace', 'mtext', 'annotation', 'semantics', 'mover', 'munder',
    ],
    ADD_ATTR: ['xmlns', 'display', 'encoding'],
  })

  // Parse sanitized HTML into React elements securely using browser DOMParser
  const parser = new DOMParser()
  const doc = parser.parseFromString(sanitizedHtml, 'text/html')
  const reactElements = Array.from(doc.body.childNodes).map((node, index) =>
    domNodeToReactElement(node, `safe-html-node-${index}`)
  )

  return <span className={className}>{reactElements}</span>
}
