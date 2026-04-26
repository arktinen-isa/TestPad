import { jsPDF } from 'jspdf'

export const generateCertificate = (studentName: string, testTitle: string, score: string, finishedAt: string, testLogoUrl?: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  // 1. BACKGROUND
  doc.setFillColor(254, 254, 255)
  doc.rect(0, 0, 297, 210, 'F')
  
  // High-poly background watermark
  const drawWatermark = () => {
    doc.saveGraphicsState()
    doc.setGState(new (doc as any).GState({ opacity: 0.02 }))
    doc.setFillColor(124, 58, 237)
    const centerX = 148.5, centerY = 105, size = 150
    doc.triangle(centerX, centerY - size/2, centerX + size/3, centerY + size/3, centerX - size/3, centerY + size/3, 'F')
    doc.restoreGraphicsState()
  }
  drawWatermark()

  // 2. CORNER DECORATIONS (Subtle)
  const drawCorner = (x: number, y: number, type: 'TL'|'TR'|'BR'|'BL') => {
    doc.saveGraphicsState()
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }))
    doc.setFillColor(124, 58, 237)
    if (type === 'TL') doc.triangle(x, y, x + 40, y, x, y + 40, 'F')
    if (type === 'TR') doc.triangle(x, y, x - 40, y, x, y + 40, 'F')
    if (type === 'BR') doc.triangle(x, y, x - 40, y, x, y - 40, 'F')
    if (type === 'BL') doc.triangle(x, y, x + 40, y, x, y - 40, 'F')
    doc.restoreGraphicsState()
  }
  drawCorner(0, 0, 'TL'); drawCorner(297, 0, 'TR'); drawCorner(297, 210, 'BR'); drawCorner(0, 210, 'BL')

  // 3. BORDERS
  doc.setDrawColor(124, 58, 237); doc.setLineWidth(1.0); doc.rect(7, 7, 283, 196)
  doc.setDrawColor(79, 70, 229); doc.setLineWidth(0.2); doc.rect(9, 9, 279, 192)

  // 4. SYSTEM LOGO (Top Center)
  const drawSystemLogo = (x: number, y: number, size: number) => {
    doc.setFillColor(124, 58, 237)
    doc.triangle(x, y - size/2, x + size/2, y, x, y + size/2, 'F')
    doc.setFillColor(79, 70, 229)
    doc.triangle(x, y - size/2, x - size/2, y, x, y + size/2, 'F')
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3)
    doc.line(x, y-size/3, x+size/4, y); doc.line(x+size/4, y, x, y+size/3)
    doc.line(x, y+size/3, x-size/4, y); doc.line(x-size/4, y, x, y-size/3)
  }
  drawSystemLogo(148.5, 25, 18)

  // 5. TEXT RENDERING HELPER (Canvas for Cyrillic)
  const drawTextToPdf = (text: string, x: number, y: number, fontSize: number, isBold: boolean, color: string) => {
    if (!text) return 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0
    const scale = 4
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * scale}px "Unbounded", "Inter", sans-serif`
    const metrics = ctx.measureText(text)
    canvas.width = metrics.width + 20
    canvas.height = fontSize * scale * 1.8
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * scale}px "Unbounded", "Inter", sans-serif`
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 10, canvas.height / 2)
    const w = metrics.width / scale, h = canvas.height / scale
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', x - w/2, y - h/2, w, h)
    return h
  }

  // 6. MAIN CONTENT
  drawTextToPdf('СЕРТИФІКАТ', 148.5, 50, 20, true, '#1e1b4b')
  drawTextToPdf('ПРО УСПІШНЕ ПРОХОДЖЕННЯ ТЕСТУ', 148.5, 60, 11, false, '#4338ca')

  drawTextToPdf('Цим підтверджується, що студент(ка)', 148.5, 80, 12, false, '#64748b')

  // Name (Surname capped at 20)
  const np = studentName.split(' ')
  const sur = np[0] || '', res = np.slice(1).join(' ')
  drawTextToPdf(sur.toUpperCase(), 148.5, 95, 20, true, '#4f46e5')
  if (res) drawTextToPdf(res, 148.5, 105, 16, false, '#6366f1')

  drawTextToPdf('успішно завершив(ла) тестування з курсу/теми:', 148.5, 125, 12, false, '#64748b')

  // Title
  const lines = doc.splitTextToSize(testTitle, 230)
  let cy = 138
  lines.forEach((l: string) => {
    drawTextToPdf(l, 148.5, cy, 18, true, '#1e293b')
    cy += 12
  })

  drawTextToPdf(`РЕЗУЛЬТАТ: ${score}`, 148.5, cy + 5, 14, true, '#4f46e5')

  // SEAL
  const drawSeal = (x: number, y: number) => {
    doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.8 }))
    doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.4); doc.circle(x, y, 15, 'S'); doc.circle(x, y, 13, 'S')
    drawTextToPdf('GRADEX', x, y - 2, 6, true, '#7c3aed')
    drawTextToPdf('VERIFIED', x, y + 3, 4, false, '#7c3aed')
    doc.restoreGraphicsState()
  }
  drawSeal(38, 172)

  // 7. FOOTER
  const dt = finishedAt ? new Date(finishedAt).toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA')
  doc.setDrawColor(199, 210, 254); doc.setLineWidth(0.4); doc.line(160, 185, 245, 185)
  drawTextToPdf('ЗАСВІДЧЕНО СИСТЕМОЮ GRADEX', 100, 192, 8, false, '#94a3b8')
  drawTextToPdf(dt, 202, 192, 10, true, '#64748b')

  if (testLogoUrl) try { doc.addImage(testLogoUrl, 'PNG', 260, 170, 16, 16) } catch (e) {}

  doc.save(`GradeX_Certificate_${studentName.replace(/\s+/g, '_')}.pdf`)
}
