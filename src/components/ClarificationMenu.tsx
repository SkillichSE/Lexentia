export function ClarificationMenu({
  question,
  options,
  onSelect,
}: {
  question: string
  options: string[]
  onSelect: (value: string) => void
}) {
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
    </div>
  )
}

