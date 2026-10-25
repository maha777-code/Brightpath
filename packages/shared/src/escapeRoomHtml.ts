import type { EscapeRoomDocument } from './gamifiedActivityTool.js';

function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

export function escapeRoomToPlayableHtml(document: EscapeRoomDocument): string {
  const playable = document.playable;
  const payload = {
    title: document.title,
    theme: document.theme,
    subject: document.subject,
    grade: document.gradeLabel,
    story: document.storyIntro,
    rules: document.gameRules,
    clues: document.stages.map((stage) => stage.hiddenClues),
    playable,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${document.title.replace(/</g, '')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(1200px 600px at 10% -10%, rgba(34,211,238,.18), transparent 50%),
        radial-gradient(900px 500px at 110% 10%, rgba(16,185,129,.16), transparent 45%),
        #020617;
      color: #e2e8f0;
      font-family: ui-sans-serif, system-ui, Segoe UI, Helvetica, Arial, sans-serif;
    }
    .panel { background: rgba(2, 6, 23, .78); border: 1px solid rgba(34,211,238,.25); }
    .shake { animation: shake .45s ease-in-out; }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-6px); }
      80% { transform: translateX(6px); }
    }
    .flash-ok { box-shadow: 0 0 0 2px rgba(16,185,129,.7), 0 0 40px rgba(16,185,129,.25); }
    .hidden-screen { display: none !important; }
    .seq-card, .seq-slot { min-height: 4.5rem; }
  </style>
</head>
<body>
  <div id="app" class="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6"></div>
  <script type="application/json" id="game-data">${embedJson(payload)}</script>
  <script>
(function () {
  const GAME = JSON.parse(document.getElementById('game-data').textContent);
  const P = GAME.playable;
  const app = document.getElementById('app');
  const LETTERS = ['A', 'B', 'C', 'D'];
  let screen = 'start';
  let remaining = Math.round((P.timerMinutes || 30) * 60);
  let startedAt = 0;
  let timerId = null;
  let seqOrder = [];
  let masteryPick = '';
  let toast = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function clock(sec) {
    const safe = Math.max(0, sec);
    return pad(Math.floor(safe / 60)) + ':' + pad(safe % 60);
  }
  function elapsed() {
    return clock(Math.round((P.timerMinutes || 30) * 60) - remaining);
  }
  function shuffle(list) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = next[i]; next[i] = next[j]; next[j] = tmp;
    }
    return next;
  }
  function escapeText(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function showToast(ok, message) {
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = 'fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-bold shadow-xl ' +
      (ok ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { if (toast) toast.remove(); toast = null; }, 2200);
  }
  function hint(stage) {
    const clues = GAME.clues[stage - 1] || [];
    return clues[0] || 'Recheck the evidence from this unit.';
  }
  function fail(panel, stage, extra) {
    if (panel) {
      panel.classList.remove('shake');
      void panel.offsetWidth;
      panel.classList.add('shake');
    }
    showToast(false, extra || ('Access denied. ' + hint(stage)));
  }
  function succeed(panel, nextScreen, message) {
    if (panel) panel.classList.add('flash-ok');
    showToast(true, message);
    setTimeout(function () { screen = nextScreen; render(); }, 550);
  }

  function startTimer() {
    if (timerId) return;
    startedAt = Date.now();
    timerId = setInterval(function () {
      remaining -= 1;
      const node = document.getElementById('timer');
      if (node) node.textContent = clock(remaining);
      if (remaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        screen = 'timeout';
        render();
      }
    }, 1000);
  }

  function shell(inner, stageLabel) {
    return '<header class="mb-5 flex flex-wrap items-center justify-between gap-3">' +
      '<div><p class="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">' + escapeText(GAME.theme) + '</p>' +
      '<h1 class="text-xl font-extrabold text-white sm:text-2xl">' + escapeText(GAME.title) + '</h1>' +
      '<p class="text-sm text-slate-400">' + escapeText(GAME.subject) + (GAME.grade ? ' · ' + escapeText(GAME.grade) : '') + '</p></div>' +
      '<div class="rounded-xl border border-cyan-400/40 bg-slate-950/70 px-4 py-2 text-right">' +
      '<p class="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Mission clock</p>' +
      '<p id="timer" class="font-mono text-2xl font-black text-emerald-300">' + clock(remaining) + '</p></div></header>' +
      (stageLabel ? '<p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">' + stageLabel + '</p>' : '') +
      inner;
  }

  function startScreen() {
    return '<div class="panel mx-auto my-6 max-w-3xl rounded-3xl p-8">' +
      '<p class="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Digital escape room</p>' +
      '<h1 class="mt-2 text-3xl font-black text-white sm:text-4xl">' + escapeText(GAME.title) + '</h1>' +
      '<p class="mt-3 text-sm text-cyan-100/80">' + escapeText(GAME.subject) + (GAME.grade ? ' · ' + escapeText(GAME.grade) : '') + '</p>' +
      '<p class="mt-5 text-base leading-relaxed text-slate-200">' + escapeText(GAME.story) + '</p>' +
      '<ul class="mt-5 list-disc space-y-1 pl-5 text-sm text-slate-300">' +
      (GAME.rules || []).map(function (rule) { return '<li>' + escapeText(rule) + '</li>'; }).join('') +
      '</ul>' +
      '<p class="mt-6 text-sm text-amber-200">You have ' + escapeText(String(P.timerMinutes || 30)) + ' minutes once the mission starts. Four rooms. No skipping.</p>' +
      '<button id="start-btn" class="mt-6 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">Start Mission</button>' +
      '</div>';
  }

  function vocabScreen() {
    const terms = shuffle(P.vocabulary.pairs.map(function (pair) { return pair.term; }));
    const options = '<option value="">Select term</option>' + terms.map(function (term) {
      return '<option value="' + escapeText(term) + '">' + escapeText(term) + '</option>';
    }).join('');
    return shell(
      '<div id="stage-panel" class="panel rounded-3xl p-6">' +
      '<h2 class="text-2xl font-black text-white">Stage 1 · Vocabulary Match</h2>' +
      '<p class="mt-2 text-sm leading-relaxed text-slate-300">' + escapeText(P.vocabulary.prompt) + '</p>' +
      '<div class="mt-5 space-y-3">' +
      P.vocabulary.pairs.map(function (pair, index) {
        return '<label class="block rounded-2xl border border-white/10 bg-slate-950/60 p-4">' +
          '<span class="text-sm text-cyan-100">' + escapeText(pair.definition) + '</span>' +
          '<select data-vocab="' + index + '" class="mt-3 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white">' + options + '</select></label>';
      }).join('') +
      '</div>' +
      '<button id="unlock-1" class="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950">Submit lock code</button>' +
      '</div>',
      'Room 1 of 4'
    );
  }

  function sequenceScreen() {
    seqOrder = [];
    return shell(
      '<div id="stage-panel" class="panel rounded-3xl p-6">' +
      '<h2 class="text-2xl font-black text-white">Stage 2 · Sequence Puzzle</h2>' +
      '<p class="mt-2 text-sm leading-relaxed text-slate-300">' + escapeText(P.sequence.prompt) + '</p>' +
      '<p class="mt-3 text-xs font-bold uppercase tracking-widest text-amber-200">Tap a process, then tap a numbered slot. Order must be B-D-C-A.</p>' +
      '<div id="seq-pool" class="mt-5 grid gap-3 md:grid-cols-2">' +
      P.sequence.cards.map(function (card) {
        return '<button type="button" data-card="' + card.id + '" class="seq-card rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 text-left">' +
          '<span class="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-slate-950">' + card.id + '</span>' +
          '<span class="text-sm text-slate-100">' + escapeText(card.text) + '</span></button>';
      }).join('') +
      '</div>' +
      '<div id="seq-slots" class="mt-5 grid gap-3 md:grid-cols-4">' +
      [1,2,3,4].map(function (n) {
        return '<button type="button" data-slot="' + (n - 1) + '" class="seq-slot rounded-2xl border border-dashed border-white/20 bg-slate-950/40 p-4 text-left text-sm text-slate-400">Slot ' + n + '</button>';
      }).join('') +
      '</div>' +
      '<div class="mt-6 flex flex-wrap gap-3">' +
      '<button id="unlock-2" class="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950">Submit sequence</button>' +
      '<button id="reset-2" class="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Reset</button>' +
      '</div></div>',
      'Room 2 of 4'
    );
  }

  function dataScreen() {
    const table = P.data.table || { headers: [], rows: [] };
    return shell(
      '<div id="stage-panel" class="panel rounded-3xl p-6">' +
      '<h2 class="text-2xl font-black text-white">Stage 3 · Data Analysis</h2>' +
      '<p class="mt-2 text-sm leading-relaxed text-slate-300">' + escapeText(P.data.scenario) + '</p>' +
      '<div class="mt-5 overflow-x-auto rounded-2xl border border-white/10">' +
      '<table class="min-w-full text-left text-sm"><thead class="bg-slate-950/80 text-cyan-200"><tr>' +
      table.headers.map(function (h) { return '<th class="px-3 py-2 font-bold">' + escapeText(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      table.rows.map(function (row) {
        return '<tr class="border-t border-white/10">' + row.map(function (cell) {
          return '<td class="px-3 py-2 text-slate-100">' + escapeText(cell) + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div class="mt-5 grid gap-3 md:grid-cols-3">' +
      P.data.fields.map(function (field) {
        return '<label class="block rounded-2xl border border-white/10 bg-slate-950/60 p-4">' +
          '<span class="text-sm text-cyan-100">' + escapeText(field.label) + '</span>' +
          '<input data-data-field="' + field.id + '" inputmode="decimal" class="mt-3 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-white" /></label>';
      }).join('') +
      '</div>' +
      '<button id="unlock-3" class="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950">Submit combination</button>' +
      '</div>',
      'Room 3 of 4'
    );
  }

  function masteryScreen() {
    masteryPick = '';
    return shell(
      '<div id="stage-panel" class="panel rounded-3xl p-6">' +
      '<h2 class="text-2xl font-black text-white">Stage 4 · Mastery Challenge</h2>' +
      '<p class="mt-2 text-sm leading-relaxed text-slate-300">' + escapeText(P.mastery.prompt) + '</p>' +
      '<blockquote class="mt-4 rounded-2xl border border-rose-400/30 bg-rose-950/40 p-4 text-sm text-rose-100">' + escapeText(P.mastery.flawedClaim) + '</blockquote>' +
      '<div class="mt-5 grid gap-3">' +
      P.mastery.options.map(function (option) {
        return '<button type="button" data-mastery="' + escapeText(option.id) + '" class="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-left text-sm text-slate-100 hover:border-cyan-300/50">' +
          '<span class="font-black text-cyan-300">' + escapeText(option.id) + ' · </span>' + escapeText(option.text) + '</button>';
      }).join('') +
      '</div>' +
      '<button id="unlock-4" class="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950">Open the vault</button>' +
      '</div>',
      'Room 4 of 4'
    );
  }

  function victoryScreen() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    return '<div class="panel mx-auto my-8 max-w-3xl rounded-3xl p-8 text-center">' +
      '<p class="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">Vault unlocked</p>' +
      '<h1 class="mt-3 text-3xl font-black text-white sm:text-4xl">' + escapeText(P.missionName || GAME.title) + ' complete</h1>' +
      '<p class="mt-4 text-lg text-cyan-100">Mission complete in <span class="font-mono font-black text-emerald-300">' + elapsed() + '</span>.</p>' +
      '<p class="mt-3 text-sm leading-relaxed text-slate-300">' + escapeText(GAME.story) + '</p>' +
      '<p class="mt-6 text-sm text-amber-200">Keep a copy of this file for Google Sites or any browser. Teachers: the answer key stays on the generator page, not in the student game.</p>' +
      '<button id="replay" class="mt-6 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950">Play again</button>' +
      '</div>';
  }

  function timeoutScreen() {
    return '<div class="panel mx-auto my-8 max-w-3xl rounded-3xl p-8 text-center">' +
      '<p class="text-xs font-bold uppercase tracking-[0.25em] text-rose-300">Lockdown</p>' +
      '<h1 class="mt-3 text-3xl font-black text-white">Time expired</h1>' +
      '<p class="mt-4 text-sm text-slate-300">The mission clock hit zero. Reset and try the four rooms again.</p>' +
      '<button id="replay" class="mt-6 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950">Restart mission</button>' +
      '</div>';
  }

  function bindSequence() {
    const pool = document.getElementById('seq-pool');
    const slots = document.getElementById('seq-slots');
    let selected = '';
    function paint() {
      Array.from(pool.querySelectorAll('[data-card]')).forEach(function (btn) {
        const used = seqOrder.indexOf(btn.getAttribute('data-card')) !== -1;
        btn.classList.toggle('opacity-30', used);
        btn.disabled = used;
      });
      Array.from(slots.querySelectorAll('[data-slot]')).forEach(function (slot) {
        const index = Number(slot.getAttribute('data-slot'));
        const letter = seqOrder[index];
        const card = letter && P.sequence.cards.find(function (item) { return item.id === letter; });
        slot.innerHTML = card
          ? '<span class="font-black text-cyan-300">' + card.id + '</span> <span class="text-slate-100">' + escapeText(card.text) + '</span>'
          : 'Slot ' + (index + 1);
        slot.className = 'seq-slot rounded-2xl border p-4 text-left text-sm ' +
          (card ? 'border-emerald-400/40 bg-emerald-950/30 text-slate-100' : 'border-dashed border-white/20 bg-slate-950/40 text-slate-400');
      });
    }
    pool.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-card]');
      if (!btn || btn.disabled) return;
      selected = btn.getAttribute('data-card');
      const empty = seqOrder.findIndex(function (item) { return !item; });
      if (seqOrder.length < 4) seqOrder.push(selected);
      else if (empty !== -1) seqOrder[empty] = selected;
      selected = '';
      paint();
    });
    slots.addEventListener('click', function (event) {
      const slot = event.target.closest('[data-slot]');
      if (!slot) return;
      const index = Number(slot.getAttribute('data-slot'));
      seqOrder.splice(index, 1);
      paint();
    });
    document.getElementById('reset-2').addEventListener('click', function () { seqOrder = []; paint(); });
    paint();
  }

  function checkVocab() {
    const panel = document.getElementById('stage-panel');
    const selects = Array.from(document.querySelectorAll('[data-vocab]'));
    const ok = P.vocabulary.pairs.every(function (pair, index) {
      return (selects[index] && selects[index].value) === pair.term;
    });
    if (!ok) return fail(panel, 1, 'Vocabulary lock failed. Match every definition, then retry.');
    succeed(panel, 'stage2', 'Keyword accepted. Sequence room unlocked.');
  }

  function checkSequence() {
    const panel = document.getElementById('stage-panel');
    const expected = (P.sequence.correctOrder || ['B', 'D', 'C', 'A']).join('');
    if (seqOrder.join('') !== expected) return fail(panel, 2, 'Sequence error. Needed B-D-C-A. ' + hint(2));
    succeed(panel, 'stage3', 'Energy cycle restored. Data station unlocked.');
  }

  function checkData() {
    const panel = document.getElementById('stage-panel');
    const ok = P.data.fields.every(function (field) {
      const input = document.querySelector('[data-data-field="' + field.id + '"]');
      const given = String(input && input.value || '').trim();
      const want = String(field.answer).trim();
      return given === want || Number(given) === Number(want);
    });
    if (!ok) return fail(panel, 3, 'Data mismatch. Recalculate X, Y, and Z.');
    succeed(panel, 'stage4', 'Combination accepted. Vault room unlocked.');
  }

  function checkMastery() {
    const panel = document.getElementById('stage-panel');
    const picked = P.mastery.options.find(function (option) { return option.id === masteryPick; });
    if (!picked || !picked.correct) return fail(panel, 4, 'Misconception still in the protocol. Choose the scientific repair.');
    succeed(panel, 'victory', 'Vault key accepted. Life support coming online.');
  }

  function bind() {
    const start = document.getElementById('start-btn');
    if (start) start.addEventListener('click', function () { startTimer(); screen = 'stage1'; render(); });
    const u1 = document.getElementById('unlock-1');
    if (u1) u1.addEventListener('click', checkVocab);
    const u2 = document.getElementById('unlock-2');
    if (u2) { bindSequence(); u2.addEventListener('click', checkSequence); }
    const u3 = document.getElementById('unlock-3');
    if (u3) u3.addEventListener('click', checkData);
    const u4 = document.getElementById('unlock-4');
    if (u4) u4.addEventListener('click', checkMastery);
    Array.from(document.querySelectorAll('[data-mastery]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        masteryPick = btn.getAttribute('data-mastery');
        Array.from(document.querySelectorAll('[data-mastery]')).forEach(function (node) {
          node.classList.toggle('ring-2', node === btn);
          node.classList.toggle('ring-cyan-300', node === btn);
        });
      });
    });
    const replay = document.getElementById('replay');
    if (replay) replay.addEventListener('click', function () {
      remaining = Math.round((P.timerMinutes || 30) * 60);
      seqOrder = [];
      masteryPick = '';
      screen = 'start';
      render();
    });
  }

  function render() {
    if (screen === 'start') app.innerHTML = startScreen();
    else if (screen === 'stage1') app.innerHTML = vocabScreen();
    else if (screen === 'stage2') app.innerHTML = sequenceScreen();
    else if (screen === 'stage3') app.innerHTML = dataScreen();
    else if (screen === 'stage4') app.innerHTML = masteryScreen();
    else if (screen === 'timeout') app.innerHTML = timeoutScreen();
    else app.innerHTML = victoryScreen();
    bind();
  }

  render();
})();
  </script>
</body>
</html>`;
}
