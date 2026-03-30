import { useState } from 'react'

export function ClarificationMenu({
  question,
  options,
  onSelect,
}: {
  question: string
  options: string[]
  onSelect: (value: string) => void
}) {
  const [customInput, setCustomInput] = useState('')

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim()
    if (trimmed) {
      onSelect(trimmed)
      setCustomInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomSubmit()
    }
  }

  return (
    <div className="lex-clarifyMenu" role="region" aria-label="Clarification menu">
      <div className="lex-clarifyQuestion">{question}</div>
      <div className="lex-clarifyOptions">
        {options.map((opt) => (
          <button
            key={opt}
            className="lex-btn lex-btn--clarify"
            onClick={() => onSelect(opt)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="lex-clarifyCustom">
        <input
          type="text"
          className="lex-clarifyInput"
          placeholder="Or type your own answer…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="lex-btn lex-btn--clarifyCustom"
          onClick={handleCustomSubmit}
          disabled={!customInput.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}

