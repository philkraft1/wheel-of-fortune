const overlayUrl = `${location.origin}/overlay`;
const urlNode = document.getElementById('overlay-url');
const answer = document.getElementById('answer');
const now = document.getElementById('now');
const tiktok = document.getElementById('tiktok');
const players = document.getElementById('players');
const log = document.getElementById('log');
const heard = document.getElementById('heard');
const letters = document.getElementById('letters');
const peek = document.getElementById('peek');
let state = null;
let answerOpen = false;

urlNode.textContent = overlayUrl;

document.getElementById('copy-url').addEventListener('click', async () => {
  await navigator.clipboard.writeText(overlayUrl);
  document.getElementById('copy-url').textContent = 'Copied';
});

for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = letter;
  if ('AEIOU'.includes(letter)) button.classList.add('vowel');
  button.addEventListener('click', () => sendChat(`/guess ${letter}`));
  letters.appendChild(button);
}

document.getElementById('puzzle-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  post({ action: 'prize', prize: data.get('prize') });
  post({ action: 'puzzle', category: data.get('category'), puzzle: data.get('puzzle') });
});

document.getElementById('random').addEventListener('click', () => {
  if (state?.status === 'playing' && !window.confirm('Replace the live puzzle?')) return;
  answerOpen = false;
  post({ action: 'random' });
});

document.getElementById('start').addEventListener('click', () => post({ action: 'start' }));
document.getElementById('skip').addEventListener('click', () => post({ action: 'skip' }));
document.getElementById('force').addEventListener('click', () => post({ action: 'force' }));
document.getElementById('reset').addEventListener('click', () => {
  if (window.confirm('Reset scores and clear the round?')) post({ action: 'reset' });
});
document.getElementById('disconnect').addEventListener('click', () => post({ action: 'disconnect' }));
document.getElementById('sound').addEventListener('change', (event) => {
  post({ action: 'sound', on: event.currentTarget.checked });
});
document.getElementById('transparent').addEventListener('change', (event) => {
  post({ action: 'transparent', on: event.currentTarget.checked });
});

document.getElementById('connect-form').addEventListener('submit', (event) => {
  event.preventDefault();
  post({ action: 'connect', username: document.getElementById('username').value });
});

document.getElementById('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  sendChat(document.getElementById('sim-comment').value);
});

document.querySelector('[data-chat="/join"]').addEventListener('click', () => sendChat('/join'));

peek.addEventListener('click', () => {
  answerOpen = !answerOpen;
  renderAnswer();
});

function sendChat(comment) {
  post({
    action: 'chat',
    name: document.getElementById('sim-name').value || 'Alex',
    comment,
  });
}

function post(body) {
  return fetch('/api/host', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const source = new EventSource('/events?role=host');
source.addEventListener('state', (event) => {
  state = JSON.parse(event.data);
  render();
});

function render() {
  if (!state) return;
  now.textContent = state.message || '';
  tiktok.textContent = state.tiktok ? `${label(state.tiktok.state)} · ${state.tiktok.detail}` : '';
  document.getElementById('sound').checked = state.sound !== false;
  document.getElementById('transparent').checked = Boolean(state.transparent);
  if (state.category && document.activeElement?.id !== 'category') {
    document.getElementById('category').value = state.category;
  }
  if (state.phrase && document.activeElement?.id !== 'puzzle') {
    document.getElementById('puzzle').value = state.phrase;
  }
  if (state.prize && document.activeElement?.id !== 'prize') {
    document.getElementById('prize').value = state.prize;
  }
  renderAnswer();
  players.replaceChildren();
  if (!state.players.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Nobody has joined yet.';
    players.appendChild(empty);
  }
  state.players.forEach((player, index) => {
    const card = document.createElement('article');
    card.className = index === state.turn && state.status === 'playing' ? 'player up' : 'player';
    const name = document.createElement('b');
    name.textContent = player.name;
    const score = document.createElement('strong');
    score.textContent = money(player.round);
    const total = document.createElement('small');
    total.textContent = `Total ${money(player.total)}`;
    card.append(name, score, total);
    players.appendChild(card);
  });
  fillList(log, (state.log || []).map((entry) => ({ text: entry.text })));
  heard.replaceChildren();
  for (const entry of state.heard || []) {
    const item = document.createElement('li');
    item.textContent = entry.text;
    if (entry.handled) item.classList.add('hit');
    heard.appendChild(item);
  }
}

function renderAnswer() {
  answer.hidden = !answerOpen;
  peek.textContent = answerOpen ? 'Hide the answer' : 'Peek at the answer';
  answer.textContent = answerOpen ? (state?.phrase || 'No puzzle yet') : '';
}

function fillList(node, entries) {
  node.replaceChildren();
  for (const entry of entries) {
    const item = document.createElement('li');
    item.textContent = entry.text;
    node.appendChild(item);
  }
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function label(value) {
  if (value === 'live') return 'Live';
  if (value === 'connecting') return 'Connecting';
  if (value === 'error') return 'Not connected';
  return 'Practice';
}
