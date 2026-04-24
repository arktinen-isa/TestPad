import { useEffect, useRef } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

interface Part {
  type: 'text' | 'code'
  content: string
  lang?: string
}

function parseQuestion(text: string): Part[] {
  const parts: Part[] = []
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'plaintext', content: match[2] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

interface CodeBlockProps {
  code: string
  lang: string
}

function CodeBlock({ code, lang }: CodeBlockProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.removeAttribute('data-highlighted')
    hljs.highlightElement(ref.current)
  }, [code, lang])

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10">
      {lang && lang !== 'plaintext' && (
        <div className="px-4 py-1.5 bg-white/5 border-b border-white/10 text-xs text-slate-400 font-mono">
          {lang}
        </div>
      )}
      <pre className="m-0 overflow-x-auto text-sm leading-relaxed">
        <code ref={ref} className={lang ? `language-${lang}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  )
}

interface QuestionTextProps {
  text: string
  className?: string
}

export default function QuestionText({ text, className = '' }: QuestionTextProps) {
  const parts = parseQuestion(text)

  return (
    <div className={className}>
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <CodeBlock key={i} code={part.content} lang={part.lang || 'plaintext'} />
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {part.content}
          </span>
        )
      )}
    </div>
  )
}
