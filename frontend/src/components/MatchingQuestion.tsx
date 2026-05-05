import { useState, useEffect } from 'react'

interface MatchingQuestionProps {
  matchingLeft: string[]
  matchingRight: string[]
  onChange: (pairs: Array<{ left: string; right: string }>) => void
  value: Array<{ left: string; right: string }>
}

export default function MatchingQuestion({
  matchingLeft,
  matchingRight,
  onChange,
  value,
}: MatchingQuestionProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)

  // Auto-pair when both columns have a selection
  useEffect(() => {
    if (selectedLeft && selectedRight) {
      // Check if left already has a pair and remove it
      const filtered = value.filter(
        (p) => p.left !== selectedLeft && p.right !== selectedRight
      )
      const updated = [...filtered, { left: selectedLeft, right: selectedRight }]
      onChange(updated)
      setSelectedLeft(null)
      setSelectedRight(null)
    }
  }, [selectedLeft, selectedRight, value, onChange])

  const handleRemovePair = (leftItem: string) => {
    onChange(value.filter((p) => p.left !== leftItem))
  }

  const getRightPair = (item: string) => value.find((p) => p.left === item)?.right

  // Determine if a right item is already paired
  const isRightPaired = (item: string) => value.some((p) => p.right === item)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 mb-2">Колонка А</h3>
          {matchingLeft.map((item, index) => {
            const pairedWith = getRightPair(item)
            const isSelected = selectedLeft === item
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedLeft(isSelected ? null : item)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-250 ${
                  isSelected
                    ? 'bg-purple-accent/20 border-purple-accent shadow-[0_0_20px_rgba(124,58,237,0.3)] scale-[1.02]'
                    : pairedWith
                    ? 'bg-white/[0.02] border-green-500/30 text-slate-400'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <span className="font-medium">{item}</span>
                {pairedWith && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/30 text-green-400 px-2.5 py-1 rounded-lg animate-fade-in">
                    З'єднано
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-pink-300 mb-2">Колонка Б</h3>
          {matchingRight.map((item, index) => {
            const isSelected = selectedRight === item
            const paired = isRightPaired(item)
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedRight(isSelected ? null : item)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-250 ${
                  isSelected
                    ? 'bg-pink-500/10 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)] scale-[1.02]'
                    : paired
                    ? 'bg-white/[0.02] border-green-500/30 text-slate-400'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <span className="font-medium">{item}</span>
                {paired && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/30 text-green-400 px-2.5 py-1 rounded-lg animate-fade-in">
                    З'єднано
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Helper instruction */}
      {(!selectedLeft || !selectedRight) && value.length < matchingLeft.length && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-slate-400 text-xs animate-pulse">
          Оберіть один елемент з Колонки А, а потім відповідний елемент з Колонки Б для з'єднання.
        </div>
      )}

      {/* Pairs Display */}
      {value.length > 0 && (
        <div className="space-y-3 animate-fade-in pt-4 border-t border-white/5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Встановлені відповідності:</h4>
          <div className="grid grid-cols-1 gap-2">
            {value.map((pair, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#160D33]/40 border border-purple-500/10 text-sm animate-slide-in"
              >
                <div className="flex items-center gap-4 truncate">
                  <span className="font-semibold text-purple-300 truncate">{pair.left}</span>
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="font-semibold text-pink-300 truncate">{pair.right}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePair(pair.left)}
                  className="p-1.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
