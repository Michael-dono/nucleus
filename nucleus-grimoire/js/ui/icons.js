/* Inline SVG glyphs for magics (from each spell file's `icon`) and artifacts (below). */
import { SPELL_DEFS } from '../spells/index.js';

const ARTIFACT_ICONS = {
  power:    `<path d="M12 3 L5 13 h6 l-1 8 L19 11 h-6z"/>`,
  vitality: `<path d="M12 20 C4 14 4 7 8.5 5.5 C11 4.6 12 7 12 7 s1-2.4 3.5-1.5C20 7 20 14 12 20z"/>`,
  magnitude:`<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>`,
  multicast:`<path d="M3 19 L14 8"/><path d="M3 12 L11 4"/><path d="M8 21 L18 11"/><path d="M12 4h8v8"/>`,
  duration: `<circle cx="12" cy="12" r="8.2"/><path d="M12 7v5.4l3.6 2.2"/>`,
  haste:    `<path d="M3 8h11M3 12h8M3 16h12"/><path d="M17 6l4 6-4 6"/>`,
  swift:    `<path d="M6 20 L13 12 L9 11 L17 4"/><path d="M14 20h6"/>`,
  attune:   `<path d="M12 3l2.6 5.8L21 9.4l-4.6 4.3 1.2 6.3L12 17l-5.6 3 1.2-6.3L3 9.4l6.4-.6z"/>`,
  ward:     `<path d="M12 3l7.5 3v6c0 5-3.4 8-7.5 9.5C7.9 20 4.5 17 4.5 12V6z"/>`,
  regrowth: `<path d="M12 21v-8"/><path d="M12 13c0-4 3-6 7-6 0 4-2.6 6-7 6z"/><path d="M12 16c0-3-2.4-4.6-6-4.6 0 3 2.2 4.6 6 4.6z"/>`,
  execlens: `<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><path d="M8 10.5h5M10.5 8v5"/>`,
  blood:    `<path d="M12 3.5c3.6 4.4 5.6 7.4 5.6 9.9a5.6 5.6 0 0 1-11.2 0c0-2.5 2-5.5 5.6-9.9z"/>`
};

export function ico(key,color){
  const c = color || 'currentColor';
  const s = a => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${a}</svg>`;
  const body = SPELL_DEFS[key] ? SPELL_DEFS[key].icon : ARTIFACT_ICONS[key];
  return s(body || `<circle cx="12" cy="12" r="7"/>`);
}
