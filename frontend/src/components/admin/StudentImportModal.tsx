import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface StudentImportModalProps {
  groupId: string
  groupName: string
  onClose: () => void
  onImport: (users: any[]) => Promise<void>
}

export default function StudentImportModal({ groupName, onClose, onImport }: StudentImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [skipped, setSkipped] = useState<{ row: number; text: string; reason: string }[]>([])
  const [activeTab, setActiveTab] = useState<'VALID' | 'SKIPPED'>('VALID')
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

        const validUsers: any[] = []
        const skippedRows: any[] = []

        rows.slice(1).forEach((row, index) => {
          const rowNum = index + 2
          const name = row[0] ? String(row[0]).trim() : ''
          const email = row[1] ? String(row[1]).trim() : ''
          const password = row[2] ? String(row[2]).trim() : ''

          if (!name || !email || !password) {
            skippedRows.push({ row: rowNum, text: name || email || '—', reason: 'Відсутні обов\'язкові дані (ПІБ, Пошта або Пароль)' })
            return
          }

          if (!email.includes('@')) {
            skippedRows.push({ row: rowNum, text: email, reason: 'Некоректний формат пошти' })
            return
          }

          if (password.length < 6) {
            skippedRows.push({ row: rowNum, text: name, reason: 'Пароль занадто короткий (мін. 6 симв.)' })
            return
          }

          validUsers.push({ name, email, password })
        })

        setPreview(validUsers)
        setSkipped(skippedRows)
        setError(null)
        if (validUsers.length === 0 && skippedRows.length > 0) setActiveTab('SKIPPED')
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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Помилка при імпорті на сервер.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const data = [
      ['ПІБ студента', 'Електронна пошта', 'Пароль'],
      ['Іванов Іван Іванович', 'ivanov@example.com', 'qwerty123'],
      ['Петренко Петро Петрович', 'petrenko@example.com', 'password555']
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, `Import_Students_${groupName}.xlsx`)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-unbounded text-lg font-bold text-white">Імпорт студентів</h2>
            <p className="text-slate-400 text-xs mt-1">Група: <span className="text-purple-400 font-semibold">{groupName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-purple-accent/50 hover:bg-purple-accent/5 transition-all cursor-pointer"
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
            <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-white text-sm font-medium">{file ? file.name : 'Оберіть XLSX файл зі списком'}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
              className="text-purple-400 hover:text-purple-300 text-xs underline mt-2 inline-block"
            >
              Завантажити шаблон
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {(preview.length > 0 || skipped.length > 0) && (
          <>
            <div className="flex gap-2 mb-4 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
              <button
                onClick={() => setActiveTab('VALID')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'VALID' ? 'bg-purple-accent text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Для імпорту ({preview.length})
              </button>
              <button
                onClick={() => setActiveTab('SKIPPED')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'SKIPPED' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Помилки ({skipped.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
              {activeTab === 'VALID' ? (
                <div className="space-y-2">
                  {preview.map((u, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{u.name}</p>
                        <p className="text-slate-500 text-xs truncate">{u.email}</p>
                      </div>
                      <div className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-400 border border-white/10">
                        Пароль: {u.password}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {skipped.map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex justify-between items-center gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300 truncate">Рядок {s.row}: {s.text}</p>
                      </div>
                      <span className="text-[10px] font-bold text-red-400 uppercase shrink-0">
                        {s.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 btn-ghost">Скасувати</button>
          <button 
            onClick={handleImport} 
            disabled={loading || preview.length === 0}
            className="flex-1 btn-secondary"
          >
            {loading ? 'Імпортуємо...' : `Імпортувати ${preview.length} студентів`}
          </button>
        </div>
      </div>
    </div>
  )
}
