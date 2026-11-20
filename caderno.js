// Caderno de erros: toda pergunta de quiz, V/F ou questão de prova que o aluno erra entra aqui
// (em qualquer modo: lição da trilha, Quiz relâmpago, Verdade ou mentira, Banco de questões).
// Sai do caderno quando ele acerta 2 vezes seguidas (cada rodada conta só a 1ª tentativa).
// Os flashcards não entram: eles já têm a Revisão do dia.
// Fica em P.caderno = { id: { t: tipo, e: nº de erros, s: acertos seguidos, d: data do último erro } }
// e P.limpos = quantas perguntas o aluno já tirou do caderno.

const ACERTOS_PARA_SAIR = 2;
// ícone da aba: caderno com espiral e um X
ICONES.caderno = '<path d="M6 2.5h11.5A2.5 2.5 0 0 1 20 5v14a2.5 2.5 0 0 1-2.5 2.5H6z" opacity=".75"/><path d="M3.5 6.5h4M3.5 12h4M3.5 17.5h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M10.5 9.5l5 5m0-5l-5 5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>';
const TIPOS_CADERNO = ['quiz', 'vf', 'questao'];

function caderno() { return (P.caderno ||= {}); }

// toda resposta passa por registrar(): é aqui que o caderno fica sabendo de erros e acertos
const registrarOriginal = registrar;
registrar = function (item, tipo, acertou, ms) {
  registrarOriginal(item, tipo, acertou, ms);
  if (TIPOS_CADERNO.includes(tipo)) anotarNoCaderno(item.id, tipo, acertou);
};

function anotarNoCaderno(id, tipo, acertou) {
  const C = caderno(), x = C[id];
  if (!acertou) {
    C[id] = { t: tipo, e: (x?.e || 0) + 1, s: 0, d: Date.now() };
  } else if (x) {
    x.s = (x.s || 0) + 1;
    if (x.s >= ACERTOS_PARA_SAIR) { delete C[id]; P.limpos = (P.limpos || 0) + 1; }
  }
  salvar();
}

// quem já usava o app antes do caderno: os erros antigos (Banco de questões e lições) entram nele uma vez
function migrarCaderno() {
  if (P.cadernoV) return;
  const C = caderno();
  for (const [id, r] of Object.entries(P.q || {})) if (r && !r.ok && !C[id]) C[id] = { t: 'questao', e: 1, s: 0, d: Date.now() };
  for (const [id, v] of Object.entries(P.vistos || {})) if (v === 0 && !C[id]) C[id] = { t: id.includes('-v') ? 'vf' : 'quiz', e: 1, s: 0, d: Date.now() };
  P.cadernoV = 1;
  salvar();
}

// acha a pergunta (o conteúdo vem das aulas já carregadas)
function itemDoCaderno(id) {
  const A = AULAS[aulaDoItem(id)];
  if (!A) return null;
  for (const [tipo, lista] of [['quiz', A.quiz], ['vf', A.vf], ['questao', A.questoes]])
    for (const it of lista || []) if (it.id === id) return { tipo, item: it };
  return null;
}
// erros que ainda existem no conteúdo (uma pergunta apagada de uma aula some do caderno sem quebrar nada)
function errosDoCaderno() {
  return Object.entries(caderno()).map(([id, r]) => ({ id, r, ex: itemDoCaderno(id) })).filter(x => x.ex);
}
function contarCaderno() { return P ? errosDoCaderno().length : 0; }

// ---------- a tela ----------
async function telaCaderno() {
  history.replaceState({ t: 'inicio' }, '');
  await Promise.all(listaAulas().map(a => aula(a.aula)));
  migrarCaderno();
  const erros = errosDoCaderno();
  const porAula = {};
  for (const x of erros) (porAula[aulaDoItem(x.id)] ||= []).push(x);
  const limpos = P.limpos || 0;
  const rotulo = { quiz: 'QUIZ', vf: 'V OU F', questao: 'PROVA' };

  tela(`${topoTrilha()}<main class="trilha caderno">
    <h1 style="margin-top:16px">Caderno <span>de erros</span></h1>
    <p class="cards-intro">Tudo o que você errou fica aqui. Acerte <b>${ACERTOS_PARA_SAIR} vezes seguidas</b> e a pergunta sai do caderno.</p>
    <button class="revdia-cards ${erros.length ? '' : 'vazia'}" id="refazer">
      <img src="mascote/${erros.length ? 'desafiando' : 'comemorando'}.webp" alt="">
      <span><b>${erros.length ? 'Refazer meus erros' : 'Caderno limpo!'}</b><small>${erros.length
        ? `${erros.length} pergunta${erros.length > 1 ? 's' : ''} esperando a revanche`
        : 'Nenhum erro pendente. Errar aqui é acertar na prova!'}</small></span>
    </button>
    <div class="cards-dom">${ic('certo')} <b>${limpos}</b> pergunta${limpos === 1 ? '' : 's'} já saíram do caderno</div>
    ${listaAulas().filter(a => porAula[a.aula]).map(a => {
      const xs = porAula[a.aula].sort((p, q) => q.r.e - p.r.e || q.r.d - p.r.d);
      return `<div class="bloco-nome">Aula ${a.aula} · ${esc(a.titulo)}</div>
      <button class="baralho cad-aula" data-refazer="${a.aula}">
        <span class="num">${xs.length}</span>
        <span class="txt"><b>Refazer os erros desta aula</b><small>${xs.length} pergunta${xs.length > 1 ? 's' : ''}</small></span>
      </button>
      <div class="cad-lista">${xs.map(x => {
        const it = x.ex.item, perg = x.ex.tipo === 'vf' ? it.afirmacao : it.enunciado;
        return `<button class="cad-item" data-ver="${esc(x.id)}">
          <span class="cad-tag t-${x.ex.tipo}">${rotulo[x.ex.tipo]}</span>
          <span class="cad-perg">${perg}</span>
          <span class="cad-info">${esc(it.topico)} · errou ${x.r.e}x${x.r.s ? ` · ${ic('certo')} ${x.r.s} de ${ACERTOS_PARA_SAIR}` : ''}</span>
        </button>`;
      }).join('')}</div>`;
    }).join('')}
  </main>${barraInferior('erros')}`);
  ligarBarra();

  // mais erradas primeiro, depois as mais antigas; no máximo 12 por rodada
  const rodada = xs => xs.sort((p, q) => q.r.e - p.r.e || p.r.d - q.r.d).slice(0, POR_LICAO).map(x => x.ex);
  const jogar = (xs, titulo) => jogarLicao(embaralhar(rodada(xs)), { titulo, bonus: 10, vidas: Infinity, sair: telaCaderno });
  document.getElementById('refazer').onclick = () => erros.length ? jogar(erros, 'Caderno de erros') : telaInicio();
  raiz.querySelectorAll('[data-refazer]').forEach(b => b.onclick = () => jogar(porAula[b.dataset.refazer], 'Caderno · Aula ' + b.dataset.refazer));
  raiz.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => {
    const ex = itemDoCaderno(b.dataset.ver);
    if (ex) abrirExplicacao([{ e: ex, marcou: null }]);
  });
}
