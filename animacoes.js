// Animações do protótipo: confete, contador de XP subindo, estrelas saindo do baú.
// Tudo respeita o "reduzir movimento" do celular (prefers-reduced-motion).
const SEM_MOVIMENTO = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

function confete(qtd = 90) {
  if (SEM_MOVIMENTO) return;
  const cores = ['#FF7A00', '#FFC531', '#0F1B2D', '#1E9E5A', '#3B82C4', '#E5402F'];
  const box = document.createElement('div'); box.className = 'confete';
  for (let i = 0; i < qtd; i++) {
    const p = document.createElement('i');
    const dx = (Math.random() - .5) * 2 * Math.min(innerWidth * .6, 380);
    const sobe = 220 + Math.random() * 260;
    p.style.cssText = `--dx:${dx}px;--sobe:${sobe}px;--gira:${(Math.random() * 4 - 2) * 360}deg;--t:${1.6 + Math.random() * 1.2}s;--atraso:${Math.random() * .25}s;` +
      `background:${cores[i % cores.length]};width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 8}px;border-radius:${Math.random() < .3 ? '50%' : '2px'}`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3400);
}

// número subindo de 0 até o valor (XP no fim da lição, no baú)
function contarAte(el, alvo, ms = 900) {
  if (!el) return;
  if (SEM_MOVIMENTO) { el.textContent = alvo; return; }
  const t0 = performance.now();
  const passo = t => {
    const k = Math.min(1, (t - t0) / ms), v = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
    el.textContent = v; if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// Delmão animado de verdade (vídeo do Gemini sem o fundo, em mascote/anim-*.webp).
// Quem pediu "reduzir movimento" vê o primeiro quadro parado.
// poses que já têm versão animada aprovada (as outras usam a figura parada)
const ANIMADOS = ['acenando', 'joinha', 'facepalm', 'comemorando', 'frustrado'];
function mascoteAnim(nome, cls = '') {
  const arq = SEM_MOVIMENTO ? `anim-${nome}-parado` : `anim-${nome}`;
  return `<img class="masc-anim ${cls}" src="mascote/${arq}.webp" alt="" draggable="false">`;
}

// estrelinhas pulando para fora do baú
function chuvaDeEstrelas(alvo, qtd = 14) {
  if (SEM_MOVIMENTO || !alvo) return;
  const r = alvo.getBoundingClientRect();
  for (let i = 0; i < qtd; i++) {
    const m = document.createElement('img');
    m.src = 'premios/estrela.webp'; m.className = 'moeda'; m.alt = '';
    m.style.cssText = `left:${r.left + r.width / 2 - 14}px;top:${r.top + r.height * .35}px;--dx:${(Math.random() - .5) * 320}px;--sobe:${140 + Math.random() * 200}px;--atraso:${.04 * i}s`;
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 2200);
  }
}
