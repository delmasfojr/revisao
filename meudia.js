// prototipo-duolingo/meudia.js — aba "Meu dia": a agenda do aluno e o plano de estudo do dia.
// Cálculo em meudia-motor.js. Dados em P.agenda e P.planos (vão com o progresso; sem tabela nova).
// Carregar DEPOIS de progresso.js: os embrulhos abaixo ficam por fora dos outros.
const MD = window.MeuDiaMotor;
const ATALHOS = [
  { nome: 'Escola', dias: [1, 2, 3, 4, 5], ini: '07:00', fim: '12:30' },
  { nome: 'Trabalho', dias: [1, 2, 3, 4, 5], ini: '08:00', fim: '17:00' },
  { nome: 'Cursinho', dias: [1, 2, 3, 4, 5], ini: '19:00', fim: '22:00' },
  { nome: 'Academia', dias: [1, 3, 5], ini: '18:00', fim: '19:00' },
  { nome: 'Almoço', dias: [0, 1, 2, 3, 4, 5, 6], ini: '12:00', fim: '13:00' },
  { nome: 'Jantar', dias: [0, 1, 2, 3, 4, 5, 6], ini: '19:30', fim: '20:00' }
];
const LETRA_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const LIMITES = [[30, '30 min'], [60, '1 h'], [120, '2 h'], [180, '3 h'], [null, 'Todo o tempo livre']];
const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`;

// ---------- barra de baixo: "Meu dia" na frente ----------
const barraAntesDoMeuDia = barraInferior;
barraInferior = function (ativo) {
  return barraAntesDoMeuDia(ativo).replace('<nav class="nav-inf">',
    `<nav class="nav-inf sete"><button data-nav="dia" class="${ativo === 'dia' ? 'on' : ''}"><span>${ic('relogio')}</span>Meu dia</button>`);
};
const ligarBarraAntesDoMeuDia = ligarBarra;
ligarBarra = function () {
  ligarBarraAntesDoMeuDia();
  raiz.querySelector('[data-nav="dia"]')?.addEventListener('click', () => telaMeuDia());
};

// ---------- agenda (primeiro uso e edição) ----------
function telaAgenda(primeiro) {
  history.replaceState({ t: 'meudia' }, '');
  const r = JSON.parse(JSON.stringify(P.agenda || { acorda: '06:30', dorme: '23:00', maxMin: 120, fixos: [] }));
  const novo = { nome: '', dias: [1, 2, 3, 4, 5], ini: '08:00', fim: '12:00' };
  let ja = false;
  const desenhar = () => {
    const y = window.scrollY;
    tela(`${topoTrilha()}<main class="md">
      <h1 style="margin-top:16px">${primeiro ? 'Monte o seu <span>dia</span>' : 'Sua <span>agenda</span>'}</h1>
      <p class="md-intro">Diga seus compromissos uma vez. Todo dia eu monto o estudo nas horas que sobram.</p>
      <div class="md-card"><b>Seu horário</b>
        <div class="md-linha"><label>Acordo <input type="time" id="ag-acorda" value="${r.acorda}"></label>
          <label>Durmo <input type="time" id="ag-dorme" value="${r.dorme}"></label></div></div>
      <div class="md-card"><b>Compromissos fixos</b>
        ${r.fixos.length ? r.fixos.map((f, i) => `<div class="md-fixo"><span><b>${esc(f.nome)}</b><small>${f.dias.map(d => LETRA_DIA[d]).join(' ')} · ${f.ini}–${f.fim}</small></span>
          <button class="md-x" data-tira="${i}" aria-label="Tirar ${esc(f.nome)}">${ic('fechar')}</button></div>`).join('') : '<p class="md-vazio">Nenhum ainda.</p>'}
        <div class="md-atalhos">${ATALHOS.map((a, i) => `<button class="md-chip" data-atalho="${i}">${esc(a.nome)}</button>`).join('')}</div>
        <input id="ag-nome" placeholder="Nome (ex.: Escola)" value="${esc(novo.nome)}">
        <div class="md-dias">${LETRA_DIA.map((l, d) => `<button class="md-dia ${novo.dias.includes(d) ? 'on' : ''}" data-dia="${d}">${l}</button>`).join('')}</div>
        <div class="md-linha"><label>Das <input type="time" id="ag-ini" value="${novo.ini}"></label>
          <label>às <input type="time" id="ag-fim" value="${novo.fim}"></label></div>
        <button class="btn3d" id="ag-add">+ ADICIONAR</button></div>
      <div class="md-card"><b>Quanto estudar por dia, no máximo?</b>
        <div class="md-atalhos">${LIMITES.map(([v, t]) => `<button class="md-chip ${r.maxMin === v ? 'on' : ''}" data-lim="${v}">${t}</button>`).join('')}</div></div>
      <button class="btn3d verde md-salvar" id="ag-ok">${primeiro ? 'BORA!' : 'SALVAR'}</button>
    </main>${barraInferior('dia')}`);
    if (ja) window.scrollTo(0, y);
    ja = true;
    ligarBarra();
    const le = () => { novo.nome = document.getElementById('ag-nome').value.trim(); novo.ini = document.getElementById('ag-ini').value; novo.fim = document.getElementById('ag-fim').value;
      r.acorda = document.getElementById('ag-acorda').value || r.acorda; r.dorme = document.getElementById('ag-dorme').value || r.dorme; };
    raiz.querySelectorAll('[data-tira]').forEach(b => b.onclick = () => { le(); r.fixos.splice(+b.dataset.tira, 1); desenhar(); });
    raiz.querySelectorAll('[data-atalho]').forEach(b => b.onclick = () => { le(); Object.assign(novo, JSON.parse(JSON.stringify(ATALHOS[+b.dataset.atalho]))); desenhar(); });
    raiz.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { le(); const d = +b.dataset.dia;
      novo.dias = novo.dias.includes(d) ? novo.dias.filter(x => x !== d) : [...novo.dias, d].sort(); desenhar(); });
    raiz.querySelectorAll('[data-lim]').forEach(b => b.onclick = () => { le(); r.maxMin = b.dataset.lim === 'null' ? null : +b.dataset.lim; desenhar(); });
    document.getElementById('ag-add').onclick = () => {
      le();
      if (!novo.nome) return toast('Dê um nome ao compromisso.');
      if (!novo.dias.length) return toast('Escolha pelo menos um dia.');
      if (MD.hm(novo.fim) <= MD.hm(novo.ini)) return toast('O compromisso tem que acabar no mesmo dia (antes da meia-noite).');
      r.fixos.push({ nome: novo.nome, dias: [...novo.dias], ini: novo.ini, fim: novo.fim });
      Object.assign(novo, { nome: '', dias: [1, 2, 3, 4, 5], ini: '08:00', fim: '12:00' });
      desenhar();
    };
    document.getElementById('ag-ok').onclick = () => {
      le();
      if (r.dorme === r.acorda) return toast('Acordar e dormir não podem ser no mesmo horário.');
      P.agenda = r;
      const p = (P.planos ||= {})[hoje()]; if (p) p.gerado = 0;   // agenda mudou: refaz o plano de hoje
      salvar();
      telaMeuDia();
    };
  };
  desenhar();
}

// ---------- contexto: o que o aluno tem para fazer agora ----------
const ROTULO = { cards: 'Revisão do dia', erros: 'Caderno de erros', trilha: 'Avançar na trilha', enem: 'Plano ENEM', fraco: 'Treinar ponto fraco' };
const ICONE = { cards: 'cards', erros: 'livro', trilha: 'estrela', enem: 'alvo', fraco: 'raio' };
const agoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

function pontoFraco() {   // mesmo critério do "Precisa melhorar" (progresso.js), só aulas numeradas
  const taxa = s => s.length ? [...s].filter(c => c === '1').length / s.length : 0;
  const t = Object.entries(P.est?.top || {}).map(([k, s]) => { const [aulaN, topico] = k.split('|');
    return { aula: aulaN, topico, n: s.length, acc: taxa(s.slice(-10)), agora: taxa(s.slice(-5)) }; })
    .filter(t => /^\d+$/.test(t.aula) && AULAS[t.aula] && t.n >= 4 && t.acc < .7 && !(t.n >= 8 && t.agora >= .8))
    .sort((a, b) => a.acc - b.acc)[0];
  return t ? { aula: t.aula, topico: t.topico } : null;
}
const carregarAulas = () => Promise.all(listaAulas().map(a => aula(a.aula)));
async function contextoDoDia() {
  await carregarAulas();
  if (typeof migrarEstudo === 'function') migrarEstudo();   // sem salvar(): só prepara P.est
  migrarCaderno();
  return {
    cards: listaAulas().flatMap(a => AULAS[a.aula]?.cards || []).filter(c => pendente(c.id)).length,
    erros: contarCaderno(),
    temLicao: listaAulas().some(a => AULAS[a.aula] && feitosNa(a.aula) < nosDa(AULAS[a.aula]).length),
    usaEnem: !!(P.enem && (P.enem.nivel || Object.keys(P.enem.n || {}).length)),
    fraco: pontoFraco(),
    seg: MD.segundosPorResposta(P.est)
  };
}

// ---------- o plano de hoje ----------
async function planoDeHoje(forcar = false) {
  const d = hoje(), pl = (P.planos ||= {});
  pl[d] ||= { extras: [], blocos: [], pend: MD.pendenciasDeOntem(pl, d), gerado: 0 };
  const p = pl[d];
  if (!p.gerado || forcar) {
    const ctx = await contextoDoDia();
    const pendAbertas = p.pend.filter(x => !p.blocos.some(b => b.pend && b.feito && b.tipo === x.tipo));
    p.blocos = MD.planejar({ agenda: P.agenda, data: d, extras: p.extras, agora: agoraMin(),
      fila: MD.montarFila({ ...ctx, pend: pendAbertas }), enche: [ctx.temLicao && 'trilha', ctx.usaEnem && 'enem'].filter(Boolean),
      feitos: p.blocos.filter(b => b.feito) });
    p.gerado = Date.now();
    MD.limpar(pl, d);
    // ação do aluno (replanejar, +Só hoje) salva de verdade; montagem automática grava só no aparelho,
    // sem mexer em atualizado_em (não carimba um P antigo como o mais novo).
    if (forcar) salvar(); else Backend.gravar('rev_prog', P);
  }
  return p;
}

// ---------- a tela ----------
let carimbar = -1;   // bloco que acabou de ser marcado (anima o carimbo)
let diaDesenhado = null;   // dia da última vez que o Meu dia foi desenhado
async function telaMeuDia() {
  history.replaceState({ t: 'meudia' }, '');
  if (!P.agenda) return telaAgenda(true);
  let p;
  try { await carregarAulas(); p = await planoDeHoje(); }
  catch (e) { console.error(e); toast('Não consegui montar o seu dia agora. Tente de novo.'); return telaInicio(); }
  const d = hoje(), dia = MD.diaDaSemana(d);
  diaDesenhado = d;
  const comp = [...P.agenda.fixos.filter(f => f.dias.includes(dia)), ...p.extras.map(e => ({ ...e, extra: true }))];
  const livre = MD.janelasLivres(P.agenda, d, p.extras, agoraMin()).reduce((s, j) => s + j.fim - j.ini, 0);
  const plan = p.blocos.reduce((s, b) => s + MD.hm(b.fim) - MD.hm(b.ini), 0);
  const titulo = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const linhas = [
    ...comp.map(c => ({ t: MD.hm(c.ini), html: `<div class="md-comp"><span class="md-h">${c.ini}–${c.fim}</span><b>${esc(c.nome)}</b>${c.extra ? '<small>só hoje</small>' : ''}</div>` })),
    ...p.blocos.map((b, i) => ({ t: MD.hm(b.ini), bloco: true, html: `<div class="md-bloco ${b.feito ? 'feito' : ''}">
      <button class="md-marca" data-marca="${i}" aria-label="${b.feito ? 'Desmarcar' : 'Marcar como feito'}">${ic(b.feito ? 'certo' : ICONE[b.tipo])}</button>
      <span class="md-txt"><span class="md-h">${b.ini}–${b.fim}</span><b>${ROTULO[b.tipo]}</b>
        <small>${b.tipo === 'cards' || b.tipo === 'erros' ? `${b.feitos}/${b.meta} ${b.tipo === 'cards' ? 'cards' : 'erros'}` : b.tipo === 'fraco' ? esc(b.alvo?.topico || '') : b.pend ? 'ficou de ontem' : ''}</small></span>
      ${b.feito ? `<span class="md-carimbo ${i === carimbar ? 'bate' : ''}">FEITO</span>` : `<button class="btn3d md-bora" data-bora="${i}">BORA!</button>`}</div>` }))
  ].sort((a, b) => a.t - b.t).map((x, i, v) => (i && x.bloco && v[i - 1].bloco ? '<div class="md-pausa" aria-hidden="true"></div>' : '') + x.html).join('');
  carimbar = -1;
  const pendAviso = p.pend.length && !p.blocos.every(b => !b.pend || b.feito)
    ? `<div class="md-aviso">Ontem ficou ${p.pend.length === 1 ? (p.pend[0].tipo === 'enem' ? 'um treino do ENEM' : 'uma lição') : 'uma lição e um treino do ENEM'} para trás — já pus no plano de hoje.</div>` : '';
  tela(`${topoTrilha()}<main class="md">
    <div class="md-topo"><h1>${esc(titulo[0].toUpperCase() + titulo.slice(1))}</h1>
      <button class="md-engr" id="md-agenda" aria-label="Editar agenda">${ic('engrenagem')}</button></div>
    <p class="md-resumo">Hoje você tem <b>${fmtDur(livre)} livres</b> → plano de <b>${fmtDur(plan)}</b></p>
    ${pendAviso}
    ${p.blocos.length ? `<div class="md-linha-tempo">${linhas}</div>`
      : `<div class="md-vazio-dia"><img src="mascote/cafe.webp" alt=""><p>Hoje não sobrou tempo... amanhã a gente compensa!</p></div>${comp.length ? `<div class="md-linha-tempo">${linhas}</div>` : ''}`}
    <div class="md-acoes"><button class="btn3d" id="md-replan">${ic('repetir')} REPLANEJAR AGORA</button>
      <button class="btn3d" id="md-extra">+ SÓ HOJE</button></div>
    <form class="md-card" id="md-fextra" hidden><b>Compromisso só de hoje</b>
      <input id="ex-nome" placeholder="Ex.: Dentista" required>
      <div class="md-linha"><label>Das <input type="time" id="ex-ini" required></label><label>às <input type="time" id="ex-fim" required></label></div>
      <button class="btn3d verde">ADICIONAR E REPLANEJAR</button></form>
  </main>${barraInferior('dia')}`);
  ligarBarra();
  document.getElementById('md-agenda').onclick = () => telaAgenda(false);
  document.getElementById('md-replan').onclick = async () => { await planoDeHoje(true); toast('Plano refeito a partir de agora.'); telaMeuDia(); };
  document.getElementById('md-extra').onclick = () => { const f = document.getElementById('md-fextra'); f.hidden = !f.hidden; };
  document.getElementById('md-fextra').onsubmit = async e => {
    e.preventDefault();
    const nome = document.getElementById('ex-nome').value.trim(), ini = document.getElementById('ex-ini').value, fim = document.getElementById('ex-fim').value;
    if (MD.hm(fim) <= MD.hm(ini)) return toast('O compromisso tem que acabar no mesmo dia (antes da meia-noite).');
    const cur = P.planos?.[hoje()];
    if (hoje() !== d || cur !== p) return telaMeuDia();   // virou o dia: redesenha
    p.extras.push({ nome, ini, fim });
    await planoDeHoje(true); telaMeuDia();
  };
  raiz.querySelectorAll('[data-marca]').forEach(b => b.onclick = () => { if (hoje() !== d || P.planos?.[hoje()] !== p) return telaMeuDia(); const bl = p.blocos[+b.dataset.marca]; MD.alternar(bl); carimbar = bl.feito ? +b.dataset.marca : -1; salvar(); telaMeuDia(); });
  raiz.querySelectorAll('[data-bora]').forEach(b => b.onclick = () => { if (hoje() !== d || P.planos?.[hoje()] !== p) return telaMeuDia(); irParaBloco(p, p.blocos[+b.dataset.bora]); });
}

// virou o dia com o app aberto: se estiver no Meu dia, redesenha com o plano de hoje
function checarVirada() {
  if (document.visibilityState === 'hidden') return;
  if (diaDesenhado && hoje() !== diaDesenhado && history.state?.t === 'meudia') telaMeuDia();
}
document.addEventListener('visibilitychange', checarVirada);
window.addEventListener('focus', checarVirada);

// ---------- BORA!: abre a atividade do bloco ----------
async function irParaBloco(p, b) {
  try { await carregarAulas(); } catch (e) { console.error(e); return toast('Não consegui carregar as aulas. Tente de novo.'); }
  if (b.tipo === 'cards') {
    const dev = listaAulas().flatMap(a => AULAS[a.aula].cards).filter(c => pendente(c.id));
    if (!dev.length) { b.feitos = b.meta; b.feito = true; salvar(); toast('Nenhum card pendente agora. Bloco feito!'); return telaMeuDia(); }
    return jogarFlash(embaralhar(dev).slice(0, Math.max(1, b.meta - b.feitos)), 'Revisão do dia');
  }
  if (b.tipo === 'erros') return telaCaderno();
  if (b.tipo === 'fraco') return b.alvo ? telaAula(b.alvo.aula) : telaMeuDia();
  if (b.tipo === 'enem') {
    let mapa = null; try { mapa = await carregarEnem('emapa'); } catch {}
    if (!mapa?.casas?.length) return toast(FALHA_ENEM);
    const est = estadoEnem(), c = M_.ordemPlano(mapa, est).find(c => ilhaAberta(mapa, est, c.id));
    return c ? treinarCasa(mapa, c) : telaPlanoEnem();
  }
  for (const a of listaAulas()) {   // trilha: a próxima etapa aberta
    const A = AULAS[a.aula], nos = nosDa(A), idx = feitosNa(a.aula);
    if (idx >= nos.length) continue;
    const no = nos[idx];
    if (no.tipo === 'bau') return abrirBau(a.aula, idx);
    const ex = no.tipo === 'licao' ? exerciciosDaLicao(A, no.grupo) : exerciciosDoDesafio(A);
    return jogarLicao(ex, { titulo: `Aula ${a.aula} · ${no.nome}`, aoTerminar: () => concluirNo(a.aula, idx), bonus: no.tipo === 'desafio' ? 20 : 10, sair: telaMeuDia });
  }
  toast('Você já concluiu a trilha toda!');
}

// ---------- marcar sozinho: cada resposta / lição concluída soma no bloco de hoje ----------
// meudia.js é carregado por último, então este embrulho roda antes dos outros: dá para ver o caderno antes de ele mudar.
const registrarAntesDoMeuDia = registrar;
registrar = function (item, tipo, acertou, ms) {
  const eraErro = acertou && errosDoCaderno().some(x => x.id === item.id);
  registrarAntesDoMeuDia(item, tipo, acertou, ms);
  const p = P.planos?.[hoje()];
  if (!p) return;
  let mudou = false;
  if (ehDoEnem(item.id)) mudou = !!MD.marcar(p, 'enem');
  else {
    if (eraErro) mudou = !!MD.marcar(p, 'erros');
    else if (tipo === 'card') mudou = !!MD.marcar(p, 'cards');
    if (tipo !== 'card') mudou = !!MD.marcar(p, 'fraco', 1, a => a && a.aula === aulaDoItem(item.id)) || mudou;
  }
  if (mudou) salvar();
};
const concluirNoAntesDoMeuDia = concluirNo;
concluirNo = function (num, idx) {
  concluirNoAntesDoMeuDia(num, idx);
  const p = P.planos?.[hoje()];
  const no = (typeof AULAS !== 'undefined' && AULAS[num]) ? nosDa(AULAS[num])[idx] : null;
  if (no?.tipo === 'bau') return;   // abrir o baú não é lição
  if (p && MD.marcar(p, 'trilha')) salvar();
};
