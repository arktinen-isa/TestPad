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

  const rgb = (r: number, g: number, b: number) => [r, g, b] as const
  const BG      = rgb(10, 11, 30)
  const BG2     = rgb(18, 16, 50)
  const PURPLE  = rgb(124, 58, 237)
  const PURPLEM = rgb(99, 46, 190)
  const PURPLEL = rgb(167, 139, 250)
  const GOLD    = rgb(251, 191, 36)
  const DIM     = rgb(71, 85, 105)
  const DARK    = rgb(30, 41, 59)

  const fill  = (c: readonly [number,number,number]) => doc.setFillColor(c[0], c[1], c[2])
  const draw  = (c: readonly [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2])
  const gst   = (opacity: number) => doc.setGState(new (doc as any).GState({ opacity }))
  const save  = () => doc.saveGraphicsState()
  const restore = () => doc.restoreGraphicsState()

  // ── BACKGROUND ──────────────────────────────────────────────────────────
  fill(BG); doc.rect(0, 0, W, H, 'F')

  save(); gst(0.35); fill(BG2); doc.rect(0, 0, W * 0.55, H, 'F'); restore()

  // Glow blobs
  save(); gst(0.14); fill(PURPLE); doc.circle(0, 0, 90, 'F'); restore()
  save(); gst(0.10); fill(GOLD);   doc.circle(W, H, 75, 'F'); restore()
  save(); gst(0.06); fill(PURPLE); doc.circle(W, 0, 50, 'F'); restore()

  // Dot grid
  save(); gst(0.05); fill(PURPLEL)
  for (let x = 22; x < W; x += 11)
    for (let y = 22; y < H; y += 11)
      doc.circle(x, y, 0.4, 'F')
  restore()

  // ── BORDERS ─────────────────────────────────────────────────────────────
  draw(GOLD);    doc.setLineWidth(0.75); doc.rect(8,  8,  W-16,  H-16)
  draw(PURPLE);  doc.setLineWidth(0.25); doc.rect(11, 11, W-22, H-22)

  // Corner ornaments
  const corner = (cx: number, cy: number, dx: number, dy: number) => {
    const s = 2.8
    save(); gst(0.95); fill(GOLD)
    doc.triangle(cx, cy - s, cx + s * 0.9, cy, cx, cy + s, 'F')
    doc.triangle(cx, cy - s, cx - s * 0.9, cy, cx, cy + s, 'F')
    draw(GOLD); doc.setLineWidth(0.55)
    doc.line(cx, cy, cx + dx * 18, cy)
    doc.line(cx, cy, cx, cy + dy * 18)
    restore()
  }
  corner(8,   8,    1,  1)
  corner(W-8, 8,   -1,  1)
  corner(W-8, H-8, -1, -1)
  corner(8,   H-8,  1, -1)

  // ── LEFT ACCENT BAR ──────────────────────────────────────────────────────
  save(); gst(0.55); fill(PURPLE); doc.rect(14, 14, 3.5, H-28, 'F'); restore()
  save(); gst(0.95); fill(GOLD);   doc.rect(14, 14, 1.2, H-28, 'F'); restore()

  // ── CANVAS TEXT RENDERER ─────────────────────────────────────────────────
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
    ctx.font = font
    ctx.fillStyle = hex
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 12, cvs.height / 2)
    const pw = cvs.width / sc, ph = cvs.height / sc
    const px = align === 'center' ? x - pw / 2 : align === 'right' ? x - pw : x
    doc.addImage(cvs.toDataURL('image/png'), 'PNG', px, y - ph / 2, pw, ph)
  }

  const wrapText = (text: string, maxPx: number, sizePx: number, weight: string): string[] => {
    const cvs = document.createElement('canvas')
    const ctx = cvs.getContext('2d')!
    const sc = 4
    ctx.font = `${weight} ${sizePx * sc}px "Unbounded","Inter",sans-serif`
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (ctx.measureText(test).width / sc > maxPx && cur) { lines.push(cur); cur = w }
      else cur = test
    }
    if (cur) lines.push(cur)
    return lines
  }

  // ── LOGO MARK ─────────────────────────────────────────────────────────────
  const logoMark = (lx: number, ly: number, s: number) => {
    fill(PURPLE);  doc.triangle(lx, ly - s, lx + s * 0.75, ly, lx, ly + s, 'F')
    fill(PURPLEM); doc.triangle(lx, ly - s, lx - s * 0.75, ly, lx, ly + s, 'F')
    save(); gst(0.9); fill(GOLD)
    const h = s * 0.38
    doc.triangle(lx, ly - h * 1.1, lx + h * 0.65, ly, lx, ly + h * 0.7, 'F')
    restore()
  }

  // ── HEADER ────────────────────────────────────────────────────────────────
  logoMark(W / 2, 25, 10)
  drawText('GRADEX', W / 2, 40.5, 7.5, 'bold', '#a78bfa')

  // Decorative rule with center dot
  draw(PURPLEL); doc.setLineWidth(0.2)
  doc.line(W/2 - 38, 46.5, W/2 - 5, 46.5)
  doc.line(W/2 + 5,  46.5, W/2 + 38, 46.5)
  fill(GOLD); doc.circle(W / 2, 46.5, 1.1, 'F')

  // ── CERTIFICATE TITLE ─────────────────────────────────────────────────────
  drawText('СЕРТИФІКАТ', W / 2, 59, 20, 'bold', '#ffffff')
  drawText('ПРО УСПІШНЕ ПРОХОДЖЕННЯ ТЕСТУВАННЯ', W / 2, 70, 7, '400', '#a78bfa')

  draw(DIM); doc.setLineWidth(0.25)
  doc.line(W / 2 - 55, 76, W / 2 + 55, 76)

  // ── BODY ──────────────────────────────────────────────────────────────────
  drawText('Цим підтверджується, що', W / 2, 84, 8.5, '300', '#94a3b8')

  const parts = studentName.trim().split(/\s+/)
  const lastName  = (parts[0] ?? '').toUpperCase()
  const firstName = parts.slice(1).join(' ')

  drawText(lastName,  W / 2, 96, 20, 'bold', '#fbbf24')
  if (firstName) drawText(firstName, W / 2, 108, 13, '400', '#e2e8f0')

  const nameBottom = firstName ? 114 : 103
  save(); gst(0.35); draw(GOLD); doc.setLineWidth(0.45)
  doc.line(W / 2 - 52, nameBottom, W / 2 + 52, nameBottom)
  restore()

  drawText('успішно завершив(ла) тестування з теми:', W / 2, nameBottom + 8, 8.5, '300', '#94a3b8')

  // Title — wrapped
  const titleLines = wrapText(testTitle, 200, 13, 'bold').slice(0, 2)
  let titleY = nameBottom + 20
  for (const line of titleLines) {
    drawText(line, W / 2, titleY, 13, 'bold', '#e2e8f0')
    titleY += 11
  }

  // Score badge
  const badgeY = titleY + 8
  const bx = W / 2 - 38, bw = 76, bh = 13
  save(); gst(0.22); fill(PURPLE); doc.roundedRect(bx, badgeY - bh / 2, bw, bh, 3, 3, 'F'); restore()
  draw(PURPLEL); doc.setLineWidth(0.3); doc.roundedRect(bx, badgeY - bh / 2, bw, bh, 3, 3, 'S')
  drawText(`РЕЗУЛЬТАТ: ${score}`, W / 2, badgeY + 0.3, 9.5, 'bold', '#c4b5fd')

  // ── SEAL ──────────────────────────────────────────────────────────────────
  const sx = 42, sy = H - 33
  // Notched outer ring
  draw(GOLD); doc.setLineWidth(0.5)
  for (let a = 0; a < 360; a += 14) {
    const ra = (a * Math.PI) / 180
    doc.line(
      sx + 16.5 * Math.cos(ra), sy + 16.5 * Math.sin(ra),
      sx + 18.2 * Math.cos(ra), sy + 18.2 * Math.sin(ra)
    )
  }
  draw(GOLD); doc.setLineWidth(0.45); doc.circle(sx, sy, 15, 'S')
  save(); gst(0.07); fill(GOLD); doc.circle(sx, sy, 15, 'F'); restore()
  logoMark(sx, sy - 9, 4)
  drawText('GRADEX',   sx, sy - 1.5, 5.5, 'bold', '#fbbf24')
  drawText('VERIFIED', sx, sy + 4,   4.2, '400',  '#fcd34d')

  // ── FOOTER ────────────────────────────────────────────────────────────────
  draw(DARK); doc.setLineWidth(0.3); doc.line(23, H - 27, W - 23, H - 27)

  const dateStr = (finishedAt ? new Date(finishedAt) : new Date())
    .toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })

  // Center date block
  draw(PURPLEL); doc.setLineWidth(0.25)
  doc.line(W / 2 - 42, H - 21.5, W / 2 + 42, H - 21.5)
  drawText('ДАТА ЗАВЕРШЕННЯ', W / 2, H - 17.5, 5.5, '400', '#64748b')
  drawText(dateStr, W / 2, H - 12,   8.5, 'bold',  '#94a3b8')

  // Bottom right branding
  drawText('gradex.app',              W - 28, H - 13, 7.5, '400',  '#475569', 'right')
  drawText('Система онлайн-тестування', W - 28, H - 19, 5.5, '300', '#334155', 'right')

  // Optional test logo
  if (testLogoUrl) {
    try {
      save(); gst(0.65)
      doc.addImage(testLogoUrl, 'PNG', W - 48, 14, 18, 18)
      restore()
    } catch {}
  }

  doc.save(`Сертифікат_${studentName.replace(/\s+/g, '_')}.pdf`)
}
