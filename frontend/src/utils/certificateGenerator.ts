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

  const BG      = [10, 11, 30]    as const
  const BG2     = [18, 16, 50]    as const
  const PURPLE  = [124, 58, 237]  as const
  const PURPLEL = [167, 139, 250] as const
  const GOLD    = [251, 191, 36]  as const
  const DIM     = [71, 85, 105]   as const

  const fill = (c: readonly [number,number,number]) => doc.setFillColor(c[0], c[1], c[2])
  const draw = (c: readonly [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2])
  const gst  = (o: number) => doc.setGState(new (doc as any).GState({ opacity: o }))
  const sv   = () => doc.saveGraphicsState()
  const rs   = () => doc.restoreGraphicsState()

  // ── BACKGROUND ─────────────────────────────────────────────────────────
  fill(BG); doc.rect(0, 0, W, H, 'F')
  sv(); gst(0.30); fill(BG2);    doc.rect(0, 0, W * 0.52, H, 'F'); rs()
  sv(); gst(0.13); fill(PURPLE); doc.circle(0, 0, 85, 'F'); rs()
  sv(); gst(0.09); fill(GOLD);   doc.circle(W, H, 70, 'F'); rs()
  sv(); gst(0.05); fill(PURPLE); doc.circle(W, 0, 45, 'F'); rs()

  sv(); gst(0.045); fill(PURPLEL)
  for (let x = 22; x < W; x += 11)
    for (let y = 22; y < H; y += 11)
      doc.circle(x, y, 0.4, 'F')
  rs()

  // ── BORDERS ────────────────────────────────────────────────────────────
  draw(GOLD);   doc.setLineWidth(0.8);  doc.rect(8,  8,  W - 16, H - 16)
  draw(PURPLE); doc.setLineWidth(0.25); doc.rect(11, 11, W - 22, H - 22)

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

  // ── TEXT RENDERER ──────────────────────────────────────────────────────
  const drawText = (
    text: string, x: number, y: number,
    sizePx: number, weight: string, hex: string,
    align: 'left'|'center'|'right' = 'center',
    fontFamily: 'heading'|'body'|'mono' = 'heading'
  ) => {
    if (!text) return
    const family =
      fontFamily === 'mono'  ? '"Courier New","Courier",monospace' :
      fontFamily === 'body'  ? '"Inter","Helvetica Neue",sans-serif' :
                               '"Unbounded","Inter",sans-serif'
    const cvs = document.createElement('canvas')
    const ctx = cvs.getContext('2d')!
    const sc = 4
    const font = `${weight} ${sizePx * sc}px ${family}`
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

  // ── PROJECT LOGO ───────────────────────────────────────────────────────
  const drawProjectLogo = (lx: number, ly: number, sizeMm: number) => {
    const sc = 6, px = Math.round(sizeMm * sc)
    const cvs = document.createElement('canvas')
    cvs.width = px; cvs.height = px
    const ctx = cvs.getContext('2d')!
    const s = px / 100
    const grad = ctx.createLinearGradient(5*s, 5*s, 95*s, 95*s)
    grad.addColorStop(0, '#7C3AED'); grad.addColorStop(1, '#4F46E5')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(50*s,5*s); ctx.lineTo(95*s,50*s)
    ctx.lineTo(50*s,95*s); ctx.lineTo(5*s,50*s)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2*s; ctx.stroke()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 8*s
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(35*s,50*s); ctx.lineTo(45*s,60*s); ctx.lineTo(65*s,40*s)
    ctx.stroke()
    ctx.setLineDash([4*s,4*s])
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.2*s
    ctx.beginPath(); ctx.arc(50*s,50*s,45*s,0,Math.PI*2); ctx.stroke()
    ctx.setLineDash([])
    doc.addImage(cvs.toDataURL('image/png'), 'PNG', lx-sizeMm/2, ly-sizeMm/2, sizeMm, sizeMm)
  }

  // ══════════════════════════════════════════════════════════════
  // PROPORTIONAL LAYOUT CALCULATOR
  // Each element: { h: height-in-mm, key: string }
  // Elements with h=0 are horizontal rules / underlines.
  // Gap between all consecutive elements is calculated to fill
  // the usable height (y 12 → 198) uniformly.
  // ══════════════════════════════════════════════════════════════
  const parts     = studentName.trim().split(/\s+/)
  const lastName  = (parts[0] ?? '').toUpperCase()
  const firstName = parts.slice(1).join(' ')
  const titleLines = wrapText(testTitle, 215, 12, '700').slice(0, 2)

  const dateStr = (finishedAt ? new Date(finishedAt) : new Date())
    .toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })

  type ElemKey =
    'logo'|'gradex'|'rule'|'cert'|'subtitle'|'sep1'|
    'cym'|'lastname'|'firstname'|'underline'|'phrase'|
    'title0'|'title1'|'badge'|'sep2'|'date'

  const ELEMS: Array<{ h: number; key: ElemKey }> = [
    { h: 18,  key: 'logo'      },
    { h: 4.5, key: 'gradex'    },
    { h: 0,   key: 'rule'      },
    { h: 9,   key: 'cert'      },
    { h: 4,   key: 'subtitle'  },
    { h: 0,   key: 'sep1'      },
    { h: 4,   key: 'cym'       },
    { h: 9,   key: 'lastname'  },
    ...(firstName ? [{ h: 5.5, key: 'firstname' as ElemKey }] : []),
    { h: 0,   key: 'underline' },
    { h: 4,   key: 'phrase'    },
    ...titleLines.map((_, i) => ({ h: 6, key: `title${i}` as ElemKey })),
    { h: 14,  key: 'badge'     },
    { h: 0,   key: 'sep2'      },
    { h: 4,   key: 'date'      },
  ]

  const MARGIN_TOP = 13, MARGIN_BTM = 12
  const usableH = H - MARGIN_TOP - MARGIN_BTM
  const totalElemH = ELEMS.reduce((s, e) => s + e.h, 0)
  const gap = (usableH - totalElemH) / (ELEMS.length - 1)

  const pos: Partial<Record<ElemKey, number>> = {}
  let curY = MARGIN_TOP
  for (let i = 0; i < ELEMS.length; i++) {
    curY += ELEMS[i].h / 2
    pos[ELEMS[i].key] = curY
    curY += ELEMS[i].h / 2
    if (i < ELEMS.length - 1) curY += gap
  }

  // ── HEADER ─────────────────────────────────────────────────────────────
  drawProjectLogo(W / 2, pos.logo!, 18)
  drawText('GRADEX', W / 2, pos.gradex!, 7.5, 'bold', '#a78bfa', 'center', 'heading')

  draw(PURPLEL); doc.setLineWidth(0.2)
  doc.line(W/2 - 36, pos.rule!, W/2 - 5, pos.rule!)
  doc.line(W/2 + 5,  pos.rule!, W/2 + 36, pos.rule!)
  fill(GOLD); doc.circle(W / 2, pos.rule!, 1.0, 'F')

  drawText('СЕРТИФІКАТ', W / 2, pos.cert!, 19, '800', '#ffffff', 'center', 'heading')
  drawText('ПРО УСПІШНЕ ПРОХОДЖЕННЯ ТЕСТУВАННЯ', W / 2, pos.subtitle!, 7.5, '600', '#a78bfa', 'center', 'body')

  sv(); gst(0.45); draw(DIM); doc.setLineWidth(0.3)
  doc.line(20, pos.sep1!, W - 20, pos.sep1!); rs()

  // ── BODY ───────────────────────────────────────────────────────────────
  drawText('цим підтверджується, що', W / 2, pos.cym!, 8, '300', '#94a3b8', 'center', 'body')

  drawText(lastName, W / 2, pos.lastname!, 19, '800', '#fbbf24', 'center', 'heading')
  if (firstName) drawText(firstName, W / 2, pos.firstname!, 12, '400', '#e2e8f0', 'center', 'heading')

  sv(); gst(0.3); draw(GOLD); doc.setLineWidth(0.4)
  doc.line(W/2 - 52, pos.underline!, W/2 + 52, pos.underline!); rs()

  drawText('успішно завершив(ла) тестування з теми (курсу):', W / 2, pos.phrase!, 8, '400', '#94a3b8', 'center', 'body')

  titleLines.forEach((line, i) => {
    drawText(line, W / 2, pos[`title${i}` as ElemKey]!, 12, '700', '#e2e8f0', 'center', 'heading')
  })

  // Score badge
  const bh = 14
  sv(); gst(0.22); fill(PURPLE)
  doc.roundedRect(W/2 - 70, pos.badge! - bh/2, 140, bh, 3, 3, 'F'); rs()
  draw(PURPLEL); doc.setLineWidth(0.3)
  doc.roundedRect(W/2 - 70, pos.badge! - bh/2, 140, bh, 3, 3, 'S')
  drawText(`РЕЗУЛЬТАТ: ${score}`, W / 2, pos.badge! + 0.2, 7.5, '700', '#c4b5fd', 'center', 'body')

  // ── FOOTER ─────────────────────────────────────────────────────────────
  sv(); gst(0.45); draw(DIM); doc.setLineWidth(0.3)
  doc.line(20, pos.sep2!, W - 20, pos.sep2!); rs()
  fill(GOLD); doc.circle(W / 2, pos.sep2!, 1.0, 'F')

  // Date label + value on one line, 8pt Inter
  drawText(`дата завершення: ${dateStr}`, W / 2, pos.date!, 8, '400', '#64748b', 'center', 'body')

  if (testLogoUrl) {
    try {
      sv(); gst(0.65)
      doc.addImage(testLogoUrl, 'PNG', W - 46, 14, 17, 17)
      rs()
    } catch {}
  }

  doc.save(`Сертифікат_${studentName.replace(/\s+/g, '_')}.pdf`)
}
