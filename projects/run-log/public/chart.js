// Draws the pace trend as an SVG line chart. Faster pace (fewer seconds) is higher.
import { formatPace, formatMiles } from './runlog.js';

const SVG = 'http://www.w3.org/2000/svg';
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 30, left: 46 };

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

/** Short date for axis and tooltip: "Nov 16". */
function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Grid step in seconds that gives about 3 to 5 lines. */
function tickStep(range) {
  return [15, 30, 60, 120, 300].find((s) => range / s <= 4) ?? 600;
}

/**
 * Render points ({ date, pace, run }) into `box`. Shows a message when fewer than 2.
 */
export function renderChart(box, points) {
  box.replaceChildren();
  if (points.length < 2) {
    const msg = document.createElement('p');
    msg.className = 'empty';
    msg.textContent = points.length === 0
      ? 'Your pace trend appears here once you log two runs.'
      : 'One run logged. Add one more to see your trend.';
    box.append(msg);
    return;
  }

  const width = Math.max(280, box.getBoundingClientRect().width || 600);
  const paces = points.map((p) => p.pace);
  const step = tickStep(Math.max(...paces) - Math.min(...paces));
  const lo = Math.floor(Math.min(...paces) / step) * step;
  const hi = Math.max(Math.ceil(Math.max(...paces) / step) * step, lo + step);
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (i / (points.length - 1)) * plotW;
  const y = (pace) => PAD.top + ((pace - lo) / (hi - lo)) * plotH;

  const svg = el('svg', {
    viewBox: `0 0 ${width} ${HEIGHT}`, width: '100%', height: HEIGHT, role: 'img',
    'aria-label': `Pace trend for ${points.length} runs, from ${formatPace(points[0].pace)} to ${formatPace(points.at(-1).pace)} per mile`,
  });

  for (let v = lo; v <= hi; v += step) {
    svg.append(el('line', { class: 'grid', x1: PAD.left, x2: width - PAD.right, y1: y(v), y2: y(v) }));
    svg.append(el('text', { class: 'tick', x: PAD.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, formatPace(v)));
  }
  svg.append(el('text', { class: 'tick', x: PAD.left, y: HEIGHT - 8 }, shortDate(points[0].date)));
  svg.append(el('text', { class: 'tick', x: width - PAD.right, y: HEIGHT - 8, 'text-anchor': 'end' }, shortDate(points.at(-1).date)));

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.pace).toFixed(1)}`).join(' ');
  svg.append(el('path', { class: 'line', d: path }));

  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;

  points.forEach((p, i) => {
    const cx = x(i);
    const cy = y(p.pace);
    const g = el('g', { class: 'pt', tabindex: '0', 'data-date': p.date });
    const label = `${shortDate(p.date)}: ${formatPace(p.pace)} per mile, ${formatMiles(p.run.distanceMi)} miles`;
    g.setAttribute('aria-label', label);
    g.append(el('circle', { class: 'hit', cx, cy, r: 23 }), el('circle', { class: 'dot', cx, cy, r: 5 }));
    const show = () => {
      tip.textContent = label;
      tip.hidden = false;
      const left = (cx / width) * 100;
      tip.style.left = `clamp(0px, calc(${left}% - 80px), calc(100% - 160px))`;
      tip.style.top = `${Math.max(0, cy - 52)}px`;
      svg.querySelectorAll('.pt.on').forEach((n) => n.classList.remove('on'));
      g.classList.add('on');
    };
    const hide = () => { tip.hidden = true; g.classList.remove('on'); };
    g.addEventListener('pointerenter', show);
    g.addEventListener('focus', show);
    // Touch fires pointerleave right after the tap, so only mouse hides on leave.
    g.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    g.addEventListener('click', show);
    g.addEventListener('blur', hide);
    svg.append(g);
  });

  box.append(svg, tip);
}
