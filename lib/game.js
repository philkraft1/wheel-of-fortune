export const SPIN_MS = 5300;
export const SPIN_ANIMATION_MS = 4800;
export const GUESS_MS = 20000;
export const BONUS_MS = 18000;
export const RESULT_MS = 1600;
export const VOWEL_COST = 250;

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export const WEDGES = [
  { label: '$500', value: 500, type: 'cash', color: '#5b21b6', text: '#ffffff' },
  { label: '$550', value: 550, type: 'cash', color: '#1d4ed8', text: '#ffffff' },
  { label: '$600', value: 600, type: 'cash', color: '#0f766e', text: '#ffffff' },
  { label: 'BANKRUPT', value: 0, type: 'bankrupt', color: '#09090b', text: '#ffffff' },
  { label: '$650', value: 650, type: 'cash', color: '#b45309', text: '#ffffff' },
  { label: '$700', value: 700, type: 'cash', color: '#9f1239', text: '#ffffff' },
  { label: '$800', value: 800, type: 'cash', color: '#6d28d9', text: '#ffffff' },
  { label: 'LOSE\nTURN', value: 0, type: 'lose', color: '#f8fafc', text: '#111827' },
  { label: '$850', value: 850, type: 'cash', color: '#1e3a8a', text: '#ffffff' },
  { label: '$900', value: 900, type: 'cash', color: '#047857', text: '#ffffff' },
  { label: '$1000', value: 1000, type: 'cash', color: '#c2410c', text: '#ffffff' },
  { label: 'BANKRUPT', value: 0, type: 'bankrupt', color: '#09090b', text: '#ffffff' },
  { label: '$500', value: 500, type: 'cash', color: '#7c3aed', text: '#ffffff' },
  { label: '$2500', value: 2500, type: 'cash', color: '#a16207', text: '#fff7d6' },
  { label: 'FREE\nPLAY', value: 500, type: 'free', color: '#15803d', text: '#ffffff' },
  { label: '$750', value: 750, type: 'cash', color: '#1d4ed8', text: '#ffffff' },
  { label: '$800', value: 800, type: 'cash', color: '#0f766e', text: '#ffffff' },
  { label: '$900', value: 900, type: 'cash', color: '#9f1239', text: '#ffffff' },
  { label: '$600', value: 600, type: 'cash', color: '#5b21b6', text: '#ffffff' },
  { label: 'LOSE\nTURN', value: 0, type: 'lose', color: '#e2e8f0', text: '#111827' },
  { label: '$1000', value: 1000, type: 'cash', color: '#b45309', text: '#ffffff' },
  { label: '$550', value: 550, type: 'cash', color: '#1e3a8a', text: '#ffffff' },
  { label: '$5000', value: 5000, type: 'cash', color: '#f5d76e', text: '#3f2e05' },
  { label: '$700', value: 700, type: 'cash', color: '#6d28d9', text: '#ffffff' },
];

export function normalizePhrase(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function clean(value) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function clip(value, max) {
  return Array.from(clean(value)).slice(0, max).join('').trim();
}

function say(state, text) {
  return {
    log: [...state.log, { id: state.logSeq + 1, text }].slice(-12),
    logSeq: state.logSeq + 1,
    message: text,
  };
}

function note(state, text, patch = {}) {
  const base = { ...state, ...patch };
  return { ...base, ...say(base, text) };
}

function commit(state, patch) {
  return { ...state, ...patch, token: state.token + 1 };
}

function shot(ms) {
  return { deadline: Date.now() + ms, clockMs: ms };
}

function noShot() {
  return { deadline: null, clockMs: null };
}

function current(state) {
  return state.players[state.turn] || null;
}

function wedgeLabel(wedge) {
  return wedge ? wedge.label.replaceAll('\n', ' ') : '';
}

export function boardRows(puzzle, revealed) {
  const open = new Set(revealed);
  return clean(puzzle).toUpperCase().split(' ').filter(Boolean).map((word) => (
    [...word].map((ch) => {
      if (!/[A-Z0-9]/.test(ch)) return { kind: 'symbol', value: ch };
      return { kind: 'tile', value: open.has(ch) ? ch : '' };
    })
  ));
}

function hasHidden(puzzle, revealed) {
  const open = new Set(revealed);
  return [...puzzle.toUpperCase()].some((ch) => /[A-Z0-9]/.test(ch) && !open.has(ch));
}

function countLetter(puzzle, letter) {
  return [...puzzle.toUpperCase()].filter((ch) => ch === letter).length;
}

function everyLetter(puzzle) {
  return [...new Set([...puzzle.toUpperCase()].filter((ch) => /[A-Z0-9]/.test(ch)))];
}

export function initialState() {
  return {
    status: 'lobby',
    category: '',
    puzzle: '',
    prize: 'A shoutout from the host',
    revealed: [],
    called: [],
    players: [],
    turn: 0,
    phase: 'waiting',
    wedge: null,
    spin: null,
    spinSeq: 0,
    token: 0,
    message: 'Set a puzzle, then tell chat to type /join',
    log: [],
    logSeq: 0,
    winnerId: null,
    won: 0,
    deadline: null,
    clockMs: null,
    sound: true,
    transparent: false,
  };
}

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US')}`;
}

function beginSpin(state, random, message) {
  if (state.players.length === 0) {
    const next = commit(state, {
      phase: 'waiting',
      wedge: null,
      ...noShot(),
      ...say(state, message || 'Waiting for players. Type /join'),
    });
    return { state: next, effects: [{ type: 'clear' }] };
  }
  const index = Math.floor(random() * WEDGES.length) % WEDGES.length;
  const wedge = WEDGES[index];
  const spinSeq = state.spinSeq + 1;
  const name = state.players[state.turn]?.name || 'Player';
  const next = commit(state, {
    status: 'playing',
    phase: 'spinning',
    wedge,
    spin: { id: spinSeq, index },
    spinSeq,
    winnerId: null,
    ...noShot(),
    ...say(state, message || `${name} is spinning`),
  });
  return {
    state: next,
    effects: [{ type: 'after', ms: SPIN_MS, action: { type: 'APPLY_WEDGE', token: next.token } }],
  };
}

function holdThen(state, message, patch, actionType) {
  const base = { ...state, ...patch };
  const next = commit(base, {
    phase: 'result',
    ...noShot(),
    ...say(base, message),
  });
  return {
    state: next,
    effects: [{ type: 'after', ms: RESULT_MS, action: { type: actionType, token: next.token } }],
  };
}

function award(state, playerId) {
  const player = state.players.find((entry) => entry.id === playerId);
  const won = player?.round || 0;
  const players = state.players.map((entry) => ({
    ...entry,
    total: entry.id === playerId ? entry.total + entry.round : entry.total,
    round: 0,
  }));
  return commit(state, {
    status: 'solved',
    phase: 'solved',
    players,
    revealed: everyLetter(state.puzzle),
    winnerId: playerId,
    won,
    ...noShot(),
    ...say(state, `${player?.name || 'Player'} solved it for ${money(won)}`),
  });
}

function miss(state, message, patch = {}) {
  return holdThen(state, message, patch, 'NEXT_TURN');
}

export function reduce(state, action, random = Math.random) {
  switch (action.type) {
    case 'SET_PUZZLE': {
      const puzzle = clean(action.puzzle).toUpperCase();
      const category = clean(action.category).toUpperCase() || 'PHRASE';
      if (!normalizePhrase(puzzle)) {
        return { state: note(state, 'Use at least one letter in the puzzle'), effects: [] };
      }
      if (puzzle.length > 72) {
        return { state: note(state, 'Keep the puzzle under 72 characters'), effects: [] };
      }
      const next = commit(state, {
        status: 'lobby',
        category,
        puzzle,
        revealed: [],
        called: [],
        turn: 0,
        phase: 'waiting',
        wedge: null,
        spin: null,
        winnerId: null,
        won: 0,
        players: state.players.map((player) => ({ ...player, round: 0 })),
        ...noShot(),
        ...say(state, 'Puzzle locked in. Start the round when chat has joined.'),
      });
      return { state: next, effects: [{ type: 'clear' }] };
    }
    case 'SET_PRIZE': {
      const prize = clip(action.prize, 60) || 'A shoutout from the host';
      return { state: { ...state, prize }, effects: [] };
    }
    case 'SET_SOUND':
      return { state: { ...state, sound: action.on !== false }, effects: [] };
    case 'SET_TRANSPARENT':
      return { state: { ...state, transparent: Boolean(action.on) }, effects: [] };
    case 'START': {
      if (!normalizePhrase(state.puzzle)) {
        return { state: note(state, 'Enter a puzzle first'), effects: [] };
      }
      const prepared = {
        ...state,
        status: 'playing',
        revealed: [],
        called: [],
        winnerId: null,
        won: 0,
        wedge: null,
        players: state.players.map((player) => ({ ...player, round: 0 })),
        turn: 0,
      };
      if (prepared.players.length === 0) {
        const next = commit(prepared, {
          phase: 'waiting',
          ...noShot(),
          ...say(prepared, 'Round is live. Viewers can type /join'),
        });
        return { state: next, effects: [{ type: 'clear' }] };
      }
      return beginSpin(prepared, random, `${prepared.players[0].name} spins first`);
    }
    case 'JOIN': {
      const id = clean(action.id).toLowerCase();
      const name = clip(action.name || id, 24) || id;
      if (!id) return { state, effects: [] };
      if (state.players.some((player) => player.id === id)) return { state, effects: [] };
      const players = [...state.players, { id, name, total: 0, round: 0 }];
      if (state.status === 'playing' && state.phase === 'waiting') {
        return beginSpin(
          { ...state, players, turn: players.length - 1 },
          random,
          `${name} joined and spins first`,
        );
      }
      if (state.status === 'playing') {
        const base = { ...state, players };
        const spoken = say(base, `${name} joined and is in line`);
        return { state: { ...base, log: spoken.log, logSeq: spoken.logSeq }, effects: [] };
      }
      return { state: note(state, `${name} joined the game`, { players }), effects: [] };
    }
    case 'BEGIN_SPIN': {
      if (action.token != null && action.token !== state.token) return { state, effects: [] };
      if (state.status !== 'playing') return { state, effects: [] };
      return beginSpin(state, random);
    }
    case 'APPLY_WEDGE': {
      if (action.token !== state.token || state.phase !== 'spinning' || !state.wedge) {
        return { state, effects: [] };
      }
      const player = current(state);
      if (!player) return { state, effects: [] };
      if (state.wedge.type === 'bankrupt') {
        const players = state.players.map((entry) => (
          entry.id === player.id ? { ...entry, round: 0 } : entry
        ));
        return miss(state, `${player.name} hit BANKRUPT`, { players });
      }
      if (state.wedge.type === 'lose') return miss(state, `${player.name} lost the turn`);
      const next = commit(state, {
        phase: 'guess',
        ...shot(GUESS_MS),
        ...say(state, `${player.name} landed on ${wedgeLabel(state.wedge)}. Type /guess and a consonant`),
      });
      return {
        state: next,
        effects: [{ type: 'after', ms: GUESS_MS, action: { type: 'TIMEOUT', token: next.token } }],
      };
    }
    case 'TIMEOUT': {
      if (action.token !== state.token || state.phase !== 'guess') return { state, effects: [] };
      const player = current(state);
      return miss(state, `${player ? player.name : 'Player'} ran out of time`);
    }
    case 'NEXT_TURN': {
      if (action.token !== state.token || state.status !== 'playing') return { state, effects: [] };
      if (state.players.length === 0) return beginSpin(state, random);
      const turn = (state.turn + 1) % state.players.length;
      return beginSpin({ ...state, turn }, random, `${state.players[turn].name}'s turn`);
    }
    case 'SKIP': {
      if (state.status !== 'playing' || state.players.length === 0) {
        return { state: note(state, 'Nobody to skip'), effects: [] };
      }
      const player = current(state);
      const turn = (state.turn + 1) % state.players.length;
      return beginSpin({ ...state, turn }, random, `Skipped ${player.name}`);
    }
    case 'GUESS': {
      const actorId = clean(action.id).toLowerCase();
      const actorName = clip(action.name || actorId, 24) || 'Someone';
      if (state.status !== 'playing') return { state: note(state, 'The round has not started'), effects: [] };
      const player = current(state);
      if (!player) return { state: note(state, 'Type /join to enter'), effects: [] };
      if (actorId !== player.id) return { state: note(state, `${actorName} has to wait for a turn`), effects: [] };
      if (state.phase !== 'guess' && state.phase !== 'bonus') {
        return { state: note(state, 'The wheel is still moving'), effects: [] };
      }
      const letter = String(action.letter || '').toUpperCase();
      if (!/^[A-Z]$/.test(letter)) {
        return { state: note(state, 'Guess one letter, like /guess S'), effects: [] };
      }
      const vowel = VOWELS.has(letter);
      if (state.phase === 'bonus' && !vowel) {
        return { state: note(state, 'Solve with /aws-networking, or wait for the next spin'), effects: [] };
      }
      if (state.called.includes(letter)) {
        if (vowel || state.phase === 'bonus') return { state: note(state, `${letter} was already called`), effects: [] };
        return miss(state, `${player.name} repeated ${letter}`);
      }
      if (vowel) {
        if (player.round < VOWEL_COST) {
          return { state: note(state, `${player.name} needs ${money(VOWEL_COST)} to buy ${letter}`), effects: [] };
        }
        const hits = countLetter(state.puzzle, letter);
        const players = state.players.map((entry) => (
          entry.id === player.id ? { ...entry, round: entry.round - VOWEL_COST } : entry
        ));
        const called = [...state.called, letter];
        if (hits === 0) {
          return miss(state, `${player.name} bought ${letter}, but it is not there`, { players, called });
        }
        const revealed = [...state.revealed, letter];
        const patched = { ...state, players, called, revealed };
        if (!hasHidden(state.puzzle, revealed)) {
          return { state: award(patched, player.id), effects: [{ type: 'clear' }] };
        }
        const next = commit(patched, {
          phase: 'bonus',
          ...shot(BONUS_MS),
          ...say(patched, `${letter} is on the board. Solve with /aws-networking, or wait to spin`),
        });
        return {
          state: next,
          effects: [{ type: 'after', ms: BONUS_MS, action: { type: 'BEGIN_SPIN', token: next.token } }],
        };
      }
      const hits = countLetter(state.puzzle, letter);
      const called = [...state.called, letter];
      if (hits === 0) {
        if (state.wedge?.type === 'free') {
          return holdThen(state, `No ${letter}. Free Play keeps the turn`, { called }, 'BEGIN_SPIN');
        }
        return miss(state, `No ${letter} for ${player.name}`, { called });
      }
      const gained = (state.wedge?.value || 0) * hits;
      const players = state.players.map((entry) => (
        entry.id === player.id ? { ...entry, round: entry.round + gained } : entry
      ));
      const revealed = [...state.revealed, letter];
      const patched = { ...state, players, called, revealed };
      if (!hasHidden(state.puzzle, revealed)) {
        return { state: award(patched, player.id), effects: [{ type: 'clear' }] };
      }
      const next = commit(patched, {
        phase: 'bonus',
        ...shot(BONUS_MS),
        ...say(patched, `${letter} hits ${hits} time${hits === 1 ? '' : 's'} for ${money(gained)}. Solve or wait to spin`),
      });
      return {
        state: next,
        effects: [{ type: 'after', ms: BONUS_MS, action: { type: 'BEGIN_SPIN', token: next.token } }],
      };
    }
    case 'SOLVE': {
      const actorId = clean(action.id).toLowerCase();
      const actorName = clip(action.name || actorId, 24) || 'Someone';
      if (state.status !== 'playing') return { state: note(state, 'There is no puzzle to solve yet'), effects: [] };
      const player = current(state);
      if (!player || actorId !== player.id) {
        return { state: note(state, `${actorName} has to wait for a turn to solve`), effects: [] };
      }
      if (state.phase !== 'guess' && state.phase !== 'bonus') {
        return { state: note(state, 'Wait for the wheel to stop before solving'), effects: [] };
      }
      if (!normalizePhrase(action.phrase)) {
        return { state: note(state, 'Type /aws-networking and then the whole puzzle'), effects: [] };
      }
      if (normalizePhrase(action.phrase) !== normalizePhrase(state.puzzle)) {
        return miss(state, `${player.name} missed the solve`);
      }
      return { state: award(state, player.id), effects: [{ type: 'clear' }] };
    }
    case 'FORCE_SOLVE': {
      const player = current(state);
      if (!player || state.status !== 'playing' || !normalizePhrase(state.puzzle)) {
        return { state: note(state, 'Start a round before awarding the solve'), effects: [] };
      }
      return { state: award(state, player.id), effects: [{ type: 'clear' }] };
    }
    case 'RESET': {
      const fresh = initialState();
      fresh.sound = state.sound;
      fresh.transparent = state.transparent;
      fresh.prize = state.prize;
      fresh.message = 'Game reset. Set a new puzzle when you are ready.';
      return { state: fresh, effects: [{ type: 'clear' }] };
    }
    default:
      return { state, effects: [] };
  }
}

function present(state) {
  const player = current(state);
  return {
    status: state.status,
    category: state.category,
    prize: state.prize,
    rows: boardRows(state.puzzle, state.revealed),
    revealed: state.revealed,
    called: state.called,
    players: state.players.map(({ id, name, total, round }) => ({ id, name, total, round })),
    turn: state.turn,
    currentPlayerId: player?.id || null,
    phase: state.phase,
    wedge: state.wedge ? {
      label: state.wedge.label,
      value: state.wedge.value,
      type: state.wedge.type,
      color: state.wedge.color,
      text: state.wedge.text,
    } : null,
    spin: state.spin ? { id: state.spin.id, index: state.spin.index } : null,
    message: state.message,
    log: state.log,
    winnerId: state.winnerId,
    won: state.won,
    deadline: state.deadline,
    clockMs: state.clockMs,
    sound: state.sound,
    transparent: state.transparent,
    spinMs: SPIN_ANIMATION_MS,
    vowelCost: VOWEL_COST,
    wedges: WEDGES,
  };
}

export function publicView(state) {
  const view = present(state);
  if (state.status === 'solved') view.phrase = state.puzzle;
  return view;
}

export function hostView(state) {
  return { ...publicView(state), phrase: state.puzzle };
}

export function createGame(random = Math.random) {
  let state = initialState();
  return {
    getState: () => state,
    dispatch(action) {
      const result = reduce(state, action, random);
      state = result.state;
      return result;
    },
  };
}
