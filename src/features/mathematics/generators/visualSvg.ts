/**
 * Детерминированные SVG для визуальных генераторов M10/M17/M18/M21/M24/M25.
 * Без Math.random; пригодны для 4 класса.
 */

export function svgClock(hours: number, minutes: number): string {
  const h = ((hours % 12) + 12) % 12;
  const minuteAngle = minutes * 6 - 90;
  const hourAngle = h * 30 + minutes * 0.5 - 90;
  const cx = 100;
  const cy = 100;
  const r = 80;
  const ticks: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (i * 30 - 90) * (Math.PI / 180);
    const x1 = cx + Math.cos(a) * (r - 2);
    const y1 = cy + Math.sin(a) * (r - 2);
    const x2 = cx + Math.cos(a) * (r - (i % 3 === 0 ? 14 : 8));
    const y2 = cy + Math.sin(a) * (r - (i % 3 === 0 ? 14 : 8));
    ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#222" stroke-width="${i % 3 === 0 ? 3 : 1.5}"/>`);
    const lx = cx + Math.cos(a) * (r - 24);
    const ly = cy + Math.sin(a) * (r - 24);
    const label = i === 0 ? 12 : i;
    ticks.push(`<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#222">${label}</text>`);
  }
  const minLen = 58;
  const hourLen = 40;
  const mx = cx + Math.cos(minuteAngle * Math.PI / 180) * minLen;
  const my = cy + Math.sin(minuteAngle * Math.PI / 180) * minLen;
  const hx = cx + Math.cos(hourAngle * Math.PI / 180) * hourLen;
  const hy = cy + Math.sin(hourAngle * Math.PI / 180) * hourLen;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="циферблат">
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#222" stroke-width="3"/>
${ticks.join('\n')}
<line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#111" stroke-width="5" stroke-linecap="round"/>
<line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>
<circle cx="${cx}" cy="${cy}" r="4" fill="#111"/>
</svg>`;
}

export type FigureKind =
  | 'square'
  | 'rectangle'
  | 'triangle'
  | 'circle'
  | 'segment'
  | 'ray'
  | 'pentagon';

export function svgFigure(kind: FigureKind, rotationDeg = 0): string {
  const rot = `rotate(${rotationDeg} 100 100)`;
  let body = '';
  if (kind === 'square') {
    body = `<rect x="55" y="55" width="90" height="90" fill="#dbeafe" stroke="#1e3a8a" stroke-width="3"/>`;
  } else if (kind === 'rectangle') {
    body = `<rect x="40" y="65" width="120" height="70" fill="#dbeafe" stroke="#1e3a8a" stroke-width="3"/>`;
  } else if (kind === 'triangle') {
    body = `<polygon points="100,40 160,155 40,155" fill="#dbeafe" stroke="#1e3a8a" stroke-width="3"/>`;
  } else if (kind === 'circle') {
    body = `<circle cx="100" cy="100" r="55" fill="#dbeafe" stroke="#1e3a8a" stroke-width="3"/>`;
  } else if (kind === 'segment') {
    body = `<line x1="40" y1="100" x2="160" y2="100" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round"/>
<circle cx="40" cy="100" r="4" fill="#1e3a8a"/><circle cx="160" cy="100" r="4" fill="#1e3a8a"/>`;
  } else if (kind === 'ray') {
    body = `<line x1="50" y1="100" x2="170" y2="100" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)"/>
<circle cx="50" cy="100" r="5" fill="#1e3a8a"/>
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#1e3a8a"/></marker></defs>`;
  } else {
    body = `<polygon points="100,35 145,70 130,125 70,125 55,70" fill="#dbeafe" stroke="#1e3a8a" stroke-width="3"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="фигура">
<rect width="200" height="200" fill="#fff"/>
<g transform="${rot}">${body}</g>
</svg>`;
}

export function svgGridSegment(cells: number, vertical = false): string {
  const cell = 18;
  const pad = 20;
  const cols = vertical ? 6 : Math.max(cells + 2, 8);
  const rows = vertical ? Math.max(cells + 2, 8) : 6;
  const w = pad * 2 + cols * cell;
  const h = pad * 2 + rows * cell;
  const lines: string[] = [];
  for (let c = 0; c <= cols; c += 1) {
    const x = pad + c * cell;
    lines.push(`<line x1="${x}" y1="${pad}" x2="${x}" y2="${pad + rows * cell}" stroke="#94a3b8" stroke-width="1"/>`);
  }
  for (let r = 0; r <= rows; r += 1) {
    const y = pad + r * cell;
    lines.push(`<line x1="${pad}" y1="${y}" x2="${pad + cols * cell}" y2="${y}" stroke="#94a3b8" stroke-width="1"/>`);
  }
  const startC = 1;
  const startR = vertical ? 1 : 2;
  if (vertical) {
    const x = pad + startC * cell;
    const y1 = pad + startR * cell;
    const y2 = pad + (startR + cells) * cell;
    lines.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#b91c1c" stroke-width="4" stroke-linecap="round"/>`);
  } else {
    const y = pad + startR * cell;
    const x1 = pad + startC * cell;
    const x2 = pad + (startC + cells) * cell;
    lines.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#b91c1c" stroke-width="4" stroke-linecap="round"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="сетка">
<rect width="${w}" height="${h}" fill="#fff"/>
${lines.join('\n')}
</svg>`;
}

export function svgGridRectangle(widthCells: number, heightCells: number, mode: 'fill' | 'outline' = 'fill'): string {
  const cell = 18;
  const pad = 20;
  const cols = widthCells + 3;
  const rows = heightCells + 3;
  const w = pad * 2 + cols * cell;
  const h = pad * 2 + rows * cell;
  const lines: string[] = [];
  for (let c = 0; c <= cols; c += 1) {
    const x = pad + c * cell;
    lines.push(`<line x1="${x}" y1="${pad}" x2="${x}" y2="${pad + rows * cell}" stroke="#94a3b8" stroke-width="1"/>`);
  }
  for (let r = 0; r <= rows; r += 1) {
    const y = pad + r * cell;
    lines.push(`<line x1="${pad}" y1="${y}" x2="${pad + cols * cell}" y2="${y}" stroke="#94a3b8" stroke-width="1"/>`);
  }
  const ox = pad + cell;
  const oy = pad + cell;
  if (mode === 'fill') {
    for (let r = 0; r < heightCells; r += 1) {
      for (let c = 0; c < widthCells; c += 1) {
        lines.push(
          `<rect x="${ox + c * cell + 1}" y="${oy + r * cell + 1}" width="${cell - 2}" height="${cell - 2}" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1"/>`,
        );
      }
    }
  } else {
    lines.push(
      `<rect x="${ox}" y="${oy}" width="${widthCells * cell}" height="${heightCells * cell}" fill="none" stroke="#b91c1c" stroke-width="3"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="прямоугольник на сетке">
<rect width="${w}" height="${h}" fill="#fff"/>
${lines.join('\n')}
</svg>`;
}

/** Г-образная фигура: большой W×H минус вырез cutW×cutH из правого верхнего угла. */
export function svgGridLShape(bigW: number, bigH: number, cutW: number, cutH: number): string {
  const cell = 16;
  const pad = 16;
  const cols = bigW + 2;
  const rows = bigH + 2;
  const w = pad * 2 + cols * cell;
  const h = pad * 2 + rows * cell;
  const lines: string[] = [];
  for (let c = 0; c <= cols; c += 1) {
    const x = pad + c * cell;
    lines.push(`<line x1="${x}" y1="${pad}" x2="${x}" y2="${pad + rows * cell}" stroke="#94a3b8" stroke-width="1"/>`);
  }
  for (let r = 0; r <= rows; r += 1) {
    const y = pad + r * cell;
    lines.push(`<line x1="${pad}" y1="${y}" x2="${pad + cols * cell}" y2="${y}" stroke="#94a3b8" stroke-width="1"/>`);
  }
  const ox = pad + cell;
  const oy = pad + cell;
  for (let r = 0; r < bigH; r += 1) {
    for (let c = 0; c < bigW; c += 1) {
      const inCut = c >= bigW - cutW && r < cutH;
      if (inCut) continue;
      lines.push(
        `<rect x="${ox + c * cell + 1}" y="${oy + r * cell + 1}" width="${cell - 2}" height="${cell - 2}" fill="#86efac" stroke="#166534" stroke-width="1"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="фигура на сетке">
<rect width="${w}" height="${h}" fill="#fff"/>
${lines.join('\n')}
</svg>`;
}

export type SymmetryKind = 'butterfly' | 'isos_triangle' | 'rectangle' | 'letter_e' | 'arrow_right' | 'circle' | 'scalene';

export function svgSymmetry(kind: SymmetryKind, showAxis: 'none' | 'vertical' | 'horizontal' | 'diagonal' = 'none'): string {
  let body = '';
  if (kind === 'butterfly') {
    body = `<ellipse cx="70" cy="100" rx="35" ry="50" fill="#c4b5fd"/><ellipse cx="130" cy="100" rx="35" ry="50" fill="#c4b5fd"/><ellipse cx="100" cy="100" rx="12" ry="28" fill="#7c3aed"/>`;
  } else if (kind === 'isos_triangle') {
    body = `<polygon points="100,35 160,160 40,160" fill="#bfdbfe" stroke="#1e40af" stroke-width="2"/>`;
  } else if (kind === 'rectangle') {
    body = `<rect x="45" y="70" width="110" height="60" fill="#bfdbfe" stroke="#1e40af" stroke-width="2"/>`;
  } else if (kind === 'letter_e') {
    body = `<path d="M60 50 H140 V70 H85 V90 H130 V110 H85 V130 H140 V150 H60 Z" fill="#1e40af"/>`;
  } else if (kind === 'arrow_right') {
    body = `<polygon points="40,80 120,80 120,55 170,100 120,145 120,120 40,120" fill="#fca5a5" stroke="#991b1b" stroke-width="2"/>`;
  } else if (kind === 'circle') {
    body = `<circle cx="100" cy="100" r="55" fill="#bfdbfe" stroke="#1e40af" stroke-width="2"/>`;
  } else {
    body = `<polygon points="50,40 170,70 140,160 40,130" fill="#fecaca" stroke="#991b1b" stroke-width="2"/>`;
  }
  let axis = '';
  if (showAxis === 'vertical') axis = `<line x1="100" y1="20" x2="100" y2="180" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>`;
  if (showAxis === 'horizontal') axis = `<line x1="20" y1="100" x2="180" y2="100" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>`;
  if (showAxis === 'diagonal') axis = `<line x1="30" y1="30" x2="170" y2="170" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="симметрия">
<rect width="200" height="200" fill="#fff"/>
${body}
${axis}
</svg>`;
}

export type ChartBarSpec = { name: string; value: number };

export function svgBarChart(
  title: string,
  bars: ChartBarSpec[],
  scaleStep: number,
  maxScale: number,
): string {
  const left = 48;
  const bottom = 160;
  const top = 28;
  const chartH = bottom - top;
  const barW = 28;
  const gap = 18;
  const width = left + bars.length * (barW + gap) + 20;
  const height = 200;
  const ticks: string[] = [];
  for (let v = 0; v <= maxScale; v += scaleStep) {
    const y = bottom - (v / maxScale) * chartH;
    ticks.push(`<line x1="${left - 4}" y1="${y.toFixed(1)}" x2="${left + bars.length * (barW + gap)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`);
    ticks.push(`<text x="${left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" font-family="Arial,sans-serif" fill="#334155">${v}</text>`);
  }
  const rects: string[] = [];
  bars.forEach((bar, i) => {
    const x = left + i * (barW + gap);
    const h = (bar.value / maxScale) * chartH;
    const y = bottom - h;
    rects.push(`<rect x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1"/>`);
    rects.push(`<text x="${x + barW / 2}" y="${bottom + 16}" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#0f172a">${bar.name}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="диаграмма">
<rect width="${width}" height="${height}" fill="#fff"/>
<text x="${width / 2}" y="18" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="#0f172a">${title}</text>
<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#334155" stroke-width="2"/>
<line x1="${left}" y1="${bottom}" x2="${left + bars.length * (barW + gap)}" y2="${bottom}" stroke="#334155" stroke-width="2"/>
${ticks.join('\n')}
${rects.join('\n')}
</svg>`;
}
