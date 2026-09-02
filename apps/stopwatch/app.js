'use strict';

// 補強のメニュー(フル・コアA・コアB・ループ・下肢)は、それぞれ独立した
// タブとして表示する(タイマー・声の選択・録音セットも完全に別)。id が
// そのままカテゴリID(録音・声選択のキー)にも、タブパネルID
// (`${id}Tab`)にもなる。el(下)より先に必要なので、ファイル先頭に置く。
const REINFORCE_MENU_TABS = [
  { id: 'reinforceFull', tabLabel: '補強フル', menuKey: 'フル' },
  { id: 'reinforceCoreA', tabLabel: '補強コアA', menuKey: 'コアA' },
  { id: 'reinforceCoreB', tabLabel: '補強コアB', menuKey: 'コアB' },
  { id: 'reinforceLoop', tabLabel: '補強ループ', menuKey: 'ループ' },
  { id: 'reinforceLower', tabLabel: '補強下肢', menuKey: '下肢' },
];

/* ---------- Global DOM (singletons) ---------- */
const el = {
  stopwatchList: document.getElementById('stopwatchList'),
  template: document.getElementById('stopwatchTemplate'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  lockToggleBtn: document.getElementById('lockToggleBtn'),
  lockOverlay: document.getElementById('lockOverlay'),
  appTopbarTitle: document.getElementById('appTopbarTitle'),
  tabPanels: {
    timer: document.getElementById('timerTab'),
    pace: document.getElementById('paceTab'),
    crossing: document.getElementById('crossingTab'),
    stretch: document.getElementById('stretchTab'),
    ...Object.fromEntries(REINFORCE_MENU_TABS.map((t) => [t.id, document.getElementById(`${t.id}Tab`)])),
    tabata: document.getElementById('tabataTab'),
    rollcall: document.getElementById('rollcallTab'),
  },
  reinforceMenuTabTemplate: document.getElementById('reinforceMenuTabTemplate'),
  paceRows: document.getElementById('paceRows'),
  paceAddRowBtn: document.getElementById('paceAddRowBtn'),
  paceRowTemplate: document.getElementById('paceRowTemplate'),
  presetDistanceInput: document.getElementById('presetDistanceInput'),
  presetPaceRows: document.querySelectorAll('#presetPaceTable .preset-pace-row'),
  trainRowTemplate: document.getElementById('trainRowTemplate'),
  crossingCards: document.querySelectorAll('.crossing-card'),
  stretchProgress: document.getElementById('stretchProgress'),
  stretchVoiceToggle: document.getElementById('stretchVoiceToggle'),
  stretchVoiceSelect: document.getElementById('stretchVoiceSelect'),
  stretchRecordingsToggle: document.getElementById('stretchRecordingsToggle'),
  stretchRecordingsModal: document.getElementById('stretchRecordingsModal'),
  stretchRecordingsModalTitle: document.getElementById('stretchRecordingsModalTitle'),
  stretchRecordingsCloseBtn: document.getElementById('stretchRecordingsCloseBtn'),
  stretchRecordingsList: document.getElementById('stretchRecordingsList'),
  recordingRowTemplate: document.getElementById('recordingRowTemplate'),
  recordingSetSelect: document.getElementById('recordingSetSelect'),
  recordingSetNewBtn: document.getElementById('recordingSetNewBtn'),
  recordingSetRenameBtn: document.getElementById('recordingSetRenameBtn'),
  recordingSetDeleteBtn: document.getElementById('recordingSetDeleteBtn'),
  recordingSetShareBtn: document.getElementById('recordingSetShareBtn'),
  stretchTimer: document.getElementById('stretchTimer'),
  stretchCurrentGroup: document.getElementById('stretchCurrentGroup'),
  stretchNextGroup: document.getElementById('stretchNextGroup'),
  stretchNextSpeech: document.getElementById('stretchNextSpeech'),
  stretchStartBtn: document.getElementById('stretchStartBtn'),
  stretchAutoBtn: document.getElementById('stretchAutoBtn'),
  stretchPrevBtn: document.getElementById('stretchPrevBtn'),
  stretchNextBtn: document.getElementById('stretchNextBtn'),
  stretchPauseBtn: document.getElementById('stretchPauseBtn'),
  stretchResetBtn: document.getElementById('stretchResetBtn'),
  tabataProgress: document.getElementById('tabataProgress'),
  tabataDisplayPanel: document.getElementById('tabataDisplayPanel'),
  tabataPhase: document.getElementById('tabataPhase'),
  tabataTimer: document.getElementById('tabataTimer'),
  tabataStartBtn: document.getElementById('tabataStartBtn'),
  tabataResetBtn: document.getElementById('tabataResetBtn'),
  pulseTimerValue: document.getElementById('pulseTimerValue'),
  pulseTimerStartBtn: document.getElementById('pulseTimerStartBtn'),
  rollcallProgress: document.getElementById('rollcallProgress'),
  rollcallMainTagFilter: document.getElementById('rollcallMainTagFilter'),
  rollcallList: document.getElementById('rollcallList'),
  rollcallRegisterToggle: document.getElementById('rollcallRegisterToggle'),
  rollcallResetBtn: document.getElementById('rollcallResetBtn'),
  rollcallMemberTemplate: document.getElementById('rollcallMemberTemplate'),
  rollcallRegisterModal: document.getElementById('rollcallRegisterModal'),
  rollcallRegisterCloseBtn: document.getElementById('rollcallRegisterCloseBtn'),
  rollcallTagManageList: document.getElementById('rollcallTagManageList'),
  rollcallNewTagName: document.getElementById('rollcallNewTagName'),
  rollcallNewTagBtn: document.getElementById('rollcallNewTagBtn'),
  rollcallAddName: document.getElementById('rollcallAddName'),
  rollcallAddTagCheckboxes: document.getElementById('rollcallAddTagCheckboxes'),
  rollcallAddBtn: document.getElementById('rollcallAddBtn'),
  rollcallRegisterList: document.getElementById('rollcallRegisterList'),
  rollcallRegisterRowTemplate: document.getElementById('rollcallRegisterRowTemplate'),
};

/* ---------- Tabs ---------- */
// アプリ内のハンバーガーメニューは廃止し、タブ間の移動はポータル側の
// 直リンク(#timer, #tabata 等)経由に一本化した。補強フル/コアA/コアB/
// ループ/下肢の5つだけは1つの「補強カウント」リンクにまとまっているため、
// createReinforceTab() が差し込む .reinforce-subnav から相互に切り替える。
const TAB_LABELS = {
  timer: '計測',
  pace: '距離',
  crossing: '山試走',
  stretch: 'ストレッチ',
  tabata: 'TABATA',
  rollcall: '点呼',
  ...Object.fromEntries(REINFORCE_MENU_TABS.map((t) => [t.id, t.tabLabel])),
};

function selectTab(tabName) {
  if (!el.tabPanels[tabName]) return false;
  Object.entries(el.tabPanels).forEach(([name, panel]) => {
    panel.hidden = name !== tabName;
  });
  const label = TAB_LABELS[tabName] || '';
  el.appTopbarTitle.textContent = label;
  // 複数の機能(タバタ・点呼・補強など)が同じアプリを指しているため、
  // ブラウザのタブ名でも見分けられるようにタブごとに document.title を変える。
  document.title = label ? `${label} | ストップウォッチ` : 'ストップウォッチ';

  // 誤タップ防止の「固定」ボタンは計測タブのみで使う(それ以外のタブは
  // 連続してボタンをタップする操作だったり、そもそも長時間画面を
  // 見ながら操作するものではないため不要)。ロック中に他のタブへ
  // 切り替えた場合は、ボタンごと消えて解除できなくなってしまわないよう
  // 自動でロックを解除しておく。
  const showLockToggle = tabName === 'timer';
  el.lockToggleBtn.hidden = !showLockToggle;
  if (!showLockToggle && !el.lockOverlay.hidden) {
    el.lockOverlay.hidden = true;
    el.lockToggleBtn.classList.remove('is-locked');
    el.lockToggleBtn.textContent = '固定';
  }
  // 「固定」ボタンが無いタブでは、そのボタン用に空けていた上部余白も
  // 詰める(計測タブのみボタンとの重なり防止のため余白を残す)。
  document.querySelector('.app').classList.toggle('no-lock-padding', !showLockToggle);
  return true;
}

// ポータルなど外部からの直リンク用: URLの #タブ名 (例: #tabata) で
// 該当タブを開いた状態にする。指定が無い/存在しないタブ名のときは計測タブ。
(function openTabFromUrlHash() {
  const tabName = location.hash.replace(/^#/, '');
  if (!selectTab(tabName)) selectTab('timer');
})();

/* ---------- Pace calculator ---------- */
// Accepts plain seconds ("270", "83.5") or minute:second ("4:30", "1:23.4",
// and even "h:mm:ss" for very long distances).
function parsePaceTime(str) {
  const s = String(str).trim();
  if (!s) return NaN;
  const parts = s.split(':');
  if (parts.some((p) => p.trim() === '' || Number.isNaN(Number(p)))) return NaN;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return NaN;
}

function formatPace(secPerKm) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '--:--/km';
  const totalDecis = Math.round(secPerKm * 10);
  const decis = totalDecis % 10;
  const totalSeconds = Math.floor(totalDecis / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${minutes}:${pad2(seconds)}.${decis}/km`;
}

function formatSpeed(kmh) {
  if (!Number.isFinite(kmh) || kmh <= 0) return '-- km/h';
  return `${kmh.toFixed(2)} km/h`;
}

function computePaceRow(row) {
  const distance = Number(row.querySelector('.pace-distance').value);
  const timeSec = parsePaceTime(row.querySelector('.pace-time').value);
  const valid = distance > 0 && Number.isFinite(timeSec) && timeSec > 0;
  const paceSecPerKm = valid ? (timeSec / distance) * 1000 : NaN;
  const speedKmh = valid ? (distance / 1000 / timeSec) * 3600 : NaN;
  row.querySelector('.pace-pace-value').textContent = formatPace(paceSecPerKm);
  row.querySelector('.pace-speed-value').textContent = formatSpeed(speedKmh);
}

function addPaceRow(distance = '', time = '') {
  const node = el.paceRowTemplate.content.firstElementChild.cloneNode(true);
  const distanceInput = node.querySelector('.pace-distance');
  const timeInput = node.querySelector('.pace-time');
  distanceInput.value = distance;
  timeInput.value = time;
  distanceInput.addEventListener('input', () => computePaceRow(node));
  timeInput.addEventListener('input', () => computePaceRow(node));
  node.querySelector('.pace-remove').addEventListener('click', () => node.remove());
  el.paceRows.appendChild(node);
  computePaceRow(node);
}

el.paceAddRowBtn.addEventListener('click', () => addPaceRow());

addPaceRow();

/* ---------- Preset-pace time table ---------- */
// The reverse direction from the calculator above: fixed common paces, and
// the distance is the only thing you type — every row's time updates the
// instant it changes.
function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '--:--';
  const totalDecis = Math.round(sec * 10);
  const decis = totalDecis % 10;
  const totalSeconds = Math.floor(totalDecis / 10);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  const minutesStr = hours > 0 ? pad2(minutes) : String(minutes);
  const base = `${minutesStr}:${pad2(seconds)}.${decis}`;
  return hours > 0 ? `${hours}:${base}` : base;
}

function renderPresetPaceTable() {
  const distance = Number(el.presetDistanceInput.value);
  const valid = distance > 0;
  el.presetPaceRows.forEach((row) => {
    const paceSecPerKm = Number(row.dataset.paceSec);
    const timeSec = valid ? paceSecPerKm * (distance / 1000) : NaN;
    row.querySelector('.preset-pace-time').textContent = formatDuration(timeSec);
  });
}

el.presetDistanceInput.addEventListener('input', renderPresetPaceTable);

/* ---------- Press feedback ---------- */
// Vibration API isn't supported by iOS Safari (as of this writing), so this
// is a no-op there — but it works on Android/Chrome, and costs nothing to
// have in place.
document.addEventListener('click', (e) => {
  if (e.target.closest('button') && 'vibrate' in navigator) {
    navigator.vibrate(15);
  }
});

// Visual stand-in for the missing haptic buzz on iOS: applied on pointerdown
// (not click) so it's instant, and cleared on pointerup/cancel anywhere —
// not just over the same button — in case a finger slides off before lifting.
document.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('button');
  if (btn && !btn.disabled) btn.classList.add('is-pressed');
});
function clearPressedButtons() {
  document.querySelectorAll('.is-pressed').forEach((btn) => btn.classList.remove('is-pressed'));
}
document.addEventListener('pointerup', clearPressedButtons);
document.addEventListener('pointercancel', clearPressedButtons);

/* ---------- Screen lock ---------- */
// Full lock: the overlay covers the whole page and swallows every tap, so
// nothing underneath can be triggered by accident. Only the toggle itself
// (fixed above the overlay) stays reachable to unlock.
el.lockToggleBtn.addEventListener('click', () => {
  const locked = el.lockOverlay.hidden;
  el.lockOverlay.hidden = !locked;
  el.lockToggleBtn.classList.toggle('is-locked', locked);
  el.lockToggleBtn.textContent = locked ? '固定中' : '固定';
  if (locked && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

/* ---------- Time formatting ---------- */
function formatTime(ms) {
  const totalCentis = Math.floor(ms / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  const base = `${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
  return hours > 0 ? `${hours}:${base}` : base;
}

// Excel export only: rounds to the nearest 0.1s and shows a single decimal
// digit (e.g. "0:00.0") instead of the on-screen two-digit centiseconds.
// The leftmost unit (hours if present, otherwise minutes) isn't zero-padded
// — e.g. "8:12.5", not "08:12.5" — but every unit below it still is, so
// "1:05:23.4" stays unambiguous.
function formatTimeShort(ms) {
  const totalDecis = Math.round(ms / 100);
  const decis = totalDecis % 10;
  const totalSeconds = Math.floor(totalDecis / 10);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  const minutesStr = hours > 0 ? pad2(minutes) : String(minutes);
  const base = `${minutesStr}:${pad2(seconds)}.${decis}`;
  return hours > 0 ? `${hours}:${base}` : base;
}

function currentElapsedMs(sw) {
  if (!sw.running) return sw.elapsedMs;
  return sw.elapsedMs + (Date.now() - sw.startEpoch);
}

// Past 1 hour the display grows an "H:" (or "HH:") prefix. The base font
// size is tuned to fill narrow phone screens with the normal 8-character
// MM:SS.CC readout, so those extra digits need a smaller size tier to avoid
// getting clipped at the edge of the watch case.
function setDisplayTime(sw, ms) {
  sw.dom.display.textContent = formatTime(ms);
  const hours = Math.floor(ms / 3600000);
  sw.dom.display.classList.toggle('is-hours', hours >= 1 && hours < 10);
  sw.dom.display.classList.toggle('is-long-hours', hours >= 10);
}

/* ---------- Stopwatch instances ---------- */
const stopwatches = new Map(); // id -> stopwatch instance
const familyGroups = new Map(); // root parent id -> wrapping DOM element for that parent + its children
let nextStopwatchNumber = 1;
let nextParentNumber = 1; // letter naming counted only among parents, so children in between never skip a letter
let firstStopwatchId = null; // only this stopwatch shows the "新規複製" button

// 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, ... (spreadsheet-style).
function defaultLabelFor(number) {
  let n = number;
  let label = '';
  while (n > 0) {
    n -= 1;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}

// Children (duplicated from a running stopwatch) are named after their root
// parent's label, e.g. "A-複製1", "A-複製2", counted among existing children
// of that same root parent.
function defaultChildLabel(rootId) {
  const rootSw = stopwatches.get(rootId);
  const parentLabel = rootSw ? rootSw.label : '';
  let count = 0;
  stopwatches.forEach((s) => {
    if (s.parentId === rootId) count += 1;
  });
  return `${parentLabel}-複製${count + 1}`;
}

// seed lets a duplicate start already running, at the source's current elapsed time.
// seed.parentId, if set, makes this a child grouped under that root parent instead
// of a new independent parent.
function createStopwatch(seed) {
  const id = `sw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const number = nextStopwatchNumber++;
  if (firstStopwatchId === null) firstStopwatchId = id;

  const defaultLabel = seed?.parentId ? defaultChildLabel(seed.parentId) : defaultLabelFor(nextParentNumber++);

  const sw = {
    id,
    number,
    label: defaultLabel,
    defaultLabel,
    parentId: seed?.parentId ?? null,
    running: seed?.running ?? false,
    startEpoch: Date.now(),
    elapsedMs: seed?.elapsedMs ?? 0,
    records: seed?.records ? seed.records.map((r) => ({ ...r })) : [],
    lastLapMs: seed?.lastLapMs ? { ...seed.lastLapMs } : { A: 0, B: 0 },
    lapCount: seed?.lapCount ? { ...seed.lapCount } : { A: 0, B: 0 },
    expanded: false,
  };

  const node = el.template.content.firstElementChild.cloneNode(true);
  node.dataset.swId = id;
  sw.dom = {
    root: node,
    label: node.querySelector('.sw-label'),
    actions: node.querySelector('.sw-actions'),
    duplicateBtn: node.querySelector('.sw-duplicate'),
    duplicateParentBtn: node.querySelector('.sw-duplicate-parent'),
    removeBtn: node.querySelector('.sw-remove'),
    display: node.querySelector('.display'),
    toggleBtn: node.querySelector('.sw-toggle'),
    lapABtn: node.querySelector('.sw-lap-a'),
    lapBBtn: node.querySelector('.sw-lap-b'),
    lapBothBtn: node.querySelector('.sw-lap-both'),
    liveA: node.querySelector('.sw-live-a'),
    liveB: node.querySelector('.sw-live-b'),
    resetBtn: node.querySelector('.sw-reset'),
    exportCsvBtn: node.querySelector('.sw-export-csv'),
    status: node.querySelector('.sw-status'),
    recordsA: node.querySelector('.sw-records-a'),
    recordsB: node.querySelector('.sw-records-b'),
    countA: node.querySelector('.sw-count-a'),
    countB: node.querySelector('.sw-count-b'),
    moreBtn: node.querySelector('.sw-more'),
    latestA: node.querySelector('.sw-latest-a'),
    latestB: node.querySelector('.sw-latest-b'),
  };

  if (sw.parentId) node.classList.add('is-child');
  sw.dom.duplicateParentBtn.hidden = id !== firstStopwatchId;
  if (id === firstStopwatchId) {
    sw.dom.actions.insertBefore(el.exportAllBtn, sw.dom.duplicateParentBtn);
  }

  sw.dom.label.textContent = sw.label;
  setDisplayTime(sw, currentElapsedMs(sw));
  updateLiveSplits(sw);

  if (sw.running) {
    setRunningUi(sw, seed?.statusMessage ?? '計測中…');
  }

  sw.dom.label.addEventListener('blur', () => renameStopwatch(sw));
  sw.dom.label.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sw.dom.label.blur();
    }
  });
  sw.dom.toggleBtn.addEventListener('click', () => toggleStopwatch(sw));
  sw.dom.lapABtn.addEventListener('click', () => addRecord(sw, 'A'));
  sw.dom.lapBBtn.addEventListener('click', () => addRecord(sw, 'B'));
  sw.dom.lapBothBtn.addEventListener('click', () => addRecord(sw, 'both'));
  sw.dom.resetBtn.addEventListener('click', () => resetStopwatch(sw));
  sw.dom.exportCsvBtn.addEventListener('click', () => exportExcel(sw));
  sw.dom.duplicateBtn.addEventListener('click', () => duplicateStopwatch(sw));
  sw.dom.duplicateParentBtn.addEventListener('click', () => duplicateStopwatch(sw, { forceNewParent: true }));
  sw.dom.removeBtn.addEventListener('click', () => removeStopwatch(sw));
  sw.dom.moreBtn.addEventListener('click', () => {
    sw.expanded = !sw.expanded;
    renderRecords(sw);
  });

  const rootId = sw.parentId ?? sw.id;
  let group = familyGroups.get(rootId);
  if (!group) {
    group = document.createElement('div');
    group.className = 'family-group';
    el.stopwatchList.appendChild(group);
    familyGroups.set(rootId, group);
  }
  if (sw.parentId) {
    // 子は親と見た目で区別できるよう、専用のコンテナにまとめて左に
    // インデント+縦線を引く(CSS側で表現)。
    let children = group.querySelector('.family-children');
    if (!children) {
      children = document.createElement('div');
      children.className = 'family-children';
      group.appendChild(children);
    }
    children.appendChild(node);
  } else {
    group.insertBefore(node, group.firstChild);
  }

  stopwatches.set(id, sw);
  renderRecords(sw);
  updateRemoveButtons();
  refreshLatestPanels(sw);
  return sw;
}

function renameStopwatch(sw) {
  const text = sw.dom.label.textContent.trim();
  sw.label = text || sw.defaultLabel;
  sw.dom.label.textContent = sw.label;
}

// 子複製: always creates a child grouped under the source's root parent
// (or under the source itself, if it's already a parent), inheriting its
// current time/records — whether the source is running or stopped.
// 親複製 (forceNewParent): always creates a brand new, fully independent,
// stopped parent with nothing inherited at all.
function duplicateStopwatch(source, { forceNewParent = false } = {}) {
  if (forceNewParent) {
    return createStopwatch({ parentId: null });
  }

  const parentId = source.parentId ?? source.id;
  return createStopwatch({
    running: source.running,
    elapsedMs: currentElapsedMs(source),
    records: source.records,
    lastLapMs: source.lastLapMs,
    lapCount: source.lapCount,
    parentId,
    statusMessage: source.running ? `${source.label} の計測中の状態を引き継ぎました。` : '',
  });
}

function removeStopwatch(sw) {
  if (stopwatches.size <= 1) return;
  const rootId = sw.parentId ?? sw.id;
  const group = familyGroups.get(rootId);
  // The "全てExcel保存" button lives inside the first stopwatch's card;
  // move it to whatever remains first before that card is torn down, so
  // removing it never deletes the button along with it.
  if (sw.dom.root.contains(el.exportAllBtn)) {
    const nextCard = Array.from(el.stopwatchList.querySelectorAll('.stopwatch-card')).find(
      (card) => card !== sw.dom.root
    );
    if (nextCard) {
      nextCard.querySelector('.sw-actions').insertBefore(el.exportAllBtn, nextCard.querySelector('.sw-duplicate-parent'));
    }
  }
  sw.dom.root.remove();
  stopwatches.delete(sw.id);
  if (group) {
    const children = group.querySelector('.family-children');
    if (children && children.children.length === 0) children.remove();
    if (group.querySelectorAll('.stopwatch-card').length === 0) {
      group.remove();
      familyGroups.delete(rootId);
    }
  }
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const disable = stopwatches.size <= 1;
  stopwatches.forEach((sw) => {
    sw.dom.removeBtn.disabled = disable;
  });
}

/* ---------- Live "time since last lap" readouts on the A/B lap buttons ---------- */
function updateLiveSplits(sw) {
  const totalMs = currentElapsedMs(sw);
  sw.dom.liveA.textContent = formatTime(totalMs - sw.lastLapMs.A);
  sw.dom.liveB.textContent = formatTime(totalMs - sw.lastLapMs.B);
}

/* ---------- Each lane's own latest lap, shown under its live split while running ---------- */
function latestRecordForTrack(sw, track) {
  for (let i = sw.records.length - 1; i >= 0; i--) {
    if (sw.records[i].track === track) return sw.records[i];
  }
  return null;
}

// Always renders both lines (using a dashed placeholder before the first
// lap) so the LCD panel is already at its final size from the start,
// instead of growing the moment a lap first appears.
function renderLatestLane(sw, track, el) {
  const r = latestRecordForTrack(sw, track);
  const lap = r ? formatTime(r.lapMs) : '--:--.--';
  const total = r ? formatTime(r.totalMs) : '--:--.--';
  el.innerHTML = `
    <div class="latest-lane-row${r ? '' : ' is-placeholder'}">
      <span class="latest-lane-lap">${lap}</span>
      <span class="latest-lane-total">${total}</span>
    </div>
  `;
}

// Refreshes a stopwatch's own A/B latest-lap readouts — called whenever its
// own data changes. Stays visible after Stop (frozen at the last lap), just
// like the main display freezes instead of clearing.
function refreshLatestPanels(sw) {
  renderLatestLane(sw, 'A', sw.dom.latestA);
  renderLatestLane(sw, 'B', sw.dom.latestB);
}

/* ---------- Single shared render loop for all running instances ---------- */
function tickAll() {
  stopwatches.forEach((sw) => {
    if (sw.running) {
      setDisplayTime(sw, currentElapsedMs(sw));
      updateLiveSplits(sw);
    }
  });
  requestAnimationFrame(tickAll);
}

/* ---------- Controls ---------- */
function toggleStopwatch(sw) {
  if (sw.running) {
    stopStopwatch(sw);
  } else {
    startStopwatch(sw);
  }
}

function setRunningUi(sw, statusMessage) {
  sw.dom.toggleBtn.textContent = 'ストップ';
  sw.dom.toggleBtn.classList.remove('btn-primary');
  sw.dom.toggleBtn.classList.add('btn-danger');
  sw.dom.lapABtn.disabled = false;
  sw.dom.lapBBtn.disabled = false;
  sw.dom.lapBothBtn.disabled = false;
  sw.dom.resetBtn.disabled = true;
  setStatus(sw, statusMessage);
}

function startStopwatch(sw) {
  if (sw.running) return;
  sw.running = true;
  sw.startEpoch = Date.now();
  setRunningUi(sw, '計測中…');
  updateLiveSplits(sw);
  refreshLatestPanels(sw);
}

function stopStopwatch(sw) {
  if (!sw.running) return;
  sw.elapsedMs = currentElapsedMs(sw);
  sw.running = false;
  setDisplayTime(sw, sw.elapsedMs);
  sw.dom.toggleBtn.textContent = 'スタート';
  sw.dom.toggleBtn.classList.remove('btn-danger');
  sw.dom.toggleBtn.classList.add('btn-primary');
  sw.dom.lapABtn.disabled = true;
  sw.dom.lapBBtn.disabled = true;
  sw.dom.lapBothBtn.disabled = true;
  sw.dom.resetBtn.disabled = false;
  setStatus(sw, '停止しました。スタートで再開、リセットでクリアできます。');
  updateLiveSplits(sw);
  refreshLatestPanels(sw);
}

function resetStopwatch(sw) {
  if (sw.running) return;
  sw.elapsedMs = 0;
  sw.records = [];
  sw.lastLapMs = { A: 0, B: 0 };
  sw.lapCount = { A: 0, B: 0 };
  sw.expanded = false;
  setDisplayTime(sw, 0);
  renderRecords(sw);
  updateLiveSplits(sw);
  setStatus(sw, '');
  refreshLatestPanels(sw);
}

function pushLap(sw, track, totalMs) {
  const lapMs = totalMs - sw.lastLapMs[track];
  sw.lastLapMs[track] = totalMs;
  sw.lapCount[track] += 1;
  sw.records.push({
    idx: sw.lapCount[track],
    track,
    lapMs,
    totalMs,
    wallClock: new Date().toISOString(),
  });
}

function addRecord(sw, track) {
  if (!sw.running) return;
  const totalMs = currentElapsedMs(sw);
  if (track === 'both') {
    pushLap(sw, 'A', totalMs);
    pushLap(sw, 'B', totalMs);
  } else {
    pushLap(sw, track, totalMs);
  }
  renderRecords(sw);
  updateLiveSplits(sw);
  refreshLatestPanels(sw);
}

function setStatus(sw, msg) {
  sw.dom.status.textContent = msg;
}

/* ---------- Records rendering ---------- */
const VISIBLE_RECORD_COUNT = 0;

// Returns how many of this lane's records are hidden beyond the visible cap.
function renderColumn(container, countEl, records, track, expanded) {
  const trackRecords = records.filter((r) => r.track === track);
  countEl.textContent = String(trackRecords.length);

  const hiddenCount = Math.max(0, trackRecords.length - VISIBLE_RECORD_COUNT);
  const visibleCount = expanded ? trackRecords.length : trackRecords.length - hiddenCount;

  const frag = document.createDocumentFragment();
  for (let i = trackRecords.length - 1; i >= trackRecords.length - visibleCount; i--) {
    const r = trackRecords[i];
    const row = document.createElement('div');
    row.className = 'record-row' + (i === trackRecords.length - 1 ? ' latest' : '');
    row.innerHTML = `
      <div class="record-row-top">
        <span class="idx">#${r.idx}</span>
        <span class="time-lap">${formatTime(r.lapMs)}</span>
      </div>
      <span class="time-total">${formatTime(r.totalMs)}</span>
    `;
    frag.appendChild(row);
  }
  container.innerHTML = '';
  container.appendChild(frag);

  return hiddenCount;
}

// One shared "もっと見る" button expands/collapses both A and B together.
function renderRecords(sw) {
  const hiddenA = renderColumn(sw.dom.recordsA, sw.dom.countA, sw.records, 'A', sw.expanded);
  const hiddenB = renderColumn(sw.dom.recordsB, sw.dom.countB, sw.records, 'B', sw.expanded);
  const hiddenTotal = hiddenA + hiddenB;

  if (hiddenTotal > 0) {
    sw.dom.moreBtn.hidden = false;
    sw.dom.moreBtn.textContent = sw.expanded ? '折りたたむ' : `もっと見る(${hiddenTotal}件)`;
  } else {
    sw.dom.moreBtn.hidden = true;
  }
}

/* ---------- Excel export ---------- */
function sanitizeSheetName(name) {
  return name.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Sheet1';
}

function formatDateStamp(date) {
  const pad2 = (n) => String(n).padStart(2, '0');
  const datePart = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const timePart = `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  return `${datePart}_${timePart}`;
}

async function downloadExcel(sheetName, header, rows, filenamePrefix) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  sheet.addRow(header);
  rows.forEach((row) => sheet.addRow(row));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF322F2B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const thin = { style: 'thin', color: { argb: 'FFB8B0A6' } };
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
    });
  });

  header.forEach((label, i) => {
    let maxLen = String(label).length;
    rows.forEach((row) => {
      const len = String(row[i] ?? '').length;
      if (len > maxLen) maxLen = len;
    });
    sheet.getColumn(i + 1).width = Math.min(maxLen + 2, 28);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formatDateStamp(new Date())}_${filenamePrefix}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

const LANE_EXPORT_HEADER = ['No', 'Aの区間タイム', 'Aの合計タイム', 'Bの区間タイム', 'Bの合計タイム'];

// A and B are independent lap series (their own counters), so rows are
// aligned by lap number (No) rather than by when each lap was taken —
// each track keeps its own 区間タイム/合計タイム columns, left blank
// where that lane has no lap at that number.
function buildLaneRows(records) {
  const byIdx = new Map();
  records.forEach((r) => {
    if (!byIdx.has(r.idx)) byIdx.set(r.idx, {});
    byIdx.get(r.idx)[r.track] = r;
  });
  const maxIdx = byIdx.size ? Math.max(...byIdx.keys()) : 0;
  const rows = [];
  for (let idx = 1; idx <= maxIdx; idx++) {
    const entry = byIdx.get(idx) || {};
    rows.push({ idx, a: entry.A, b: entry.B });
  }
  return rows;
}

function laneRowToCells(row) {
  const { a, b } = row;
  return [
    row.idx,
    a ? formatTimeShort(a.lapMs) : '',
    a ? formatTimeShort(a.totalMs) : '',
    b ? formatTimeShort(b.lapMs) : '',
    b ? formatTimeShort(b.totalMs) : '',
  ];
}

async function exportExcel(sw) {
  if (sw.records.length === 0) {
    setStatus(sw, '記録がありません。');
    return;
  }
  const rows = buildLaneRows(sw.records).map(laneRowToCells);
  sw.dom.exportCsvBtn.disabled = true;
  try {
    await downloadExcel(sw.label, LANE_EXPORT_HEADER, rows, `stopwatch_${sw.number}`);
  } finally {
    sw.dom.exportCsvBtn.disabled = false;
  }
}

// Walks the DOM in display order (family-groups, then parent-then-children
// within each) so the combined file's row order matches what's on screen.
function stopwatchesInDisplayOrder() {
  const ordered = [];
  el.stopwatchList.querySelectorAll('.stopwatch-card').forEach((card) => {
    const sw = stopwatches.get(card.dataset.swId);
    if (sw) ordered.push(sw);
  });
  return ordered;
}

async function exportAllExcel() {
  const header = ['ストップウォッチ', '親子', ...LANE_EXPORT_HEADER];
  const rows = [];
  stopwatchesInDisplayOrder().forEach((sw) => {
    const kind = sw.parentId ? '子' : '親';
    buildLaneRows(sw.records).forEach((row) => {
      rows.push([sw.label, kind, ...laneRowToCells(row)]);
    });
  });
  if (rows.length === 0) {
    window.alert('記録がありません。');
    return;
  }
  el.exportAllBtn.disabled = true;
  try {
    await downloadExcel('記録一覧', header, rows, 'stopwatch_all');
  } finally {
    el.exportAllBtn.disabled = false;
  }
}

el.exportAllBtn.addEventListener('click', exportAllExcel);

/* ---------- Level-crossing safety calculator (山試走) ---------- */
// Clock time ("7:21") -> seconds since midnight. Distinct from parsePaceTime
// (a duration parser reused below for the fastest/slowest fields) because
// a bare "H:MM" here means hours:minutes, not minutes:seconds.
function parseClockTime(str) {
  const s = String(str).trim();
  if (!s) return NaN;
  const parts = s.split(':');
  if (parts.length < 2 || parts.length > 3) return NaN;
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return NaN;
  return nums.length === 2 ? nums[0] * 3600 + nums[1] * 60 : nums[0] * 3600 + nums[1] * 60 + nums[2];
}

function formatClockTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '--:--';
  let secs = Math.round(totalSeconds);
  secs = ((secs % 86400) + 86400) % 86400;
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const pad2 = (n) => String(n).padStart(2, '0');
  return seconds > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${hours}:${pad2(minutes)}`;
}

// Closure formula confirmed against two observed trains: a 小涌谷→宮ノ下
// train closes the crossing [発-2分, 着-2分]; a 宮ノ下→小涌谷 train closes
// it [発+1分, 着]. Given a runner's fastest/slowest start→crossing time,
// the corresponding "avoid starting in this window" range is
// [closureStart - slowest, closureEnd - fastest] — algebraically, that's
// exactly the set of start times whose [start+fastest, start+slowest]
// arrival-at-crossing window overlaps the closure.
function computeTrainRow(row, fastestSec, slowestSec) {
  const dir = row.querySelector('.train-direction').value;
  const depSec = parseClockTime(row.querySelector('.train-dep').value);
  const arrSec = parseClockTime(row.querySelector('.train-arr').value);
  const closureEl = row.querySelector('.train-closure');
  const avoidEl = row.querySelector('.train-avoid');

  if (!Number.isFinite(depSec) || !Number.isFinite(arrSec)) {
    closureEl.textContent = '--';
    avoidEl.textContent = '--';
    return null;
  }

  const closureStart = dir === 'AtoB' ? depSec - 120 : depSec + 60;
  const closureEnd = dir === 'AtoB' ? arrSec - 120 : arrSec;
  closureEl.textContent = `${formatClockTime(closureStart)}〜${formatClockTime(closureEnd)}`;

  if (!Number.isFinite(fastestSec) || !Number.isFinite(slowestSec)) {
    avoidEl.textContent = '--';
    return null;
  }
  const unsafeStart = closureStart - slowestSec;
  const unsafeEnd = closureEnd - fastestSec;
  avoidEl.textContent = `${formatClockTime(unsafeStart)}〜${formatClockTime(unsafeEnd)}`;
  return [unsafeStart, unsafeEnd];
}

function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = intervals.map((iv) => iv.slice()).sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [s, e] = sorted[i];
    if (s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

function renderCrossingSummary(card, unsafeWindows) {
  const resultEl = card.querySelector('.crossing-result');
  const rangeStart = parseClockTime(card.querySelector('.search-start').value);
  const rangeEnd = parseClockTime(card.querySelector('.search-end').value);
  if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) {
    resultEl.innerHTML = '<p class="pace-desc">検索範囲(開始・終了)を正しく入力してください。</p>';
    return;
  }

  const merged = mergeIntervals(unsafeWindows)
    .map(([s, e]) => [Math.max(s, rangeStart), Math.min(e, rangeEnd)])
    .filter(([s, e]) => s < e);

  const safeRanges = [];
  let cursor = rangeStart;
  merged.forEach(([s, e]) => {
    if (s > cursor) safeRanges.push([cursor, s]);
    cursor = Math.max(cursor, e);
  });
  if (cursor < rangeEnd) safeRanges.push([cursor, rangeEnd]);

  const dangerHtml = merged.length
    ? merged.map(([s, e]) => `<li class="crossing-danger">${formatClockTime(s)}〜${formatClockTime(e)} は避ける</li>`).join('')
    : '<li class="crossing-safe">この範囲に踏切の危険はありません</li>';
  const safeHtml = safeRanges.length
    ? safeRanges.map(([s, e]) => `<li class="crossing-safe">${formatClockTime(s)}〜${formatClockTime(e)} はスタート可</li>`).join('')
    : '<li class="crossing-danger">この範囲内に安全なスタート時刻はありません</li>';

  resultEl.innerHTML = `
    <p class="pace-metric-label">スタートを避けるべき時間帯</p>
    <ul class="crossing-list">${dangerHtml}</ul>
    <p class="pace-metric-label">安全にスタートできる時間帯</p>
    <ul class="crossing-list">${safeHtml}</ul>
  `;
}

function computeCrossingCard(card) {
  const fastestSec = parsePaceTime(card.querySelector('.crossing-fastest').value);
  const slowestSec = parsePaceTime(card.querySelector('.crossing-slowest').value);
  const unsafeWindows = [];
  card.querySelectorAll('.train-row').forEach((row) => {
    const win = computeTrainRow(row, fastestSec, slowestSec);
    if (win) unsafeWindows.push(win);
  });
  renderCrossingSummary(card, unsafeWindows);
}

function addTrainRow(card, direction, dep, arr) {
  const node = el.trainRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.train-direction').value = direction;
  node.querySelector('.train-dep').value = dep;
  node.querySelector('.train-arr').value = arr;
  const recompute = () => computeCrossingCard(card);
  node.querySelector('.train-direction').addEventListener('change', recompute);
  node.querySelector('.train-dep').addEventListener('input', recompute);
  node.querySelector('.train-arr').addEventListener('input', recompute);
  node.querySelector('.train-remove').addEventListener('click', () => {
    node.remove();
    recompute();
  });
  card.querySelector('.train-rows').appendChild(node);
}

el.crossingCards.forEach((card) => {
  const recompute = () => computeCrossingCard(card);
  card.querySelector('.crossing-fastest').addEventListener('input', recompute);
  card.querySelector('.crossing-slowest').addEventListener('input', recompute);
  card.querySelector('.search-start').addEventListener('input', recompute);
  card.querySelector('.search-end').addEventListener('input', recompute);
  card.querySelector('.add-train-btn').addEventListener('click', () => {
    addTrainRow(card, 'AtoB', '', '');
    recompute();
  });
  // Both directions share the same observed pair of trains as a starting example.
  addTrainRow(card, 'AtoB', '7:21', '7:26');
  addTrainRow(card, 'BtoA', '7:26', '7:31');
  computeCrossingCard(card);
});

/* ---------- Stretch-count timer (ストレッチ) ---------- */
// Flattened from the team's cue sheet: every 30-second segment gets its own
// entry, in the order the manager reads them aloud. "group" is the short
// name shown big; "speech" is the exact line to say when that segment starts.
// "speech" is the full on-screen cue (kanji + furigana + stage directions,
// e.g. "(選手が体制を変えたらウォッチ押す)") — useful reference text for the
// manager. "voice" is what's actually spoken aloud: kana readings in place
// of kanji (verified against anatomical-term sources) so it's pronounced
// correctly, with stage directions and asides dropped since those are
// instructions for the manager, not part of the spoken cue itself.
const STRETCH_STEPS = [
  { group: '下後鋸筋', speech: '下後鋸筋(かこうきょきん)行きます、よーいはじめ', voice: 'かこうきょきん、行きます。よーいはじめ' },
  { group: '下後鋸筋(反対)', speech: '反対', voice: '反対' },

  { group: '大臀筋', speech: '次、大臀筋(だいでんきん)(選手が体制を変えたらよーいはじめ)', voice: '次、だいでんきん' },
  { group: '大臀筋(反対)', speech: '反対', voice: '反対' },

  { group: '梨状筋', speech: '次、梨状筋(りじょうきん)(選手が体制を変えたらウォッチ押す)', voice: '次、りじょうきん' },
  { group: '梨状筋(反対)', speech: '反対', voice: '反対' },

  { group: '中臀筋', speech: '次、中臀筋(ちゅうでんきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ちゅうでんきん' },
  { group: '中臀筋(反対)', speech: '反対', voice: '反対' },

  { group: '大腿筋膜張筋', speech: '次、大腿筋膜張筋(だいたいきんまくちょうきん)(選手が体制を変えたらウォッチ押す)', voice: '次、だいたいきんまくちょうきん' },
  { group: '大腿筋膜張筋(反対)', speech: '反対', voice: '反対' },

  { group: 'ハム', speech: '次、ハムストリングス(選手が体制を変えたらウォッチ押す)', voice: '次、ハムストリングス' },
  { group: 'ハム(内側)', speech: '内側', voice: '内側' },
  { group: 'ハム(外側)', speech: '外側', voice: '外側' },
  { group: 'ハム(反対)', speech: '反対', voice: '反対' },
  { group: 'ハム(反対・内側)', speech: '内側', voice: '内側' },
  { group: 'ハム(反対・外側)', speech: '外側', voice: '外側' },

  { group: '内転筋', speech: '次、内転筋(ないてんきん)(選手が体制を変えたらウォッチ押す) ※補強のサーキットなどで内転筋をした場合とばす', voice: '次、ないてんきん' },
  { group: '内転筋(反対)', speech: '反対', voice: '反対' },

  { group: '腸骨筋', speech: '次、腸骨筋(ちょうこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ちょうこつきん' },
  { group: '腸骨筋(大腰筋)', speech: '大腰筋(だいようきん)', voice: '次、だいようきん' },

  { group: '反対・腸骨筋', speech: '次、反対、腸骨筋(ちょうこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、反対、ちょうこつきん' },
  { group: '反対・腸骨筋(大腰筋)', speech: '大腰筋', voice: '次、だいようきん' },

  { group: '大腿四頭筋', speech: '次、大腿四頭筋(だいたいしとうきん)(選手が体制を変えたらウォッチ押す)', voice: '次、だいたいしとうきん' },
  { group: '大腿四頭筋(反対)', speech: '反対', voice: '反対' },

  { group: '腓骨筋', speech: '次、腓骨筋(ひこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ひこつきん' },
  { group: '腓骨筋(後脛骨筋)', speech: '後脛骨筋(こうけいこつきん)', voice: '次、こうけいこつきん' },
  { group: '腓骨筋(反対)', speech: '反対、腓骨筋', voice: '反対、ひこつきん' },
  { group: '腓骨筋(反対・後脛骨筋)', speech: '後脛骨筋(こうけいこつきん)', voice: '次、こうけいこつきん' },

  { group: '足底', speech: '次、足底(そくてい)(選手が体制を変えたらウォッチ押す)', voice: '次、そくてい' },

  { group: '腓腹筋', speech: '次、腓腹筋(ひふくきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ひふくきん' },
  { group: '腓腹筋(ヒラメ筋)', speech: 'ヒラメ筋(ひらめきん) ※2024夏合宿よりつま先内側廃止', voice: '次、ひらめきん' },
  { group: '腓腹筋(反対)', speech: '反対腓腹筋(ひふくきん)', voice: '反対、ひふくきん' },
  { group: '腓腹筋(反対・ヒラメ筋)', speech: 'ヒラメ筋(ひらめきん) ※2024夏合宿よりつま先内側廃止', voice: '次、ひらめきん' },

  { group: '前脛骨筋', speech: '次、前脛骨筋(ぜんけいこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ぜんけいこつきん' },
  { group: '前脛骨筋(反対)', speech: '反対', voice: '反対' },
  { group: '前脛骨筋(終わり)', speech: '終わりです', voice: '終わりです' },
];

const STRETCH_STEP_MS = 30000;
// 次の種目の内容の自動先読みは、30秒ぴったりではなく29秒経過した時点で
// 始める(読み終わる頃にはだいたい30秒経っているくらいのタイミングを
// 狙ったもの)。カウント表示や種目自体の30秒はこれまで通り変わらない。
const STRETCH_ANNOUNCE_LEAD_MS = 1000;
// 「全種目を連続再生」モードで、ある種目が終わってから次の種目の「はじめ」
// を読み上げてタイマーを始めるまでに空ける間隔。
const STRETCH_AUTO_GAP_MS = 5000;
// 次の種目の内容は、直前の種目の30秒が終わったタイミングで自動的に先読み
// されるので(下の enterStretchStep 参照)、実際にボタンを押して次の種目に
// 入る時はこの短い合図だけを読む(先読みできていた場合のみ。できなかった
// 場合はこれまで通りその種目の内容をフルで読み上げる)。
const STRETCH_START_CUE = 'はじめ';
// 最後の種目の30秒が終わった時に読み上げる完了の合図。ちょうど最後の種目
// (前脛骨筋(終わり))自体のセリフと同じ文言なので、その録音をそのまま
// 使い回せる。
const STRETCH_COMPLETE_CUE = '終わりです';

/* ---------- Reinforcement training menus (補強) ---------- */
// Same "group / speech / voice" shape as STRETCH_STEPS (see comment above),
// plus "spec" (the reps/count description shown for reference, e.g. "10回4
// カウント") and "durationSec": a number for steps with an explicit fixed
// duration (auto-counts and auto-stops, like the stretch timer), or null for
// rep/count-based steps with no real clock duration (the manager decides
// when to advance — see createReinforceTab's startNext()). Each key here is
// its own independent top-level tab — see REINFORCE_MENU_TABS.
const REINFORCE_MENUS = {
  フル: [
    { group: '【1】膝立て', spec: '10回4カウント', speech: '膝立ていきます、よーいはじめ', voice: 'ひざだていきます、よーいはじめ', durationSec: null },
    { group: '【2】膝伸ばし', spec: '10回4カウント', speech: '膝伸ばしいきます、よーいはじめ', voice: 'ひざのばしいきます、よーいはじめ', durationSec: null },
    { group: '【3】バンザイ', spec: '10回4カウント', speech: 'バンザイいきます、よーいはじめ', voice: 'バンザイいきます、よーいはじめ', durationSec: null },
    { group: '【4】四つん這い', spec: '10回4カウント', speech: '四つん這いいきます、よーいはじめ', voice: 'よつんばいいきます、よーいはじめ', durationSec: null },
    { group: '【5】プランク', spec: '10回4カウント', speech: 'プランクいきます、よーいはじめ', voice: 'プランクいきます、よーいはじめ', durationSec: null },
    { group: '【6】プランク(各自)', spec: '8回4カウント', speech: 'プランク各自いきます、よーいはじめ', voice: 'プランク各自いきます、よーいはじめ', durationSec: null },

    { group: '【7】ダイアゴナル(縦横)', spec: '40秒', speech: 'ダイアゴナル縦横40秒ずついきます、よーいはじめ', voice: 'ダイアゴナルたてよこ40秒ずついきます、よーいはじめ', durationSec: 40 },
    { group: '【7】ダイアゴナル(反対)', spec: '40秒', speech: '反対いきます、よーいはじめ', voice: '反対いきます、よーいはじめ', durationSec: 40 },
    { group: '【7】ダイアゴナル(サイド)', spec: '40秒', speech: 'サイドいきます、よーいはじめ', voice: 'サイドいきます、よーいはじめ', durationSec: 40 },
    { group: '【7】ダイアゴナル(反対)', spec: '40秒', speech: '反対いきます、よーいはじめ', voice: '反対いきます、よーいはじめ', durationSec: 40 },

    { group: '【8】L字傾け', spec: '8回4カウント×4(一拍空ける)', speech: 'L字傾けいきます、よーいはじめ', voice: 'L字傾けいきます、よーいはじめ', durationSec: null },
    { group: '【9】L字腕振り', spec: '60秒', speech: 'L字腕振りいきます、よーいはじめ', voice: 'L字うでふりいきます、よーいはじめ', durationSec: 60 },

    { group: '【10】上体起こし', spec: '4回4カウント×5', speech: '上体起こしいきます、よーいはじめ', voice: '上体起こしいきます、よーいはじめ', durationSec: null },
    { group: '【10】上体起こし(反対)', spec: '4回4カウント×5', speech: '反対', voice: '反対', durationSec: null },

    { group: '【11】ストレッチ', spec: '30秒', speech: 'ストレッチいきます、よーいはじめ', voice: 'ストレッチいきます、よーいはじめ', durationSec: 30 },
    { group: '【11】ストレッチ(脊柱起立筋)', spec: '30秒', speech: '次、脊柱起立筋(30秒)いきます、よーいはじめ', voice: '次、せきちゅうきりつきん、いきます、よーいはじめ', durationSec: 30 },

    { group: '※2人組になる', spec: '', speech: '2人組になってください', voice: 'ふたりぐみになってください', durationSec: null },

    { group: '【12】2人組腹斜筋', spec: '各10回4カウント×2', speech: '2人組腹斜筋いきます、外腹斜筋を意識してください、よーいはじめ', voice: 'ふたりぐみふくしゃきんいきます、がいふくしゃきんを意識してください、よーいはじめ', durationSec: null },
    { group: '【12】2人組腹斜筋(反対)', spec: '各10回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【13】スリップボード', spec: '45秒', speech: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', voice: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', durationSec: 45 },

    { group: '※2人組交代', spec: '腹斜筋に戻る', speech: '交代してください', voice: '交代してください', durationSec: null },

    { group: '【14】2人組腹斜筋', spec: '各10回4カウント×2', speech: '2人組腹斜筋いきます、外腹斜筋を意識してください、よーいはじめ', voice: 'ふたりぐみふくしゃきんいきます、がいふくしゃきんを意識してください、よーいはじめ', durationSec: null },
    { group: '【14】2人組腹斜筋(反対)', spec: '各10回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【15】スリップボード', spec: '45秒', speech: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', voice: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', durationSec: 45 },

    { group: '【16】ショートV', spec: '(1人で行う)10回4カウント×2', speech: 'ショートVいきます、外腹斜筋と内転筋を意識してください、よーいはじめ', voice: 'ショートVいきます、がいふくしゃきんとないてんきんを意識してください、よーいはじめ', durationSec: null },
    { group: '【16】ショートV(反対)', spec: '(1人で行う)10回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【17】レッグダウン', spec: '(2人組)各8回4カウント+あげて', speech: 'レッグダウンいきます、外腹斜筋と内転筋を意識してください、よーいはじめ', voice: 'レッグダウンいきます、がいふくしゃきんとないてんきんを意識してください、よーいはじめ', durationSec: null },
    { group: '【17】レッグダウン(反対)', spec: '(2人組)各8回4カウント+あげて', speech: '反対', voice: '反対', durationSec: null },
    { group: '【17】レッグダウン(交代)', spec: '', speech: '交代', voice: '交代', durationSec: null },
    { group: '【17】レッグダウン(反対)', spec: '(2人組)各8回4カウント+あげて', speech: '反対', voice: '反対', durationSec: null },

    { group: '【18】ストレッチ', spec: '30秒×2(1人で行う)', speech: 'ストレッチいきます、よーいはじめ', voice: 'ストレッチいきます、よーいはじめ', durationSec: 30 },
    { group: '【18】ストレッチ(反対)', spec: '30秒×2(1人で行う)', speech: '反対', voice: '反対', durationSec: 30 },

    { group: '【19】前鋸筋', spec: '(1人で行う)各20回4カウント×2', speech: '前鋸筋いきます、よーいはじめ', voice: 'ぜんきょきんいきます、よーいはじめ', durationSec: null },
    { group: '【19】前鋸筋(反対)', spec: '(1人で行う)各20回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【20】下後鋸筋', spec: '(2人組)各自30回・全員終わるまで待つ', speech: '下後鋸筋いきます', voice: 'かこうきょきんいきます', durationSec: null },

    { group: '【21】ストレッチ', spec: '30秒×2(以降1人で行う)', speech: 'ストレッチいきます、よーいはじめ', voice: 'ストレッチいきます、よーいはじめ', durationSec: 30 },
    { group: '【21】ストレッチ(反対)', spec: '30秒×2(以降1人で行う)', speech: '反対', voice: '反対', durationSec: 30 },

    { group: '【22】アップ', spec: 'なるべく上級生の動きに合わせて', speech: 'アップいきます、よーいはじめ', voice: 'アップいきます、よーいはじめ', durationSec: null },

    { group: '【23】サーキット①腕振り', spec: '10カウント', speech: 'サーキット右手下からいきます、(選手がコア入れたのを確認してから)よーいはじめ', voice: 'サーキット右手下からいきます、よーいはじめ', durationSec: null },
    { group: '【23】サーキット②', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット③腕をたたむ', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット④サイドバキューム', spec: '6回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑤サイドプランクアブダクション', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑥ジャックナイフ', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },

    { group: '【23】サーキット①腕振り', spec: '10カウント', speech: 'サーキット左手下からいきます、(選手がコア入れたのを確認してから)よーいはじめ', voice: 'サーキット左手下からいきます、よーいはじめ', durationSec: null },
    { group: '【23】サーキット②', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット③腕をたたむ', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット④サイドバキューム', spec: '6回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑤サイドプランクアブダクション', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑥ジャックナイフ', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
  ],
  コアA: [
    { group: '【1】膝伸ばし', spec: '10回4カウント', speech: '膝伸ばしいきます、よーいはじめ', voice: 'ひざのばしいきます、よーいはじめ', durationSec: null },
    { group: '【2】バンザイ', spec: '10回4カウント', speech: 'バンザイいきます、よーいはじめ', voice: 'バンザイいきます、よーいはじめ', durationSec: null },
    { group: '【3】四つん這い', spec: '10回4カウント', speech: '四つん這いいきます、よーいはじめ', voice: 'よつんばいいきます、よーいはじめ', durationSec: null },
    { group: '【4】プランク膝つき', spec: '10回4カウント', speech: 'プランク膝つきいきます、よーいはじめ', voice: 'プランクひざつきいきます、よーいはじめ', durationSec: null },

    { group: '【5】ダイアゴナル(縦振り)', spec: '30秒', speech: 'ダイアゴナル、縦振りいきます、よーいはじめ', voice: 'ダイアゴナル、縦振りいきます、よーいはじめ', durationSec: 30 },
    { group: '【5】ダイアゴナル(横振り)', spec: '30秒', speech: '横振りいきます、よーいはじめ', voice: '横振りいきます、よーいはじめ', durationSec: 30 },
    { group: '【5】ダイアゴナル(縦振り・反対)', spec: '30秒', speech: '反対いきます、よーいはじめ', voice: '反対いきます、よーいはじめ', durationSec: 30 },
    { group: '【5】ダイアゴナル(横振り・反対)', spec: '30秒', speech: '横振りいきます、よーいはじめ', voice: '横振りいきます、よーいはじめ', durationSec: 30 },

    { group: '【6】L字傾け', spec: '8回4カウント×5、各4回', speech: 'L字傾けいきます、よーいはじめ', voice: 'L字傾けいきます、よーいはじめ', durationSec: null },

    { group: '【7】L字傾け(両手・縦振り)', spec: '30秒', speech: '両手縦振りいきます、よーいはじめ', voice: '両手縦振りいきます、よーいはじめ', durationSec: 30 },
    { group: '【7】L字傾け(両手・クロス)', spec: '30秒', speech: 'クロスいきます、よーいはじめ', voice: 'クロスいきます、よーいはじめ', durationSec: 30 },
    { group: '【7】L字傾け(両手・横振り)', spec: '30秒', speech: '横振りいきます、よーいはじめ', voice: '横振りいきます、よーいはじめ', durationSec: 30 },

    { group: '【8】上体起こし', spec: '4カウント', speech: '上体起こしいきます、よーいはじめ', voice: '上体起こしいきます、よーいはじめ', durationSec: null },
    { group: '【8】上体起こし(反対)', spec: '4カウント', speech: '反対', voice: '反対', durationSec: null },

    { group: '【9】サーキット①サイドプランク腕ふり', spec: '10回', speech: 'サーキット右手下からいきます、サイドプランク腕ふり、(選手の準備ができたのを確認してから)よーいはじめ', voice: 'サーキット右手下からいきます、サイドプランク腕ふり、よーいはじめ', durationSec: null },
    { group: '【9】サーキット②サイドプランク脚', spec: '10回', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット③サイドプランクアダクション', spec: '10回、片手片脚クロス', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット④サイドバキューム', spec: '10回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット⑤ザ・ツイスト', spec: '6回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット⑥ジャックナイフ', spec: '10回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },

    { group: '【9】サーキット①サイドプランク腕ふり', spec: '10回', speech: 'サーキット2セット目、左手下からいきます、サイドプランク腕ふり、(選手の準備ができたのを確認してから)よーいはじめ', voice: 'サーキット2セット目、左手下からいきます、サイドプランク腕ふり、よーいはじめ', durationSec: null },
    { group: '【9】サーキット②サイドプランク脚', spec: '10回', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット③サイドプランクアダクション', spec: '10回、片手片脚クロス', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット④サイドバキューム', spec: '10回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット⑤ザ・ツイスト', spec: '6回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【9】サーキット⑥ジャックナイフ', spec: '10回4カウント、サーキット合計約5分', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },

    { group: '【10】サーキット①サイドプランク腕ふり', spec: '10回', speech: 'サーキット右手下からいきます、サイドプランク腕ふり、(選手の準備ができたのを確認してから)よーいはじめ', voice: 'サーキット右手下からいきます、サイドプランク腕ふり、よーいはじめ', durationSec: null },
    { group: '【10】サーキット②サイドプランク脚', spec: '10回', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット③サイドプランクアダクション', spec: '10回、片手片脚クロス', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット④サイドバキューム', spec: '10回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット⑤ザ・ツイスト', spec: '6回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット⑥ジャックナイフ', spec: '10回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },

    { group: '【10】サーキット①サイドプランク腕ふり', spec: '10回', speech: 'サーキット2セット目、左手下からいきます、サイドプランク腕ふり、(選手の準備ができたのを確認してから)よーいはじめ', voice: 'サーキット2セット目、左手下からいきます、サイドプランク腕ふり、よーいはじめ', durationSec: null },
    { group: '【10】サーキット②サイドプランク脚', spec: '10回', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット③サイドプランクアダクション', spec: '10回、片手片脚クロス', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット④サイドバキューム', spec: '10回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット⑤ザ・ツイスト', spec: '6回4カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【10】サーキット⑥ジャックナイフ', spec: '10回4カウント、サーキット合計約5分', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
  ],
  コアB: [
    { group: '【1】膝伸ばし', spec: '10回4カウント', speech: '膝伸ばしいきます、よーいはじめ', voice: 'ひざのばしいきます、よーいはじめ', durationSec: null },
    { group: '【2】バンザイ', spec: '10回4カウント', speech: 'バンザイいきます、よーいはじめ', voice: 'バンザイいきます、よーいはじめ', durationSec: null },
    { group: '【3】四つん這い', spec: '10回4カウント', speech: '四つん這いいきます、よーいはじめ', voice: 'よつんばいいきます、よーいはじめ', durationSec: null },
    { group: '【4】プランク膝つき', spec: '10回4カウント', speech: 'プランク膝つきいきます、よーいはじめ', voice: 'プランクひざつきいきます、よーいはじめ', durationSec: null },

    { group: '【5】ダイアゴナル(縦振り)', spec: '30秒', speech: 'ダイアゴナル、縦振りいきます、よーいはじめ', voice: 'ダイアゴナル、縦振りいきます、よーいはじめ', durationSec: 30 },
    { group: '【5】ダイアゴナル(横振り)', spec: '30秒', speech: '横振りいきます、よーいはじめ', voice: '横振りいきます、よーいはじめ', durationSec: 30 },
    { group: '【5】ダイアゴナル(縦振り・反対)', spec: '30秒', speech: '反対いきます、よーいはじめ', voice: '反対いきます、よーいはじめ', durationSec: 30 },
    { group: '【5】ダイアゴナル(横振り・反対)', spec: '30秒', speech: '反対いきます、よーいはじめ', voice: '反対いきます、よーいはじめ', durationSec: 30 },

    { group: '【6】L字傾け', spec: '8回4カウント×5、各4回', speech: 'L字傾けいきます、よーいはじめ', voice: 'L字傾けいきます、よーいはじめ', durationSec: null },

    { group: '【7】L字傾け(両手・縦振り)', spec: '30秒', speech: '両手縦振りいきます、よーいはじめ', voice: '両手縦振りいきます、よーいはじめ', durationSec: 30 },
    { group: '【7】L字傾け(両手・クロス)', spec: '30秒', speech: 'クロスいきます、よーいはじめ', voice: 'クロスいきます、よーいはじめ', durationSec: 30 },
    { group: '【7】L字傾け(両手・横振り)', spec: '30秒', speech: '横振りいきます、よーいはじめ', voice: '横振りいきます、よーいはじめ', durationSec: 30 },

    { group: '【8】上体起こし', spec: '4カウント', speech: '上体起こしいきます、よーいはじめ', voice: '上体起こしいきます、よーいはじめ', durationSec: null },

    { group: '※2人組になる', spec: '', speech: '2人組になってください', voice: 'ふたりぐみになってください', durationSec: null },

    { group: '【9】2人組腹筋', spec: '各10回4カウント×2', speech: '2人組腹筋いきます、よーいはじめ', voice: 'ふたりぐみ腹筋いきます、よーいはじめ', durationSec: null },
    { group: '【9】2人組腹筋(反対)', spec: '各10回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【10】スリップボード', spec: '45秒', speech: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', voice: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', durationSec: 45 },

    { group: '※2人組交代', spec: '', speech: '交代してください', voice: '交代してください', durationSec: null },

    { group: '【11】ショートV', spec: '各10回', speech: 'ショートVいきます、よーいはじめ', voice: 'ショートVいきます、よーいはじめ', durationSec: null },
    { group: '【11】ショートV(反対)', spec: '各10回', speech: '反対', voice: '反対', durationSec: null },

    { group: '【12】レッグダウン', spec: '各8回', speech: 'レッグダウンいきます、よーいはじめ', voice: 'レッグダウンいきます、よーいはじめ', durationSec: null },
    { group: '【12】レッグダウン(反対)', spec: '各8回', speech: '反対', voice: '反対', durationSec: null },

    { group: '【13】ストレッチ', spec: '30秒', speech: 'ストレッチいきます、よーいはじめ', voice: 'ストレッチいきます、よーいはじめ', durationSec: 30 },

    { group: '【14】前鋸筋', spec: '各20回', speech: '前鋸筋いきます、よーいはじめ', voice: 'ぜんきょきんいきます、よーいはじめ', durationSec: null },
    { group: '【14】前鋸筋(反対)', spec: '各20回', speech: '反対', voice: '反対', durationSec: null },

    { group: '【15】下後鋸筋', spec: '', speech: '下後鋸筋いきます', voice: 'かこうきょきんいきます', durationSec: null },
  ],
  ループ: [
    { group: '◎アップ(1)膝立て', spec: '腹横筋の感覚入力', speech: '膝立ていきます、よーいはじめ', voice: 'ひざだていきます、よーいはじめ', durationSec: null },
    { group: '◎アップ(2)バンザイ', spec: '腹横筋の感覚入力', speech: 'バンザイいきます、よーいはじめ', voice: 'バンザイいきます、よーいはじめ', durationSec: null },

    { group: '【1】スクリューレッグリフトフルレンジ(右上)', spec: '10回', speech: 'スクリューレッグリフトフルレンジ、右上いきます、よーいはじめ', voice: 'スクリューレッグリフトフルレンジ、右上いきます、よーいはじめ', durationSec: null },
    { group: '【1】スクリューレッグリフトフルレンジ(左上)', spec: '10回', speech: '左上、よーいはじめ', voice: '左上、よーいはじめ', durationSec: null },

    { group: '【2】Vアップつま先タッチ', spec: '15回', speech: 'Vアップつま先タッチいきます、よーいはじめ', voice: 'Vアップつま先タッチいきます、よーいはじめ', durationSec: null },

    { group: '【3】ニーリングサイドリフト', spec: '左右20回', speech: 'ニーリングサイドリフトいきます、よーいはじめ', voice: 'ニーリングサイドリフトいきます、よーいはじめ', durationSec: null },
    { group: '【3】ニーリングサイドリフト(反対)', spec: '左右20回', speech: '反対', voice: '反対', durationSec: null },

    { group: '【4】ニーリングサイドキック(手を頭に当てて)', spec: '10回', speech: 'ニーリングサイドキック、手を頭に当てていきます、よーいはじめ', voice: 'ニーリングサイドキック、手を頭に当てていきます、よーいはじめ', durationSec: null },
    { group: '【4】ニーリングサイドキック(手を動かして)', spec: '10回', speech: '続けて、手を動かしていきます、よーいはじめ', voice: '続けて、手を動かしていきます、よーいはじめ', durationSec: null },

    { group: '【5】4の字ツイストボード', spec: '15回(5カウント)', speech: '4の字ツイストボードいきます、よーいはじめ', voice: 'よんの字ツイストボードいきます、よーいはじめ', durationSec: null },

    { group: '【6】サイドエルボープッシュ', spec: '20回(4カウント)', speech: 'サイドエルボープッシュいきます、よーいはじめ', voice: 'サイドエルボープッシュいきます、よーいはじめ', durationSec: null },

    { group: '【7】ショートT(4カウント)', spec: '10回', speech: 'ショートTいきます、よーいはじめ', voice: 'ショートTいきます、よーいはじめ', durationSec: null },
    { group: '【7】ショートT(1カウント)', spec: '10回', speech: '続けて1カウント、よーいはじめ', voice: '続けて1カウント、よーいはじめ', durationSec: null },
    { group: '【7】ショートT(キープ)', spec: '10秒', speech: 'キープ、よーいはじめ', voice: 'キープ、よーいはじめ', durationSec: 10 },

    { group: '【8】ショートV', spec: '15回(4カウント)', speech: 'ショートVいきます、よーいはじめ', voice: 'ショートVいきます、よーいはじめ', durationSec: null },
    { group: '【8】ショートV(反対)', spec: '15回(4カウント)', speech: '反対', voice: '反対', durationSec: null },

    { group: '【9】ロングV', spec: '15回', speech: 'ロングVいきます、よーいはじめ', voice: 'ロングVいきます、よーいはじめ', durationSec: null },
    { group: '【9】ロングV(反対)', spec: '15回', speech: '反対', voice: '反対', durationSec: null },

    { group: '【10】ピラーブリッジフロント(腕)', spec: '肘付き・5カウント', speech: 'ピラーブリッジフロント、肘付き、腕からいきます、よーいはじめ', voice: 'ピラーブリッジフロント、肘付き、腕からいきます、よーいはじめ', durationSec: null },
    { group: '【10】ピラーブリッジフロント(脚)', spec: '肘付き・5カウント', speech: '続けて脚、よーいはじめ', voice: '続けてあし、よーいはじめ', durationSec: null },
    { group: '【10】ピラーブリッジフロント(対角バランス)', spec: '2周・5カウント', speech: '対角バランス、2周いきます、よーいはじめ', voice: '対角バランス、2周いきます、よーいはじめ', durationSec: null },
  ],
  下肢: [
    // ラダー形式(Lv.1→Lv.1反対→Lv.1→Lv.2→…→Lv.4反対)で、
    // ラウンドを追う毎にLv.4まで種目を1つずつ増やしていく。
    { group: '【Lv.1】スプリットスクワット', spec: '片脚20回4カウント', speech: 'スプリットスクワットいきます、よーいはじめ', voice: 'スプリットスクワットいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.1】スプリットスクワット(反対)', spec: '片脚20回4カウント', speech: '反対', voice: '反対', durationSec: null },

    { group: '【Lv.1】スプリットスクワット', spec: '片脚20回4カウント', speech: 'スプリットスクワットいきます、よーいはじめ', voice: 'スプリットスクワットいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.2】オーバーヘッドスプリットスクワット', spec: '片脚20回4カウント', speech: 'オーバーヘッドスプリットスクワットいきます、よーいはじめ', voice: 'オーバーヘッドスプリットスクワットいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.1】スプリットスクワット(反対)', spec: '片脚20回4カウント', speech: '反対', voice: '反対', durationSec: null },
    { group: '【Lv.2】オーバーヘッドスプリットスクワット(反対)', spec: '片脚20回4カウント', speech: '反対', voice: '反対', durationSec: null },

    { group: '【Lv.1】スプリットスクワット', spec: '片脚20回4カウント', speech: 'スプリットスクワットいきます、よーいはじめ', voice: 'スプリットスクワットいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.2】オーバーヘッドスプリットスクワット', spec: '片脚20回4カウント', speech: 'オーバーヘッドスプリットスクワットいきます、よーいはじめ', voice: 'オーバーヘッドスプリットスクワットいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.3】ダイアゴナル・シングルレッグニーアップ', spec: '片脚20回1カウント', speech: 'ダイアゴナル・シングルレッグニーアップいきます、よーいはじめ', voice: 'ダイアゴナル・シングルレッグニーアップいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.1】スプリットスクワット(反対)', spec: '片脚20回4カウント', speech: '反対', voice: '反対', durationSec: null },
    { group: '【Lv.2】オーバーヘッドスプリットスクワット(反対)', spec: '片脚20回4カウント', speech: '反対', voice: '反対', durationSec: null },
    { group: '【Lv.3】ダイアゴナル・シングルレッグニーアップ(反対)', spec: '片脚20回1カウント', speech: '反対', voice: '反対', durationSec: null },

    { group: '【Lv.1】スプリットスクワット', spec: '片脚20回4カウント', speech: 'スプリットスクワットいきます、よーいはじめ', voice: 'スプリットスクワットいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.2】オーバーヘッドスプリットスクワット', spec: '片脚20回4カウント', speech: 'オーバーヘッドスプリットスクワットいきます、よーいはじめ', voice: 'オーバーヘッドスプリットスクワットいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.3】ダイアゴナル・シングルレッグニーアップ', spec: '片脚20回1カウント', speech: 'ダイアゴナル・シングルレッグニーアップいきます、よーいはじめ', voice: 'ダイアゴナル・シングルレッグニーアップいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.4】トゥリフト&カーフレイズ', spec: '片脚20回1カウント', speech: 'トゥリフトアンドカーフレイズいきます、よーいはじめ', voice: 'トゥリフトアンドカーフレイズいきます、よーいはじめ', durationSec: null },
    { group: '【Lv.1】スプリットスクワット(反対)', spec: '片脚20回4カウント', speech: '反対', voice: '反対', durationSec: null },
    { group: '【Lv.2】オーバーヘッドスプリットスクワット(反対)', spec: '片脚20回4カウント', speech: '反対', voice: '反対', durationSec: null },
    { group: '【Lv.3】ダイアゴナル・シングルレッグニーアップ(反対)', spec: '片脚20回1カウント', speech: '反対', voice: '反対', durationSec: null },
    { group: '【Lv.4】トゥリフト&カーフレイズ(反対)', spec: '片脚20回1カウント', speech: '反対', voice: '反対', durationSec: null },
  ],
};
let stretchIndex = -1; // -1 = not started yet
let stretchRunning = false;
let stretchElapsedMs = 0; // accumulated time for the current step, while paused/stopped
let stretchStartEpoch = 0; // epoch when the current running span began
// どの種目も、セリフを読み終えるまでタイマーを始めない(iOS Safariは
// ボタン操作を伴わない音声合成を仕様上ブロックするため、必ずボタン操作
// に紐づけて確実にセリフを読み上げ、それが終わってからタイマーを始める
// 設計にしている)。この間は stretchRunning は false のまま(この専用
// フラグで区別する。一時停止と紛らわしくならないよう「一時停止」ボタンも
// 封じる)。
let stretchAwaitingVoice = false;
// 30秒後の「終わり」を、セリフ再生から一切スキマなく繋がる<audio>チェーン
// (セリフ→無音→終わり)で自動再生している間、進行中のchainの終わり側
// <audio>要素への参照(一時停止/再開/キャンセルの対象)。この方式を使って
// いない(録音が揃っていない・音声合成を使っている)場合は null のまま。
let stretchAutoAnnounceAudio = null;
// 今の種目が上記の<audio>チェーン方式で「終わり」を鳴らす予定かどうか。
// true の間は tickStretch 側のベストエフォート呼び出しを重複させない。
let stretchUsingAudioChain = false;
// 上記のチェーンで実際に(確実に)次の種目の内容を先読みできた場合、その
// 種目のインデックスを保持する。ボタン操作でその種目に入る時、この値と
// 一致していればフルのセリフは省略し、短い開始の合図だけにする。先読みが
// 確実でなかった場合(ベストエフォート止まりだった等)はここに記録しない
// ので、フルのセリフが必ずどこかのタイミングで読み上げられる。
let stretchPreAnnouncedIndex = -1;
// 「▶️ 全種目を連続再生」がONかどうか。ONの間は、録音済み音声チェーンで
// 次の種目への先読みまで確実に終わった種目については、5秒空けてから自動で
// 次の種目の「はじめ」を読み上げてタイマーを始める(「次へ」を押さなくて
// 良い)。録音が揃っておらずチェーンが使えない種目では自動継続できない
// ため、その場合は通常通り手動で「次へ(スタート)」を押す必要がある。
let stretchAutoMode = false;

// Reads each step's cue aloud (via speechSynthesis or a recording — see
// below) so the manager doesn't have to read it themselves. Shared between
// the ストレッチ and 補強 tabs — both drive the same voice/recording engine.
let voiceEnabled = true;

// The Web Speech API can only use voices the browser itself exposes to
// speechSynthesis.getVoices() — on iOS Safari that's a small, fixed list
// that does NOT track the system "Spoken Content" voice chosen in
// Settings > Accessibility (that setting only affects VoiceOver/Speak
// Screen, not web pages). So instead of guessing, let the user see exactly
// what's available in THIS browser and pick directly, with a live preview.
// ストレッチと補強の各タブ(フル・コアA…)はそれぞれ完全に独立した
// 録音プールを持つため(同じ「反対」でも別収録として扱う)、選んだ声も
// タブごとに別々に覚えておく。
const CATEGORIES = ['stretch', ...REINFORCE_MENU_TABS.map((t) => t.id)];
const selectedVoiceURIByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, null]));

// Recordings are grouped into named "sets" (e.g. one per coach) so several
// complete recordings can coexist and be switched between for playback,
// rather than the whole team sharing one anonymous pool. Selecting a set's
// entry in the dropdown, listed below the synthesized voices, switches
// playback to that set's recorded human audio (this device's own copy,
// falling back to the team's shared copy) instead of speechSynthesis. The
// value format is "recorded:<set name>". Sets are also scoped per category
// for the same reason the voice choice is.
// 個人利用セットは3つデフォルトで用意し(いくらでも自分で追加もできる)、
// この3つだけは削除・名前変更ができない固定枠にする。
// DEFAULT_SET_NAME(先頭の①)は、セット機能導入前からの互換のため —
// dbKeyFor() の無変換キー方式(IndexedDBの古い保存形式)がこの1つの名前と
// 結び付いている。
const DEFAULT_SET_NAMES = ['個人利用音声①', '個人利用音声②', '個人利用音声③'];
const DEFAULT_SET_NAME = DEFAULT_SET_NAMES[0];
function isDefaultSetName(setName) {
  return DEFAULT_SET_NAMES.includes(setName);
}
const RECORDED_VOICE_PREFIX = 'recorded:';
const knownSetsByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, new Set(DEFAULT_SET_NAMES)])); // every set name seen so far in each category, local or shared
const activeRecordingSetIdByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, DEFAULT_SET_NAME])); // which set each category's recordings modal is currently viewing/recording into
let activeRecordingCategory = 'stretch'; // which category's recordings modal is currently open

function recordedVoiceValue(setName) {
  return RECORDED_VOICE_PREFIX + setName;
}
function isRecordedVoiceValue(value) {
  return typeof value === 'string' && value.startsWith(RECORDED_VOICE_PREFIX);
}
function setNameFromVoiceValue(value) {
  return value.slice(RECORDED_VOICE_PREFIX.length);
}

// 補強の各タブ(フル・コアA…)は createReinforceTab() が自分の <select> を
// ここに登録する(まだ生成されていないため、この時点では stretch のみ)。
const voiceSelectByCategory = { stretch: el.stretchVoiceSelect };
const voiceToggles = []; // mute is one shared, device-wide setting — registerVoiceToggle() fills this in

function populateVoiceSelect(category) {
  const select = voiceSelectByCategory[category];
  if (!select) return;

  const voices = 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
  const jaVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
  const list = jaVoices.length > 0 ? jaVoices : voices;
  const knownSets = knownSetsByCategory[category];

  let selected = selectedVoiceURIByCategory[category];
  if (isRecordedVoiceValue(selected)) {
    if (!knownSets.has(setNameFromVoiceValue(selected))) {
      selected = recordedVoiceValue(DEFAULT_SET_NAME); // its set was deleted — fall back to the default set
    }
  } else {
    const stillAvailable = selected && list.some((v) => v.voiceURI === selected);
    if (!stillAvailable) {
      if (list.length > 0) {
        const preferred = list.find((v) => /premium|enhanced|neural|siri/i.test(v.name)) || list[0];
        selected = preferred.voiceURI;
      } else {
        selected = recordedVoiceValue(DEFAULT_SET_NAME); // no synthesized voice available at all — recordings are the only option
      }
    }
  }
  selectedVoiceURIByCategory[category] = selected;

  select.innerHTML = '';
  select.disabled = false;
  list.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    select.appendChild(opt);
  });
  knownSets.forEach((setName) => {
    const opt = document.createElement('option');
    opt.value = recordedVoiceValue(setName);
    opt.textContent = `🎙 ${setName}`;
    select.appendChild(opt);
  });
  select.value = selected;
}

function populateAllVoiceSelects() {
  CATEGORIES.forEach(populateVoiceSelect);
}

if ('speechSynthesis' in window) {
  populateAllVoiceSelects();
  window.speechSynthesis.addEventListener('voiceschanged', populateAllVoiceSelects);
} else {
  populateAllVoiceSelects(); // still offers the recorded-voice option even with no TTS at all
}

CATEGORIES.forEach((category) => {
  const select = voiceSelectByCategory[category];
  if (!select) return;
  select.addEventListener('change', () => {
    selectedVoiceURIByCategory[category] = select.value;
  });
});

// 読み上げ・再生の「完了」を伝える Promise が、ブラウザ側の不具合で
// end/error イベントが一切発火しないケースでも永遠に待ち続けないための
// 保険。enterStretchStep はセリフの読み上げ完了を待ってからその種目の
// タイマーを開始するため、ここが固まるとタイマーが永久に始まらなくなる。
const CUE_SAFETY_TIMEOUT_MS = 8000;
function withCueSafetyTimeout(executor) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timeoutId = setTimeout(finish, CUE_SAFETY_TIMEOUT_MS);
    executor(() => {
      clearTimeout(timeoutId);
      finish();
    });
  });
}

// SpeechSynthesisUtterance を他から参照しないままにしておくと、ブラウザ
// (特にChrome系)によっては読み上げ中にGCされてしまい、onend/onerrorが
// 一切発火しないことがある。ここで参照を保持して防ぐ。
let pendingUtterance = null;

function speakCue(category, text) {
  return withCueSafetyTimeout((finish) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) {
      finish();
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel(); // don't let a fast "次へ" tap queue up overlapping lines

    // iOS Safari の speechSynthesis はボタン操作を介さず(タイマー等から)
    // 連続で呼び出すと、cancel() 直後の speak() や、直前の発話からあまり
    // 間を置かない2回目以降の speak() が何のイベントも出さず無反応に
    // なることがある(既知の不具合)。cancel() 直後に同期でspeak()せず
    // 一呼吸置くのと、一定時間内に実際に話し始めなければ resume() を挟んで
    // もう一度だけ試すことで、これを避ける。
    const speakNow = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      const voiceURI = selectedVoiceURIByCategory[category];
      const voice = synth.getVoices().find((v) => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      pendingUtterance = utterance;
      utterance.addEventListener('end', finish);
      utterance.addEventListener('error', finish);
      synth.speak(utterance);
      setTimeout(() => {
        if (pendingUtterance === utterance && !synth.speaking && !synth.pending) {
          synth.resume();
          synth.speak(utterance);
        }
      }, 250);
    };
    setTimeout(speakNow, 0);
  });
}

function applyVoiceToggleState(toggle) {
  toggle.classList.toggle('is-muted', !voiceEnabled);
  toggle.textContent = voiceEnabled ? '🔊 音声' : '🔇 音声';
}

function renderVoiceToggle() {
  voiceToggles.forEach(applyVoiceToggleState);
}

// stretch用の固定ボタンだけでなく、補強の各タブが動的に生成する自分の
// 🔊音声ボタンもここから登録する(ON/OFFは端末共通の1つの設定)。
function registerVoiceToggle(toggle) {
  if (!toggle) return;
  voiceToggles.push(toggle);
  applyVoiceToggleState(toggle);
  toggle.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      stopAnyPlayback();
    }
    renderVoiceToggle();
  });
}

registerVoiceToggle(el.stretchVoiceToggle);

/* ---------- Cue recordings (自分の声で録音) ---------- */
// Lets the manager record their own voice for each cue instead of relying on
// speechSynthesis. Recordings are saved as audio Blobs in IndexedDB, the only
// persistent storage in this app — everything else here is deliberately
// stateless, but there's no other way to keep a recording across reloads.
//
// ストレッチと補強の各タブ(フル・コアA…)は完全に独立したタイマーで、
// 同じ「反対」という言葉でも別の収録として扱いたいという要望から、あら
// ゆる録音データは (category, setName, text) の3つ組で管理される。
// category は CATEGORIES のいずれか('stretch' またはいずれかの補強タブ
// のid)。recordingsMap/sharedRecordingsMapは Map<"category setName", Map<text, ...>>
// という2階層構造で、外側キーをmapKey()で組み立てて既存のnested*ヘルパーを
// そのまま使い回す。
const RECORDINGS_DB_NAME = 'stretchRecordings';
const RECORDINGS_STORE_NAME = 'recordings';
const recordingSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
const recordingsMap = new Map(); // mapKey(category, setName) -> Map<text, Blob> (this device's own recordings, in IndexedDB)
let currentPlaybackAudio = null;
let activeRecording = null; // { category, setName, id, recorder, stream, chunks } while recording is in progress

function mapKey(category, setName) {
  return `${category} ${setName}`;
}
function nestedGet(map, outerKey, innerKey) {
  const inner = map.get(outerKey);
  return inner ? inner.get(innerKey) : undefined;
}
function nestedHas(map, outerKey, innerKey) {
  const inner = map.get(outerKey);
  return !!inner && inner.has(innerKey);
}
function nestedSet(map, outerKey, innerKey, value) {
  if (!map.has(outerKey)) map.set(outerKey, new Map());
  map.get(outerKey).set(innerKey, value);
}
function nestedDelete(map, outerKey, innerKey) {
  const inner = map.get(outerKey);
  if (inner) inner.delete(innerKey);
}

// Recordings can also be shared with the whole team via a small API hosted
// alongside the trainer's separate knowledge-base site (itonomaki), which
// already has FTP access to their Xserver hosting for storing files. Listing
// is public; uploading/deleting needs a shared token (entered once, kept in
// this browser's localStorage — never committed to source, unlike the
// server-side FTP credentials it ultimately relies on).
const SHARED_AUDIO_API_URL = '/itonomaki/api/stretch-audio';
const SHARED_AUDIO_TOKEN_KEY = 'stretchAudioToken';
const sharedRecordingsMap = new Map(); // mapKey(category, setName) -> Map<text, url>

function getStoredAudioToken() {
  try {
    return localStorage.getItem(SHARED_AUDIO_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function promptForAudioToken() {
  const input = prompt('チーム共有のアップロード用の合言葉を入力してください(この端末に保存され、次回からは聞かれません)');
  const token = input ? input.trim() : '';
  if (token) {
    try {
      localStorage.setItem(SHARED_AUDIO_TOKEN_KEY, token);
    } catch {
      /* localStorage unavailable (private browsing etc.) — just skip sharing this once */
    }
  }
  return token;
}

// 補強が複数タブに分かれる前、サーバー上の共有録音は全て category:
// "reinforce" で保存されていた(当時「フル」しか内容がなかったため、実質
// 補強フルのもの)。読み込み時にそのまま補強フルへ割り当て直す。
function normalizeIncomingCategory(rawCategory) {
  if (rawCategory === 'reinforce') return 'reinforceFull';
  return CATEGORIES.includes(rawCategory) ? rawCategory : 'stretch';
}

async function loadSharedRecordings() {
  try {
    const res = await fetch(SHARED_AUDIO_API_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    sharedRecordingsMap.clear();
    (data.items || []).forEach((item) => {
      if (!item || !item.text || !item.url) return;
      const category = normalizeIncomingCategory(item.category);
      const setName = item.setName || DEFAULT_SET_NAME;
      knownSetsByCategory[category].add(setName);
      nestedSet(sharedRecordingsMap, mapKey(category, setName), item.text, item.url);
    });
  } catch {
    // Offline, or the shared server is unreachable — local recordings and
    // speech synthesis still work fine without it.
  }
}

async function uploadRecordingToServer(category, setName, text, blob, allowRetry = true) {
  let token = getStoredAudioToken();
  if (!token) token = promptForAudioToken();
  if (!token) return false; // declined to enter one — recording stays local-only

  const form = new FormData();
  form.append('file', blob, 'cue');
  form.append('text', text);
  form.append('setName', setName);
  form.append('category', category);
  try {
    const res = await fetch(SHARED_AUDIO_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (res.status === 401) {
      try {
        localStorage.removeItem(SHARED_AUDIO_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      if (!allowRetry) return false;
      alert('合言葉が正しくありませんでした。もう一度入力してください。');
      return uploadRecordingToServer(category, setName, text, blob, false);
    }
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.url) nestedSet(sharedRecordingsMap, mapKey(category, setName), text, data.url);
    return true;
  } catch {
    return false; // offline, etc. — local recording is still saved
  }
}

async function deleteRecordingFromServer(category, setName, text) {
  let token = getStoredAudioToken();
  if (!token) token = promptForAudioToken();
  if (!token) return false;
  try {
    const res = await fetch(
      `${SHARED_AUDIO_API_URL}?category=${encodeURIComponent(category)}&setName=${encodeURIComponent(setName)}&text=${encodeURIComponent(text)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 401) {
      try {
        localStorage.removeItem(SHARED_AUDIO_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      alert('合言葉が正しくありませんでした。共有からの削除はできませんでしたが、この端末からは削除されました。');
      return false;
    }
    if (!res.ok) return false;
    nestedDelete(sharedRecordingsMap, mapKey(category, setName), text);
    return true;
  } catch {
    return false;
  }
}

async function deleteSetFromServer(category, setName) {
  let token = getStoredAudioToken();
  if (!token) token = promptForAudioToken();
  if (!token) return false;
  try {
    const res = await fetch(`${SHARED_AUDIO_API_URL}?category=${encodeURIComponent(category)}&setName=${encodeURIComponent(setName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      try {
        localStorage.removeItem(SHARED_AUDIO_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      alert('合言葉が正しくありませんでした。共有からの削除はできませんでしたが、この端末からは削除されました。');
      return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}

function openRecordingsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECORDINGS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(RECORDINGS_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// The IndexedDB key for a (category, set, text) triple. Recordings made
// before 補強/sets existed are stored under a plain-text key (no prefix) and
// were always ストレッチ content (補強 didn't exist yet); keeping that exact
// scheme for (category: "stretch", set: DEFAULT_SET_NAME) means those old
// recordings still load with no migration. The "|||" separator is a string
// nobody would plausibly type into a cue or a set name, so every other
// composite key stays unambiguous.
const DB_KEY_SEP = '|||';
function dbKeyFor(category, setName, text) {
  if (category === 'stretch' && setName === DEFAULT_SET_NAME) return text;
  return `${category}${DB_KEY_SEP}${setName}${DB_KEY_SEP}${text}`;
}
function parseDbKey(key) {
  const firstSep = key.indexOf(DB_KEY_SEP);
  if (firstSep === -1) return { category: 'stretch', setName: DEFAULT_SET_NAME, text: key };
  const category = key.slice(0, firstSep);
  const rest = key.slice(firstSep + DB_KEY_SEP.length);
  const secondSep = rest.indexOf(DB_KEY_SEP);
  return { category, setName: rest.slice(0, secondSep), text: rest.slice(secondSep + DB_KEY_SEP.length) };
}

async function loadAllRecordings() {
  const db = await openRecordingsDB();
  // 補強が複数タブに分かれる前のこの端末の録音は、IndexedDB内で
  // category: "reinforce" として保存されている。読み込んだ後にまとめて
  // 補強フル(reinforceFull)へ移し替え、以後この移行処理が不要になる
  // ようにする。
  const legacyReinforceEntries = []; // { setName, text, blob }
  await new Promise((resolve, reject) => {
    const store = db.transaction(RECORDINGS_STORE_NAME, 'readonly').objectStore(RECORDINGS_STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result;
      const getAll = store.getAll ? store.getAll() : null;
      if (getAll) {
        getAll.onsuccess = () => {
          keys.forEach((key, i) => {
            let { category, setName, text } = parseDbKey(key);
            const blob = getAll.result[i];
            if (category === 'reinforce') {
              legacyReinforceEntries.push({ setName, text, blob });
              category = 'reinforceFull';
            }
            if (!knownSetsByCategory[category]) return; // ignore anything from an unrecognized future category
            knownSetsByCategory[category].add(setName);
            nestedSet(recordingsMap, mapKey(category, setName), text, blob);
          });
          resolve();
        };
        getAll.onerror = () => reject(getAll.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
  for (const { setName, text, blob } of legacyReinforceEntries) {
    await saveRecordingToDB('reinforceFull', setName, text, blob);
    await deleteRecordingFromDB('reinforce', setName, text);
  }
}

async function saveRecordingToDB(category, setName, text, blob) {
  const db = await openRecordingsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDINGS_STORE_NAME, 'readwrite');
    tx.objectStore(RECORDINGS_STORE_NAME).put(blob, dbKeyFor(category, setName, text));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteRecordingFromDB(category, setName, text) {
  const db = await openRecordingsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDINGS_STORE_NAME, 'readwrite');
    tx.objectStore(RECORDINGS_STORE_NAME).delete(dbKeyFor(category, setName, text));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteSetFromDB(category, setName) {
  const db = await openRecordingsDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction(RECORDINGS_STORE_NAME, 'readwrite').objectStore(RECORDINGS_STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const parsed = parseDbKey(cursor.key);
      if (parsed.category === category && parsed.setName === setName) cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

function pickRecordingMimeType() {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  for (const type of candidates) {
    if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(type)) return type;
  }
  return ''; // let the browser pick its default
}

// Groups a category's steps by their exact spoken text — "反対" alone is
// read at several different steps within a menu, "終わり" for every step's
// auto-stop, etc. — so one recording covers every step within that category
// that says the same thing, instead of making the manager record the same
// word over and over. ストレッチと補強の各タブ(フル・コアA…)はそれぞれ
// 独立したカテゴリなので、ここで文言をまとめるのもそのカテゴリ内だけ
// (同じ「反対」でもタブが違えば別収録になる)。
function buildRecordingItems(category) {
  const byText = new Map(); // text -> groupNames[]
  function addStep(step) {
    if (!byText.has(step.voice)) byText.set(step.voice, []);
    byText.get(step.voice).push(step.group);
  }
  if (category === 'stretch') {
    STRETCH_STEPS.forEach(addStep);
    // ストレッチは各種目の30秒が終わると次の種目の内容を自動で先読みする
    // ため、「終わり」の合図はもう使わない。代わりに、その先読みの後
    // ボタン操作で実際にその種目に入る時に読む短い開始の合図を登録する。
    if (!byText.has(STRETCH_START_CUE)) byText.set(STRETCH_START_CUE, []);
    byText.get(STRETCH_START_CUE).push('(共通)開始の合図');
  } else {
    const tab = REINFORCE_MENU_TABS.find((t) => t.id === category);
    (tab ? REINFORCE_MENUS[tab.menuKey] || [] : []).forEach(addStep);
    if (!byText.has('終わり')) byText.set('終わり', []);
    byText.get('終わり').push('(共通)終わりの合図');
  }
  return Array.from(byText.entries()).map(([text, groupNames]) => ({ id: text, text, groupNames }));
}

// 録音は常にこの端末に保存されるだけで、自動でアップロードはしない。
// チーム共有は、ユーザーが「☁️ チームに共有」ボタンで選んだセットを明示的
// にアップロードした時だけ行う(その時点で端末に録音済みの分だけをまとめ
// て送る。全項目が揃っている必要はない)。
async function shareActiveSetToServer() {
  const category = activeRecordingCategory;
  const setName = activeRecordingSetIdByCategory[category];
  const key = mapKey(category, setName);
  const items = buildRecordingItems(category).filter((item) => nestedHas(recordingsMap, key, item.id));
  if (items.length === 0) {
    alert('このセットにはまだ録音がありません。');
    return;
  }
  if (!confirm(`「${setName}」セット(録音済み ${items.length} 件)をチームに共有します。よろしいですか?`)) return;

  el.recordingSetShareBtn.disabled = true;
  const originalText = el.recordingSetShareBtn.textContent;
  el.recordingSetShareBtn.textContent = '☁️ 共有中…';
  let allOk = true;
  for (const item of items) {
    const blob = nestedGet(recordingsMap, key, item.id);
    const ok = await uploadRecordingToServer(category, setName, item.id, blob);
    if (!ok) allOk = false;
  }
  el.recordingSetShareBtn.disabled = false;
  el.recordingSetShareBtn.textContent = originalText;
  buildAllRecordingRows();
  alert(
    allOk
      ? `「${setName}」セットをチームに共有しました(${items.length} 件)。`
      : '一部の録音でチーム共有アップロードに失敗しました。通信状況を確認して、もう一度お試しください。'
  );
}

function stopAnyPlayback() {
  if (currentPlaybackAudio) {
    currentPlaybackAudio.pause();
    currentPlaybackAudio = null;
  }
}

// Reflects the currently-open category's known sets into the modal's own
// set picker (independent of the "声を選ぶ" playback pickers — this one just
// controls which set the modal is currently viewing/recording into, via
// activeRecordingSetIdByCategory).
// デフォルトの3つの個人利用セットは常に存在させる固定枠なので、
// 削除・名前変更のどちらもできない(削除・変更ボタンをここでまとめて
// 無効化する)。
function updateRecordingSetActionButtons() {
  const isDefault = isDefaultSetName(activeRecordingSetIdByCategory[activeRecordingCategory]);
  el.recordingSetDeleteBtn.disabled = isDefault;
  el.recordingSetRenameBtn.disabled = isDefault;
}

function populateRecordingSetSelect() {
  const category = activeRecordingCategory;
  const knownSets = knownSetsByCategory[category];
  el.recordingSetSelect.innerHTML = '';
  knownSets.forEach((setName) => {
    const opt = document.createElement('option');
    opt.value = setName;
    opt.textContent = setName;
    el.recordingSetSelect.appendChild(opt);
  });
  if (!knownSets.has(activeRecordingSetIdByCategory[category])) activeRecordingSetIdByCategory[category] = DEFAULT_SET_NAME;
  el.recordingSetSelect.value = activeRecordingSetIdByCategory[category];
  updateRecordingSetActionButtons();
}

el.recordingSetSelect.addEventListener('change', () => {
  activeRecordingSetIdByCategory[activeRecordingCategory] = el.recordingSetSelect.value;
  updateRecordingSetActionButtons();
  buildAllRecordingRows();
});

el.recordingSetNewBtn.addEventListener('click', () => {
  const category = activeRecordingCategory;
  const input = prompt('新しいセットの名前を入力してください(例:田中コーチ)');
  const name = input ? input.trim() : '';
  if (!name) return;
  knownSetsByCategory[category].add(name);
  activeRecordingSetIdByCategory[category] = name;
  populateRecordingSetSelect();
  populateVoiceSelect(category); // the new set should also appear as a playback choice right away
  buildAllRecordingRows();
});

el.recordingSetDeleteBtn.addEventListener('click', async () => {
  const category = activeRecordingCategory;
  const setName = activeRecordingSetIdByCategory[category];
  if (isDefaultSetName(setName)) return; // guarded by disabled state too
  if (!confirm(`セット「${setName}」の録音を全て削除します。よろしいですか?`)) return;

  const key = mapKey(category, setName);
  recordingsMap.delete(key);
  await deleteSetFromDB(category, setName);
  const hadShared = sharedRecordingsMap.has(key);
  sharedRecordingsMap.delete(key);
  knownSetsByCategory[category].delete(setName);
  if (hadShared) await deleteSetFromServer(category, setName);
  if (selectedVoiceURIByCategory[category] === recordedVoiceValue(setName)) selectedVoiceURIByCategory[category] = null; // populateVoiceSelect() re-picks a fallback

  activeRecordingSetIdByCategory[category] = DEFAULT_SET_NAME;
  populateRecordingSetSelect();
  populateVoiceSelect(category);
  buildAllRecordingRows();
});

el.recordingSetRenameBtn.addEventListener('click', async () => {
  const category = activeRecordingCategory;
  const oldName = activeRecordingSetIdByCategory[category];
  if (isDefaultSetName(oldName)) return; // guarded by disabled state too

  const input = prompt('セットの新しい名前を入力してください', oldName);
  const newName = input ? input.trim() : '';
  if (!newName || newName === oldName) return;
  if (isDefaultSetName(newName) || knownSetsByCategory[category].has(newName)) {
    alert('その名前はすでに使われています。別の名前を入力してください。');
    return;
  }

  const oldKey = mapKey(category, oldName);
  const newKey = mapKey(category, newName);

  const oldRecordings = recordingsMap.get(oldKey);
  if (oldRecordings) {
    for (const [text, blob] of oldRecordings) {
      await saveRecordingToDB(category, newName, text, blob);
      await deleteRecordingFromDB(category, oldName, text);
    }
    recordingsMap.set(newKey, oldRecordings);
    recordingsMap.delete(oldKey);
  }

  // 既にチーム共有していた分は、名前変更後もサーバー上は旧名のまま残って
  // しまうため一旦削除する(必要なら新しい名前で改めて「☁️ チームに共有」
  // を押せば再アップロードできる)。
  const hadShared = sharedRecordingsMap.has(oldKey);
  if (hadShared) {
    await deleteSetFromServer(category, oldName);
    sharedRecordingsMap.delete(oldKey);
  }

  knownSetsByCategory[category].delete(oldName);
  knownSetsByCategory[category].add(newName);
  if (selectedVoiceURIByCategory[category] === recordedVoiceValue(oldName)) {
    selectedVoiceURIByCategory[category] = recordedVoiceValue(newName);
  }
  activeRecordingSetIdByCategory[category] = newName;

  populateRecordingSetSelect();
  populateVoiceSelect(category);
  buildAllRecordingRows();

  if (hadShared) {
    alert(`セット名を「${newName}」に変更しました。チーム共有していた分はサーバーから削除したので、必要であれば改めて「☁️ チームに共有」を押してください。`);
  }
});

el.recordingSetShareBtn.addEventListener('click', shareActiveSetToServer);

function createRecordingRow(item) {
  const node = el.recordingRowTemplate.content.firstElementChild.cloneNode(true);
  const groupEl = node.querySelector('.recording-row-group');
  const statusEl = node.querySelector('.recording-row-status');
  const textEl = node.querySelector('.recording-row-text');
  const recordBtn = node.querySelector('.recording-record-btn');
  const playBtn = node.querySelector('.recording-play-btn');
  const deleteBtn = node.querySelector('.recording-delete-btn');

  groupEl.textContent = item.text;
  textEl.textContent = `使用箇所: ${item.groupNames.join('、')}`;

  if (!recordingSupported) {
    recordBtn.disabled = true;
    recordBtn.title = 'この端末は録音に対応していません(再生・削除は可能です)';
  }

  // Reads activeRecordingCategory/activeRecordingSetIdByCategory live (not
  // captured at row-build time) so these handlers always act on whichever
  // category+set is currently selected.
  function currentKey() {
    return mapKey(activeRecordingCategory, activeRecordingSetIdByCategory[activeRecordingCategory]);
  }
  function refreshRowStatus() {
    const key = currentKey();
    const hasLocal = nestedHas(recordingsMap, key, item.id);
    const hasShared = nestedHas(sharedRecordingsMap, key, item.id);
    node.classList.toggle('is-recorded', hasLocal || hasShared);
    statusEl.textContent = hasShared ? 'チーム共有済み' : hasLocal ? '端末のみ(未共有)' : '未録音';
    playBtn.disabled = !(hasLocal || hasShared);
    deleteBtn.disabled = !(hasLocal || hasShared);
  }
  refreshRowStatus();

  recordBtn.addEventListener('click', () =>
    toggleRecording(activeRecordingCategory, activeRecordingSetIdByCategory[activeRecordingCategory], item.id, recordBtn, refreshRowStatus)
  );

  playBtn.addEventListener('click', () => {
    stopAnyPlayback();
    const key = currentKey();
    const blob = nestedGet(recordingsMap, key, item.id);
    if (blob) {
      const audio = new Audio(URL.createObjectURL(blob));
      currentPlaybackAudio = audio;
      audio.play().catch((err) => alert(`再生に失敗しました(端末保存分)\n${err.name}: ${err.message}`));
      return;
    }
    const url = nestedGet(sharedRecordingsMap, key, item.id);
    if (url) {
      const audio = new Audio(url);
      currentPlaybackAudio = audio;
      // 共有音声だけ、原因の切り分けができるよう詳しいエラーを表示する
      // (端末保存分と違い、ネットワーク越しの再生でここが失敗しがちなため)。
      // error イベントと play() の reject は同じ失敗で両方発火することがある
      // ので、二重アラートにならないようフラグで抑制する。
      //
      // 注意: ここで fetch() によるHEADリクエストでヘッダーを確認しようと
      // したことがあるが、<audio> 要素自体はCORSの制限を受けずに再生できる
      // 一方、fetch() は別オリジン(Xserver)への読み取りにCORSヘッダーが
      // 必要なため、無関係な"Load failed"エラーが出てしまい誤診断の原因に
      // なった。ヘッダーを確認したい場合は、このURLをブラウザで直接開いて
      // もらう(トップレベルナビゲーションはCORSの対象外)のが正しい方法。
      let alerted = false;
      audio.addEventListener('error', () => {
        if (alerted) return;
        alerted = true;
        const code = audio.error ? audio.error.code : null;
        const codeNames = { 1: 'MEDIA_ERR_ABORTED', 2: 'MEDIA_ERR_NETWORK', 3: 'MEDIA_ERR_DECODE', 4: 'MEDIA_ERR_SRC_NOT_SUPPORTED' };
        alert(`共有音声の再生に失敗しました\nURL: ${url}\nエラーコード: ${code ?? '不明'}(${codeNames[code] || '不明'})`);
      });
      audio.play().catch((err) => {
        if (alerted) return;
        alerted = true;
        alert(`共有音声の再生に失敗しました\nURL: ${url}\n${err.name}: ${err.message}`);
      });
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const category = activeRecordingCategory;
    const setName = activeRecordingSetIdByCategory[category];
    const key = mapKey(category, setName);
    const hadShared = nestedHas(sharedRecordingsMap, key, item.id);
    nestedDelete(recordingsMap, key, item.id);
    await deleteRecordingFromDB(category, setName, item.id);
    if (hadShared) await deleteRecordingFromServer(category, setName, item.id);
    refreshRowStatus();
  });

  return node;
}

function buildAllRecordingRows() {
  el.stretchRecordingsList.innerHTML = '';
  buildRecordingItems(activeRecordingCategory).forEach((item) => {
    el.stretchRecordingsList.appendChild(createRecordingRow(item));
  });
}

async function toggleRecording(category, setName, id, btn, refreshRowStatus) {
  if (activeRecording && activeRecording.category === category && activeRecording.setName === setName && activeRecording.id === id) {
    activeRecording.recorder.stop(); // onstop handles saving + cleanup
    return;
  }
  if (activeRecording) return; // one recording at a time

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert('マイクを使用できませんでした。ブラウザの設定でマイクへのアクセスを許可してください。');
    return;
  }

  const mimeType = pickRecordingMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });
  recorder.addEventListener('stop', async () => {
    stream.getTracks().forEach((track) => track.stop());
    activeRecording = null;
    btn.classList.remove('is-recording');
    btn.textContent = '🔴 録音';
    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
    if (blob.size > 0) {
      nestedSet(recordingsMap, mapKey(category, setName), id, blob);
      refreshRowStatus();
      await saveRecordingToDB(category, setName, id, blob);
    }
  });

  activeRecording = { category, setName, id, recorder, stream, chunks };
  btn.classList.add('is-recording');
  btn.textContent = '⏹ 停止';
  recorder.start();
}

// Only used when the given category's selected voice is a "🎙 <セット名>"
// entry: prefers this device's own recording (in that category+set) for the
// exact cue text, then the team's shared recording (same category+set),
// falling back to speechSynthesis if neither exists. Any TTS voice always
// speaks via speechSynthesis, ignoring recordings entirely. Recordings are
// keyed by the spoken text itself, so every step within a category that
// says e.g. "反対" shares one recording within a set automatically — but
// ストレッチ and 補強 never share recordings with each other, even for the
// exact same word (see the module comment above).
// 再生の完了(またはそもそも何も再生しなかったこと)を Promise で知らせる。
// 呼び出し側から見れば、録音再生・共有音声再生・音声合成のどれが実際に
// 使われたかに関わらず「読み終わった」タイミングが await で分かる。
function announceCue(category, text) {
  return withCueSafetyTimeout((finish) => {
    if (!voiceEnabled) {
      finish();
      return;
    }
    stopAnyPlayback();
    const selectedVoiceURI = selectedVoiceURIByCategory[category];
    if (isRecordedVoiceValue(selectedVoiceURI)) {
      const setName = setNameFromVoiceValue(selectedVoiceURI);
      const key = mapKey(category, setName);
      const blob = nestedGet(recordingsMap, key, text);
      if (blob) {
        const audio = new Audio(URL.createObjectURL(blob));
        currentPlaybackAudio = audio;
        audio.addEventListener('ended', finish);
        audio.addEventListener('error', finish);
        audio.play().catch(finish);
        return;
      }
      const url = nestedGet(sharedRecordingsMap, key, text);
      if (url) {
        const audio = new Audio(url);
        currentPlaybackAudio = audio;
        // 共有音声の再生に失敗しても(権限・回線・非対応形式など)ワークアウト中に
        // 無音のまま止まらないよう、音声合成に自動でフォールバックする。二重に
        // 読み上げないよう、フォールバック済みかどうかをフラグで管理する。
        let fellBack = false;
        const fallbackToSpeech = () => {
          if (fellBack) return;
          fellBack = true;
          speakCue(category, text).then(finish);
        };
        audio.addEventListener('ended', finish);
        audio.addEventListener('error', fallbackToSpeech);
        audio.play().catch(fallbackToSpeech);
        return;
      }
    }
    speakCue(category, text).then(finish);
  });
}

// 「終わり」のように、ボタン操作を伴わずタイマーから自動で鳴らす必要が
// ある合図を確実に鳴らすための仕組み。iOS Safariはボタン操作を伴わない
// 新規の音声再生開始を仕様上ブロックする。共有録音(チーム共有サーバー)
// はCORS未対応のためWeb Audio APIで生データを読み込めず、AudioContextの
// アンロックだけでは解決できない。そこで、ボタン操作(セリフ再生開始)
// から一切スキマなく繋がる1本の <audio> 再生の中で「セリフ→(30秒などの
// 種目の長さぶんの)無音→終わり」と鳴らす。<audio>要素はそもそも
// 再生自体にCORSは不要なので(fetch()で生データを読む場合とは違う)、
// この方式なら共有録音でも問題なく再生できる。
//
// 録音済み音声を使っていて、種目本来のセリフと「終わり」の両方の録音が
// 揃っている場合だけこの方式を使う。音声合成を使っている場合や、いずれ
// かの録音が無い場合は、今まで通りのベストエフォート(announceCue)に
// フォールバックする。

const silentWavDataUriCache = new Map(); // durationMs -> data URI
function silentWavDataUri(durationMs, sampleRate = 8000) {
  if (silentWavDataUriCache.has(durationMs)) return silentWavDataUriCache.get(durationMs);
  const numSamples = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  const dataSize = numSamples; // 8-bit PCM mono, 1 byte/sample
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset, str) => {
    for (let i = 0; i < str.length; i++) bytes[offset + i] = str.charCodeAt(i);
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);
  bytes.fill(128, 44); // 8-bit unsigned PCMの無音レベル
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const dataUri = `data:audio/wav;base64,${btoa(binary)}`;
  silentWavDataUriCache.set(durationMs, dataUri);
  return dataUri;
}

// 指定の (category, text) について、この端末またはチーム共有の録音が
// あればその再生用URL(またはBlob URL)を返す。無ければ null。
function recordedCueAudioSrc(category, text) {
  const selectedVoiceURI = selectedVoiceURIByCategory[category];
  if (!isRecordedVoiceValue(selectedVoiceURI)) return null;
  const setName = setNameFromVoiceValue(selectedVoiceURI);
  const key = mapKey(category, setName);
  const blob = nestedGet(recordingsMap, key, text);
  if (blob) return URL.createObjectURL(blob);
  return nestedGet(sharedRecordingsMap, key, text) || null;
}

populateRecordingSetSelect();
buildAllRecordingRows();
loadAllRecordings()
  .then(() => {
    populateRecordingSetSelect();
    populateAllVoiceSelects();
    buildAllRecordingRows();
  })
  .catch(() => {});
loadSharedRecordings()
  .then(() => {
    populateRecordingSetSelect();
    populateAllVoiceSelects();
    buildAllRecordingRows();
  })
  .catch(() => {});

const RECORDINGS_MODAL_TITLE = {
  stretch: 'ストレッチのセリフを自分の声で録音する',
  ...Object.fromEntries(REINFORCE_MENU_TABS.map((t) => [t.id, `${t.tabLabel}のセリフを自分の声で録音する`])),
};

function openRecordingsModal(category) {
  activeRecordingCategory = category;
  el.stretchRecordingsModalTitle.textContent = RECORDINGS_MODAL_TITLE[category];
  el.stretchRecordingsModal.hidden = false;
  populateRecordingSetSelect();
  buildAllRecordingRows();
  loadSharedRecordings()
    .then(() => {
      populateRecordingSetSelect();
      populateVoiceSelect(category);
      buildAllRecordingRows();
    })
    .catch(() => {});
}
function closeRecordingsModal() {
  el.stretchRecordingsModal.hidden = true;
  stopAnyPlayback();
}
if (el.stretchRecordingsToggle) el.stretchRecordingsToggle.addEventListener('click', () => openRecordingsModal('stretch'));
el.stretchRecordingsCloseBtn.addEventListener('click', closeRecordingsModal);
el.stretchRecordingsModal.addEventListener('click', (e) => {
  if (e.target === el.stretchRecordingsModal) closeRecordingsModal(); // backdrop tap
});

function currentStretchElapsedMs() {
  if (!stretchRunning) return stretchElapsedMs;
  return stretchElapsedMs + (Date.now() - stretchStartEpoch);
}

function formatStretchTimer(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${minutes}:${pad2(seconds)}`;
}

function updateStretchTimerDisplay() {
  const elapsedMs = stretchIndex === -1 ? 0 : Math.min(currentStretchElapsedMs(), STRETCH_STEP_MS);
  el.stretchTimer.textContent = formatStretchTimer(elapsedMs);
  el.stretchTimer.classList.toggle('is-overtime', elapsedMs >= STRETCH_STEP_MS);
}

function renderStretchUI() {
  const current = stretchIndex >= 0 ? STRETCH_STEPS[stretchIndex] : null;
  const next = stretchIndex + 1 < STRETCH_STEPS.length ? STRETCH_STEPS[stretchIndex + 1] : null;

  el.stretchCurrentGroup.textContent = current ? current.group : '準備中';
  el.stretchNextGroup.textContent = next ? next.group : stretchIndex >= 0 ? 'これで終わりです' : STRETCH_STEPS[0].group;
  el.stretchNextSpeech.textContent = next ? next.speech : stretchIndex >= 0 ? '' : STRETCH_STEPS[0].speech;
  el.stretchProgress.textContent = `${Math.max(stretchIndex + 1, 0)} / ${STRETCH_STEPS.length}`;

  // "ストレッチ中" (locked) covers the whole in-progress span for this step,
  // including while paused — not just while actively counting — so pausing
  // doesn't look like the step finished. Only reaching the full 30s unlocks it.
  const stepInProgress = stretchIndex >= 0 && currentStretchElapsedMs() < STRETCH_STEP_MS;
  el.stretchStartBtn.disabled = stepInProgress;
  el.stretchStartBtn.textContent = stretchIndex === -1 ? 'スタート' : stepInProgress ? 'ストレッチ中' : '次へ(スタート)';
  el.stretchAutoBtn.classList.toggle('is-active', stretchAutoMode);
  el.stretchAutoBtn.textContent = stretchAutoMode ? '⏸ 連続再生 停止' : '▶️ 全種目を連続再生';
  // 前に戻る/次に進む はロック中でも押せる手動スキップ用ボタンなので、
  // stepInProgress では無効化しない(戻れない/進めない条件のときだけ無効化)。
  el.stretchPrevBtn.disabled = stretchIndex <= 0;
  el.stretchNextBtn.disabled = STRETCH_STEPS.length === 0;
  el.stretchPauseBtn.disabled = stretchIndex === -1 || stretchAwaitingVoice;
  el.stretchPauseBtn.textContent = stretchRunning ? '一時停止' : '再開';
  updateStretchTimerDisplay();
}

// 進行中の「終わり」自動再生チェーンがあれば止める(種目を切り替えた/
// リセットした時に、古いチェーンが後から鳴ってしまわないようにする)。
function stopStretchAutoAnnounce() {
  if (stretchAutoAnnounceAudio) {
    stretchAutoAnnounceAudio.pause();
    stretchAutoAnnounceAudio = null;
  }
  stretchUsingAudioChain = false;
}

// 種目を選び直す共通処理(「次へ」「前に戻る」共通)。iOS Safariはボタン
// 操作を伴わない(タイマーからの自動)音声合成を仕様上ブロックしており
// JS側では回避できないため、必ずこの実際のボタン操作に紐づけてセリフを
// 読み上げ、それが読み終わってから初めてその種目のタイマーを開始する。
//
// この種目のセリフと、次の種目のセリフ(最後の種目なら「終わりです」)の
// 両方が録音済み音声(この端末またはチーム共有)で揃っている場合、セリフ
// 再生からスキマなく繋がる1本の<audio>再生チェーン(セリフ→30秒の無音→
// 次の種目のセリフ)を、このボタン操作をきっかけに今すぐ開始しておく。
// これにより、この種目の30秒が終わるのとほぼ同時に次の種目の内容が自動で
// 読み上げられる(ボタン操作なしでも<audio>要素の再生自体にはCORSが不要
// なため、チーム共有録音(CORS未対応のXserver)でも問題なく鳴らせる)。
// この自動先読みが確実に行えた場合は stretchPreAnnouncedIndex に記録し、
// 実際にその種目に入る時は短い「はじめ」の合図だけにしてフルのセリフの
// 二重読みを避ける。音声合成を使っている場合や録音が揃っていない場合は
// この方式が使えないため、これまで通りtickStretch側のベストエフォート
// 呼び出しに任せる(その場合は先読みが確実でないので、ボタン操作時に
// 必ずフルのセリフを読み上げる)。
function enterStretchStep(index) {
  stopStretchAutoAnnounce();
  stretchIndex = index;
  stretchElapsedMs = 0;
  stretchRunning = false;
  stretchAwaitingVoice = true;
  renderStretchUI();

  const step = STRETCH_STEPS[index];
  const wasPreAnnounced = stretchPreAnnouncedIndex === index;
  stretchPreAnnouncedIndex = -1;
  const buttonCueText = wasPreAnnounced ? STRETCH_START_CUE : step.voice;

  const nextStep = STRETCH_STEPS[index + 1] || null;
  const afterText = nextStep ? nextStep.voice : STRETCH_COMPLETE_CUE;

  const cueSrc = voiceEnabled ? recordedCueAudioSrc('stretch', buttonCueText) : null;
  const afterSrc = voiceEnabled ? recordedCueAudioSrc('stretch', afterText) : null;

  if (cueSrc && afterSrc) {
    stretchUsingAudioChain = true;
    stopAnyPlayback();
    const cueAudio = new Audio(cueSrc);
    currentPlaybackAudio = cueAudio;
    const startTimer = () => {
      if (stretchIndex !== index || !stretchAwaitingVoice) return;
      stretchAwaitingVoice = false;
      stretchRunning = true;
      stretchStartEpoch = Date.now();
      renderStretchUI();

      const silenceAudio = new Audio(silentWavDataUri(STRETCH_STEP_MS - STRETCH_ANNOUNCE_LEAD_MS));
      stretchAutoAnnounceAudio = silenceAudio;
      silenceAudio.addEventListener('ended', () => {
        if (stretchAutoAnnounceAudio !== silenceAudio) return; // キャンセル済み
        if (nextStep) stretchPreAnnouncedIndex = index + 1;
        const afterAudio = new Audio(afterSrc);
        stretchAutoAnnounceAudio = afterAudio;
        afterAudio.addEventListener('ended', () => {
          if (stretchAutoAnnounceAudio !== afterAudio) return; // キャンセル済み
          // 全種目を連続再生するモードでない、またはこれが最後の種目なら
          // ここで止まる(次は手動で「次へ(スタート)」を押してもらう)。
          if (!stretchAutoMode || !nextStep) return;
          const gapAudio = new Audio(silentWavDataUri(STRETCH_AUTO_GAP_MS));
          stretchAutoAnnounceAudio = gapAudio;
          gapAudio.addEventListener('ended', () => {
            if (stretchAutoAnnounceAudio !== gapAudio) return; // キャンセル済み
            enterStretchStep(index + 1);
          });
          gapAudio.play().catch(() => {});
        });
        afterAudio.play().catch(() => {});
      });
      silenceAudio.play().catch(() => {});
    };
    cueAudio.addEventListener('ended', startTimer);
    cueAudio.addEventListener('error', () => {
      // 再生できなかった場合はベストエフォート方式に切り替える。
      stretchUsingAudioChain = false;
      startTimer();
    });
    cueAudio.play().catch(() => {
      stretchUsingAudioChain = false;
      startTimer();
    });
    return;
  }

  stretchUsingAudioChain = false;
  announceCue('stretch', buttonCueText).then(() => {
    // 読み上げを待っている間に別の操作で状態が変わっていたら何もしない。
    if (stretchIndex !== index || !stretchAwaitingVoice) return;
    stretchAwaitingVoice = false;
    stretchRunning = true;
    stretchStartEpoch = Date.now();
    renderStretchUI();
  });
}

function startNextStretchStep() {
  const nextIndex = stretchIndex + 1;
  if (nextIndex >= STRETCH_STEPS.length) {
    stopStretchAutoAnnounce();
    stretchPreAnnouncedIndex = -1;
    stretchIndex = -1;
    stretchRunning = false;
    stretchAwaitingVoice = false;
    stretchElapsedMs = 0;
    renderStretchUI();
    return;
  }
  enterStretchStep(nextIndex);
}

// 「前に戻る」: ロック中かどうかに関わらず、直前の種目に戻ってやり直せる。
// 最初の種目(index 0)より前には戻れない。手動で過去に戻る操作なので、
// 連続再生モードは解除する(戻った先から自動で進み続けると紛らわしいため)。
function goToPreviousStretchStep() {
  if (stretchIndex <= 0) return;
  stretchAutoMode = false;
  enterStretchStep(stretchIndex - 1);
}

// 「▶️ 全種目を連続再生」のON/OFF切り替え。ONにした時、ちょうど次の種目に
// 進める状態(未開始、または種目が終わってロックが解除された状態)なら、
// そのまま次の種目から自動連続再生を始める。種目の途中(ロック中)なら、
// フラグだけ立てておき、この種目が終わったタイミングから自動継続に入る。
function toggleStretchAutoMode() {
  stretchAutoMode = !stretchAutoMode;
  if (stretchAutoMode && !el.stretchStartBtn.disabled) {
    startNextStretchStep();
  } else {
    renderStretchUI();
  }
}

// For interruptions mid-stretch (a car passing on the road, etc.) — freezes
// the current step's elapsed time in place rather than losing it.
function toggleStretchPause() {
  if (stretchIndex === -1 || stretchAwaitingVoice) return; // guarded by disabled state too
  if (stretchRunning) {
    stretchElapsedMs = currentStretchElapsedMs();
    stretchRunning = false;
    if (stretchAutoAnnounceAudio) stretchAutoAnnounceAudio.pause();
  } else {
    stretchStartEpoch = Date.now();
    stretchRunning = true;
    if (stretchAutoAnnounceAudio) stretchAutoAnnounceAudio.play().catch(() => {});
  }
  renderStretchUI();
}

function resetStretch() {
  stopStretchAutoAnnounce();
  stretchAutoMode = false;
  stretchPreAnnouncedIndex = -1;
  stretchIndex = -1;
  stretchRunning = false;
  stretchAwaitingVoice = false;
  stretchElapsedMs = 0;
  renderStretchUI();
}

function tickStretch() {
  if (stretchRunning) {
    if (currentStretchElapsedMs() >= STRETCH_STEP_MS) {
      // Auto-stop right at 30s instead of counting up indefinitely.
      stretchElapsedMs = STRETCH_STEP_MS;
      stretchRunning = false;
      renderStretchUI();
      // 録音済み音声(セリフ・次の種目のセリフの両方)が揃っている場合は、
      // セリフ再生から繋がる<audio>チェーンが既に次の種目の内容(最後の
      // 種目なら「終わりです」)の自動先読みを予約済みなので、ここでは
      // 重複させない。それ以外の場合はベストエフォートで鳴らす(音声合成
      // の場合、iOS Safariでは鳴らないことがある。いずれの場合も、次の
      // 種目の内容自体は次へボタンを押した時に確実に読み上げられる)。
      if (!stretchUsingAudioChain) {
        const nextStep = STRETCH_STEPS[stretchIndex + 1] || null;
        announceCue('stretch', nextStep ? nextStep.voice : STRETCH_COMPLETE_CUE);
      }
    } else {
      updateStretchTimerDisplay();
    }
  }
  requestAnimationFrame(tickStretch);
}

el.stretchStartBtn.addEventListener('click', startNextStretchStep);
el.stretchAutoBtn.addEventListener('click', toggleStretchAutoMode);
el.stretchPrevBtn.addEventListener('click', goToPreviousStretchStep);
el.stretchNextBtn.addEventListener('click', startNextStretchStep); // same "advance" action, but usable even while locked
el.stretchPauseBtn.addEventListener('click', toggleStretchPause);
el.stretchResetBtn.addEventListener('click', resetStretch);

renderStretchUI();
requestAnimationFrame(tickStretch);

/* ---------- Reinforcement training timers (補強フル・コアA・コアB・ループ・下肢) ---------- */
// Structurally like the stretch timer (manual "次へ" advance through a list
// of steps, sharing the same voice/recording engine above), generalized to
// handle a mix of fixed-duration steps (auto-counts and auto-stops, like
// every stretch step) and rep/count-based steps with no real duration (the
// manager just presses "次へ" whenever the group is done — see
// REINFORCE_MENUS's durationSec comment).
//
// Each of REINFORCE_MENU_TABS is now a fully independent top-level tab —
// own timer, own voice picker, own recording sets — rather than a picker
// inside one shared 補強 tab. createReinforceTab() clones
// #reinforceMenuTabTemplate into that tab's (otherwise-empty) panel and
// wires it up as its own self-contained instance (closure-local state, no
// globals shared between tabs).
function createReinforceTab(tab) {
  const panel = document.getElementById(`${tab.id}Tab`);
  if (!panel) return;
  panel.appendChild(el.reinforceMenuTabTemplate.content.cloneNode(true));

  panel.querySelectorAll('.reinforce-subnav-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === tab.id);
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
  });

  const elLocal = {
    voiceToggle: panel.querySelector('.reinforce-voice-toggle'),
    voiceSelect: panel.querySelector('.reinforce-voice-select'),
    recordingsToggle: panel.querySelector('.reinforce-recordings-toggle'),
    progress: panel.querySelector('.reinforce-progress'),
    timer: panel.querySelector('.reinforce-timer'),
    currentGroup: panel.querySelector('.reinforce-current-group'),
    currentSpec: panel.querySelector('.reinforce-current-spec'),
    nextGroup: panel.querySelector('.reinforce-next-group'),
    nextSpeech: panel.querySelector('.reinforce-next-speech'),
    startBtn: panel.querySelector('.reinforce-start-btn'),
    prevBtn: panel.querySelector('.reinforce-prev-btn'),
    nextBtn: panel.querySelector('.reinforce-next-btn'),
    pauseBtn: panel.querySelector('.reinforce-pause-btn'),
    resetBtn: panel.querySelector('.reinforce-reset-btn'),
  };

  let index = -1;
  let running = false;
  let elapsedMs = 0;
  let startEpoch = 0;
  // どの種目も、セリフを読み終えるまでタイマーを始めない(音声がOFFの時は
  // 読み上げが即座に完了するので、体感上はボタンを押した瞬間にタイマーが
  // 始まる)。ストレッチタブと同じ設計 — iOS Safariがボタン操作を伴わない
  // 音声合成を仕様上ブロックするため。
  let awaitingVoice = false;

  function steps() {
    return REINFORCE_MENUS[tab.menuKey] || [];
  }
  function currentStep() {
    const s = steps();
    return index >= 0 && index < s.length ? s[index] : null;
  }
  function currentDurationMs() {
    const step = currentStep();
    return step && step.durationSec ? step.durationSec * 1000 : null;
  }
  function currentElapsedMs() {
    if (!running) return elapsedMs;
    return elapsedMs + (Date.now() - startEpoch);
  }

  function updateTimerDisplay() {
    const durationMs = currentDurationMs();
    const rawElapsedMs = index === -1 ? 0 : currentElapsedMs();
    const shownMs = durationMs !== null ? Math.min(rawElapsedMs, durationMs) : rawElapsedMs;
    elLocal.timer.textContent = formatStretchTimer(shownMs);
    elLocal.timer.classList.toggle('is-overtime', durationMs !== null && rawElapsedMs >= durationMs);
  }

  function render() {
    const s = steps();
    const current = currentStep();
    const next = index + 1 < s.length ? s[index + 1] : null;

    elLocal.currentGroup.textContent = current ? current.group : s.length > 0 ? '準備中' : 'このメニューは準備中です';
    elLocal.currentSpec.textContent = current ? current.spec : '';
    elLocal.nextGroup.textContent = next ? next.group : index >= 0 ? 'これで終わりです' : s[0] ? s[0].group : '';
    elLocal.nextSpeech.textContent = next ? next.speech : index >= 0 ? '' : s[0] ? s[0].speech : '';
    elLocal.progress.textContent = `${Math.max(index + 1, 0)} / ${s.length}`;

    const durationMs = currentDurationMs();
    const stepInProgress = index >= 0 && durationMs !== null && currentElapsedMs() < durationMs;
    elLocal.startBtn.disabled = stepInProgress || s.length === 0;
    elLocal.startBtn.textContent = index === -1 ? 'スタート' : stepInProgress ? '実施中' : '次へ(スタート)';
    // 前に戻る/次に進む はロック中でも押せる手動スキップ用ボタンなので、
    // stepInProgress では無効化しない(戻れない/進めない条件のときだけ無効化)。
    elLocal.prevBtn.disabled = index <= 0;
    elLocal.nextBtn.disabled = s.length === 0;
    elLocal.pauseBtn.disabled = index === -1 || awaitingVoice;
    elLocal.pauseBtn.textContent = running ? '一時停止' : '再開';
    updateTimerDisplay();
  }

  // 種目を選び直す共通処理(「次へ」「前に戻る」共通)。セリフを読み終える
  // まで待ってから、その種目のタイマーを開始する。
  function enterStep(nextIndex) {
    index = nextIndex;
    elapsedMs = 0;
    running = false;
    awaitingVoice = true;
    render();
    const enteredIndex = index;
    announceCue(tab.id, steps()[index].voice).then(() => {
      // 読み上げを待っている間に別の操作で状態が変わっていたら何もしない。
      if (index !== enteredIndex || !awaitingVoice) return;
      awaitingVoice = false;
      running = true;
      startEpoch = Date.now();
      render();
    });
  }

  function startNext() {
    const s = steps();
    const nextIndex = index + 1;
    if (nextIndex >= s.length) {
      index = -1;
      running = false;
      awaitingVoice = false;
      elapsedMs = 0;
      render();
      return;
    }
    enterStep(nextIndex);
  }

  // 「前に戻る」: ロック中かどうかに関わらず、直前の種目に戻ってやり直せる。
  // 最初の種目(index 0)より前には戻れない。
  function goToPrevious() {
    if (index <= 0) return;
    enterStep(index - 1);
  }

  function togglePause() {
    if (index === -1 || awaitingVoice) return; // guarded by disabled state too
    if (running) {
      elapsedMs = currentElapsedMs();
      running = false;
    } else {
      startEpoch = Date.now();
      running = true;
    }
    render();
  }

  function reset() {
    index = -1;
    running = false;
    awaitingVoice = false;
    elapsedMs = 0;
    render();
  }

  function tick() {
    if (running) {
      const durationMs = currentDurationMs();
      if (durationMs !== null && currentElapsedMs() >= durationMs) {
        // Auto-stop steps with a fixed duration, same as the stretch timer;
        // rep/count-based steps (durationMs === null) never hit this — those
        // just keep counting up until the manager presses "次へ" themselves.
        elapsedMs = durationMs;
        running = false;
        render();
        announceCue(tab.id, '終わり');
      } else {
        updateTimerDisplay();
      }
    }
    requestAnimationFrame(tick);
  }

  elLocal.startBtn.addEventListener('click', startNext);
  elLocal.prevBtn.addEventListener('click', goToPrevious);
  elLocal.nextBtn.addEventListener('click', startNext); // same "advance" action, but usable even while locked
  elLocal.pauseBtn.addEventListener('click', togglePause);
  elLocal.resetBtn.addEventListener('click', reset);
  if (elLocal.recordingsToggle) elLocal.recordingsToggle.addEventListener('click', () => openRecordingsModal(tab.id));

  voiceSelectByCategory[tab.id] = elLocal.voiceSelect;
  registerVoiceToggle(elLocal.voiceToggle);

  render();
  requestAnimationFrame(tick);
}

REINFORCE_MENU_TABS.forEach(createReinforceTab);
populateAllVoiceSelects(); // 上で登録された補強の各 <select> にも声の一覧を反映する

/* ---------- TABATA timer ---------- */
// Unlike the manually-advanced stretch timer, TABATA is meant to run
// hands-free once started: 20s training / 10s rest, repeated for 8 sets,
// auto-advancing on its own.
const TABATA_TRAIN_SEC = 20;
const TABATA_REST_SEC = 10;
const TABATA_SETS = 8;
const TABATA_PHASES = [];
for (let set = 1; set <= TABATA_SETS; set++) {
  TABATA_PHASES.push({ type: 'train', set, duration: TABATA_TRAIN_SEC });
  TABATA_PHASES.push({ type: 'rest', set, duration: TABATA_REST_SEC });
}

let tabataIndex = -1; // -1 = not started, TABATA_PHASES.length = finished
let tabataRunning = false;
let tabataPhaseStartEpoch = 0;

// カウントダウン音: 各フェーズの残り3・2・1秒で短いビープ(ぴ、ぴ、ぴ)、
// フェーズが切り替わる瞬間(0秒)で長めのビープ(ぴー)を鳴らす。
// 音声ファイルは使わずWeb Audio APIでその場でトーンを生成する。
let tabataAudioCtx = null;
let tabataLastBeepedSecond = null;

function ensureTabataAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!tabataAudioCtx) tabataAudioCtx = new Ctx();
  if (tabataAudioCtx.state === 'suspended') tabataAudioCtx.resume();
  return tabataAudioCtx;
}

function playTabataBeep({ frequency, durationMs }) {
  const ctx = ensureTabataAudioCtx();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  const now = ctx.currentTime;
  const durationSec = durationMs / 1000;
  // 立ち上がり/立ち下がりを短いランプにして、オン/オフ時の「プツッ」という
  // クリックノイズを防ぐ。
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
  gain.gain.setValueAtTime(0.35, Math.max(now + 0.01, now + durationSec - 0.03));
  gain.gain.linearRampToValueAtTime(0, now + durationSec);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSec);
}

function updateTabataTimerDisplay() {
  const phase = TABATA_PHASES[tabataIndex];
  const elapsedMs = Date.now() - tabataPhaseStartEpoch;
  const remainingSec = Math.max(0, phase.duration - Math.floor(elapsedMs / 1000));
  el.tabataTimer.textContent = String(remainingSec);

  if (remainingSec <= 3 && remainingSec >= 1 && remainingSec !== tabataLastBeepedSecond) {
    tabataLastBeepedSecond = remainingSec;
    playTabataBeep({ frequency: 880, durationMs: 120 });
  }
}

function renderTabataUI() {
  const idle = tabataIndex === -1;
  const finished = tabataIndex >= TABATA_PHASES.length;
  const phase = !idle && !finished ? TABATA_PHASES[tabataIndex] : null;

  el.tabataProgress.textContent = `セット ${phase ? phase.set : finished ? TABATA_SETS : 0} / ${TABATA_SETS}`;
  el.tabataPhase.textContent = phase ? (phase.type === 'train' ? 'トレーニング' : 'レスト') : finished ? '完了!' : 'スタート待ち';
  el.tabataDisplayPanel.classList.toggle('is-train', !!phase && phase.type === 'train');
  el.tabataDisplayPanel.classList.toggle('is-rest', !!phase && phase.type === 'rest');
  el.tabataStartBtn.disabled = !!phase;
  el.tabataStartBtn.textContent = phase ? '実行中' : idle ? 'スタート' : 'もう一度';

  if (phase) {
    updateTabataTimerDisplay();
  } else {
    el.tabataTimer.textContent = idle ? String(TABATA_TRAIN_SEC) : '0';
  }
}

function advanceTabataPhase() {
  // 直前のフェーズがちょうど0秒に達した瞬間なので、長めのビープを鳴らす。
  playTabataBeep({ frequency: 988, durationMs: 450 });
  tabataIndex += 1;
  if (tabataIndex >= TABATA_PHASES.length) {
    tabataRunning = false;
    renderTabataUI();
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    return;
  }
  tabataPhaseStartEpoch = Date.now();
  tabataLastBeepedSecond = null;
  renderTabataUI();
  if ('vibrate' in navigator) {
    navigator.vibrate(TABATA_PHASES[tabataIndex].type === 'train' ? [300] : [150, 100, 150]);
  }
}

function startTabata() {
  if (tabataRunning) return;
  tabataIndex = 0;
  tabataRunning = true;
  tabataPhaseStartEpoch = Date.now();
  tabataLastBeepedSecond = null;
  ensureTabataAudioCtx(); // ユーザー操作(クリック)の中で作成/再開しておく
  renderTabataUI();
  if ('vibrate' in navigator) navigator.vibrate([300]);
}

function resetTabata() {
  tabataIndex = -1;
  tabataRunning = false;
  renderTabataUI();
}

// 全セット終了後、脈拍を測るための15秒タイマー。タバタ本体とは独立して
// 動く(セットが進行中でも押せる)。ボタンを押した瞬間にだけ動き始め、
// 15秒経つと自動で止まる。
const PULSE_TIMER_SEC = 15;
let pulseTimerRunning = false;
let pulseTimerStartEpoch = 0;

function updatePulseTimerDisplay() {
  if (!pulseTimerRunning) {
    el.pulseTimerValue.textContent = String(PULSE_TIMER_SEC);
    return;
  }
  const elapsedMs = Date.now() - pulseTimerStartEpoch;
  const remainingSec = Math.max(0, PULSE_TIMER_SEC - Math.floor(elapsedMs / 1000));
  el.pulseTimerValue.textContent = String(remainingSec);
  if (remainingSec <= 0) {
    pulseTimerRunning = false;
    el.pulseTimerStartBtn.disabled = false;
    el.pulseTimerStartBtn.textContent = 'スタート';
    if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);
  }
}

function startPulseTimer() {
  if (pulseTimerRunning) return;
  pulseTimerRunning = true;
  pulseTimerStartEpoch = Date.now();
  el.pulseTimerStartBtn.disabled = true;
  el.pulseTimerStartBtn.textContent = '計測中';
  updatePulseTimerDisplay();
  if ('vibrate' in navigator) navigator.vibrate([200]);
}

function tickTabata() {
  if (tabataRunning && tabataIndex >= 0 && tabataIndex < TABATA_PHASES.length) {
    const phase = TABATA_PHASES[tabataIndex];
    if (Date.now() - tabataPhaseStartEpoch >= phase.duration * 1000) {
      advanceTabataPhase();
    } else {
      updateTabataTimerDisplay();
    }
  }
  if (pulseTimerRunning) updatePulseTimerDisplay();
  requestAnimationFrame(tickTabata);
}

el.tabataStartBtn.addEventListener('click', startTabata);
el.tabataResetBtn.addEventListener('click', resetTabata);
el.pulseTimerStartBtn.addEventListener('click', startPulseTimer);

renderTabataUI();
requestAnimationFrame(tickTabata);

// Runs immediately (the script tag sits at the end of <body>, so the DOM is
// already parsed) rather than waiting for window "load", so the "全て
// Excel保存" button gets moved into place before first paint instead of
// briefly flashing at its original spot in the markup.
createStopwatch();
requestAnimationFrame(tickAll);

/* ---------- 点呼(ロールコール) ---------- */
// 名簿は端末のlocalStorageに保存する(録音のような大きなバイナリではなく
// 単純なJSONなので、IndexedDBではなくlocalStorageで十分)。
const ROLLCALL_STORAGE_KEY = 'stopwatch_rollcall_members_v1';
const ROLLCALL_GRADES = [4, 3, 2, 1];

// 初期名簿(写真の名簿から読み取ったもの)。学年ごとに元の並び順のまま。
// ※写真の文字が読み取りにくい箇所があるため、間違いがあれば「📋 名簿を
// 編集」から修正してください。
const ROLLCALL_INITIAL_MEMBERS = [
  { name: '阪井 漠人', grade: 4 },
  { name: '倉井 健文', grade: 4 },
  { name: '中村 海斗', grade: 4 },
  { name: '花本 史龍', grade: 4 },
  { name: '淀川 緑史', grade: 4 },
  { name: '平柳 芽祐', grade: 4 },
  { name: '村上 直斗', grade: 4 },
  { name: '安島 莉玖', grade: 4 },

  { name: '舘田 翔太', grade: 3 },
  { name: '蛯名 真登', grade: 3 },
  { name: '遠藤 大成', grade: 3 },
  { name: '小川原 陽斗', grade: 3 },
  { name: '折田 壮太', grade: 3 },
  { name: '佐々木 大輝', grade: 3 },
  { name: '佐野 愛斗', grade: 3 },
  { name: '樋本 天翔', grade: 3 },
  { name: '福富 翔', grade: 3 },
  { name: '船越 碧', grade: 3 },
  { name: '松田 煌希', grade: 3 },
  { name: '若林 朔弥', grade: 3 },
  { name: '石川 浩輝', grade: 3 },

  { name: '下野 拳斗', grade: 2 },
  { name: '大島 福', grade: 2 },
  { name: '河邑 亮汰', grade: 2 },
  { name: '坂本 康太', grade: 2 },
  { name: '福嶋 一凛', grade: 2 },
  { name: '田中 智晴', grade: 2 },
  { name: '樋口 慶馬', grade: 2 },
  { name: '日向 蒼空', grade: 2 },
  { name: '本吉 慶心', grade: 2 },
  { name: '前川 翔悟', grade: 2 },
  { name: '松田 祐真', grade: 2 },
  { name: '紀田 菜緒', grade: 2 },

  { name: '古川 陽樹', grade: 1 },
  { name: '藤岡 幸太郎', grade: 1 },
  { name: '新見 蒼唯', grade: 1 },
  { name: '大数 遥斗', grade: 1 },
  { name: '寺内 輔', grade: 1 },
  { name: '谷口 修哉', grade: 1 },
  { name: '栗林 凛太朗', grade: 1 },
  { name: '大竹 実玖', grade: 1 },
  { name: '斎藤 晴樹', grade: 1 },
  { name: '前田 蒼空', grade: 1 },
  { name: '横嶋 諒大', grade: 1 },
  { name: '苗田 和佳', grade: 1 },
  { name: '沖野 絵梨', grade: 1 },
];

function makeRollcallId() {
  return `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadRollcallMembers() {
  try {
    const raw = localStorage.getItem(ROLLCALL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    /* 壊れた保存データは無視して初期名簿にフォールバックする */
  }
  return ROLLCALL_INITIAL_MEMBERS.map((m, i) => ({
    id: makeRollcallId(),
    name: m.name,
    grade: m.grade,
    isTemp: false,
    tags: [],
    checked: false,
    checkedSeq: 0,
    sortIndex: i,
  }));
}

let rollcallMembers = loadRollcallMembers();
let rollcallNextCheckedSeq = 1 + rollcallMembers.reduce((max, m) => Math.max(max, m.checkedSeq || 0), 0);
let rollcallNextSortIndex = 1 + rollcallMembers.reduce((max, m) => Math.max(max, m.sortIndex || 0), -1);

function saveRollcallMembers() {
  try {
    localStorage.setItem(ROLLCALL_STORAGE_KEY, JSON.stringify(rollcallMembers));
  } catch (e) {
    /* localStorage unavailable (private browsing等) — 保存だけ諦める */
  }
}

/* ----- タグの管理(マスターリスト、Notion「点呼タグ管理」DB) -----
   タグは自由入力ではなく、ここで登録したタグの中から選手ごとにチェック
   ボックスで選ぶ方式。各タグは { id, name, showBadge } の形で持ち、
   showBadgeがtrueのタグだけ点呼タブ本体の名前ボタンに小さな略称バッジ
   として表示される(全部のタグを表示すると、タグの有無でボタンの高さが
   バラバラになって使いにくいため)。タグ一覧・showBadge設定はNotionの
   専用DBに保存され全端末で共有される(Xserverは使わない)。選手・一時的な
   参加者ごとのタグの割り当ては、部員DB・一時参加者DBの各ページの
   「点呼タグ」列に保存され、それぞれの取得処理(loadAthleteRosterFromNotion
   等)で一緒に読み込まれる。 */
let rollcallTags = [];

const ROLLCALL_TAGS_API_URL = '/api/rollcall-tags';
const ROLLCALL_TAGS_ASSIGN_API_URL = '/api/rollcall-tags/assign';

async function loadRollcallTagsFromNotion() {
  try {
    const res = await fetch(ROLLCALL_TAGS_API_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const body = await res.json();
    if (Array.isArray(body.tags)) rollcallTags = body.tags;
  } catch {
    // オフライン、またはサーバー未応答 — この端末に既にあるタグ一覧のまま使う。
  }
}

async function createRollcallTagOnServer(name) {
  try {
    const res = await fetch(ROLLCALL_TAGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `サーバーエラー(${res.status})` };
    return { ok: true, tag: body.tag };
  } catch {
    return { ok: false, error: 'サーバーに接続できませんでした(オフライン等)' };
  }
}

async function updateRollcallTagBadgeOnServer(id, showBadge) {
  try {
    const res = await fetch(ROLLCALL_TAGS_API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, showBadge }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `サーバーエラー(${res.status})` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'サーバーに接続できませんでした(オフライン等)' };
  }
}

async function deleteRollcallTagOnServer(id) {
  try {
    const res = await fetch(`${ROLLCALL_TAGS_API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `サーバーエラー(${res.status})` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'サーバーに接続できませんでした(オフライン等)' };
  }
}

// 選手・一時的な参加者どちらのページIDでも渡せる(サーバー側が判別する)。
async function assignPersonTagsOnServer(pageId, tags) {
  try {
    const res = await fetch(ROLLCALL_TAGS_ASSIGN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, tags }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `サーバーエラー(${res.status})` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'サーバーに接続できませんでした(オフライン等)' };
  }
}

/* ----- 部員DB(Notion)からの選手名簿の自動反映 -----
   氏名・学年は手入力(写真からの転記)だと部員DBとズレることがあったため、
   部員DBの「区分」が選手になっている人を毎回自動取得して名簿に反映する。
   氏名・学年はここが唯一の情報源になるため、点呼アプリ内からは編集でき
   ない(「名簿を編集」タブでは読み取り専用)。部員DBのページIDをそのまま
   member.id として使うことで、端末をまたいでも同一人物として扱える。
   id が一致する(または、まだ移行前で id が無い場合は氏名が一致する)
   既存メンバーからはタグ・点呼済み状態・並び順を引き継ぎ、部員DBに
   無くなった人(退部・区分変更等)は名簿から外れる。一時的な参加者
   (isTemp)はこの処理では一切触らない。取得に失敗した場合は、この端末に
   既にある名簿のまま使う。 */
const ROLLCALL_ATHLETES_API_URL = '/api/rollcall-roster';

function applyNotionAthleteRoster(athletes) {
  if (!Array.isArray(athletes)) return;
  const valid = athletes.filter(
    (a) => a && typeof a.id === 'string' && typeof a.name === 'string' && a.name.trim() && ROLLCALL_GRADES.includes(a.grade)
  );
  if (valid.length === 0) return;

  const tempMembers = rollcallMembers.filter((m) => m.isTemp);
  const existingAthletes = rollcallMembers.filter((m) => !m.isTemp);
  const byId = new Map(existingAthletes.map((m) => [m.id, m]));
  const byName = new Map(existingAthletes.map((m) => [m.name, m]));

  // 部員DB側のクエリを作成日時の昇順で固定しているため、取得した配列の
  // 並び順そのものが「追加した順」として安定している。sortIndexは毎回
  // この並び順で上書きする(以前の(不安定だった頃の)値を引きずらない)。
  const athleteMembers = valid.map((a, index) => {
    const existing = byId.get(a.id) || byName.get(a.name);
    const tags = Array.isArray(a.tags) ? a.tags : [];
    if (existing) return { ...existing, id: a.id, name: a.name, grade: a.grade, isTemp: false, tags, sortIndex: index };
    return {
      id: a.id,
      name: a.name,
      grade: a.grade,
      isTemp: false,
      tags,
      checked: false,
      checkedSeq: 0,
      sortIndex: index,
    };
  });

  rollcallMembers = [...athleteMembers, ...tempMembers];
  rollcallNextCheckedSeq = 1 + rollcallMembers.reduce((max, m) => Math.max(max, m.checkedSeq || 0), 0);
  rollcallNextSortIndex = 1 + rollcallMembers.reduce((max, m) => Math.max(max, m.sortIndex || 0), -1);
  saveRollcallMembers();
}

async function loadAthleteRosterFromNotion() {
  try {
    const res = await fetch(ROLLCALL_ATHLETES_API_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const body = await res.json();
    applyNotionAthleteRoster(body.athletes);
  } catch {
    // オフライン、またはサーバー未応答 — この端末に既にある名簿のまま使う。
  }
}

/* ----- 一時的な参加者(その他)DB(Notion)-----
   単発で来る一時的な参加者は、部員DBとは別の専用Notion DBで管理する。
   氏名は選手と違って点呼アプリの「名簿を編集」タブから直接、追加・
   氏名変更・削除ができる(削除はNotion側ではアーカイブ扱いになる)。
   一覧上は grade を問わず常に「4年」欄の下に「その他」として表示する。 */
const ROLLCALL_TEMP_PARTICIPANTS_API_URL = '/api/temp-participants';

function applyTempParticipantsRoster(participants) {
  if (!Array.isArray(participants)) return;
  const valid = participants.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim());

  const athleteMembers = rollcallMembers.filter((m) => !m.isTemp);
  const existingTemp = rollcallMembers.filter((m) => m.isTemp);
  const byId = new Map(existingTemp.map((m) => [m.id, m]));

  // 一時参加者DB側のクエリも作成日時の昇順で固定しているため、
  // sortIndexは毎回この並び順で上書きする(理由はathleteMembersと同じ)。
  const tempMembers = valid.map((p, index) => {
    const existing = byId.get(p.id);
    const tags = Array.isArray(p.tags) ? p.tags : [];
    if (existing) return { ...existing, name: p.name, tags, sortIndex: index };
    return {
      id: p.id,
      name: p.name,
      grade: null,
      isTemp: true,
      tags,
      checked: false,
      checkedSeq: 0,
      sortIndex: index,
    };
  });

  rollcallMembers = [...athleteMembers, ...tempMembers];
  rollcallNextCheckedSeq = 1 + rollcallMembers.reduce((max, m) => Math.max(max, m.checkedSeq || 0), 0);
  rollcallNextSortIndex = 1 + rollcallMembers.reduce((max, m) => Math.max(max, m.sortIndex || 0), -1);
  saveRollcallMembers();
}

async function loadTempParticipantsFromNotion() {
  try {
    const res = await fetch(ROLLCALL_TEMP_PARTICIPANTS_API_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const body = await res.json();
    applyTempParticipantsRoster(body.participants);
  } catch {
    // オフライン、またはサーバー未応答 — この端末に既にある名簿のまま使う。
  }
}

// 一時的な参加者の追加・氏名変更・削除は、一時参加者DB専用のAPIを直接
// 呼び出す(部員DBのようにNotion側で更新してもらう運用ではなく、この
// アプリから完結させたいため)。合言葉は不要。
// エラー時、原因の切り分け(サーバー未設定・Notion側の問題・通信断など)
// ができるよう、サーバーが返したエラーメッセージをそのまま呼び出し側に
// 返す(「通信エラーです」の一言で握りつぶさない)。
async function createTempParticipantOnServer(name) {
  try {
    const res = await fetch(ROLLCALL_TEMP_PARTICIPANTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `サーバーエラー(${res.status})` };
    return { ok: true, participant: body.participant };
  } catch {
    return { ok: false, error: 'サーバーに接続できませんでした(オフライン等)' };
  }
}

async function renameTempParticipantOnServer(id, name) {
  try {
    const res = await fetch(ROLLCALL_TEMP_PARTICIPANTS_API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `サーバーエラー(${res.status})` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'サーバーに接続できませんでした(オフライン等)' };
  }
}

async function deleteTempParticipantOnServer(id) {
  try {
    const res = await fetch(`${ROLLCALL_TEMP_PARTICIPANTS_API_URL}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `サーバーエラー(${res.status})` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'サーバーに接続できませんでした(オフライン等)' };
  }
}

async function addRollcallTag(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (rollcallTags.some((t) => t.name === trimmed)) {
    alert('そのタグは既に登録されています。');
    return false;
  }
  const result = await createRollcallTagOnServer(trimmed);
  if (!result.ok) {
    alert(`タグの追加に失敗しました: ${result.error}`);
    return false;
  }
  rollcallTags.push(result.tag);
  return true;
}

async function deleteRollcallTag(name) {
  if (!confirm(`タグ「${name}」を削除しますか?(このタグが付いている全員からも外れます)`)) return;
  const tag = rollcallTags.find((t) => t.name === name);
  if (!tag) return;
  const result = await deleteRollcallTagOnServer(tag.id);
  if (!result.ok) {
    alert(`タグの削除に失敗しました: ${result.error}`);
    return;
  }
  rollcallTags = rollcallTags.filter((t) => t.name !== name);
  rollcallMembers.forEach((m) => {
    m.tags = m.tags.filter((t) => t !== name);
  });
  saveRollcallMembers();
  renderRollcallList();
  renderRollcallRegisterView();
}

async function setRollcallTagShowBadge(name, showBadge) {
  const tag = rollcallTags.find((t) => t.name === name);
  if (!tag) return;
  const result = await updateRollcallTagBadgeOnServer(tag.id, showBadge);
  if (!result.ok) {
    alert(`設定の更新に失敗しました: ${result.error}`);
    renderRollcallTagManageList(); // チェックボックスの見た目を元に戻す
    return;
  }
  tag.showBadge = showBadge;
  renderRollcallList();
}

function renderRollcallTagManageList() {
  el.rollcallTagManageList.innerHTML = '';
  if (rollcallTags.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'rollcall-tag-empty-hint';
    hint.textContent = 'タグがまだ登録されていません。';
    el.rollcallTagManageList.appendChild(hint);
    return;
  }
  rollcallTags.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'rollcall-tag-chip';
    const label = document.createElement('span');
    label.textContent = tag.name;
    chip.appendChild(label);

    const badgeToggle = document.createElement('label');
    badgeToggle.className = 'rollcall-tag-badge-toggle';
    const badgeCheckbox = document.createElement('input');
    badgeCheckbox.type = 'checkbox';
    badgeCheckbox.checked = tag.showBadge;
    badgeCheckbox.addEventListener('change', () => setRollcallTagShowBadge(tag.name, badgeCheckbox.checked));
    badgeToggle.appendChild(badgeCheckbox);
    badgeToggle.appendChild(document.createTextNode('ボタンに表示'));
    chip.appendChild(badgeToggle);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'rollcall-tag-chip-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = `「${tag.name}」を削除`;
    deleteBtn.addEventListener('click', () => deleteRollcallTag(tag.name));
    chip.appendChild(deleteBtn);

    el.rollcallTagManageList.appendChild(chip);
  });
}

// 登録済みタグをチェックボックスとして container に描画する。選手の追加
// フォーム・各選手の編集フォームの両方で使う共通処理。
function renderTagCheckboxes(container, selectedTags) {
  container.innerHTML = '';
  if (rollcallTags.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'rollcall-tag-empty-hint';
    hint.textContent = '上の「タグを管理」で先にタグを登録してください。';
    container.appendChild(hint);
    return;
  }
  rollcallTags.forEach((tag) => {
    const label = document.createElement('label');
    label.className = 'rollcall-tag-checkbox';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag.name;
    checkbox.checked = selectedTags.includes(tag.name);
    label.appendChild(checkbox);
    const span = document.createElement('span');
    span.textContent = tag.name;
    label.appendChild(span);
    container.appendChild(label);
  });
}

function readCheckedTags(container) {
  return Array.from(container.querySelectorAll('input:checked')).map((cb) => cb.value);
}

el.rollcallNewTagBtn.addEventListener('click', async () => {
  const added = await addRollcallTag(el.rollcallNewTagName.value);
  if (!added) return;
  el.rollcallNewTagName.value = '';
  renderRollcallTagManageList();
  renderTagCheckboxes(el.rollcallAddTagCheckboxes, []);
  renderRollcallList();
});

// タグ絞り込み用<select>の選択肢を、登録済みタグ一覧(rollcallTags)から
// 作り直す。点呼タブ本体の絞り込みと、名簿編集モーダルの絞り込みの両方で
// 使う共通処理。
function renderTagFilterOptions(selectEl) {
  const currentValue = selectEl.value;
  selectEl.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'すべて表示';
  selectEl.appendChild(allOption);
  rollcallTags.forEach((tag) => {
    const opt = document.createElement('option');
    opt.value = tag.name;
    opt.textContent = tag.name;
    selectEl.appendChild(opt);
  });
  // 選んでいたタグがまだ存在するなら維持する(無くなっていたら「すべて」に戻る)。
  selectEl.value = rollcallTags.some((t) => t.name === currentValue) ? currentValue : '';
}

/* ----- 点呼タブ本体: 学年ごとに縦並び、押すと一番下にスライドする ----- */
function renderRollcallProgress(visibleMembers) {
  const total = visibleMembers.length;
  const checkedCount = visibleMembers.filter((m) => m.checked).length;
  el.rollcallProgress.textContent = `点呼 ${checkedCount} / ${total}`;
}

// 名前ボタンの高さを揃えるため、タグは全部ではなく「ボタンに表示」を
// ONにしたものだけを、1〜2文字に短くまとめて表示する。
// バッジ表示用の枠は常に2段固定(中身が0〜1個でも2段ぶんの高さを確保する
// ことで、ボタンの高さが誰であっても揃うようにする)。3個以上ONのタグに
// 一致する場合も、2段に収まる分(先頭2つ)だけ表示する。
const ROLLCALL_BADGE_LINES = 2;

function rollcallBadgeLabelsForMember(member) {
  return rollcallTags
    .filter((tag) => tag.showBadge && member.tags.includes(tag.name))
    .map((tag) => tag.name.slice(0, 2))
    .slice(0, ROLLCALL_BADGE_LINES);
}

// 点呼ボタンには「姓 名」のフルネームではなく、スペースより前の苗字だけを表示する
// (ボタンを詰めて並べるため)。名簿編集画面ではフルネームのまま表示・編集する。
function rollcallFamilyName(fullName) {
  return fullName.split(/[ 　]+/)[0];
}

function buildRollcallMemberButton(member) {
  const node = el.rollcallMemberTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = member.id;
  node.classList.toggle('is-checked', member.checked);
  node.title = member.name;
  node.querySelector('.rollcall-member-name').textContent = rollcallFamilyName(member.name);
  const labels = rollcallBadgeLabelsForMember(member);
  node.querySelectorAll('.rollcall-member-tag-line').forEach((lineEl, i) => {
    // 空の段も見えない文字(nbsp)で埋めて、常に2段ぶんの高さを保つ。
    lineEl.textContent = labels[i] || ' ';
  });
  node.addEventListener('click', () => toggleRollcallChecked(member.id));
  return node;
}

// 学年の欄(見出し+一覧)を1つ作って親要素に追加する。isSub は「その他
// (一時的な参加者)」のように、同じ列の中で別の学年欄の下に続けて表示する
// 小見出しかどうか。
function appendRollcallGroup(container, label, members, isSub) {
  // 未点呼(checked=false)は、学年欄・その他(一時的な参加者)どちらも
  // sortIndex(部員DBの並び)昇順のまま上から並べる。50音順(近似)は
  // 表示が不自然だったため廃止した。点呼済みは押した順に下に積み
  // 上がっていく(直近に押した人ほど一番下)。
  const unchecked = members
    .filter((m) => !m.checked)
    .sort((a, b) => a.sortIndex - b.sortIndex);
  const checked = members
    .filter((m) => m.checked)
    .sort((a, b) => a.checkedSeq - b.checkedSeq);

  const heading = document.createElement('div');
  heading.className = 'rollcall-grade-heading' + (isSub ? ' rollcall-grade-heading-sub' : '');
  heading.textContent = `${label}(${members.length - checked.length} / ${members.length})`;
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'rollcall-grade-members';
  [...unchecked, ...checked].forEach((member) => list.appendChild(buildRollcallMemberButton(member)));
  container.appendChild(list);
}

// タグで絞り込んでいる間は、その絞り込み内の人数だけを対象に一覧・進捗を
// 表示する(絞り込みを外せば全員が対象に戻る)。
function renderRollcallList() {
  renderTagFilterOptions(el.rollcallMainTagFilter);
  const filterTag = el.rollcallMainTagFilter.value;
  const visibleMembers = rollcallMembers.filter((m) => !filterTag || m.tags.includes(filterTag));

  el.rollcallList.innerHTML = '';
  ROLLCALL_GRADES.forEach((grade) => {
    const members = visibleMembers.filter((m) => !m.isTemp && m.grade === grade);
    // 一時的な参加者(その他)は4年の欄の下に続けて表示する。
    const tempMembers = grade === 4 ? visibleMembers.filter((m) => m.isTemp) : [];
    if (members.length === 0 && tempMembers.length === 0) return;

    const section = document.createElement('div');
    section.className = 'rollcall-grade-section';
    if (members.length > 0) appendRollcallGroup(section, `${grade}年`, members, false);
    if (tempMembers.length > 0) appendRollcallGroup(section, 'その他', tempMembers, true);
    el.rollcallList.appendChild(section);
  });
  renderRollcallProgress(visibleMembers);
}

el.rollcallMainTagFilter.addEventListener('change', renderRollcallList);

// タップ時の「一番下にスライド」感を出すため、再描画の前後で各行の位置を
// 記録し(FLIPテクニック)、移動した分だけ逆方向にずらしておいてから
// transitionで元の位置(=新しい位置)へ戻すことで、実際に滑るように見せる。
function animateRollcallReorder(renderFn) {
  const firstRects = new Map();
  el.rollcallList.querySelectorAll('.rollcall-member').forEach((item) => {
    firstRects.set(item.dataset.id, item.getBoundingClientRect());
  });

  renderFn();

  el.rollcallList.querySelectorAll('.rollcall-member').forEach((item) => {
    const first = firstRects.get(item.dataset.id);
    if (!first) return;
    const last = item.getBoundingClientRect();
    const deltaY = first.top - last.top;
    if (Math.abs(deltaY) < 1) return;
    item.style.transition = 'none';
    item.style.transform = `translateY(${deltaY}px)`;
    requestAnimationFrame(() => {
      item.style.transition = 'transform 280ms ease';
      item.style.transform = '';
    });
  });
}

// タップで点呼済み↔未点呼をトグルする(誤タップの取り消しもできるように)。
// 点呼済みにする時だけ checkedSeq を採番し直すので、何度もON/OFFしても
// 最後にONにした瞬間の順番が保たれる(常に一番下に来る)。
function toggleRollcallChecked(id) {
  const member = rollcallMembers.find((m) => m.id === id);
  if (!member) return;
  member.checked = !member.checked;
  member.checkedSeq = member.checked ? rollcallNextCheckedSeq++ : 0;
  saveRollcallMembers();
  animateRollcallReorder(renderRollcallList);
}

function resetRollcallChecks() {
  if (!confirm('点呼の状態をリセットして、全員未点呼に戻しますか?')) return;
  rollcallMembers.forEach((m) => {
    m.checked = false;
    m.checkedSeq = 0;
  });
  saveRollcallMembers();
  animateRollcallReorder(renderRollcallList);
}

el.rollcallResetBtn.addEventListener('click', resetRollcallChecks);

/* ----- 名簿の登録・編集モーダル ----- */
function setRollcallRegisterModalOpen(open) {
  el.rollcallRegisterModal.hidden = !open;
  if (open) {
    renderRollcallTagManageList();
    renderTagCheckboxes(el.rollcallAddTagCheckboxes, []);
    renderRollcallRegisterView();
    // 開くたびに最新のタグ一覧・部員DBの選手名簿・一時参加者名簿を
    // 読み直す(他の端末での編集や、各DB側の変更を拾う)。
    loadRollcallTagsFromNotion()
      .then(loadAthleteRosterFromNotion)
      .then(loadTempParticipantsFromNotion)
      .then(() => {
        renderRollcallTagManageList();
        renderTagCheckboxes(el.rollcallAddTagCheckboxes, []);
        renderRollcallRegisterView();
        renderRollcallList();
      });
  }
}
el.rollcallRegisterToggle.addEventListener('click', () => setRollcallRegisterModalOpen(true));
el.rollcallRegisterCloseBtn.addEventListener('click', () => setRollcallRegisterModalOpen(false));

// 選手(部員DB由来)は氏名・学年を点呼アプリ側から編集できない
// (部員DBが唯一の情報源のため)。氏名編集・削除もできない(部員DBの区分が
// 変われば次回取得時に自動で名簿から外れる)。一時的な参加者(isTemp)だけ、
// 氏名の変更・削除もできる。タグは選手・一時的な参加者どちらも、
// 「編集」のような開閉操作を挟まず常に表示されたチェックボックスで選べ、
// 変更した瞬間にサーバー(Notion)へ自動保存される。
function buildRollcallRegisterRow(member) {
  const node = el.rollcallRegisterRowTemplate.content.firstElementChild.cloneNode(true);
  const nameEditRow = node.querySelector('.rollcall-edit-name-row');
  const deleteBtn = node.querySelector('.rollcall-delete-btn');
  const renameBtn = node.querySelector('.rollcall-rename-btn');
  const tagCheckboxesEl = node.querySelector('.rollcall-row-tag-checkboxes');

  node.querySelector('.rollcall-register-row-name').textContent = member.name;
  node.querySelector('.rollcall-register-row-grade').textContent = member.isTemp ? 'その他' : `${member.grade}年`;

  renderTagCheckboxes(tagCheckboxesEl, member.tags);
  tagCheckboxesEl.addEventListener('change', async (e) => {
    const checkbox = e.target;
    if (!(checkbox instanceof HTMLInputElement)) return;
    checkbox.disabled = true;
    const newTags = readCheckedTags(tagCheckboxesEl);
    const result = await assignPersonTagsOnServer(member.id, newTags);
    checkbox.disabled = false;
    if (!result.ok) {
      alert(`タグの更新に失敗しました: ${result.error}`);
      checkbox.checked = !checkbox.checked; // 反映できなかったのでチェックを元に戻す
      return;
    }
    member.tags = newTags;
    saveRollcallMembers();
    renderRollcallList();
  });

  if (!member.isTemp) {
    renameBtn.hidden = true;
    deleteBtn.hidden = true;
    const note = document.createElement('div');
    note.className = 'rollcall-register-row-note';
    note.textContent = '氏名・学年は部員DB(Notion)で管理されています';
    node.querySelector('.rollcall-register-row-info').appendChild(note);
    return node;
  }

  renameBtn.addEventListener('click', () => {
    node.querySelector('.rollcall-edit-name').value = member.name;
    nameEditRow.hidden = false;
  });
  node.querySelector('.rollcall-cancel-name-btn').addEventListener('click', () => {
    nameEditRow.hidden = true;
  });
  node.querySelector('.rollcall-save-name-btn').addEventListener('click', async () => {
    const newName = node.querySelector('.rollcall-edit-name').value.trim();
    if (!newName) {
      alert('氏名を入力してください。');
      return;
    }
    if (newName === member.name) {
      nameEditRow.hidden = true;
      return;
    }
    const saveBtn = node.querySelector('.rollcall-save-name-btn');
    saveBtn.disabled = true;
    const result = await renameTempParticipantOnServer(member.id, newName);
    saveBtn.disabled = false;
    if (!result.ok) {
      alert(`氏名の更新に失敗しました: ${result.error}`);
      return;
    }
    member.name = newName;
    saveRollcallMembers();
    renderRollcallRegisterView();
    renderRollcallList();
  });
  deleteBtn.addEventListener('click', async () => {
    if (!confirm(`「${member.name}」を名簿から削除しますか?`)) return;
    const result = await deleteTempParticipantOnServer(member.id);
    if (!result.ok) {
      alert(`削除に失敗しました: ${result.error}`);
      return;
    }
    rollcallMembers = rollcallMembers.filter((m) => m.id !== member.id);
    saveRollcallMembers();
    renderRollcallRegisterView();
    renderRollcallList();
  });

  return node;
}

// 「その他(一時的な参加者)」が4年のすぐ下に来るよう、実際の学年(4〜1)の
// 次に位置する仮想の並び順キーを割り当てる。
// 4年→3年→2年→1年の順に並べ、一時的な参加者(その他)は学年の数値より
// 小さい値にしておくことで、必ず1年の後(一番最後)に来るようにする。
function registerSortKey(member) {
  return member.isTemp ? 0 : member.grade;
}

function renderRollcallRegisterView() {
  const members = rollcallMembers
    .slice()
    .sort((a, b) => (registerSortKey(b) - registerSortKey(a)) || (a.sortIndex - b.sortIndex));

  el.rollcallRegisterList.innerHTML = '';
  members.forEach((member) => el.rollcallRegisterList.appendChild(buildRollcallRegisterRow(member)));
}

el.rollcallAddBtn.addEventListener('click', async () => {
  const name = el.rollcallAddName.value.trim();
  if (!name) {
    alert('氏名を入力してください。');
    return;
  }
  el.rollcallAddBtn.disabled = true;
  const result = await createTempParticipantOnServer(name);
  if (!result.ok) {
    el.rollcallAddBtn.disabled = false;
    alert(`追加に失敗しました: ${result.error}`);
    return;
  }
  const { participant } = result;
  const initialTags = readCheckedTags(el.rollcallAddTagCheckboxes);
  if (initialTags.length > 0) {
    const tagResult = await assignPersonTagsOnServer(participant.id, initialTags);
    if (!tagResult.ok) {
      alert(`タグの設定に失敗しました(氏名は追加済みです): ${tagResult.error}`);
    }
  }
  el.rollcallAddBtn.disabled = false;
  rollcallMembers.push({
    id: participant.id,
    name: participant.name,
    grade: null,
    isTemp: true,
    tags: initialTags,
    checked: false,
    checkedSeq: 0,
    sortIndex: rollcallNextSortIndex++,
  });
  saveRollcallMembers();
  el.rollcallAddName.value = '';
  renderTagCheckboxes(el.rollcallAddTagCheckboxes, []);
  renderRollcallRegisterView();
  renderRollcallList();
});

renderRollcallList();
loadRollcallTagsFromNotion()
  .then(loadAthleteRosterFromNotion)
  .then(loadTempParticipantsFromNotion)
  .then(() => {
    renderRollcallList();
  });
