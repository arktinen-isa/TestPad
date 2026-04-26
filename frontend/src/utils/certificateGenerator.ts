import { jsPDF } from 'jspdf'

export const generateCertificate = (studentName: string, testTitle: string, score: string, finishedAt: string, testLogoUrl?: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  // 1. BACKGROUND & WATERMARK
  doc.setFillColor(252, 251, 255)
  doc.rect(0, 0, 297, 210, 'F')
  
  // Large background logo watermark
  const drawWatermark = () => {
    doc.setGState(new (doc as any).GState({ opacity: 0.03 }))
    doc.setFillColor(124, 58, 237)
    const centerX = 148.5, centerY = 105, size = 120
    doc.triangle(centerX, centerY - size/2, centerX + size/2, centerY, centerX, centerY + size/2, 'F')
    doc.triangle(centerX, centerY - size/2, centerX - size/2, centerY, centerX, centerY + size/2, 'F')
    doc.setGState(new (doc as any).GState({ opacity: 1 }))
  }
  drawWatermark()

  // 2. CORNER DECORATIONS
  const drawCorner = (x: number, y: number, rot: number) => {
    doc.saveGraphicsState()
    doc.setFillColor(124, 58, 237, 0.1)
    doc.setDrawColor(124, 58, 237)
    doc.setLineWidth(0.5)
    // Simple geometric shape for corner
    if (rot === 0) { // Top-left
       doc.triangle(x, y, x + 40, y, x, y + 40, 'F')
    } else if (rot === 90) { // Top-right
       doc.triangle(x, y, x - 40, y, x, y + 40, 'F')
    } else if (rot === 180) { // Bottom-right
       doc.triangle(x, y, x - 40, y, x, y - 40, 'F')
    } else if (rot === 270) { // Bottom-left
       doc.triangle(x, y, x + 40, y, x, y - 40, 'F')
    }
    doc.restoreGraphicsState()
  }
  drawCorner(0, 0, 0)
  drawCorner(297, 0, 90)
  drawCorner(297, 210, 180)
  drawCorner(0, 210, 270)

  // 3. BORDERS
  doc.setDrawColor(124, 58, 237) // Purple
  doc.setLineWidth(1.5)
  doc.rect(8, 8, 281, 194)
  doc.setDrawColor(79, 70, 229) // Indigo
  doc.setLineWidth(0.3)
  doc.rect(10, 10, 277, 190)

  // 4. SYSTEM LOGO (Top Center)
  const drawSystemLogo = (x: number, y: number, size: number) => {
    doc.setFillColor(124, 58, 237)
    doc.triangle(x, y - size/2, x + size/2, y, x, y + size/2, 'F')
    doc.setFillColor(79, 70, 229)
    doc.triangle(x, y - size/2, x - size/2, y, x, y + size/2, 'F')
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5)
    doc.line(x, y-size/3, x+size/4, y); doc.line(x+size/4, y, x, y+size/3)
    doc.line(x, y+size/3, x-size/4, y); doc.line(x-size/4, y, x, y-size/3)
  }
  drawSystemLogo(148.5, 30, 20)

  // 5. TEXT RENDERING HELPER (CYRILLIC CANVAS)
  const drawTextToPdf = (text: string, x: number, y: number, fontSize: number, isBold: boolean, color: string) => {
    if (!text) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scale = 4
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * scale}px "Unbounded", "Inter", Arial, sans-serif`
    const metrics = ctx.measureText(text)
    canvas.width = metrics.width + 20
    canvas.height = fontSize * scale * 1.5
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * scale}px "Unbounded", "Inter", Arial, sans-serif`
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 10, canvas.height / 2)
    
    const w = metrics.width / scale
    const h = (fontSize * scale * 1.5) / scale
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', x - w/2, y - h/2, w, h)
    return h
  }

  // 6. MAIN CONTENT (UKRAINIAN)
  drawTextToPdf('СЕРТИФІКАТ', 148.5, 55, 36, true, '#1e293b')
  drawTextToPdf('ПРО УСПІШНЕ ПРОХОДЖЕННЯ ТЕСТУ', 148.5, 65, 12, false, '#64748b')

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(14); doc.setFont('helvetica', 'normal')
  doc.text('Цим підтверджується, що студент(ка)', 148.5, 88, { align: 'center' })

  // STUDENT NAME (Surname + Rest)
  const nameParts = studentName.split(' ')
  const surname = nameParts[0] || ''
  const restName = nameParts.slice(1).join(' ')
  drawTextToPdf(surname.toUpperCase(), 148.5, 102, 22, true, '#7c3aed')
  if (restName) drawTextToPdf(restName, 148.5, 112, 18, false, '#7c3aed')

  doc.text('успішно завершив(ла) тестування з курсу/теми:', 148.5, 130, { align: 'center' })

  // TEST TITLE (Multiline)
  const titleLines = doc.splitTextToSize(testTitle, 220)
  let currentY = 142
  titleLines.forEach((line: string) => {
    drawTextToPdf(line, 148.5, currentY, 16, true, '#1e293b')
    currentY += 10
  })

  // SCORE
  drawTextToPdf(`РЕЗУЛЬТАТ: ${score}`, 148.5, currentY + 8, 12, true, '#4f46e5')

  // 7. VERIFIED SEAL
  const drawSeal = (x: number, y: number) => {
    doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.5); doc.circle(x, y, 15, 'S')
    doc.circle(x, y, 13, 'S')
    drawTextToPdf('GRADEX', x, y - 2, 6, true, '#7c3aed')
    drawTextToPdf('VERIFIED', x, y + 3, 4, false, '#7c3aed')
  }
  drawSeal(35, 175)

  // 8. FOOTER
  const displayDate = finishedAt ? new Date(finishedAt).toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA')
  doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.5)
  doc.line(167, 185, 237, 185)
  doc.setFontSize(10); doc.setTextColor(148, 163, 184)
  doc.text('ЗАСВІДЧЕНО СИСТЕМОЮ GRADEX', 95, 192, { align: 'center' })
  doc.text(displayDate, 202, 192, { align: 'center' })

  // BRAND LOGO
  if (testLogoUrl) {
    try { doc.addImage(testLogoUrl, 'PNG', 255, 170, 20, 20) } catch (e) {}
  }

  doc.save(`GradeX_Certificate_${studentName.replace(/\s+/g, '_')}.pdf`)
}
