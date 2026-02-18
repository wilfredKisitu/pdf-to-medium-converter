import { useMemo, useState } from 'react'
import hljs from 'highlight.js'
import { CopyIcon, CheckIcon } from './Icons.jsx'
import './CodeBlock.css'

export default function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)

  const highlighted = useMemo(() => {
    try {
      if (lang !== 'plaintext') {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      }
    } catch { /* unknown lang — fall through */ }
    return hljs.highlightAuto(code).value
  }, [code, lang])

  const copy = () => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      })
      .catch(() => {})
  }

  return (
    <div className="code-wrap">
      <div className="code-bar">
        <div className="code-dots">
          <span /><span /><span />
        </div>
        <span className="code-lang">{lang}</span>
        <button className={`copy-btn${copied ? ' copy-btn--ok' : ''}`} onClick={copy}>
          {copied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
        </button>
      </div>
      <div className="code-body">
        <pre>
          <code
            className={`hljs language-${lang}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  )
}
