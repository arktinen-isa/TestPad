import { jsPDF } from 'jspdf'

export const generateCertificate = (studentName: string, testTitle: string, score: string, date: string, logoUrl?: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  // Since jsPDF has issues with Cyrillic without custom fonts, 
  // we'll use a clean English template if font isn't loaded, 
  // OR we use the strategy of drawing to a canvas first then adding to PDF.
  // For this implementation, we'll use standard fonts and assume the environment 
  // might need a font-face injection.
  
  // Background
  doc.setFillColor(250, 250, 252)
  doc.rect(0, 0, 297, 210, 'F')
  
  // Border
  doc.setDrawColor(124, 58, 237) // Purple
  doc.setLineWidth(2)
  doc.rect(10, 10, 277, 190)
  
  doc.setDrawColor(236, 72, 153) // Pink
  doc.setLineWidth(0.5)
  doc.rect(13, 13, 271, 184)

  // Logo Placeholder or actual logo
  if (logoUrl) {
    try {
       doc.addImage(logoUrl, 'PNG', 135, 25, 25, 25)
    } catch (e) {
       // fallback if logo fails to load
    }
  }

  // Function to render text to a data URL using canvas (for perfect Cyrillic support)
  const drawText = (text: string, fontSize: number, isBold: boolean, color: string) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * 4}px "Unbounded", "Inter", Arial`
    const metrics = ctx.measureText(text)
    canvas.width = metrics.width + 20
    canvas.height = fontSize * 5
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize * 4}px "Unbounded", "Inter", Arial`
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 10, canvas.height / 2)
    return canvas.toDataURL('image/png')
  }

  // Header (English is fine)
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(40)
  doc.text('CERTIFICATE', 148.5, 70, { align: 'center' })
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text('OF COMPLETION', 148.5, 80, { align: 'center' })

  // Body
  doc.setFontSize(14)
  doc.text('This is to certify that', 148.5, 105, { align: 'center' })
  
  // Student Name (Cyrillic support)
  const nameImg = drawText(studentName, 28, true, '#7c3aed')
  if (nameImg) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 112px "Unbounded", "Inter", Arial'
    const wMatched = ctx.measureText(studentName).width / 4;
    doc.addImage(nameImg, 'PNG', 148.5 - (wMatched / 2), 110, wMatched, 15)
  }
  
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('has successfully passed the examination', 148.5, 135, { align: 'center' })
  
  // Test Title (Cyrillic support)
  const titleImg = drawText(testTitle, 22, true, '#1e293b')
  if (titleImg) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 88px "Unbounded", "Inter", Arial'
    const wMatched = ctx.measureText(testTitle).width / 4;
    doc.addImage(titleImg, 'PNG', 148.5 - (wMatched / 2), 140, wMatched, 12)
  }

  // Footer / Result
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`Result: ${score}`, 148.5, 165, { align: 'center' })
  
  // Bottom line details
  doc.setDrawColor(203, 213, 225)
  doc.line(60, 185, 130, 185)
  doc.line(167, 185, 237, 185)
  
  doc.setFontSize(10)
  doc.text('GRADEX VERIFIED', 95, 192, { align: 'center' })
  doc.text(date, 202, 192, { align: 'center' })

  doc.save(`GradeX_Certificate_${studentName.replace(/\s+/g, '_')}.pdf`)
}
