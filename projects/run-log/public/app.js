// UI wiring: reads the form, saves runs, and redraws totals, chart, and list.
// All user text is set with textContent, never innerHTML.
import {
  loadRuns, saveRuns, validateRun, sortRuns, weekTotals, monthTotals, weekStart, weekEnd,
  pacePerMile, formatPace, formatDuration, formatMiles, toIsoDate, chartPoints, toCsv,
} from './runlog.js';
import { renderChart } from './chart.js';
import { setupGoal } from './goal.js';

const $ = (sel) => document.querySelector(sel);
const form = $('#run-form');
const FIELDS = ['date', 'distance', 'time', 'avgHr', 'note'];
let runs = loadRuns(localStorage);
const renderGoal = setupGoal(localStorage, () => weekTotals(runs, new Date()).miles);

function longDate(iso, opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}

function renderTotal(card, totals, rangeText) {
  card.querySelector('[data-range]').textContent = rangeText;
  card.querySelector('[data-miles]').textContent = formatMiles(totals.miles);
  card.querySelector('[data-count]').textContent = String(totals.count);
  card.querySelector('[data-time]').textContent = formatDuration(totals.seconds);
  card.querySelector('[data-pace]').textContent = totals.pace == null ? 'none' : `${formatPace(totals.pace)} /mi`;
}

function renderTotals() {
  const today = new Date();
  const short = { month: 'short', day: 'numeric' };
  renderTotal($('#week'), weekTotals(runs, today),
    `${longDate(weekStart(today), short)} to ${longDate(weekEnd(today), short)}`);
  renderTotal($('#month'), monthTotals(runs, today),
    today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
}

function renderList() {
  const list = $('#run-list');
  const tpl = $('#run-row');
  list.replaceChildren();
  for (const run of sortRuns(runs)) {
    const row = tpl.content.firstElementChild.cloneNode(true);
    row.dataset.id = run.id;
    const when = row.querySelector('.run-date');
    when.dateTime = run.date;
    when.textContent = longDate(run.date);
    row.querySelector('[data-pace]').textContent = formatPace(pacePerMile(run.seconds, run.distanceMi));
    row.querySelector('[data-miles]').textContent = formatMiles(run.distanceMi);
    row.querySelector('[data-time]').textContent = formatDuration(run.seconds);
    row.querySelector('[data-hr]').textContent = run.avgHr ? `, avg HR ${run.avgHr} bpm` : '';
    const note = row.querySelector('.run-note');
    note.textContent = run.note;
    note.hidden = !run.note;
    const del = row.querySelector('.btn-delete');
    del.setAttribute('aria-label', `Delete run on ${longDate(run.date)}`);
    del.addEventListener('click', () => deleteRun(run));
    list.append(row);
  }
  $('#empty').hidden = runs.length > 0;
  $('#export').disabled = runs.length === 0;
}

function renderAll() {
  renderTotals();
  renderGoal();
  renderList();
  renderChart($('#chart'), chartPoints(runs));
}

function showErrors(errors) {
  for (const f of FIELDS) {
    $(`#${f}-error`).textContent = errors[f] ?? '';
    const inputs = f === 'time' ? ['#hours', '#minutes', '#seconds'] : [`#${f}`];
    for (const sel of inputs) $(sel).setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

function persist() {
  try {
    saveRuns(localStorage, runs);
    return true;
  } catch {
    $('#status').textContent = 'Could not save on this device. Export your runs to keep a copy.';
    return false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const { run, errors } = validateRun(Object.fromEntries(new FormData(form)));
  showErrors(errors);
  if (!run) {
    $('#status').textContent = 'Check the highlighted fields.';
    const first = FIELDS.find((f) => errors[f]);
    $(first === 'time' ? '#minutes' : `#${first}`).focus();
    return;
  }
  run.id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  runs = [run, ...runs];
  if (persist()) $('#status').textContent = `Run saved: ${formatMiles(run.distanceMi)} mi at ${formatPace(pacePerMile(run.seconds, run.distanceMi))} /mi.`;
  const keepDate = form.date.value;
  form.reset();
  form.date.value = keepDate;
  renderAll();
});

function deleteRun(run) {
  if (!confirm(`Delete the ${formatMiles(run.distanceMi)} mile run on ${longDate(run.date)}?`)) return;
  runs = runs.filter((r) => r.id !== run.id);
  if (persist()) $('#status').textContent = 'Run deleted.';
  renderAll();
}

$('#export').addEventListener('click', () => {
  const blob = new Blob([toCsv(runs)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `run-log-${toIsoDate(new Date())}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// Redraw the chart when the width changes (phone rotation, window resize).
let lastWidth = 0;
new ResizeObserver(([entry]) => {
  const w = Math.round(entry.contentRect.width);
  if (w !== lastWidth) {
    lastWidth = w;
    renderChart($('#chart'), chartPoints(runs));
  }
}).observe($('#chart'));

form.date.value = toIsoDate(new Date());
renderAll();
