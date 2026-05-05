import { useEffect } from 'react'

interface OrderingQuestionProps {
  orderingItems: string[]
  onChange: (items: string[]) => void
  value: string[]
}

export default function OrderingQuestion({
  orderingItems,
  onChange,
  value,
}: OrderingQuestionProps) {
  // Initialize value if empty
  useEffect(() => {
    if (!value || value.length === 0) {
      onChange(orderingItems)
    }
  }, [orderingItems, value, onChange])

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...value]
    const temp = updated[index]
    updated[index] = updated[index - 1]!
    updated[index - 1] = temp!
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === value.length - 1) return
    const updated = [...value]
    const temp = updated[index]
    updated[index] = updated[index + 1]!
    updated[index + 1] = temp!
    onChange(updated)
  }

  const itemsToRender = value.length > 0 ? value : orderingItems

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
        Розставте кроки чи елементи в правильному порядку:
      </p>

      <div className="space-y-2">
        {itemsToRender.map((item, index) => {
          const isFirst = index === 0
          const isLast = index === itemsToRender.length - 1

          return (
            <div
              key={item}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg hover:border-purple-500/20 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4 truncate">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center font-unbounded text-xs font-black shadow-inner">
                  {index + 1}
                </div>
                <span className="font-semibold text-slate-200 truncate">{item}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                {/* Move Up */}
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={isFirst}
                  className={`p-2 rounded-xl transition-all ${
                    isFirst
                      ? 'text-white/10 cursor-not-allowed'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05] active:scale-95'
                  }`}
                  title="Перемістити вгору"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={isLast}
                  className={`p-2 rounded-xl transition-all ${
                    isLast
                      ? 'text-white/10 cursor-not-allowed'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05] active:scale-95'
                  }`}
                  title="Перемістити вниз"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
