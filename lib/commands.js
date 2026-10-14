const SOLVE = '/aws-networking';

function normalized(comment) {
  let text = String(comment || '').trim();
  if (text.startsWith('!')) text = `/${text.slice(1)}`;
  return text;
}

export function parseCommand(comment) {
  const text = normalized(comment);
  if (!text) return null;
  const lower = text.toLowerCase();

  if (lower === '/join' || lower.startsWith('/join ')) return { type: 'join' };

  if (/^\/guess\b/i.test(text) || /^\/guess[a-z]$/i.test(text)) {
    const exact = text.match(/^\/guess\s*([a-z])$/i);
    if (exact) return { type: 'guess', letter: exact[1].toUpperCase() };
    const last = text.split(/\s+/).at(-1) || '';
    if (/^[a-z]$/i.test(last)) return { type: 'guess', letter: last.toUpperCase() };
    return { type: 'guess', letter: '' };
  }

  if (lower === SOLVE || lower.startsWith(`${SOLVE} `) || lower.startsWith(`${SOLVE}:`)) {
    const phrase = text.slice(SOLVE.length).replace(/^[\s:.-]+/, '').trim();
    return { type: 'solve', phrase };
  }

  return null;
}
