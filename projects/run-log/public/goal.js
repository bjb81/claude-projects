// Weekly mileage goal on the This week card: the progress bar and the small form that sets it.
// Calculations live in runlog.js; this file only touches the page.
import { loadGoal, saveGoal, validateGoal, goalProgress, formatMiles } from './runlog.js';

const $ = (sel) => document.querySelector(sel);

/**
 * Wire up the goal controls. `weekMiles` returns this week's miles.
 * Returns a render function to call whenever the runs change.
 */
export function setupGoal(storage, weekMiles) {
  let goal = loadGoal(storage);
  const form = $('#goal-form');
  const input = $('#goal-input');
  const editBtn = $('#goal-edit');
  const say = (message) => { $('#goal-status').textContent = message; };

  function render() {
    const hasGoal = goal != null;
    $('#goal-progress').hidden = !hasGoal;
    editBtn.textContent = hasGoal ? 'Change goal' : 'Set a weekly goal';
    $('#goal-remove').hidden = !hasGoal;
    if (!hasGoal) return;

    const miles = weekMiles();
    const p = goalProgress(miles, goal);
    $('#goal-text').textContent = `${formatMiles(miles)} of ${formatMiles(goal)} mi (${p.percent}%)`;
    $('#goal-left').textContent = p.met ? 'Goal met' : `${formatMiles(p.remaining)} mi to go`;
    $('#goal-fill').style.width = `${p.fill * 100}%`;
    $('#goal').classList.toggle('met', p.met);
    const bar = $('#goal-bar');
    bar.setAttribute('aria-valuemax', String(goal));
    bar.setAttribute('aria-valuenow', String(Math.min(miles, goal)));
    bar.setAttribute('aria-valuetext', `${formatMiles(miles)} of ${formatMiles(goal)} miles, ${p.percent}%`);
  }

  function showError(message) {
    $('#goal-error').textContent = message ?? '';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function close() {
    form.hidden = true;
    editBtn.hidden = false;
    showError(null);
    editBtn.focus();
  }

  function store(next, message) {
    try {
      saveGoal(storage, next);
      goal = next;
      say(message);
    } catch {
      say('Could not save the goal on this device.');
    }
    close();
    render();
  }

  editBtn.addEventListener('click', () => {
    say('');
    input.value = goal ?? '';
    showError(null);
    editBtn.hidden = true;
    form.hidden = false;
    input.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { goal: next, error } = validateGoal(input.value);
    if (error) {
      showError(error);
      input.focus();
      return;
    }
    store(next, `Weekly goal saved: ${formatMiles(next)} miles.`);
  });

  $('#goal-cancel').addEventListener('click', close);
  $('#goal-remove').addEventListener('click', () => store(null, 'Weekly goal removed.'));
  form.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });

  return render;
}
