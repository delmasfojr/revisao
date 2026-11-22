// Ícones do app (no lugar dos emojis): desenhados em SVG, nas cores do Delmão.
// Os de uma cor só usam "currentColor" (pegam a cor do texto/botão); os coloridos têm cor própria.
// Uso: ic('fogo')  →  <svg class="icn icn-fogo">…</svg>
const ICONES = {
  // ----- uma cor (currentColor) -----
  casa: '<path d="M2.6 11 12 3l9.4 8-1.3 1.5-1.1-.9V20a1.5 1.5 0 0 1-1.5 1.5h-3.8v-6.2H10.3v6.2H6.5A1.5 1.5 0 0 1 5 20v-8.4l-1.1.9z"/>',
  cards: '<rect x="8.6" y="2.2" width="12" height="16" rx="2.2" opacity=".45" transform="rotate(9 14.6 10.2)"/><rect x="3.4" y="5.4" width="12" height="16.2" rx="2.2"/><path d="M7.4 11.2a2.3 2.3 0 1 1 3.3 2.1c-.6.3-.8.6-.8 1.2v.3" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><circle cx="9.9" cy="17.5" r="1" fill="#fff"/>',
  questoes: '<rect x="3.5" y="2.5" width="13.5" height="19" rx="2.2"/><rect x="6.5" y="6.8" width="7.5" height="1.8" rx=".9" fill="#fff"/><rect x="6.5" y="10.6" width="5.5" height="1.8" rx=".9" fill="#fff"/><rect x="6.5" y="14.4" width="4" height="1.8" rx=".9" fill="#fff"/><path d="m13.8 19.6.6-3.1 6.2-6.2a1.8 1.8 0 0 1 2.5 2.5l-6.2 6.2z" fill="#FF7A00" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>',
  perfil: '<circle cx="12" cy="7.6" r="4.4"/><path d="M3.6 21.2a8.4 8.4 0 0 1 16.8 0z"/>',
  coroa: '<path d="M3 8.2 7.6 12 12 4.6l4.4 7.4L21 8.2l-1.9 10.3H4.9z"/><rect x="4.9" y="19.6" width="14.2" height="2.2" rx="1.1"/>',
  certo: '<path d="m4.8 12.6 4.6 4.6L19.4 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
  xis: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  estrela: '<path d="m12 2.6 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
  livro: '<path d="M3.5 5A1.8 1.8 0 0 1 5.3 3.2c2.7 0 4.6.6 5.9 1.8v15.4c-1.3-1.1-3.2-1.6-5.9-1.6a1.8 1.8 0 0 1-1.8-1.8z"/><path d="M20.5 5a1.8 1.8 0 0 0-1.8-1.8c-2.7 0-4.6.6-5.9 1.8v15.4c1.3-1.1 3.2-1.6 5.9-1.6a1.8 1.8 0 0 0 1.8-1.8z" opacity=".7"/>',
  raio: '<path d="M13.6 2 4.8 13.6h6.1L9.9 22l9.3-12.2h-6.3z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>',
  alvo: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="4.8" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="1.8"/>',
  engrenagem: '<path d="M12 2.6l1.5 2.4a7.4 7.4 0 0 1 2.2.9l2.7-.7 1.6 2.7-1.9 2a7.4 7.4 0 0 1 0 2.2l1.9 2-1.6 2.7-2.7-.7a7.4 7.4 0 0 1-2.2.9L12 21.4l-1.5-2.4a7.4 7.4 0 0 1-2.2-.9l-2.7.7-1.6-2.7 1.9-2a7.4 7.4 0 0 1 0-2.2l-1.9-2 1.6-2.7 2.7.7a7.4 7.4 0 0 1 2.2-.9z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="#fff"/>',
  relogio: '<circle cx="12" cy="12.8" r="8.6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 8.2v4.8l3.2 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="9.6" y="1.6" width="4.8" height="2.2" rx="1.1"/>',
  cadeado: '<path d="M7.6 10.4V8a4.4 4.4 0 0 1 8.8 0v2.4" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="4.8" y="10.2" width="14.4" height="11" rx="2.4"/><rect x="11" y="13.8" width="2" height="4" rx="1" fill="#fff"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  repetir: '<path d="M19.2 9.5A7.6 7.6 0 0 0 5.6 7.2M4.8 14.5a7.6 7.6 0 0 0 13.6 2.3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M4.4 3.6v4.6H9M19.6 20.4v-4.6H15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  grafico: '<rect x="3.5" y="12" width="4" height="8.5" rx="1"/><rect x="10" y="6.5" width="4" height="14" rx="1"/><rect x="16.5" y="3.5" width="4" height="17" rx="1"/>',

  // ----- coloridos -----
  fogo: '<path d="M12 1.8c1.1 3.6 5.9 5.8 5.9 11.4a5.9 5.9 0 0 1-11.8 0c0-2.6 1.3-4.3 2.8-5.6.2 1.7 1 2.9 2.1 3.4C10.4 7.6 10.8 4.4 12 1.8z" fill="#FF7A00"/><path d="M12 12.6c1.3 1.5 2.7 2.6 2.7 4.5a2.7 2.7 0 0 1-5.4 0c0-1.6 1-2.8 2.7-4.5z" fill="#FFC531"/>',
  estrelaOuro: '<path d="m12 2.6 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="#FFC531" stroke="#E9A400" stroke-width="1.2" stroke-linejoin="round"/><path d="M9.2 9.6 12 5.2" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>',
  trofeu: '<path d="M7 5H3.8a3.4 3.4 0 0 0 3.6 4.4M17 5h3.2a3.4 3.4 0 0 1-3.6 4.4" fill="none" stroke="#C95F00" stroke-width="2"/><path d="M6.6 2.6h10.8v5.6a5.4 5.4 0 0 1-10.8 0z" fill="#FF7A00"/><path d="M9.4 4.6v3.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".6"/><rect x="10.6" y="13.4" width="2.8" height="3.6" fill="#C95F00"/><rect x="7" y="17" width="10" height="4.4" rx="1.2" fill="#0F1B2D"/>',
  coracao: '<path d="M12 21.2s-8.6-5.2-8.6-11.4A4.7 4.7 0 0 1 12 7.1a4.7 4.7 0 0 1 8.6 2.7c0 6.2-8.6 11.4-8.6 11.4z" fill="#E5402F"/><ellipse cx="8" cy="9.4" rx="1.8" ry="1.2" fill="#fff" opacity=".55" transform="rotate(-35 8 9.4)"/>',
  bau: '<path d="M3 10V8.4a5 5 0 0 1 5-4.6h8a5 5 0 0 1 5 4.6V10z" fill="#FF7A00"/><rect x="3" y="10" width="18" height="10.4" rx="1.6" fill="#C95F00"/><rect x="3" y="9.2" width="18" height="2.2" fill="#0F1B2D"/><rect x="6.6" y="3.9" width="2.2" height="16.5" fill="#FFC531"/><rect x="15.2" y="3.9" width="2.2" height="16.5" fill="#FFC531"/><rect x="10" y="9" width="4" height="5.4" rx="1" fill="#FFC531" stroke="#0F1B2D" stroke-width="1"/>',
  brilho: '<path d="M12 1.8 14.3 9.7 22.2 12l-7.9 2.3L12 22.2l-2.3-7.9L1.8 12l7.9-2.3z" fill="#FFC531" stroke="#E9A400" stroke-width="1" stroke-linejoin="round"/><path d="M19 2.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="#FF7A00"/>',
  vf: '<circle cx="7.2" cy="12" r="5.6" fill="#1E9E5A"/><path d="m4.7 12.2 1.8 1.8 3.2-3.4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16.8" cy="12" r="5.6" fill="#D93A2B"/><path d="m14.8 10 4 4m0-4-4 4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'
};
function ic(nome, cls = '') {
  return `<svg class="icn icn-${nome} ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
}

// Prêmios ilustrados (gerados no ChatGPT no estilo adesivo do Delmão, recortados em premios/*.webp)
function premio(nome, cls = '') {
  return `<img class="premio premio-${nome} ${cls}" src="premios/${nome}.webp" alt="" draggable="false">`;
}
