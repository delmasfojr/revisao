// Meu progresso: tempo de estudo, o que já revisou, pontos fortes, o que melhorou, o que falta melhorar,
// e as conquistas (medalhas com 5 níveis, que dão pontos de prêmio).
// Tudo fica em P.est (vai junto com o progresso do aluno para o banco):
//   ms: tempo total (ms) · dias: { 'AAAA-MM-DD': ms } · n / ok: respostas e acertos por tipo (card, quiz, vf, questao)
//   top: { 'NN|tópico': '1101…' } últimas respostas por tópico (1 = acertou) · recSeq: maior sequência de dias
// e P.conq = { id da conquista: nível já comemorado }.

const MAX_POR_RESPOSTA = 120e3;   // uma resposta conta no máximo 2 min de estudo (celular esquecido aberto não vira hora)
const SEG_ESTIMADO = 20e3;        // quem já usava o app: cada resposta antiga vale ~20 s de estudo
const TIPOS_EXERC = ['quiz', 'vf', 'questao'];

function est() {
  const E = (P.est ||= {});
  E.ms ||= 0; E.dias ||= {}; E.n ||= {}; E.ok ||= {}; E.top ||= {}; E.recSeq ||= 0;
  return E;
}
const tipoDoId = id => /-f\d/.test(id) ? 'card' : /-v\d/.test(id) ? 'vf' : /-p\d/.test(id) ? 'questao' : 'quiz';

// ---------- toda resposta passa por aqui ----------
const registrarAntesDoProgresso = registrar;
registrar = function (item, tipo, acertou, ms) {
  registrarAntesDoProgresso(item, tipo, acertou, ms);
  anotarEstudo(item, tipo, acertou, ms);
};
function anotarEstudo(item, tipo, acertou, ms) {
  migrarEstudo();   // o histórico antigo entra antes da 1ª resposta nova (senão ela contaria duas vezes)
  const E = est(), t = Math.max(0, Math.min(+ms || 0, MAX_POR_RESPOSTA)), d = hoje();
  E.ms += t; E.dias[d] = (E.dias[d] || 0) + t;
  E.n[tipo] = (E.n[tipo] || 0) + 1;
  if (acertou) E.ok[tipo] = (E.ok[tipo] || 0) + 1;
  const k = `${aulaDoItem(item.id)}|${item.topico || 'Geral'}`;
  E.top[k] = ((E.top[k] || '') + (acertou ? 1 : 0)).slice(-40);
  // guarda só os últimos 60 dias de tempo diário
  const dias = Object.keys(E.dias).sort();
  while (dias.length > 60) delete E.dias[dias.shift()];
  marcarDia();
  E.recSeq = Math.max(E.recSeq, sequenciaAtual());
  salvar();
  checarConquistas();
}
// lição concluída na trilha também pode liberar conquista (lições, aulas)
const concluirNoAntesDoProgresso = concluirNo;
concluirNo = function (num, idx) { concluirNoAntesDoProgresso(num, idx); checarConquistas(); };

// quem já usava o app antes desta tela: conta o histórico uma vez (precisa das aulas carregadas, por causa dos tópicos)
function migrarEstudo() {
  if (P.estV) return false;
  const E = est(), soma = (tipo, n, ok) => { E.n[tipo] = (E.n[tipo] || 0) + n; E.ok[tipo] = (E.ok[tipo] || 0) + ok; };
  const topico = {};
  for (const A of Object.values(AULAS)) for (const x of [...(A.cards || []), ...(A.quiz || []), ...(A.vf || []), ...(A.questoes || [])]) topico[x.id] = x.topico;
  const marca = (id, ok) => { const k = `${aulaDoItem(id)}|${topico[id] || 'Geral'}`; E.top[k] = ((E.top[k] || '') + (ok ? 1 : 0)).slice(-40); };
  let respostas = 0;
  for (const [id, it] of Object.entries(P.itens || {})) {
    const v = it.v || 0, e = Math.min(it.e || 0, v);
    soma('card', v, v - e); respostas += v;
    for (let i = 0; i < v; i++) marca(id, i >= e);   // erros primeiro, acertos depois (a ordem real não foi guardada)
  }
  for (const [id, r] of Object.entries(P.vistos || {})) { soma(tipoDoId(id), 1, r ? 1 : 0); respostas++; marca(id, r); }
  for (const [id, r] of Object.entries(P.q || {})) {
    const n = r?.n || 1; soma('questao', n, r?.ok ? 1 : 0); respostas += n;
    for (let i = 0; i < n; i++) marca(id, r?.ok && i === n - 1);
  }
  E.ms += respostas * SEG_ESTIMADO;
  E.recSeq = Math.max(E.recSeq, sequenciaAtual());
  P.estV = 1;
  return true;
}

// a trilha carrega todas as aulas ao abrir: é a hora de trazer o histórico antigo (e comemorar o que ele já tinha)
const telaInicioAntesDoProgresso = telaInicio;
telaInicio = async function (...args) {
  await telaInicioAntesDoProgresso(...args);
  if (migrarEstudo()) { salvar(); checarConquistas(); }
};

// ---------- números ----------
const somaTipos = (obj, tipos) => tipos.reduce((s, t) => s + (obj[t] || 0), 0);
const licoesFeitas = () => Object.values(P.trilha || {}).reduce((s, n) => s + n, 0);
const aulasConcluidas = () => Object.entries(P.trilha || {})
  .filter(([n, k]) => AULAS[n] ? k >= nosDa(AULAS[n]).length : k >= 5).length;
function fmtTempo(ms) {
  const min = Math.round(ms / 60e3);
  if (min < 1) return 'menos de 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ---------- conquistas ----------
const NIVEIS = [
  { nome: 'Bronze', cor: '#C77B3A', cor2: '#8E5222', bonus: 20 },
  { nome: 'Prata', cor: '#9AA7B8', cor2: '#64748A', bonus: 50 },
  { nome: 'Ouro', cor: '#F5B800', cor2: '#B98700', bonus: 100 },
  { nome: 'Diamante', cor: '#3FB6E8', cor2: '#1C7FAE', bonus: 200 },
  { nome: 'Lenda', cor: '#FF7A00', cor2: '#0F1B2D', bonus: 500 }
];
const CONQUISTAS = [
  { id: 'horas', nome: 'Horas de estudo', icone: 'relogio', metas: [1, 5, 10, 25, 50], un: 'h', valor: () => est().ms / 3.6e6 },
  { id: 'exerc', nome: 'Exercícios feitos', icone: 'alvo', metas: [50, 200, 500, 1000, 2500], valor: () => somaTipos(est().n, TIPOS_EXERC) },
  { id: 'cards', nome: 'Flashcards revisados', icone: 'cards', metas: [30, 150, 400, 1000, 2500], valor: () => est().n.card || 0 },
  { id: 'acertos', nome: 'Acertos', icone: 'certo', metas: [50, 250, 750, 2000, 5000], valor: () => somaTipos(est().ok, ['card', ...TIPOS_EXERC]) },
  { id: 'dias', nome: 'Dias seguidos', icone: 'fogo', metas: [3, 7, 15, 30, 60], valor: () => Math.max(est().recSeq, sequenciaAtual()) },
  { id: 'licoes', nome: 'Lições da trilha', icone: 'trofeu', metas: [5, 15, 40, 80, 150], valor: licoesFeitas },
  { id: 'aulas', nome: 'Aulas concluídas', icone: 'coroa', metas: [1, 5, 10, 20, 40], valor: aulasConcluidas },
  { id: 'limpos', nome: 'Erros corrigidos', icone: 'caderno', metas: [10, 40, 100, 250, 500], valor: () => P.limpos || 0 }
];
const nivelDe = c => { const v = c.valor(); let n = 0; while (n < c.metas.length && v >= c.metas[n]) n++; return n; };   // 0 = nenhum

// compara com o que já foi comemorado; o que for novo dá pontos e aparece numa faixa no topo
function checarConquistas(silencioso = false) {
  P.conq ||= {};
  const novas = [];
  for (const c of CONQUISTAS) {
    const n = nivelDe(c), antes = P.conq[c.id] || 0;
    for (let k = antes + 1; k <= n; k++) novas.push({ c, nivel: k });
    if (n > antes) P.conq[c.id] = n;
  }
  if (!novas.length) return [];
  const bonus = novas.reduce((s, x) => s + NIVEIS[x.nivel - 1].bonus, 0);
  P.xp = (P.xp || 0) + bonus;
  salvar();
  if (!silencioso) mostrarConquistas(novas, bonus);
  return novas;
}

function medalha(c, nivel, cls = '') {
  const N = NIVEIS[nivel - 1];
  return `<span class="medalha ${nivel ? '' : 'apagada'} ${cls}" style="${N ? `--m:${N.cor};--m2:${N.cor2}` : ''}">${ic(c.icone)}
    ${nivel ? `<i class="m-est">${'★'.repeat(nivel)}</i>` : ''}</span>`;
}

let filaConq = [], mostrandoConq = false;
function mostrarConquistas(novas, bonus) {
  // várias de uma vez (ex.: primeiro acesso a esta tela): uma faixa só, com a maior
  const top = novas.reduce((a, b) => b.nivel > a.nivel ? b : a);
  filaConq.push({ ...top, qtd: novas.length, bonus });
  if (!mostrandoConq) proximaConquista();
}
function proximaConquista() {
  const x = filaConq.shift();
  if (!x) { mostrandoConq = false; return; }
  mostrandoConq = true;
  const N = NIVEIS[x.nivel - 1];
  const el = document.createElement('div');
  el.className = 'faixa-conq';
  el.setAttribute('role', 'status');
  el.innerHTML = `${medalha(x.c, x.nivel)}<div><small>${x.qtd > 1 ? `${x.qtd} CONQUISTAS DESBLOQUEADAS!` : 'CONQUISTA DESBLOQUEADA!'}</small>
    <b>${esc(x.c.nome)} · ${N.nome}</b><span>+${x.bonus} pontos</span></div>`;
  el.onclick = () => el.classList.add('sai');
  document.body.appendChild(el);
  try { som('fim'); } catch {}
  try { confete(60); } catch {}
  setTimeout(() => el.classList.add('sai'), 3800);
  setTimeout(() => { el.remove(); proximaConquista(); }, 4300);
}

// ---------- tela ----------
async function telaProgresso() {
  history.replaceState({ t: 'progresso' }, '');
  await Promise.all(listaAulas().map(a => aula(a.aula)));
  if (migrarEstudo()) salvar();
  checarConquistas();   // antes de desenhar: os pontos do topo já vêm com o prêmio
  const E = est();

  // semana: minutos por dia
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * DIA); return { d, k: hoje(d), ms: E.dias[hoje(d)] || 0 }; });
  const maxDia = Math.max(...dias.map(x => x.ms), 15 * 60e3);
  const semana = dias.reduce((s, x) => s + x.ms, 0);
  const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  // tópicos: pontos fortes, o que melhorou, o que falta melhorar
  const nomeAula = num => AULAS[num]?.titulo || `Aula ${num}`;
  const taxa = s => s.length ? [...s].filter(c => c === '1').length / s.length : 0;
  const tops = Object.entries(E.top).map(([k, s]) => {
    const [aulaN, topico] = k.split('|'), rec = s.slice(-10);
    const antes = s.slice(0, -5), agora = s.slice(-5);
    return { aula: aulaN, topico, n: s.length, acc: taxa(rec), ganho: antes.length >= 3 && s.length >= 8 ? taxa(agora) - taxa(antes) : 0, antes: taxa(antes), agora: taxa(agora) };
  });
  const fracos = tops.filter(t => t.n >= 4 && t.acc < .7 && !(t.n >= 8 && t.agora >= .8))   // quem já virou o jogo nas últimas 5 sai do alerta.sort((a, b) => a.acc - b.acc).slice(0, 5);
  const fortes = tops.filter(t => t.n >= 5 && t.acc >= .85).sort((a, b) => b.acc - a.acc || b.n - a.n).slice(0, 5);
  const melhorou = tops.filter(t => t.ganho >= .2).sort((a, b) => b.ganho - a.ganho).slice(0, 5);
  const pct = x => `${Math.round(x * 100)}%`;
  const linhaTop = (t, extra) => `<div class="pg-top"><div><b>${esc(t.topico)}</b><small>Aula ${t.aula} · ${esc(nomeAula(t.aula))}</small></div>${extra}</div>`;

  // o que já revisou: itens vistos por aula
  const vistoNaAula = A => {
    const ids = [...(A.cards || []), ...(A.quiz || []), ...(A.vf || []), ...(A.questoes || [])].map(x => x.id);
    const vistos = ids.filter(id => P.itens?.[id]?.v || P.vistos?.[id] !== undefined || P.q?.[id]).length;
    return { vistos, total: ids.length };
  };
  const revis = listaAulas().map(a => ({ a, ...vistoNaAula(AULAS[a.aula]), licoes: feitosNa(a.aula), nos: nosDa(AULAS[a.aula]).length }));
  const comecadas = revis.filter(r => r.vistos || r.licoes);
  const naoComecadas = revis.length - comecadas.length;
  const cad = typeof contarCaderno === 'function' ? contarCaderno() : 0;

  const exerc = somaTipos(E.n, TIPOS_EXERC), okEx = somaTipos(E.ok, TIPOS_EXERC);
  const conqHtml = CONQUISTAS.map(c => {
    const n = nivelDe(c), v = c.valor(), prox = c.metas[n], ant = n ? c.metas[n - 1] : 0;
    const fmt = x => c.un === 'h' ? (x < 10 ? x.toFixed(1).replace('.', ',') : Math.floor(x)) + ' h' : Math.floor(x);
    const barra = prox ? Math.min(100, 100 * (v - ant) / (prox - ant)) : 100;
    return `<div class="conq ${n ? '' : 'trancada'}">${medalha(c, n)}<div class="conq-txt"><b>${esc(c.nome)}</b>
      <small>${n ? NIVEIS[n - 1].nome : 'Ainda não'}${prox ? ` · próximo: ${fmt(prox)} (${NIVEIS[n].nome}, +${NIVEIS[n].bonus} pts)` : ' · nível máximo!'}</small>
      <span class="conq-barra"><i style="width:${barra}%"></i></span><em>${fmt(v)}${prox ? ` de ${fmt(prox)}` : ''}</em></div></div>`;
  }).join('');
  const totalMedalhas = CONQUISTAS.reduce((s, c) => s + nivelDe(c), 0);

  tela(`<div class="topo-trilha"><div class="marca">Meu <span>progresso</span></div>
      <div class="st" title="Pontos">${premio('estrela')}<b>${P.xp || 0}</b></div></div>
    <main class="progresso">
      <section class="pg-resumo">
        <div><b>${ic('relogio')} ${fmtTempo(E.ms)}</b><small>de estudo</small></div>
        <div><b>${ic('alvo')} ${exerc}</b><small>exercícios${exerc ? ` · ${pct(okEx / exerc)} certos` : ''}</small></div>
        <div><b>${ic('cards')} ${E.n.card || 0}</b><small>flashcards revisados</small></div>
        <div><b>${premio('fogo')} ${sequenciaAtual()}</b><small>dias seguidos (recorde ${Math.max(E.recSeq, sequenciaAtual())})</small></div>
      </section>

      <h2 class="pg-h">Esta <span>semana</span></h2>
      <div class="pg-semana">
        <div class="pg-barras">${dias.map(x => `<div class="pg-dia ${x.k === hoje() ? 'hoje' : ''}"><span class="pg-min">${x.ms >= 60e3 ? Math.round(x.ms / 60e3) : ''}</span>
          <i style="height:${Math.max(x.ms ? 6 : 2, 100 * x.ms / maxDia)}%"></i><small>${SEM[x.d.getDay()]}</small></div>`).join('')}</div>
        <p>${semana ? `Você estudou <b>${fmtTempo(semana)}</b> nos últimos 7 dias.` : 'Nenhum estudo nos últimos 7 dias. Bora começar hoje?'}</p>
      </div>

      <h2 class="pg-h">Conquistas <span>${totalMedalhas} de ${CONQUISTAS.length * NIVEIS.length}</span></h2>
      <p class="pg-sub">Cada medalha tem 5 níveis: Bronze, Prata, Ouro, Diamante e Lenda. Todo nível novo dá pontos de prêmio.</p>
      <div class="conqs">${conqHtml}</div>

      <h2 class="pg-h">O que <span>melhorou</span></h2>
      ${melhorou.length ? `<div class="pg-lista">${melhorou.map(t => linhaTop(t, `<span class="pg-tag sobe">${pct(t.antes)} → ${pct(t.agora)}</span>`)).join('')}</div>`
        : `<p class="pg-vazio">Continue respondendo: quando um assunto que você errava passar a dar certo, ele aparece aqui.</p>`}

      <h2 class="pg-h">Precisa <span>melhorar</span></h2>
      ${fracos.length ? `<div class="pg-lista">${fracos.map(t => linhaTop(t, `<span class="pg-tag desce">${pct(t.acc)}</span><button class="pg-treinar" data-aula="${esc(t.aula)}">Treinar</button>`)).join('')}</div>`
        : `<p class="pg-vazio">Nenhum assunto em alerta agora. Mandou bem!</p>`}
      ${cad ? `<button class="pg-caderno" id="pg-caderno">${ic('caderno')} <span><b>${cad} ${cad === 1 ? 'pergunta' : 'perguntas'} no Caderno de erros</b><small>Acerte 2 vezes seguidas para tirar do caderno</small></span></button>` : ''}

      <h2 class="pg-h">Pontos <span>fortes</span></h2>
      ${fortes.length ? `<div class="pg-lista">${fortes.map(t => linhaTop(t, `<span class="pg-tag sobe">${pct(t.acc)}</span>`)).join('')}</div>`
        : `<p class="pg-vazio">Responda pelo menos 5 perguntas de um assunto para ver seus pontos fortes.</p>`}

      <h2 class="pg-h">O que já <span>revisou</span></h2>
      ${comecadas.length ? `<div class="pg-aulas">${comecadas.map(r => `<button class="pg-aula" data-aula="${esc(r.a.aula)}">
          <span class="num">${esc(r.a.aula)}</span><span class="txt"><b>${esc(AULAS[r.a.aula].titulo)}</b>
          <small>${r.vistos} de ${r.total} perguntas e cards vistos · trilha ${Math.min(r.licoes, r.nos)}/${r.nos}</small>
          <span class="conq-barra"><i style="width:${Math.round(100 * r.vistos / Math.max(1, r.total))}%"></i></span></span></button>`).join('')}</div>`
        : `<p class="pg-vazio">Você ainda não começou nenhuma aula. A trilha está te esperando!</p>`}
      ${naoComecadas && comecadas.length ? `<p class="pg-sub">${naoComecadas} ${naoComecadas === 1 ? 'aula ainda não começada' : 'aulas ainda não começadas'}.</p>` : ''}

      <button class="link av-sair" id="pg-sair">Sair da conta neste aparelho</button>
    </main>
    ${barraInferior('perfil')}`);
  ligarBarra();
  raiz.querySelectorAll('[data-aula]').forEach(b => b.onclick = () => telaAula(b.dataset.aula));
  document.getElementById('pg-caderno')?.addEventListener('click', () => telaCaderno());
  document.getElementById('pg-sair').onclick = () => { if (confirm('Sair da sua conta neste aparelho?')) Backend.sair().then(() => telaLogin()); };
}
