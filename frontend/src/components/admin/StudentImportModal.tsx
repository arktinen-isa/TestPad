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
            skippedRows.push({ row: rowNum, text: name || email || '—', reason: 'Відсутні обов\'язкові дані' })
            return
          }

          if (!email.includes('@')) {
            skippedRows.push({ row: rowNum, text: email, reason: 'Некоректна пошта' })
            return
          }

          if (password.length < 6) {
            skippedRows.push({ row: rowNum, text: name, reason: 'Короткий пароль' })
            return
          }

          validUsers.push({ name, email, password })
        })

        setPreview(validUsers)
        setSkipped(skippedRows)
        setError(null)
        if (validUsers.length === 0 && skippedRows.length > 0) setActiveTab('SKIPPED')
        else setActiveTab('VALID')
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
    XLSX.writeFile(wb, `GradeX_Import_Template.xlsx`)
  }

  return (
    <div className="modal-overlay">
      <div className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
          <div>
            <h2 className="font-unbounded text-lg font-bold text-white">Імпорт студентів</h2>
            <p className="text-slate-400 text-xs mt-0.5">Група: <span className="text-purple-400 font-semibold">{groupName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          {/* Step 1: Upload */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-bold border border-purple-500/30">1</span>
              <h3 className="text-sm font-semibold text-white">Завантажте файл</h3>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group ${
                file ? 'border-purple-accent/50 bg-purple-accent/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
              <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-colors ${
                file ? 'bg-purple-accent/20 text-purple-400' : 'bg-white/5 text-slate-500 group-hover:text-slate-400'
              }`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">{file ? file.name : 'Натисніть або перетягніть XLSX файл'}</p>
              <p className="text-slate-500 text-xs mt-1">Обов'язкові колонки: ПІБ, Пошта, Пароль</p>
              
              <button 
                onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
                className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-purple-400 hover:text-purple-300 hover:bg-white/10 text-xs font-medium transition-all inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Завантажити шаблон
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Step 2: Preview */}
          {(preview.length > 0 || skipped.length > 0) && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-bold border border-purple-500/30">2</span>
                <h3 className="text-sm font-semibold text-white">Перевірка даних</h3>
              </div>

              <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
                <button
                  onClick={() => setActiveTab('VALID')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'VALID' ? 'bg-purple-accent text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Валідні
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'VALID' ? 'bg-white/20' : 'bg-white/5'}`}>
                    {preview.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('SKIPPED')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'SKIPPED' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Помилки
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'SKIPPED' ? 'bg-white/20' : 'bg-white/5'}`}>
                    {skipped.length}
                  </span>
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden min-h-[200px]">
                {activeTab === 'VALID' ? (
                  <div className="divide-y divide-white/5">
                    {preview.length > 0 ? preview.map((u, i) => (
                      <div key={i} className="p-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{u.name}</p>
                          <p className="text-slate-500 text-[11px] truncate">{u.email}</p>
                        </div>
                        <div className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 text-slate-400 border border-white/10">
                          {u.password}
                        </div>
                      </div>
                    )) : (
                      <div className="p-10 text-center text-slate-500 text-sm">Валідних записів не знайдено</div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {skipped.length > 0 ? skipped.map((s, i) => (
                      <div key={i} className="p-3 flex justify-between items-center gap-4 hover:bg-red-500/5 transition-colors">
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-300">Рядок {s.row}: <span className="text-slate-500">{s.text}</span></p>
                        </div>
                        <span className="text-[9px] font-bold text-red-400/80 uppercase px-2 py-1 rounded bg-red-500/10 border border-red-500/20 shrink-0">
                          {s.reason}
                        </span>
                      </div>
                    )) : (
                      <div className="p-10 text-center text-slate-500 text-sm">Помилок не виявлено</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/10 bg-slate-900/95 backdrop-blur-sm flex gap-3 flex-shrink-0 relative z-10">
          <button onClick={onClose} className="flex-1 btn-ghost h-11 text-sm font-semibold">
            Скасувати
          </button>
          <button 
            onClick={handleImport} 
            disabled={loading || preview.length === 0}
            className="flex-1 btn-secondary h-11 text-sm font-bold shadow-lg shadow-purple-accent/20 disabled:opacity-30 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Імпортуємо...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Додати {preview.length || ''} студентів
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
