import { useState } from 'react'
import { Question } from '../../types'
import QuestionText from '../QuestionText'

interface QuestionPreviewModalProps {
  question: Question
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  SINGLE: 'Одна відповідь',
  MULTI: 'Декілька відповідей',
  MATCHING: 'Відповідності',
  ORDERING: 'Послідовність',
}

const TYPE_COLORS: Record<string, string> = {
  SINGLE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  MULTI: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  MATCHING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ORDERING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

function getPreviewTypeColor(type: string): string {
  if (type === 'SINGLE') return TYPE_COLORS.SINGLE
  if (type === 'MULTI') return TYPE_COLORS.MULTI
  if (type === 'MATCHING') return TYPE_COLORS.MATCHING
  if (type === 'ORDERING') return TYPE_COLORS.ORDERING
  return 'bg-white/5 text-slate-400 border-white/10'
}

function getPreviewTypeLabel(type: string): string {
  if (type === 'SINGLE') return TYPE_LABELS.SINGLE
  if (type === 'MULTI') return TYPE_LABELS.MULTI
  if (type === 'MATCHING') return TYPE_LABELS.MATCHING
  if (type === 'ORDERING') return TYPE_LABELS.ORDERING
  return type
}

export default function QuestionPreviewModal({ question, onClose }: QuestionPreviewModalProps) {
  const [showCorrect, setShowCorrect] = useState(true)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [matchingSelections, setMatchingSelections] = useState<Map<string, string>>(new Map())
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  
  // For interactive ordering
  const [orderingState, setOrderingState] = useState<string[]>(
    question.type === 'ORDERING' ? [...(question.orderingItems || [])].sort(() => Math.random() - 0.5) : []
  )

  const handleAnswerClick = (answerId: string) => {
    if (question.type === 'SINGLE') {
      setSelectedAnswers([answerId])
    } else if (question.type === 'MULTI') {
      setSelectedAnswers((prev) =>
        prev.includes(answerId) ? prev.filter((id) => id !== answerId) : [...prev, answerId]
      )
    }
  }

  const handleLeftClick = (item: string) => {
    setSelectedLeft(selectedLeft === item ? null : item)
  }

  const handleRightClick = (item: string) => {
    if (!selectedLeft) return
    setMatchingSelections((prev) => {
      const next = new Map(prev)
      next.set(selectedLeft, item)
      return next
    })
    setSelectedLeft(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...orderingState]
    const [removed] = updated.splice(index - 1, 1)
    updated.splice(index, 0, removed!)
    setOrderingState(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === orderingState.length - 1) return
    const updated = [...orderingState]
    const [removed] = updated.splice(index, 1)
    updated.splice(index + 1, 0, removed!)
    setOrderingState(updated)
  }

  const resetInteractive = () => {
    setSelectedAnswers([])
    setMatchingSelections(new Map())
    setSelectedLeft(null)
    if (question.type === 'ORDERING') {
      setOrderingState([...(question.orderingItems || [])].sort(() => Math.random() - 0.5))
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-3xl animate-zoom-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="font-unbounded text-lg font-bold text-white">Попередній перегляд</h2>
            <span className={`status-badge border text-xs ${getPreviewTypeColor(question.type)}`}>
              {getPreviewTypeLabel(question.type)}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Question Metadata Row */}
        <div className="flex flex-wrap gap-2.5 mb-6">
          {question.category && (
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Категорія: <strong className="text-white">{question.category.name}</strong>
            </span>
          )}
          {question.timeLimitSeconds && (
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Час: <strong className="text-white">{question.timeLimitSeconds} сек</strong>
            </span>
          )}
          {question.difficultyIndex !== undefined && question.difficultyIndex !== null && (
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              Складність: <strong className="text-white">{Math.round(question.difficultyIndex * 100)}%</strong>
            </span>
          )}
          {question.totalResponsesCount && question.totalResponsesCount > 0 ? (
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              Відповідей: <strong className="text-white">{question.totalResponsesCount}</strong>
            </span>
          ) : null}
        </div>

        {/* Preview Content */}
        <div className="space-y-6 text-left">
          {/* Question Text Box */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Текст питання:</span>
            <QuestionText text={question.text} className="text-white text-base leading-relaxed" />
          </div>

          {/* Question Image if present */}
          {question.imageUrl && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Прикріплене зображення:</span>
              <div className="rounded-2xl overflow-hidden border border-white/10 max-h-64 flex justify-center bg-black/35 p-2">
                <img src={question.imageUrl} alt="Зображення питання" className="max-w-full max-h-60 object-contain rounded-lg shadow-md" />
              </div>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowCorrect(true); resetInteractive() }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  showCorrect
                    ? 'bg-purple-accent/20 border-purple-accent text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Правильні відповіді
              </button>
              <button
                type="button"
                onClick={() => { setShowCorrect(false); resetInteractive() }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  !showCorrect
                    ? 'bg-purple-accent/20 border-purple-accent text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Інтерактивне тестування
              </button>
            </div>
            {!showCorrect && (
              <button
                type="button"
                onClick={resetInteractive}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium underline"
              >
                Скинути спробу
              </button>
            )}
          </div>

          {/* Render Choices based on mode */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              {showCorrect ? 'Правильна комбінація:' : 'Спробуйте відповісти:'}
            </span>

            {/* SINGLE / MULTI */}
            {(question.type === 'SINGLE' || question.type === 'MULTI') && (
              <div className="space-y-2.5">
                {question.answers.map((answer) => {
                  const isSelected = selectedAnswers.includes(answer.id)
                  const isCorrect = answer.isCorrect
                  
                  let cardStyle = 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  let circleStyle = 'border-white/30'
                  let circleDot = null

                  if (showCorrect) {
                    if (isCorrect) {
                      cardStyle = 'bg-green-500/10 border-green-500/30 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.05)]'
                      circleStyle = 'border-green-500 bg-green-500/20'
                      circleDot = <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    }
                  } else {
                    if (isSelected) {
                      cardStyle = 'bg-purple-accent/20 border-purple-accent text-white shadow-[0_0_15px_rgba(124,58,237,0.15)] scale-[1.01]'
                      circleStyle = 'border-purple-accent bg-purple-accent/20'
                      circleDot = <span className="w-2.5 h-2.5 rounded-full bg-purple-accent" />
                    }
                  }

                  return (
                    <button
                      key={answer.id}
                      type="button"
                      disabled={showCorrect}
                      onClick={() => handleAnswerClick(answer.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${cardStyle}`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${circleStyle}`}>
                        {circleDot}
                      </div>
                      <span className="font-semibold text-sm leading-relaxed">{answer.text}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* MATCHING */}
            {question.type === 'MATCHING' && (
              <div className="space-y-4">
                {showCorrect ? (
                  /* Correct Pairs side by side */
                  <div className="grid grid-cols-1 gap-2.5">
                    {question.matchingPairs?.map((pair, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-2xl bg-[#160D33]/40 border border-purple-500/10 text-sm hover:border-purple-500/25 transition-all"
                      >
                        <div className="flex-1 p-2.5 rounded-xl bg-purple-accent/5 border border-purple-accent/10 text-purple-200 font-semibold truncate">
                          {pair.left}
                        </div>
                        <div className="px-4 flex-shrink-0 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                        <div className="flex-1 p-2.5 rounded-xl bg-pink-500/5 border border-pink-500/10 text-pink-200 font-semibold truncate">
                          {pair.right}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Interactive matching */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">Колонка А</h4>
                        {question.matchingPairs?.map((pair, idx) => {
                          const item = pair.left
                          const pairedWith = matchingSelections.get(item)
                          const isSelected = selectedLeft === item
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleLeftClick(item)}
                              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left text-xs transition-all duration-200 ${
                                isSelected
                                  ? 'bg-purple-accent/20 border-purple-accent shadow-[0_0_15px_rgba(124,58,237,0.25)]'
                                  : pairedWith
                                  ? 'bg-white/[0.01] border-green-500/20 text-slate-400'
                                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                              }`}
                            >
                              <span className="font-semibold truncate pr-3">{item}</span>
                              {pairedWith && (
                                <span className="text-[9px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-md flex-shrink-0">
                                  З'єднано
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1">Колонка Б</h4>
                        {/* Shuffle right column slightly or just list them */}
                        {question.matchingPairs?.map((pair, idx) => {
                          const item = pair.right
                          const isPaired = Array.from(matchingSelections.values()).includes(item)
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!selectedLeft}
                              onClick={() => handleRightClick(item)}
                              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left text-xs transition-all duration-200 ${
                                isPaired
                                  ? 'bg-white/[0.01] border-green-500/20 text-slate-400'
                                  : selectedLeft
                                  ? 'bg-white/[0.03] border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-500/5'
                                  : 'bg-white/[0.02] border-white/5 opacity-55 cursor-not-allowed'
                              }`}
                            >
                              <span className="font-semibold truncate">{item}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Established pairings */}
                    {matchingSelections.size > 0 && (
                      <div className="space-y-2 pt-4 border-t border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">З'єднані вами пари:</span>
                        <div className="grid grid-cols-1 gap-2">
                          {Array.from(matchingSelections.entries()).map(([left, right], idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-[#160D33]/30 border border-purple-500/10 text-xs">
                              <div className="flex items-center gap-3 truncate">
                                <span className="font-bold text-purple-300 truncate">{left}</span>
                                <svg className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                <span className="font-bold text-pink-300 truncate">{right}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setMatchingSelections(prev => {
                                    const next = new Map(prev)
                                    next.delete(left)
                                    return next
                                  })
                                }}
                                className="p-1 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ORDERING */}
            {question.type === 'ORDERING' && (
              <div className="space-y-2">
                {showCorrect ? (
                  /* Correct sequential order */
                  (question.orderingItems || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/5 border border-green-500/20 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.02)]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center font-unbounded text-xs font-black">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-sm leading-relaxed">{item}</span>
                    </div>
                  ))
                ) : (
                  /* Interactive order moving */
                  orderingState.map((item, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === orderingState.length - 1
                    return (
                      <div
                        key={item}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 shadow hover:border-purple-500/10 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4 truncate">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center font-unbounded text-xs font-bold">
                            {idx + 1}
                          </div>
                          <span className="font-semibold text-slate-200 text-sm truncate">{item}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={isFirst}
                            className={`p-1.5 rounded-lg transition-all ${
                              isFirst ? 'text-white/10 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={isLast}
                            className={`p-1.5 rounded-lg transition-all ${
                              isLast ? 'text-white/10 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-6 mt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-6 py-2.5 rounded-xl font-bold text-xs"
          >
            Закрити прев'ю
          </button>
        </div>
      </div>
    </div>
  )
}
