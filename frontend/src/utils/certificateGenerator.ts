import { jsPDF } from 'jspdf'

export const generateCertificate = (studentName: string, testTitle: string, score: string, finishedAt: string, testLogoUrl?: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  // 1. BACKGROUND & PATTERN
  doc.setFillColor(250, 250, 252)
  doc.rect(0, 0, 297, 210, 'F')
  
  // Subtle dots pattern
  doc.setDrawColor(226, 232, 240)
  for (let i = 0; i < 297; i += 10) {
    for (let j = 0; j < 210; j += 10) {
      doc.circle(i, j, 0.2, 'S')
    }
  }
  
  // 2. BORDERS
  doc.setDrawColor(124, 58, 237) // Purple
  doc.setLineWidth(1.5)
  doc.rect(8, 8, 281, 194)
  
  doc.setDrawColor(79, 70, 229) // Indigo
  doc.setLineWidth(0.5)
  doc.rect(10, 10, 277, 190)

  // 3. SYSTEM LOGO (Drawn manually for best quality/portability)
  const drawSystemLogo = (x: number, y: number, size: number) => {
    doc.setFillColor(124, 58, 237)
    doc.triangle(x, y - size/2, x + size/2, y, x, y + size/2, 'F')
    doc.setFillColor(79, 70, 229)
    doc.triangle(x, y - size/2, x - size/2, y, x, y + size/2, 'F')
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.5)
    doc.line(x, y - size/3, x + size/4, y)
    doc.line(x + size/4, y, x, y + size/3)
    doc.line(x, y + size/3, x - size/4, y)
    doc.line(x - size/4, y, x, y - size/3)
  }
  drawSystemLogo(148.5, 30, 20)

  // 4. TEXT RENDERING HELPER (FOR CYRILLIC)
  const drawTextToPdf = (text: string, x: number, y: number, fontSize: number, isBold: boolean, color: string, align: 'left' | 'center' | 'right' = 'center') => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scale = 4
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * scale}px "Unbounded", "Inter", Arial`
    const metrics = ctx.measureText(text)
    canvas.width = metrics.width + 20
    canvas.height = fontSize * scale * 1.5
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * scale}px "Unbounded", "Inter", Arial`
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 10, canvas.height / 2)
    
    const w = metrics.width / scale
    const h = (fontSize * scale * 1.5) / scale
    const finalX = align === 'center' ? x - w/2 : align === 'right' ? x - w : x
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', finalX, y - h/2, w, h)
  }

  // 5. CONTENT
  // Header
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  doc.text('CERTIFICATE', 148.5, 55, { align: 'center' })
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('OF ACHIEVEMENT', 148.5, 63, { align: 'center' })

  doc.setFontSize(14)
  doc.text('This is to certify that', 148.5, 85, { align: 'center' })

  // 6. STUDENT NAME (Split Logic)
  const nameParts = studentName.split(' ')
  const surname = nameParts[0] || ''
  const restOfName = nameParts.slice(1).join(' ')
  
  drawTextToPdf(surname, 148.5, 100, 20, true, '#7c3aed') // Surname line
  if (restOfName) {
    drawTextToPdf(restOfName, 148.5, 110, 18, false, '#7c3aed') // Name & Patronymic line
  }

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(14)
  doc.text('has successfully completed the assessment', 148.5, 128, { align: 'center' })

  // 7. TEST TITLE (Multiline scaling)
  const maxTitleWidth = 200
  const titleLines = doc.splitTextToSize(testTitle, maxTitleWidth)
  let currentY = 142
  titleLines.forEach((line: string) => {
    drawTextToPdf(line, 148.5, currentY, 16, true, '#1e293b')
    currentY += 10
  })

  // 8. SCORE & FOOTER
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(12)
  doc.text(`SCORE OBTAINED: ${score}`, 148.5, currentY + 10, { align: 'center' })

  // Automatic Date from finish time
  const displayDate = finishedAt ? new Date(finishedAt).toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA')

  doc.setDrawColor(203, 213, 225)
  doc.line(60, 185, 130, 185)
  doc.line(167, 185, 237, 185)
  
  doc.setFontSize(10)
  doc.text('AUTHORIZED BY GRADEX', 95, 192, { align: 'center' })
  doc.text(displayDate, 202, 192, { align: 'center' })

  // 9. TEST BRANDING LOGO (If provided)
  if (testLogoUrl) {
    try {
      doc.addImage(testLogoUrl, 'PNG', 20, 20, 20, 20)
    } catch (e) {}
  }

  doc.save(`GradeX_Certificate_${studentName.replace(/\s+/g, '_')}.pdf`)
}
