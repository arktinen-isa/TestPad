import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Category, QuestionType } from '../../types'

interface ExcelImportModalProps {
  categories: Category[]
  onClose: () => void
  onImport: (questions: any[]) => Promise<void>
}

export default function ExcelImportModal({ categories, onClose, onImport }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      parseFile(f)
    }
  }

  const parseFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        // Expected format: Text | Category | Type | A1 | C1 | A2 | C2 ...
        const questions = rows.slice(1).map(row => {
          if (!row[0]) return null
          
          const text = String(row[0])
          const catName = row[1] ? String(row[1]).trim() : ''
          const category = categories.find(c => c.name.toLowerCase() === catName.toLowerCase())
          
          const type = (String(row[2] || '').toUpperCase() === 'MULTI') ? 'MULTI' : 'SINGLE'
          
          const answers = []
          for (let i = 3; i < row.length; i += 2) {
            if (row[i]) {
              answers.push({
                text: String(row[i]),
                isCorrect: !!row[i+1]
              })
            }
          }

          if (answers.length < 2) return null

          return {
            text,
            categoryId: category?.id || categories[0]?.id,
            type,
            answers,
            isActive: true
          }
        }).filter(Boolean)

        setPreview(questions)
        setError(null)
      } catch (err) {
        setError('Помилка при читанні файлу. Перевірте формат.')
      }
    }
    reader.readAsBinaryString(f)
  }

  const handleImport = async () => {
    if (preview.length === 0) return
    setLoading(true)
    try {
      await onImport(preview)
      onClose()
    } catch (err) {
      setError('Помилка при імпорті на сервер.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-unbounded text-lg font-bold text-white">Імпорт питань з Excel</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="mb-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-purple-accent/50 hover:bg-purple-accent/5 transition-all cursor-pointer"
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
            <svg className="w-10 h-10 text-slate-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <p className="text-white font-medium">{file ? file.name : 'Оберіть XLSX файл'}</p>
            <p className="text-slate-500 text-xs mt-1">Формат: Текст | Категорія | Тип | Відповідь 1 | Вірна? | Відповідь 2 | Вірна? ...</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {preview.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Попередній перегляд ({preview.length} питань)</h3>
            <div className="space-y-3">
              {preview.map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white text-sm font-medium mb-2">{q.text}</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">{q.type}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                      {categories.find(c => c.id === q.categoryId)?.name || 'Без категорії'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">{q.answers.length} відп.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 btn-ghost">Скасувати</button>
          <button 
            onClick={handleImport} 
            disabled={loading || preview.length === 0}
            className="flex-1 btn-secondary"
          >
            {loading ? 'Імпортуємо...' : `Імпортувати ${preview.length} питань`}
          </button>
        </div>
      </div>
    </div>
  )
}
