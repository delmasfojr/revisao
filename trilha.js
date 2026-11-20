// PROTÓTIPO — trilha e lição guiada no estilo Duolingo, com a cara do Delmão.
// Fica por cima do app.js: troca a tela inicial por uma trilha de bolinhas e
// cria a "lição" (perguntas misturadas, VERIFICAR/CONTINUAR, vidas, faixa de retorno).
// O resto (Banco de questões, painel, login) continua o mesmo do app.

const VIDAS = 5;
const POR_LICAO = 12;
const CORES = ['lar', 'navy'];   // cor de cada aula na trilha, alternando
const ZIGUE = [0, 52, 78, 52, 0, -52, -78, -52];

// ---------- montagem das lições de uma aula ----------
// Os tópicos, na ordem em que aparecem nas questões, viram 3 lições (ou menos, se a aula tiver poucos).
function topicosDa(A) {
  const ordem = [];
  for (const x of [...A.quiz, ...A.vf]) if (!ordem.includes(x.topico)) ordem.push(x.topico);
  return ordem;
}
function gruposDa(A) {
  const ts = topicosDa(A), n = Math.min(3, ts.length) || 1;
  const g = Array.from({ length: n }, () => []);
  ts.forEach((t, i) => g[Math.floor(i * n / ts.length)].push(t));
  return g.filter(x => x.length);
}
// nós da trilha de uma aula: lições + desafio + baú
function nosDa(A) {
  return [
    ...gruposDa(A).map((g, i, all) => ({ tipo: 'licao', grupo: g, nome: `Lição ${i + 1} de ${all.length}` })),
    { tipo: 'desafio', nome: 'Desafio da aula' },
    { tipo: 'bau', nome: 'Baú da aula' }
  ];
}
function exerciciosDaLicao(A, grupo) {
  const lim = Math.max(3, Math.ceil(POR_LICAO / grupo.length));
  const ex = [];
  for (const t of grupo) {
    // só perguntas que o app corrige sozinho (os flashcards ficam na aba Cards); as que têm figura vêm primeiro
    const comFig = x => x.figura ? 0 : 1;
    const qs = embaralhar(A.quiz.filter(q => q.topico === t)).sort((a, b) => comFig(a) - comFig(b));
    const vs = embaralhar(A.vf.filter(v => v.topico === t)).sort((a, b) => comFig(a) - comFig(b));
    const pool = [];
    while (qs.length || vs.length) {
      if (vs.length) pool.push({ tipo: 'vf', item: vs.shift() });
      if (qs.length) pool.push({ tipo: 'quiz', item: qs.shift() });
    }
    ex.push(...pool.slice(0, lim));
  }
  return ex.slice(0, POR_LICAO);
}
function exerciciosDoDesafio(A) {
  const qs = (A.questoes || []).map(q => ({ tipo: 'questao', item: q }));
  const extra = embaralhar(A.quiz).slice(0, Math.max(0, 8 - qs.length)).map(q => ({ tipo: 'quiz', item: q }));
  return embaralhar([...qs, ...extra]);
}

// ---------- progresso na trilha ----------
const feitosNa = num => (P.trilha ||= {})[num] || 0;           // quantos nós desta aula já foram concluídos
let RECEM = null;   // última etapa concluída: a trilha anima ela e libera a próxima
function concluirNo(num, idx) {
  P.trilha ||= {};
  if (feitosNa(num) <= idx) RECEM = { num, idx };
  if (feitosNa(num) <= idx) P.trilha[num] = idx + 1;
  salvar();
}

// ---------- som (curtinho, sem arquivo) ----------
let audio = null;
function som(tipo) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const notas = tipo === 'ok' ? [660, 880] : tipo === 'fim' ? [523, 659, 784, 1047] : [220, 196];
    notas.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.11;
      o.type = tipo === 'no' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(tipo === 'no' ? 0.05 : 0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.2);
    });
  } catch {}
}

// ---------- tela inicial: a trilha ----------
function barraInferior(ativo) {
  const todos = listaAulas().flatMap(a => AULAS[a.aula]?.cards || []);
  const dev = todos.filter(c => pendente(c.id)).length;
  return `<nav class="nav-inf">
    <button data-nav="trilha" class="${ativo === 'trilha' ? 'on' : ''}"><span>${ic('casa')}</span>Trilha</button>
    <button data-nav="cards" class="${ativo === 'cards' ? 'on' : ''}"><span>${ic('cards')}${dev ? `<i>${dev > 99 ? '99+' : dev}</i>` : ''}</span>Cards</button>
    <button data-nav="questoes"><span>${ic('questoes')}</span>Questões</button>
    <button data-nav="sair"><span>${ic('perfil')}</span>Sair</button>
  </nav>`;
}
function ligarBarra() {
  raiz.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
    const n = b.dataset.nav;
    if (n === 'trilha') telaInicio();
    else if (n === 'cards') telaCards();
    else if (n === 'questoes') telaFiltroQuestoes(listaAulas().map(a => a.aula));
    else if (n === 'sair' && confirm('Sair da sua conta neste aparelho?')) Backend.sair().then(() => telaLogin());
  });
}

function topoTrilha() {
  const licoesFeitas = Object.values(P.trilha || {}).reduce((s, n) => s + n, 0);
  return `<div class="topo-trilha">
      <div class="marca">Revisão <span>Delmão</span></div>
      <div class="st" title="Dias seguidos">${premio('fogo')}<b>${sequenciaAtual()}</b></div>
      <div class="st" title="Pontos">${premio('estrela')}<b>${P.xp}</b></div>
      <div class="st" title="Lições concluídas">${premio('trofeu')}<b>${licoesFeitas}</b></div>
    </div>`;
}

telaInicio = async function () {
  history.replaceState({ t: 'inicio' }, '');
  if (!listaAulas().length) {
    tela(`${cabecalho(false)}<main class="fim"><img src="mascote/cafe.webp" alt=""><h1>Aulas <span>a caminho</span></h1><p>O conteúdo está sendo preparado. Volte daqui a pouco!</p></main>`);
    return;
  }
  await Promise.all(listaAulas().map(a => aula(a.aula)));
  let atualMarcado = false, k = 0;

  const htmlAulas = INDICE.blocos.map(b => `<div class="bloco-nome">${esc(b.nome)}</div>` + b.aulas.map(a => {
    const A = AULAS[a.aula], nos = nosDa(A), feitos = feitosNa(a.aula), cor = CORES[k % 2], lado = k % 2 ? -1 : 1;
    k++;
    const completa = feitos >= nos.length;
    const bolinhas = nos.map((no, i) => {
      const estado = i < feitos ? 'feito' : i === feitos ? 'aberto' : 'fechado';
      const atual = estado === 'aberto' && !atualMarcado;
      if (atual) atualMarcado = true;
      const icone = no.tipo === 'bau' ? premio(estado === 'feito' ? 'bau-aberto' : 'bau')
        : no.tipo === 'desafio' ? premio('coroa')
        : ic(estado === 'feito' ? 'certo' : 'estrela');
      return `<div class="linha" style="--x:${lado * ZIGUE[i % ZIGUE.length]}px">
        ${atual ? `<div class="balao-comecar">COMEÇAR</div>` : ''}
        <button class="no ${no.tipo} ${estado} ${atual ? 'atual' : ''}" data-aula="${a.aula}" data-no="${i}" aria-label="${esc(no.nome)}">${icone}</button>
      </div>`;
    }).join('');
    return `<section class="unidade cor-${cor}">
      <div class="faixa"><div><small>AULA ${a.aula}${completa ? ' · CONCLUÍDA' : ''}</small><b>${esc(A.titulo)}</b></div>
        <button class="guia" data-guia="${a.aula}" title="Modos antigos desta aula">${ic('livro')}</button></div>
      <div class="caminho">${bolinhas}
        <img class="masc-trilha" style="--lado:${-lado}" src="mascote/${['estudando', 'pensando', 'desafiando', 'ideia', 'joinha', 'explicando'][k % 6]}.webp" alt="">
      </div>
    </section>`;
  }).join('')).join('');

  tela(`${topoTrilha()}
    <main class="trilha">${htmlAulas}</main>
    ${barraInferior('trilha')}`);

  ligarBarra();
  raiz.querySelectorAll('.no').forEach(b => b.onclick = e => { e.stopPropagation(); abrirPopover(b); });
  raiz.querySelectorAll('[data-guia]').forEach(b => b.onclick = () => telaAula(b.dataset.guia));
  raiz.querySelector('main.trilha').addEventListener('click', () => fecharPopover());
  const atual = raiz.querySelector('.no.atual');
  if (RECEM) {
    const feito = raiz.querySelector(`.no[data-aula="${RECEM.num}"][data-no="${RECEM.idx}"]`);
    const prox = raiz.querySelector(`.no[data-aula="${RECEM.num}"][data-no="${RECEM.idx + 1}"]`);
    if (feito) { feito.classList.add('acabou'); setTimeout(() => feito.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60); }
    if (prox) setTimeout(() => prox.classList.add('liberou'), 700);
    RECEM = null;
  } else if (atual) setTimeout(() => atual.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
};

function fecharPopover() { raiz.querySelectorAll('.popover').forEach(p => p.remove()); }
function abrirPopover(b) {
  const jaAberto = b.parentElement.querySelector('.popover');
  fecharPopover(); if (jaAberto) return;
  const num = b.dataset.aula, idx = +b.dataset.no, A = AULAS[num], no = nosDa(A)[idx];
  const estado = b.classList.contains('feito') ? 'feito' : b.classList.contains('fechado') ? 'fechado' : 'aberto';
  let titulo = no.nome, sub = '', botao = '';
  if (no.tipo === 'licao') sub = no.grupo.join(' · ');
  if (no.tipo === 'desafio') sub = 'Questões no estilo prova, com resolução.';
  if (no.tipo === 'bau') sub = estado === 'feito' ? 'Você já abriu este baú.' : 'Um prêmio por fechar a aula.';
  if (estado === 'fechado') botao = `<div class="pop-trava">${ic('cadeado')} Termine as etapas acima para liberar</div>`;
  else if (no.tipo === 'bau') botao = estado === 'feito' ? '' : `<button class="pop-bt" data-ir>ABRIR +30 XP</button>`;
  else botao = `<button class="pop-bt" data-ir>${estado === 'feito' ? 'PRATICAR DE NOVO +5 XP' : `COMEÇAR +${no.tipo === 'desafio' ? 20 : 10} XP`}</button>`;
  const pop = document.createElement('div');
  pop.className = 'popover' + (estado === 'fechado' ? ' trancado' : '');
  pop.innerHTML = `<b>${esc(titulo)}</b><p>${esc(sub)}</p>${botao}`;
  pop.onclick = e => e.stopPropagation();
  b.parentElement.appendChild(pop);
  pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const ir = pop.querySelector('[data-ir]');
  if (ir) ir.onclick = () => {
    if (no.tipo === 'bau') return abrirBau(num, idx);
    const ex = no.tipo === 'licao' ? exerciciosDaLicao(A, no.grupo) : exerciciosDoDesafio(A);
    const bonus = estado === 'feito' ? 5 : no.tipo === 'desafio' ? 20 : 10;
    jogarLicao(ex, { titulo: `Aula ${num} · ${no.nome}`, aoTerminar: () => concluirNo(num, idx), bonus });
  };
}

function abrirBau(num, idx) {
  concluirNo(num, idx); ganhar(30);
  tela(`<main class="lic-fim bau-tela">
    <div class="bau-palco" id="palco"><div class="raios"></div>${premio('bau', 'b-fechado')}${premio('bau-aberto', 'b-aberto')}</div>
    <h1 class="depois">Aula ${num} <span>fechada!</span></h1>
    <p class="fala depois">+<b id="xpbau">0</b> XP PRA CONTA!</p>
    <button class="btn3d verde depois" id="cont">CONTINUAR</button>
  </main>`);
  // o baú treme, abre, solta estrelas e confete
  setTimeout(() => {
    document.getElementById('palco')?.classList.add('aberto'); som('fim'); confete(70);
    chuvaDeEstrelas(document.getElementById('palco')); contarAte(document.getElementById('xpbau'), 30);
  }, SEM_MOVIMENTO ? 0 : 1100);
  document.getElementById('cont').onclick = telaInicio;
}

// ---------- aba Cards: flashcards (os que precisam de "mostrar resposta") ----------
async function telaCards() {
  history.replaceState({ t: 'inicio' }, '');
  await Promise.all(listaAulas().map(a => aula(a.aula)));
  const todos = listaAulas().flatMap(a => AULAS[a.aula].cards);
  const dev = todos.filter(c => pendente(c.id));
  const dom = todos.filter(c => dominado(c.id)).length;
  tela(`${topoTrilha()}<main class="trilha">
    <h1 style="margin-top:16px">Flash<span>cards</span></h1>
    <p class="cards-intro">Vire o card, confira e diga se acertou. O que você errar volta na Revisão do dia.</p>
    <button class="revdia-cards ${dev.length ? '' : 'vazia'}" id="revdia">
      <img src="mascote/${dev.length ? 'desafiando' : 'cafe'}.webp" alt="">
      <span><b>Revisão do dia</b><small>${dev.length ? `${dev.length} card${dev.length > 1 ? 's' : ''} esperando por você` : 'Nada pendente agora. Bora treinar um baralho?'}</small></span>
    </button>
    <div class="cards-dom">${ic('cards')} <b>${dom}</b> de ${todos.length} cards dominados</div>
    ${INDICE.blocos.map(b => `<div class="bloco-nome">${esc(b.nome)}</div><div class="baralhos">${b.aulas.map(a => {
      const cs = AULAS[a.aula].cards, d = cs.filter(c => dominado(c.id)).length, p = cs.filter(c => pendente(c.id)).length;
      return `<button class="baralho" data-baralho="${a.aula}">
        <span class="num">${a.aula}</span>
        <span class="txt"><b>${esc(a.titulo)}</b><small>${d}/${cs.length} dominados${p ? ` · <em>${p} p/ revisar</em>` : ''}</small>
        <span class="barra"><i style="width:${Math.round(100 * d / (cs.length || 1))}%"></i></span></span>
      </button>`;
    }).join('')}</div>`).join('')}
  </main>${barraInferior('cards')}`);
  ligarBarra();
  document.getElementById('revdia').onclick = () => dev.length ? jogarFlash(embaralhar(dev).slice(0, 30), 'Revisão do dia') : toast('Nada pendente agora. Escolha um baralho!');
  raiz.querySelectorAll('[data-baralho]').forEach(b => b.onclick = () => {
    const A = AULAS[b.dataset.baralho];
    const peso = c => pendente(c.id) ? 0 : !P.itens[c.id] ? 1 : 2 + (P.itens[c.id].c || 0);
    jogarFlash(embaralhar(A.cards).sort((x, y) => peso(x) - peso(y)), 'Aula ' + A.aula);
  });
}

// ---------- a lição ----------
function jogarLicao(exercicios, { titulo, aoTerminar, bonus = 10 }) {
  history.pushState({ t: 'jogo' }, '');
  const fila = [...exercicios], total = exercicios.length, jaErrou = new Set();
  let feitos = 0, acertosDePrimeira = 0, vidas = VIDAS, seguidas = 0, xp = 0;
  const t0 = Date.now();

  function mostrar() {
    if (!fila.length) return fim();
    const e = fila[0], it = e.item;
    const rotulo = { card: [ic('cards'), 'RELEMBRE'], quiz: [ic('raio'), 'QUIZ'], vf: [ic('vf'), 'VERDADE OU MENTIRA?'], questao: [ic('questoes'), 'QUESTÃO DE PROVA'] }[e.tipo];
    const repetida = jaErrou.has(it.id) ? `<div class="lic-tipo repetida">${ic('repetir')} ERRO ANTERIOR</div>` : `<div class="lic-tipo t-${e.tipo}">${rotulo[0]} ${rotulo[1]}</div>`;
    let corpo = '';
    if (e.tipo === 'quiz' || e.tipo === 'questao') {
      const ordem = embaralhar(it.alternativas.map((t, k) => ({ t, k })));
      corpo = `<h2 class="lic-perg">${it.enunciado}</h2>${figuraDe(it)}
        <div class="opcoes">${ordem.map((o, n) => `<button class="opc" data-k="${o.k}"><span class="n">${n + 1}</span><span>${o.t}</span></button>`).join('')}</div>`;
    } else if (e.tipo === 'vf') {
      corpo = `<div class="fala-masc">${typeof mascoteAnim === 'function' ? mascoteAnim('pensando') : '<img src="mascote/pensando.webp" alt="">'}<div class="balao">${it.afirmacao}</div></div>${figuraDe(it)}
        <div class="opcoes vf2"><button class="opc" data-k="0"><span class="n">1</span><span>${ic('xis')} Mentira</span></button><button class="opc" data-k="1"><span class="n">2</span><span>${ic('certo')} Verdade</span></button></div>`;
    } else {
      corpo = `<div class="fala-masc">${typeof mascoteAnim === 'function' ? mascoteAnim('pensando') : '<img src="mascote/pensando.webp" alt="">'}<div class="balao">${it.frente}</div></div>
        <div class="verso-card" id="verso" hidden>${it.verso}</div>
        <p class="pense" id="pense">Pense na resposta antes de ver.</p>`;
    }
    tela(`<div class="lic">
      <div class="lic-top">
        <button class="fechar" id="fechar" aria-label="Sair da lição">${ic('fechar')}</button>
        <div class="lic-prog"><i style="width:${100 * feitos / total}%"></i>${seguidas >= 3 ? `<em>${premio('fogo')} ${seguidas} SEGUIDAS</em>` : ''}</div>
        <span class="vidas ${vidas <= 1 ? 'pouca' : ''}">${premio('coracao')}<b>${vidas}</b></span>
      </div>
      <div class="lic-corpo">${repetida}${corpo}</div>
      <footer class="lic-rod" id="rod">
        <div class="rod-dentro">
          <div class="rod-msg" id="msg"></div>
          <div class="rod-bts" id="bts">${e.tipo === 'card'
            ? `<button class="btn3d" id="mostrar">MOSTRAR RESPOSTA</button>`
            : `<button class="btn3d" id="verificar" disabled>VERIFICAR</button>`}</div>
        </div>
      </footer>
    </div>`);
    document.getElementById('fechar').onclick = () => { if (confirm('Sair agora? O progresso desta lição se perde.')) telaInicio(); };
    const tq = performance.now();
    let escolha = null, respondido = false;

    const teclas = ev => {
      if (ev.key === 'Enter') { const b = raiz.querySelector('.rod-bts button:not([disabled])'); if (b) { ev.preventDefault(); b.click(); } return; }
      const n = +ev.key; if (!respondido && n >= 1 && n <= 4) raiz.querySelectorAll('.opc')[n - 1]?.click();
    };
    document.addEventListener('keydown', teclas);
    pararJogo = () => document.removeEventListener('keydown', teclas);

    if (e.tipo === 'card') {
      document.getElementById('mostrar').onclick = () => {
        document.getElementById('verso').hidden = false; document.getElementById('pense').hidden = true;
        document.getElementById('bts').innerHTML = `<button class="btn3d branco" id="errei">ERREI</button><button class="btn3d verde" id="acertei">ACERTEI</button>`;
        document.getElementById('errei').onclick = () => resultado(false);
        document.getElementById('acertei').onclick = () => resultado(true);
      };
    } else {
      raiz.querySelectorAll('.opc').forEach(b => b.onclick = () => {
        if (respondido) return;
        raiz.querySelectorAll('.opc').forEach(x => x.classList.toggle('sel', x === b));
        escolha = +b.dataset.k; document.getElementById('verificar').disabled = false;
      });
      document.getElementById('verificar').onclick = () => {
        if (escolha === null) return;
        const ok = e.tipo === 'vf' ? (escolha === 1) === it.verdadeira : escolha === it.correta;
        raiz.querySelectorAll('.opc').forEach(x => {
          x.disabled = true;
          const k = +x.dataset.k, certa = e.tipo === 'vf' ? (k === 1) === it.verdadeira : k === it.correta;
          if (certa) x.classList.add('certa'); else if (k === escolha) x.classList.add('errada');
        });
        resultado(ok);
      };
    }

    function resultado(ok) {
      if (respondido) return; respondido = true;
      const primeira = !jaErrou.has(it.id);
      if (primeira) {
        registrar(it, e.tipo === 'card' ? 'card' : e.tipo, ok, performance.now() - tq);
        if (e.tipo === 'card') atualizarCaixa(it.id, ok);
        if (e.tipo === 'questao') { P.q ||= {}; P.q[it.id] = { ok, n: (P.q[it.id]?.n || 0) + 1 }; }
      }
      if (ok) { if (primeira) acertosDePrimeira++; feitos++; seguidas++; xp += primeira ? 2 : 1; som('ok'); }
      else {
        seguidas = 0; jaErrou.add(it.id); som('no');
        if (e.tipo !== 'card') vidas--;            // no "Relembre" o aluno se corrige sozinho: não perde vida
      }
      fila.shift();
      if (!ok) fila.push(e);                        // errou: volta no fim da lição
      if (e.tipo === 'card') return mostrar();      // card: segue direto

      const rod = document.getElementById('rod'); rod.classList.add(ok ? 'r-ok' : 'r-no');
      const cv = raiz.querySelector('.vidas'); cv.querySelector('b').textContent = vidas;
      if (!ok) { cv.classList.remove('perdeu'); void cv.offsetWidth; cv.classList.add('perdeu'); raiz.querySelector('.lic-prog em')?.remove(); }
      const barra = raiz.querySelector('.lic-prog i'); barra.style.width = `${100 * feitos / total}%`;
      if (ok) { barra.classList.remove('brilha'); void barra.offsetWidth; barra.classList.add('brilha'); }
      if (ok && seguidas >= 3) {          // foguinho de "acertos seguidos" pula na hora
        const pr = raiz.querySelector('.lic-prog'); let em = pr.querySelector('em');
        if (!em) { em = document.createElement('em'); pr.appendChild(em); }
        em.innerHTML = `${premio('fogo')} ${seguidas} SEGUIDAS`; em.classList.remove('pula'); void em.offsetWidth; em.classList.add('pula');
      }
      const elogios = ['MANDOU BEM!', 'ISSO AÍ!', 'EXCELENTE!', 'TÁ FERA!', 'PERFEITO!'];
      const certaTxt = e.tipo === 'vf' ? (it.verdadeira ? 'VERDADE' : 'MENTIRA') : it.alternativas[it.correta];
      const explic = e.tipo === 'questao' ? (it.resolucao || it.explicacao) : it.explicacao;
      document.getElementById('msg').innerHTML = `
        ${(() => { const pose = ok ? (seguidas >= 3 ? 'comemorando' : 'joinha') : (vidas <= 1 ? 'frustrado' : 'facepalm');
          return typeof mascoteAnim === 'function' && ANIMADOS.includes(pose) ? mascoteAnim(pose) : `<img src="mascote/${pose}.webp" alt="">`; })()}
        <div><b>${ok ? elogios[Math.floor(Math.random() * elogios.length)] : 'Resposta certa:'}</b>
        ${ok ? '' : `<div class="certa-txt">${certaTxt}</div>`}
        <div class="explic-txt">${explic || ''}</div></div>`;
      document.getElementById('bts').innerHTML = `<button class="btn3d ${ok ? 'verde' : 'vermelho'}" id="cont">CONTINUAR</button>`;
      document.getElementById('cont').onclick = () => vidas <= 0 ? semVidas() : mostrar();
      document.getElementById('cont').focus({ preventScroll: true });
    }
  }

  function semVidas() {
    pararJogo(); pararJogo = () => {};
    tela(`<main class="lic-fim">
      ${typeof mascoteAnim === 'function' ? mascoteAnim('frustrado') : '<img src="mascote/frustrado.webp" alt="">'}
      <h1>Acabaram <span>as vidas</span></h1>
      <p>Respira, relê a explicação e tenta de novo. Errar aqui é acertar na prova!</p>
      <div class="botoes2">
        <button class="btn3d" id="denovo">TENTAR DE NOVO</button>
        <button class="btn3d branco" id="volta">VOLTAR PARA A TRILHA</button>
      </div>
    </main>`);
    document.getElementById('denovo').onclick = () => jogarLicao(exercicios, { titulo, aoTerminar, bonus });
    document.getElementById('volta').onclick = telaInicio;
  }

  function fim() {
    pararJogo(); pararJogo = () => {};
    const pct = Math.round(100 * acertosDePrimeira / total), seg = Math.round((Date.now() - t0) / 1000);
    const ganho = xp + bonus;
    ganhar(ganho);
    if (aoTerminar) aoTerminar();
    som('fim');
    tela(`<main class="lic-fim">
      ${typeof mascoteAnim === 'function' ? mascoteAnim(pct >= 70 ? 'comemorando' : 'joinha', 'masc-pula') : `<img class="masc-pula" src="mascote/${pct >= 70 ? 'comemorando' : 'joinha'}.webp" alt="">`}
      <h1>Lição <span>concluída!</span></h1>
      <p class="fala">${pct === 100 ? 'GABARITOU!' : pct >= 70 ? 'TÁ FICANDO FERA!' : 'ERROU? AGORA NÃO ERRA MAIS!'}</p>
      <div class="caixas">
        <div class="cx cx-xp"><small>TOTAL DE XP</small><b>${premio('estrela')} <span id="xpfim">0</span></b></div>
        <div class="cx cx-prec"><small>${pct >= 90 ? 'MANDOU BEM' : 'PRECISÃO'}</small><b>${ic('alvo')} ${pct}%</b></div>
        <div class="cx cx-tempo"><small>TEMPO</small><b>${ic('relogio')} ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}</b></div>
      </div>
      <button class="btn3d verde" id="cont">CONTINUAR</button>
    </main>`);
    contarAte(document.getElementById('xpfim'), ganho);
    if (pct >= 70) confete();
    document.getElementById('cont').onclick = telaInicio;
  }

  mostrar();
}

iniciar();
