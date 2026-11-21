// Plano ENEM — telas. A lógica fica em enem-motor.js (EnemMotor).
const ENEM_DADOS = {};
const M_ = window.EnemMotor;
function estadoEnem() { return (P.enem ||= M_.novoEstado()); }
async function carregarEnem(id) {
  if (!ENEM_DADOS[id]) {
    ENEM_DADOS[id] = await Backend.carregarAula(id, { blocos: [{ aulas: [{ aula: id, arquivo: `enem/${id}.json` }] }] });
    // as casas (eNN) entram em AULAS para "Como resolver" achar os cards do assunto e o Caderno de erros achar as perguntas
    if (id !== 'emapa' && id !== 'enivel') AULAS[id] = ENEM_DADOS[id];
  }
  return ENEM_DADOS[id];
}
// igual a carregarEnem, mas devolve null se a casa ainda não tem conteúdo (ilha lançada sem arquivo, falha de rede)
async function tentarEnem(id) { try { return await carregarEnem(id); } catch { return null; } }
const FALHA_ENEM = 'Não consegui carregar o Plano ENEM. Confira a internet.';
const PREPARANDO_ENEM = 'Essa ilha ainda está sendo preparada. Volte em breve!';
function rotuloIlha(c, cr, ab) {
  const estado = { verde: 'você domina', amarelo: 'quase lá', vermelho: 'precisa estudar', cinza: 'você ainda não viu' }[cr];
  return `${c.titulo}, cai ${c.peso.toFixed(1).replace('.', ',')} por prova, ${estado}${ab ? '' : ', fechada'}`;
}
// "vez" / "vezes" por prova (1,0 ou menos = singular)
function vezes(peso) { return `${peso.toFixed(1).replace('.', ',')} ${peso <= 1 ? 'vez' : 'vezes'}`; }
function porcento(x) { return Math.round(100 * x); }

async function telaPlanoEnem() {
  history.replaceState({ t: 'enem' }, '');
  let mapa;
  try { mapa = await carregarEnem('emapa'); } catch { return toast(FALHA_ENEM); }
  if (!mapa?.casas?.length) return toast(FALHA_ENEM);
  const est = estadoEnem();
  const lista = M_.ordemPlano(mapa, est), max = Math.max(...mapa.casas.map(c => c.peso));
  const semNivel = !est.nivel;
  const ZZ = [0, 70, 95, 40, -60, -95, -40, 50];
  let y = 10;
  const ilhas = lista.map((c, i) => {
    const d = M_.tamanhoIlha(c.peso, max), ab = M_.aberta(mapa, est, c.id), cr = M_.cor(est, c.id);
    const x = ZZ[i % ZZ.length], top = y; y += d + 28;
    const alvo = i === 0 && ab && cr !== 'verde' && !semNivel;
    return `<button class="ilha c-${cr} ${ab ? '' : 'fechada'} ${alvo ? 'alvo' : ''} ${d < 80 ? 'peq' : ''}" data-casa="${c.id}"
      style="--d:${d}px;--x:${x}px;top:${top}px" aria-label="${esc(rotuloIlha(c, cr, ab))}">
      <span class="nm">${esc(c.titulo)}</span><small>${c.peso.toFixed(1).replace('.', ',')}/prova</small>
      ${cr === 'verde' ? '<i class="bandeira"></i>' : ''}${ab ? '' : `<i class="cad">${ic('cadeado')}</i>`}</button>`;
  }).join('');
  const embreve = mapa.casas.filter(c => !c.lancada).length;
  tela(`${topoTrilha()}<main class="enem">
    <div class="enem-meta"><b>Você domina ${M_.dominioGeral(mapa, est)}%</b> do que mais cai<div class="bar"><i style="width:${M_.dominioGeral(mapa, est)}%"></i></div></div>
    ${semNivel ? `<div class="enem-chamada"><img src="mascote/desafiando.webp" alt=""><div><p>Faça o nivelamento para eu montar seu plano!</p><button class="btn3d" id="nivel">FAZER NIVELAMENTO</button></div></div>`
      : `<div class="enem-acoes"><button class="btn3d verde" id="rev">${ic('repetir')} REVISÃO DO DIA</button><button class="btn3d branco" id="nivel">REFAZER NIVELAMENTO</button></div>`}
    <h2 class="enem-tit">Seu <span>arquipélago</span></h2><p class="enem-sub">Ilha grande = cai muito. Conquiste as vermelhas primeiro!</p>
    <div class="arquipelago" style="height:${y + 20}px"><svg class="rota" aria-hidden="true"></svg>${ilhas}</div>
    ${embreve ? `<p class="enem-breve">+ ${embreve} ilhas em breve</p>` : ''}
  </main>${barraInferior('enem')}`);
  ligarBarra();
  desenharRota();
  document.getElementById('nivel').onclick = telaNivelamento;
  document.getElementById('rev')?.addEventListener('click', () => jogarRevisaoEnem(mapa));
  raiz.querySelectorAll('.ilha').forEach(b => b.onclick = ev => { ev.stopPropagation(); abrirIlha(mapa, b); });
  raiz.querySelector('.arquipelago').onclick = () => raiz.querySelectorAll('.ilha-pop').forEach(p => p.remove());
}

// a rota liga os centros das ilhas; usa getBoundingClientRect porque o zigue-zague é um transform (offsetLeft não o vê)
function desenharRota() {
  const caixa = raiz.querySelector('.arquipelago'), svg = caixa.querySelector('.rota'), r0 = caixa.getBoundingClientRect();
  const pts = [...caixa.querySelectorAll('.ilha')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left - r0.left + r.width / 2), Math.round(r.top - r0.top + r.height / 2)]; });
  svg.setAttribute('viewBox', `0 0 ${caixa.clientWidth} ${caixa.clientHeight}`);
  svg.innerHTML = pts.length > 1 ? `<path d="M${pts.map(p => p.join(' ')).join(' L')}" />` : '';
}

function abrirIlha(mapa, b) {
  raiz.querySelectorAll('.ilha-pop').forEach(p => p.remove());
  const est = estadoEnem(), c = mapa.casas.find(x => x.id === b.dataset.casa), ab = M_.aberta(mapa, est, c.id);
  const base = (c.prereq || []).map(p => mapa.casas.find(x => x.id === p)?.titulo).filter(Boolean).join(', ');
  const pop = document.createElement('div'); pop.className = `ilha-pop c-${M_.cor(est, c.id)}`;
  pop.style.top = `${b.offsetTop + b.offsetHeight + 10}px`;
  pop.innerHTML = `<b>${esc(c.titulo)}</b><p>Cai ${vezes(c.peso)} por prova · ${est.n[c.id] ? `você domina ${porcento(est.dom[c.id])}%` : 'você ainda não treinou'}</p>
    ${ab ? `<button class="btn3d branco" id="treinar">TREINAR</button>` : `<p>${ic('cadeado')} Abre quando você estiver bem em: ${esc(base)}</p>`}`;
  b.parentElement.appendChild(pop);
  pop.onclick = ev => ev.stopPropagation();
  pop.querySelector('#treinar')?.addEventListener('click', () => treinarCasa(mapa, c));
}

async function treinarCasa(mapa, c) {
  const A = await tentarEnem(c.id), est = estadoEnem();
  if (!A) return toast(PREPARANDO_ENEM);
  if (!(A.quiz || []).length && !(A.vf || []).length && !(A.questoes || []).length) return toast(PREPARANDO_ENEM);
  A.quiz ||= []; A.vf ||= []; A.questoes ||= [];
  const nos = nosDa(A), feitos = (est.trilha ||= {})[c.id] || 0, no = nos[Math.min(feitos, nos.length - 2)];
  const exs = no.tipo === 'desafio' ? exerciciosDoDesafio(A) : exerciciosDaLicao(A, no.grupo);
  if (!exs.length) return toast(PREPARANDO_ENEM);
  jogarLicao(exs, {
    titulo: `${c.titulo} · ${no.nome}`,
    aoResponder: (it, ok) => { M_.responder(est, c.id, ok); est.vistos[it.id] = ok ? 1 : 0; },
    aoTerminar: () => { est.trilha[c.id] = Math.min(feitos + 1, nos.length - 1); salvar(); },
    aoSair: telaPlanoEnem
  });
}

async function jogarRevisaoEnem(mapa) {
  const est = estadoEnem(), itens = {};
  for (const c of mapa.casas.filter(x => x.lancada && est.n[x.id])) {
    const A = await tentarEnem(c.id);
    if (!A) continue;
    itens[c.id] = [...(A.quiz || []).map(item => ({ ...item, _t: 'quiz' })), ...(A.questoes || []).map(item => ({ ...item, _t: 'questao' }))];
  }
  const lista = M_.revisaoDoDia(mapa, est, itens, Date.now(), 8);
  if (!lista.length) return toast('Nada para revisar agora. Treine uma ilha!');
  jogarLicao(lista.map(x => ({ tipo: x.item._t, item: x.item })), {
    titulo: 'Revisão do dia', bonus: 15,
    aoResponder: (it, ok) => { M_.responder(est, M_.casaDoItem(it.id), ok); est.vistos[it.id] = ok ? 1 : 0; },
    aoSair: telaPlanoEnem
  });
}

function telaNivelamento() {
  const op = [[15, 'Rápido', '~20 min'], [30, 'Completo', '~40 min'], [45, 'Prova inteira', '~1h30']];
  tela(`${cabecalho(true)}<main class="enem nivel-escolha">
    <img class="masc" src="mascote/estudando.webp" alt="">
    <h1>Nivela<span>mento</span></h1>
    <p>Quanto mais questões, mais certeiro fica o seu plano.</p>
    ${op.map(([n, t, d]) => `<button class="nivel-op" data-n="${n}"><b>${t}</b><span>${n} questões · ${d}</span></button>`).join('')}
  </main>`);
  raiz.querySelectorAll('.nivel-op').forEach(b => b.onclick = () => jogarNivelamento(+b.dataset.n));
}

async function jogarNivelamento(n) {
  let mapa, pool;
  try { mapa = await carregarEnem('emapa'); pool = (await carregarEnem('enivel')).quiz || []; } catch { return toast(FALHA_ENEM); }
  const qs = M_.montarNivelamento(mapa, pool, n);
  if (!qs.length) return toast('O nivelamento ainda está sendo preparado. Volte em breve!');
  const resp = []; let i = 0;
  history.pushState({ t: 'jogo' }, '');
  function mostrar() {
    if (i >= qs.length) return fimNivelamento(mapa, resp, n);
    const it = qs[i];
    tela(`<div class="lic"><div class="lic-top"><button class="fechar" id="fechar">${ic('fechar')}</button>
      <div class="lic-prog"><i style="width:${100 * i / qs.length}%"></i></div><span class="nivel-cont">${i + 1}/${qs.length}</span></div>
      <div class="lic-corpo"><div class="lic-tipo t-questao">${ic('alvo')} NIVELAMENTO</div>
      <h2 class="lic-perg">${it.enunciado}</h2>${figuraDe(it)}
      <div class="opcoes">${it.alternativas.map((t, k) => `<button class="opc" data-k="${k}"><span class="n">${'ABCDE'[k]}</span><span>${t}</span></button>`).join('')}</div></div>
      <footer class="lic-rod"><div class="rod-dentro"><div class="rod-bts"><button class="btn3d" id="ok" disabled>CONFIRMAR</button></div></div></footer></div>`);
    let esc_ = null;
    raiz.querySelectorAll('.opc').forEach(b => b.onclick = () => { raiz.querySelectorAll('.opc').forEach(x => x.classList.toggle('sel', x === b)); esc_ = +b.dataset.k; document.getElementById('ok').disabled = false; });
    document.getElementById('ok').onclick = () => {
      const ok = esc_ === it.correta;
      registrar(it, 'quiz', ok, 0);
      resp.push({ casa: M_.casaDoItem(it.id), ok, item: it }); i++; mostrar();
    };
    document.getElementById('fechar').onclick = () => { if (confirm('Sair do nivelamento? As respostas se perdem.')) telaPlanoEnem(); };
  }
  mostrar();
}

function fimNivelamento(mapa, resp, n) {
  const est = estadoEnem();
  M_.aplicarNivelamento(est, resp.map(r => ({ casa: r.casa, ok: r.ok })), n);
  ganhar(20);
  const top = M_.ordemPlano(mapa, est).slice(0, 3);
  const motivo = c => `cai ${vezes(c.peso)} por prova${est.n[c.id] && est.dom[c.id] < 0.5 ? ' e você errou' : ''}`;
  tela(`<main class="lic-fim enem-res">
    ${typeof mascoteAnim === 'function' ? mascoteAnim('joinha') : '<img src="mascote/joinha.webp" alt="">'}
    <h1>Seu <span>plano</span></h1>
    <p class="fala">Você acertou ${est.nivel.acertos} de ${est.nivel.total}. Comece por:</p>
    <ol class="enem-top">${top.map(c => `<li class="c-${M_.cor(est, c.id)}"><b>${esc(c.titulo)}</b><small>${motivo(c)}</small></li>`).join('')}</ol>
    <button class="btn3d verde" id="ver">VER MEU ARQUIPÉLAGO</button></main>`);
  document.getElementById('ver').onclick = telaPlanoEnem;
}

// ---- imagens de questões reais do ENEM: largura total + toque para ampliar ----
const _figuraDe = figuraDe;
figuraDe = function (x) {
  if (!x || !x.figura || !String(x.figura).trim().startsWith('enem-img/')) return _figuraDe(x);
  const alt = esc(x.legenda || 'questão do ENEM');
  return `<figure class="figura enem-real"><img src="${esc(String(x.figura).trim())}" alt="${alt}" data-zoom tabindex="0" role="button" aria-label="Ampliar: ${alt}"><figcaption>Toque na imagem para ampliar${x.legenda ? ' · ' + esc(x.legenda) : ''}</figcaption></figure>`;
};
function ampliarImagem(src, alt) {
  const ov = document.createElement('div'); ov.className = 'enem-zoom'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Imagem ampliada');
  ov.innerHTML = `<button class="fechar" aria-label="Fechar imagem">${ic('fechar')}</button><div class="zoom-rolagem"><img src="${esc(src)}" alt="${esc(alt || '')}"></div>`;
  const fechar = () => { ov.remove(); document.removeEventListener('keydown', tecla, true); };
  const tecla = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); fechar(); } };
  ov.querySelector('.fechar').onclick = fechar;
  ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.classList.contains('zoom-rolagem')) fechar(); });
  document.addEventListener('keydown', tecla, true);
  document.body.appendChild(ov); ov.querySelector('.fechar').focus();
}
document.addEventListener('click', ev => { const im = ev.target.closest?.('.figura.enem-real img'); if (im) ampliarImagem(im.getAttribute('src'), im.alt); });
document.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches?.('.figura.enem-real img')) { ev.preventDefault(); ampliarImagem(ev.target.getAttribute('src'), ev.target.alt); } });

// o troféu do topo conta as lições concluídas; as do Plano ENEM ficam em P.enem.trilha, então somamos aqui
const _topoTrilha = topoTrilha;
topoTrilha = function () {
  const n = Object.values(P.enem?.trilha || {}).reduce((t, x) => t + x, 0);
  return n ? _topoTrilha().replace(/(title="Lições concluídas">[\s\S]*?<b>)(\d+)(<\/b>)/, (m, a, b, c) => a + (+b + n) + c) : _topoTrilha();
};

// ---- molde da questão (questões por molde): card no "Como resolver" ----
function cardDoMolde(it) {
  const m = it && it.molde && AULAS[aulaDoItem(it.id)]?.moldes?.[it.molde];
  if (!m) return '';
  const lista = (xs, tag) => xs.length ? `<${tag}>${xs.map(x => `<li>${x}</li>`).join('')}</${tag}>` : '';
  return `<div class="molde-card">
    <span class="molde-selo">${ic('alvo')} ESSE É UM MOLDE QUE CAI</span>
    <h3>${esc(m.nome)}</h3>
    ${m.reais ? `<p class="molde-freq">Apareceu em ${m.reais} questões das provas de 2010 a 2025.</p>` : ''}
    ${m.ideia ? `<p>${m.ideia}</p>` : ''}
    ${m.sinais?.length ? `<h4>Como reconhecer</h4>${lista(m.sinais.map(esc), 'ul')}` : ''}
    ${m.passos?.length ? `<h4>Roteiro</h4>${lista(m.passos, 'ol')}` : ''}
    ${m.armadilhas?.length ? `<h4>Cuidado com</h4>${lista(m.armadilhas.map(esc), 'ul class="molde-arm"')}` : ''}
    ${m.frase ? `<p class="molde-frase">${esc(m.frase)}</p>` : ''}
    <p class="molde-rev">${ic('repetir')} Na <b>Revisão do dia</b> vem outra questão desse molde.</p>
  </div>`;
}
