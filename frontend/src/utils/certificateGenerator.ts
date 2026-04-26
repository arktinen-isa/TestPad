import { jsPDF } from 'jspdf'

export const generateCertificate = (
  studentName: string,
  testTitle: string,
  score: string,
  finishedAt: string,
  testLogoUrl?: string | null
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297, H = 210

  // Palette
  const BG      = [10, 11, 30]   as const
  const BG2     = [18, 16, 50]   as const
  const PURPLE  = [124, 58, 237] as const
  const PURPLEM = [99, 46, 190]  as const
  const PURPLEL = [167, 139, 250] as const
  const GOLD    = [251, 191, 36] as const
  const DIM     = [71, 85, 105]  as const

  const fill = (c: readonly [number,number,number]) => doc.setFillColor(c[0], c[1], c[2])
  const draw = (c: readonly [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2])
  const gst  = (o: number) => doc.setGState(new (doc as any).GState({ opacity: o }))
  const sv   = () => doc.saveGraphicsState()
  const rs   = () => doc.restoreGraphicsState()

  // ── BACKGROUND ─────────────────────────────────────────────────────────
  fill(BG); doc.rect(0, 0, W, H, 'F')
  sv(); gst(0.3); fill(BG2); doc.rect(0, 0, W * 0.52, H, 'F'); rs()
  sv(); gst(0.13); fill(PURPLE); doc.circle(0, 0, 85, 'F'); rs()
  sv(); gst(0.09); fill(GOLD);   doc.circle(W, H, 70, 'F'); rs()
  sv(); gst(0.05); fill(PURPLE); doc.circle(W, 0, 45, 'F'); rs()

  // Dot grid
  sv(); gst(0.045); fill(PURPLEL)
  for (let x = 22; x < W; x += 11)
    for (let y = 22; y < H; y += 11)
      doc.circle(x, y, 0.4, 'F')
  rs()

  // ── BORDERS ────────────────────────────────────────────────────────────
  draw(GOLD);   doc.setLineWidth(0.8);  doc.rect(8,  8,  W - 16, H - 16)
  draw(PURPLE); doc.setLineWidth(0.25); doc.rect(11, 11, W - 22, H - 22)

  // Corner ornaments
  const corner = (cx: number, cy: number, dx: number, dy: number) => {
    sv(); gst(0.95); fill(GOLD)
    const s = 2.8
    doc.triangle(cx, cy - s, cx + s * 0.9, cy, cx, cy + s, 'F')
    doc.triangle(cx, cy - s, cx - s * 0.9, cy, cx, cy + s, 'F')
    draw(GOLD); doc.setLineWidth(0.55)
    doc.line(cx, cy, cx + dx * 18, cy)
    doc.line(cx, cy, cx, cy + dy * 18)
    rs()
  }
  corner(8,   8,    1,  1)
  corner(W-8, 8,   -1,  1)
  corner(W-8, H-8, -1, -1)
  corner(8,   H-8,  1, -1)

  // ── CANVAS TEXT RENDERER ───────────────────────────────────────────────
  const drawText = (
    text: string, x: number, y: number,
    sizePx: number, weight: string,
    hex: string, align: 'left'|'center'|'right' = 'center'
  ) => {
    if (!text) return
    const cvs = document.createElement('canvas')
    const ctx = cvs.getContext('2d')!
    const sc = 4
    const font = `${weight} ${sizePx * sc}px "Unbounded","Inter",sans-serif`
    ctx.font = font
    const mw = ctx.measureText(text).width
    cvs.width  = Math.ceil(mw + 24)
    cvs.height = Math.ceil(sizePx * sc * 1.65)
    ctx.font = font; ctx.fillStyle = hex; ctx.textBaseline = 'middle'
    ctx.fillText(text, 12, cvs.height / 2)
    const pw = cvs.width / sc, ph = cvs.height / sc
    const px = align === 'center' ? x - pw / 2 : align === 'right' ? x - pw : x
    doc.addImage(cvs.toDataURL('image/png'), 'PNG', px, y - ph / 2, pw, ph)
  }

  const wrapText = (text: string, maxMm: number, sizePx: number, weight: string): string[] => {
    const cvs = document.createElement('canvas')
    const ctx = cvs.getContext('2d')!
    ctx.font = `${weight} ${sizePx * 4}px "Unbounded","Inter",sans-serif`
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (ctx.measureText(test).width / 4 > maxMm && cur) { lines.push(cur); cur = w }
      else cur = test
    }
    if (cur) lines.push(cur)
    return lines
  }

  // ── LOGO MARK ──────────────────────────────────────────────────────────
  const logoMark = (lx: number, ly: number, s: number) => {
    fill(PURPLE);  doc.triangle(lx, ly - s, lx + s * 0.75, ly, lx, ly + s, 'F')
    fill(PURPLEM); doc.triangle(lx, ly - s, lx - s * 0.75, ly, lx, ly + s, 'F')
    sv(); gst(0.9); fill(GOLD)
    const h = s * 0.38
    doc.triangle(lx, ly - h * 1.1, lx + h * 0.65, ly, lx, ly + h * 0.7, 'F')
    rs()
  }

  // ══════════════════════════════════════════════════════════════
  // HEADER  (y 14 – 54)
  // ══════════════════════════════════════════════════════════════
  logoMark(W / 2, 22, 9)
  drawText('GRADEX', W / 2, 34, 7.5, 'bold', '#a78bfa')

  draw(PURPLEL); doc.setLineWidth(0.2)
  doc.line(W/2 - 36, 39.5, W/2 - 5, 39.5)
  doc.line(W/2 + 5,  39.5, W/2 + 36, 39.5)
  fill(GOLD); doc.circle(W / 2, 39.5, 1.0, 'F')

  drawText('СЕРТИФІКАТ', W / 2, 49, 19, 'bold', '#ffffff')
  drawText('ПРО УСПІШНЕ ПРОХОДЖЕННЯ ТЕСТУВАННЯ', W / 2, 58, 6.5, '400', '#a78bfa')

  // Header / body separator
  sv(); gst(0.5); draw(DIM); doc.setLineWidth(0.3)
  doc.line(20, 64, W - 20, 64); rs()

  // ══════════════════════════════════════════════════════════════
  // BODY  (y 68 – 148)
  // ══════════════════════════════════════════════════════════════
  drawText('Цим підтверджується, що', W / 2, 72, 8, '300', '#94a3b8')

  const parts     = studentName.trim().split(/\s+/)
  const lastName  = (parts[0] ?? '').toUpperCase()
  const firstName = parts.slice(1).join(' ')

  drawText(lastName,  W / 2, 83, 19, 'bold', '#fbbf24')
  if (firstName) drawText(firstName, W / 2, 94, 12, '400', '#e2e8f0')

  const nameBottom = firstName ? 100 : 89
  sv(); gst(0.3); draw(GOLD); doc.setLineWidth(0.4)
  doc.line(W/2 - 50, nameBottom, W/2 + 50, nameBottom); rs()

  drawText('успішно завершив(ла) тестування з теми:', W / 2, nameBottom + 8, 8, '300', '#94a3b8')

  // Test title – wrapped
  const titleLines = wrapText(testTitle, 200, 12, 'bold').slice(0, 2)
  let titleY = nameBottom + 19
  for (const line of titleLines) {
    drawText(line, W / 2, titleY, 12, 'bold', '#e2e8f0')
    titleY += 10.5
  }

  // Score badge
  const badgeY = titleY + 8
  sv(); gst(0.2); fill(PURPLE)
  doc.roundedRect(W/2 - 40, badgeY - 7, 80, 14, 3, 3, 'F'); rs()
  draw(PURPLEL); doc.setLineWidth(0.3)
  doc.roundedRect(W/2 - 40, badgeY - 7, 80, 14, 3, 3, 'S')
  drawText(`РЕЗУЛЬТАТ: ${score}`, W / 2, badgeY + 0.3, 9.5, 'bold', '#c4b5fd')

  // ══════════════════════════════════════════════════════════════
  // FOOTER SEPARATOR  (y ≈ badgeY + 13)
  // ══════════════════════════════════════════════════════════════
  const footerTop = Math.max(badgeY + 13, 148)

  sv(); gst(0.45); draw(DIM); doc.setLineWidth(0.3)
  doc.line(20, footerTop, W - 20, footerTop); rs()

  // Decorative centre diamond on rule
  fill(GOLD); doc.circle(W / 2, footerTop, 1.0, 'F')

  // ══════════════════════════════════════════════════════════════
  // FOOTER  – three columns  (footerTop … H-12)
  // ══════════════════════════════════════════════════════════════
  const fCY = (footerTop + H - 12) / 2   // vertical centre of footer zone

  // ── Left column: Seal ──────────────────────────────────────────
  const sx = 48, sy = fCY
  draw(GOLD); doc.setLineWidth(0.45)
  for (let a = 0; a < 360; a += 14) {
    const ra = (a * Math.PI) / 180
    doc.line(sx + 15.5 * Math.cos(ra), sy + 15.5 * Math.sin(ra),
             sx + 17.2 * Math.cos(ra), sy + 17.2 * Math.sin(ra))
  }
  doc.circle(sx, sy, 14, 'S')
  sv(); gst(0.07); fill(GOLD); doc.circle(sx, sy, 14, 'F'); rs()
  logoMark(sx, sy - 8, 3.8)
  drawText('GRADEX',   sx, sy - 0.5, 5.2, 'bold', '#fbbf24')
  drawText('VERIFIED', sx, sy + 4.5, 4,   '400',  '#fcd34d')

  // ── Centre column: Date ────────────────────────────────────────
  const dateStr = (finishedAt ? new Date(finishedAt) : new Date())
    .toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })

  drawText('ДАТА ЗАВЕРШЕННЯ', W / 2, fCY - 6, 5.8, '400', '#64748b')
  // Thin rule under label
  sv(); gst(0.4); draw(PURPLEL); doc.setLineWidth(0.25)
  doc.line(W/2 - 36, fCY - 2, W/2 + 36, fCY - 2); rs()
  drawText(dateStr, W / 2, fCY + 5, 9, 'bold', '#e2e8f0')

  // ── Right column: Issuer ───────────────────────────────────────
  const rx = W - 48
  // Signature line
  sv(); gst(0.5); draw(PURPLEL); doc.setLineWidth(0.3)
  doc.line(rx - 34, fCY - 3, rx + 20, fCY - 3); rs()
  drawText('ЗАСВІДЧЕНО', rx - 7, fCY + 3,  5.5, '400',  '#64748b', 'center')
  drawText('GradeX',    rx - 7, fCY + 9.5, 8,   'bold', '#a78bfa', 'center')

  // Test logo (top-right, if provided)
  if (testLogoUrl) {
    try {
      sv(); gst(0.65)
      doc.addImage(testLogoUrl, 'PNG', W - 46, 14, 17, 17)
      rs()
    } catch {}
  }

  doc.save(`Сертифікат_${studentName.replace(/\s+/g, '_')}.pdf`)
}
