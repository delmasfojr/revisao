// App do aluno: login, flashcards com revisão espaçada, Quiz Relâmpago e Verdade ou Mentira.
const raiz = document.getElementById('raiz');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const embaralhar = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hoje = (d = new Date()) => d.toLocaleDateString('sv');   // AAAA-MM-DD
const INTERVALOS = [0, 1, 3, 7, 15, 30];                         // dias até rever, por caixa
const DIA = 864e5;

let USER = null, ACESSO = null, INDICE = null, P = null;
const AULAS = {};
let pararJogo = () => {};   // cancela cronômetros quando sai de um jogo

// ---------------- utilidades ----------------
function tela(html) { pararJogo(); pararJogo = () => {}; raiz.innerHTML = html; window.scrollTo(0, 0); }
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function cabecalho(voltar) {
  return `<header>
    ${voltar ? '<button data-acao="inicio" aria-label="Voltar">←</button>' : ''}
    <div class="marca">Revisão <span>Delmão</span></div>
    ${ACESSO === 'professor' ? `<button data-acao="painel" aria-label="Painel do professor" title="Painel do professor">${ic('grafico')}</button>` : ''}
    <button data-acao="sair" style="font-size:14px">Sair</button>
  </header>`;
}
raiz.addEventListener('click', e => {
  const b = e.target.closest('[data-acao]'); if (!b) return;
  const a = b.dataset.acao;
  if (a === 'inicio') telaInicio();
  else if (a === 'painel') location.href = 'painel.html';
  else if (a === 'sair') { if (confirm('Sair da sua conta neste aparelho?')) Backend.sair().then(() => telaLogin()); }
});

const listaAulas = () => INDICE.blocos.flatMap(b => b.aulas);
async function aula(num) {
  if (!AULAS[num]) {
    AULAS[num] = await Backend.carregarAula(num, INDICE);
  }
  return AULAS[num];
}
const aulaDoItem = id => id.split('-')[0];
// Figura de uma questão/card: campo "figura" no JSON. Pode ser um desenho SVG escrito no próprio
// JSON (fica protegido no banco junto com o resto) ou o caminho de uma imagem. Opcional: "legenda".
function figuraDe(x) {
  if (!x || !x.figura) return '';
  const f = String(x.figura).trim();
  const corpo = f.startsWith('<') ? f : `<img src="${esc(f)}" alt="${esc(x.legenda || 'figura da questão')}">`;
  return `<figure class="figura">${corpo}${x.legenda ? `<figcaption>${esc(x.legenda)}</figcaption>` : ''}</figure>`;
}

// ---------------- progresso ----------------
function progressoVazio() { return { itens: {}, xp: 0, seq: 0, ultimoDia: null, recordes: {} }; }
function salvar() { Backend.salvarProgresso(P); }
function marcarDia() {
  const h = hoje(); if (P.ultimoDia === h) return;
  P.seq = P.ultimoDia === hoje(new Date(Date.now() - DIA)) ? P.seq + 1 : 1;
  P.ultimoDia = h;
}
function sequenciaAtual() {
  return (P.ultimoDia === hoje() || P.ultimoDia === hoje(new Date(Date.now() - DIA))) ? P.seq : 0;
}
function ganhar(xp) { P.xp += xp; marcarDia(); salvar(); }
function atualizarCaixa(id, acertou) {
  const it = P.itens[id] || { c: 0, p: 0, v: 0, e: 0 };
  it.v++;
  if (acertou) { it.c = Math.min(5, it.c + 1); it.p = Date.now() + INTERVALOS[it.c] * DIA; }
  else { it.e++; it.c = 0; it.p = Date.now(); }
  P.itens[id] = it;
}
const pendente = id => { const it = P.itens[id]; return it && it.p <= Date.now(); };
const dominado = id => (P.itens[id]?.c || 0) >= 3;
function registrar(item, tipo, acertou, ms) {
  Backend.registrar({ item: item.id, tipo, aula: aulaDoItem(item.id), topico: item.topico, acertou, ms: Math.round(ms || 0) });
}

// ---------------- entrada ----------------
async function iniciar() {
  await Backend.iniciar();
  USER = await Backend.usuario();
  if (!USER) return telaLogin();
  // quem entrou pelo link do e-mail ou já usava o app antes de existir senha: oferece criar uma (pode pular)
  if (Backend.online && !USER.temSenha && !sessionStorage.getItem('rev_sem_senha')) return telaCriarSenha(false);
  await depoisDeEntrar();
}

async function depoisDeEntrar() {
  try {
    ACESSO = await Backend.acesso();
    if (ACESSO !== 'bloqueado') INDICE = await Backend.carregarIndice();
  } catch { tela(`<div class="login"><h1>Sem <span>conexão</span></h1><p>Não consegui falar com o servidor. Confira a internet e tente de novo.</p><button class="principal" onclick="location.reload()">Tentar de novo</button></div>`); return; }
  if (ACESSO === 'bloqueado') return telaBloqueado();
  P = (await Backend.carregarProgresso()) || progressoVazio();
  P.itens ||= {}; P.recordes ||= {}; P.q ||= {};
  Backend.enviarFila();
  telaInicio();
}

function telaLogin() {
  tela(`<div class="login">
    <img src="mascote/capa.webp" alt="">
    <h1>Revisão <span>Delmão</span></h1>
    <p>Flashcards e jogos de todas as aulas.</p>
    ${Backend.online ? '' : '<div class="aviso"><b>Modo teste:</b> o banco ainda não está ligado. Qualquer e-mail, senha ou código entram, e tudo fica salvo só neste aparelho.</div>'}
    <form id="f0">
      <label for="email">Seu e-mail de compra</label>
      <input id="email" type="email" autocomplete="username" inputmode="email" required placeholder="voce@email.com">
      <label for="senha" style="margin-top:10px;display:block">Senha</label>
      <input id="senha" type="password" autocomplete="current-password" required placeholder="Sua senha">
      <button class="principal" style="margin-top:14px">Entrar</button>
      <button type="button" class="link" id="primeiro">Primeiro acesso / esqueci a senha</button>
    </form>
    <form id="f1" hidden>
      <p>Vamos mandar um código para o seu e-mail. Depois você cria a sua senha e não precisa mais de código.</p>
      <label for="email1">Seu e-mail de compra</label>
      <input id="email1" type="email" autocomplete="email" inputmode="email" required placeholder="voce@email.com">
      <button class="principal" style="margin-top:14px">Receber código</button>
      <button type="button" class="link" data-voltar>Já tenho senha</button>
    </form>
    <form id="f2" hidden>
      <p id="enviado"></p>
      <label for="cod">Código de 6 dígitos</label>
      <input id="cod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required placeholder="000000">
      <button class="principal" style="margin-top:14px">Continuar</button>
      <button type="button" class="link" data-voltar>Voltar</button>
    </form>
    <div class="erro" id="err"></div>
  </div>`);
  const f0 = document.getElementById('f0'), f1 = document.getElementById('f1'), f2 = document.getElementById('f2'), err = document.getElementById('err');
  const mostrar = f => { for (const x of [f0, f1, f2]) x.hidden = x !== f; err.textContent = ''; };
  let email = '';
  document.getElementById('primeiro').onclick = () => {
    document.getElementById('email1').value = document.getElementById('email').value;
    mostrar(f1); document.getElementById('email1').focus();
  };
  document.querySelectorAll('[data-voltar]').forEach(b => b.onclick = () => mostrar(f0));
  f0.onsubmit = async e => {
    e.preventDefault(); err.textContent = '';
    const b = f0.querySelector('button.principal'); b.disabled = true; b.textContent = 'Entrando…';
    const r = await Backend.entrarComSenha(document.getElementById('email').value.trim().toLowerCase(), document.getElementById('senha').value);
    b.disabled = false; b.textContent = 'Entrar';
    if (!r.ok) { err.textContent = r.erro; return; }
    USER = await Backend.usuario();
    await depoisDeEntrar();
  };
  f1.onsubmit = async e => {
    e.preventDefault(); err.textContent = '';
    email = document.getElementById('email1').value.trim().toLowerCase();
    const b = f1.querySelector('button.principal'); b.disabled = true; b.textContent = 'Enviando…';
    const r = await Backend.pedirCodigo(email);
    b.disabled = false; b.textContent = 'Receber código';
    if (!r.ok) { err.textContent = r.erro; return; }
    mostrar(f2);
    document.getElementById('enviado').innerHTML = `Mandamos um e-mail para <b>${esc(email)}</b> (olhe também o spam). Digite o código abaixo ou toque no link do e-mail.`;
    document.getElementById('cod').focus();
  };
  f2.onsubmit = async e => {
    e.preventDefault(); err.textContent = '';
    const b = f2.querySelector('button.principal'); b.disabled = true;
    const r = await Backend.confirmarCodigo(email, document.getElementById('cod').value.trim());
    b.disabled = false;
    if (!r.ok) { err.textContent = r.erro; return; }
    USER = await Backend.usuario();
    telaCriarSenha(true);
  };
}

// Depois de entrar pelo código (primeiro acesso ou "esqueci a senha"), ou para quem
// entrou pelo link do e-mail / já usava o app antes de existir senha.
function telaCriarSenha(obrigatoria) {
  tela(`<div class="login">
    <img src="mascote/joinha.webp" alt="">
    <h1>Crie sua <span>senha</span></h1>
    <p>Da próxima vez é só e-mail e senha, sem código.</p>
    <form id="fs">
      <input type="email" autocomplete="username" value="${esc(USER?.email || '')}" hidden readonly>
      <label for="s1">Nova senha (mínimo 6 caracteres)</label>
      <input id="s1" type="password" autocomplete="new-password" minlength="6" required>
      <label for="s2" style="margin-top:10px;display:block">Repita a senha</label>
      <input id="s2" type="password" autocomplete="new-password" minlength="6" required>
      <button class="principal" style="margin-top:14px">Salvar senha</button>
      ${obrigatoria ? '' : '<button type="button" class="link" id="depois">Agora não</button>'}
    </form>
    <div class="erro" id="err"></div>
  </div>`);
  const err = document.getElementById('err');
  const depois = document.getElementById('depois');
  if (depois) depois.onclick = () => { try { sessionStorage.setItem('rev_sem_senha', '1'); } catch {} depoisDeEntrar(); };
  document.getElementById('fs').onsubmit = async e => {
    e.preventDefault(); err.textContent = '';
    const s1 = document.getElementById('s1').value, s2 = document.getElementById('s2').value;
    if (s1 !== s2) { err.textContent = 'As duas senhas não estão iguais.'; return; }
    const b = e.target.querySelector('button.principal'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await Backend.criarSenha(s1);
    b.disabled = false; b.textContent = 'Salvar senha';
    if (!r.ok) { err.textContent = r.erro; return; }
    USER = await Backend.usuario();
    await depoisDeEntrar();
  };
}

function telaBloqueado() {
  const link = (window.CONFIG || {}).linkCompra;
  tela(`<div class="login">
    <img src="mascote/confuso.webp" alt="">
    <h1>Acesso <span>não liberado</span></h1>
    <p>O e-mail <b>${esc(USER?.email)}</b> ainda não tem acesso à revisão.</p>
    <p>Se você já comprou, confira se entrou com o mesmo e-mail da compra. A liberação pode levar alguns minutos.</p>
    ${link ? `<a class="principal" style="display:block;text-align:center;text-decoration:none;padding:14px;border-radius:14px;margin-top:14px" href="${esc(link)}">Quero ter acesso</a>` : ''}
    <button class="sec" style="margin-top:12px" onclick="location.reload()">Já comprei, tentar de novo</button>
    <button class="link" data-acao="sair">Entrar com outro e-mail</button>
  </div>`);
}

// ---------------- início ----------------
async function telaInicio() {
  history.replaceState({ t: 'inicio' }, '');
  if (!listaAulas().length) {
    tela(`${cabecalho(false)}<main class="fim"><img src="mascote/cafe.webp" alt="">
      <h1>Aulas <span>a caminho</span></h1>
      <p>${ACESSO === 'professor' ? 'O banco ainda não tem aulas. Abra o painel (📊) no PC e toque em “Enviar aulas para o banco”.' : 'O conteúdo está sendo preparado. Volte daqui a pouco!'}</p></main>`);
    return;
  }
  await Promise.all(listaAulas().map(a => aula(a.aula)));
  const todos = listaAulas().flatMap(a => AULAS[a.aula].cards);
  const devidos = todos.filter(c => pendente(c.id));
  const dom = todos.filter(c => dominado(c.id)).length;
  tela(`${cabecalho(false)}<main>
    <div class="stats">
      <div class="stat"><b>${P.xp}</b><small>pontos</small></div>
      <div class="stat"><b>${premio('fogo')} ${sequenciaAtual()}</b><small>dias seguidos</small></div>
      <div class="stat"><b>${dom}</b><small>cards dominados</small></div>
    </div>
    <button class="revdia" id="revdia" ${devidos.length ? '' : 'disabled'}>
      <img src="mascote/${devidos.length ? 'desafiando' : 'cafe'}.webp" alt="">
      <span><b>Revisão do dia</b><small>${devidos.length
        ? `${devidos.length} card${devidos.length > 1 ? 's' : ''} esperando por você`
        : 'Nada pendente agora. Escolha uma aula e treine!'}</small></span>
    </button>
    <button class="modo" id="banco" style="margin-bottom:8px"><span class="ic">${ic('questoes')}</span><span><b>Banco de questões</b>
      <small>${listaAulas().reduce((s, a) => s + questoesDa(AULAS[a.aula]).length, 0)} questões de todas as aulas · ${resumoQ(listaAulas().flatMap(a => questoesDa(AULAS[a.aula])))}</small></span></button>
    ${INDICE.blocos.map(b => `<div class="bloco"><h3>${esc(b.nome)}</h3>${b.aulas.map(a => {
      const cs = AULAS[a.aula].cards, d = cs.filter(c => dominado(c.id)).length;
      return `<button class="aula" data-aula="${a.aula}"><span class="num">${a.aula}</span>
        <span class="txt"><b>${esc(a.titulo)}</b><small>${d} de ${cs.length} cards dominados</small>
        <div class="barra"><i style="width:${Math.round(100 * d / cs.length)}%"></i></div></span></button>`;
    }).join('')}</div>`).join('')}
  </main>`);
  document.getElementById('revdia').onclick = () => jogarFlash(embaralhar(devidos).slice(0, 30), 'Revisão do dia');
  document.getElementById('banco').onclick = () => telaFiltroQuestoes(listaAulas().map(a => a.aula));
  raiz.querySelectorAll('[data-aula]').forEach(b => b.onclick = () => telaAula(b.dataset.aula));
}

async function telaAula(num) {
  history.pushState({ t: 'aula' }, '');
  const A = await aula(num);
  const pend = A.cards.filter(c => pendente(c.id)).length;
  const novos = A.cards.filter(c => !P.itens[c.id]).length;
  const rq = P.recordes['quiz-' + num] || 0, rv = P.recordes['vf-' + num] || 0;
  tela(`${cabecalho(true)}<main>
    <span class="chip">Aula ${A.aula}</span>
    <h1>${esc(A.titulo)}</h1>
    <div class="modos">
      <button class="modo" id="m-flash"><span class="ic">${ic('cards')}</span><span><b>Flashcards</b>
        <small>${A.cards.length} cards · ${novos} novos · ${pend} para revisar</small></span></button>
      <button class="modo" id="m-quiz"><span class="ic">${ic('raio')}</span><span><b>Quiz relâmpago</b>
        <small>10 questões, 20 segundos cada${rq ? ` · recorde ${rq}` : ''}</small></span></button>
      <button class="modo" id="m-vf"><span class="ic">${ic('vf')}</span><span><b>Verdade ou mentira</b>
        <small>60 segundos, acerte o máximo${rv ? ` · recorde ${rv}` : ''}</small></span></button>
      <button class="modo" id="m-q"><span class="ic">${ic('questoes')}</span><span><b>Questões</b>
        <small>${questoesDa(A).length} questões sem cronômetro, com resolução · ${resumoQ(questoesDa(A))}</small></span></button>
    </div>
  </main>`);
  document.getElementById('m-q').onclick = () => telaFiltroQuestoes([A.aula]);
  document.getElementById('m-flash').onclick = () => {
    // primeiro os pendentes e os novos, depois o resto
    const peso = c => pendente(c.id) ? 0 : !P.itens[c.id] ? 1 : 2 + (P.itens[c.id].c || 0);
    const deck = embaralhar(A.cards).sort((a, b) => peso(a) - peso(b));
    jogarFlash(deck, 'Aula ' + A.aula, num);
  };
  document.getElementById('m-quiz').onclick = () => jogarQuiz(A);
  document.getElementById('m-vf').onclick = () => jogarVF(A);
}
window.addEventListener('popstate', () => { if (P) telaInicio(); });

// ---------------- flashcards ----------------
function jogarFlash(deck, rotulo, num) {
  if (!deck.length) return toast('Nenhum card aqui.');
  history.pushState({ t: 'jogo' }, '');
  const fila = [...deck], total = deck.length, jaErrou = new Set();
  let feitos = 0, acertos = 0, t0 = 0;
  function mostrar() {
    if (!fila.length) return fim();
    const c = fila[0];
    tela(`${cabecalho(true)}<main>
      <div class="topo"><div class="prog"><i style="width:${100 * feitos / total}%"></i></div><span class="cont">${feitos}/${total}</span></div>
      <span class="chip">${esc(rotulo)} · ${esc(c.topico)}</span>
      <div class="flash" id="flash"><div class="dentro">
        <div class="face frente"><div>${c.frente}</div>${figuraDe(c)}<div class="dica-virar">toque para virar</div></div>
        <div class="face verso"><div>${c.verso}</div></div>
      </div></div>
      <div class="respostas2" id="resp" hidden>
        <button class="errei" id="errei">${ic('xis')} Errei</button>
        <button class="acertei" id="acertei">${ic('certo')} Acertei</button>
      </div>
      <p id="pense" style="text-align:center;color:#556;margin:0">Pense na resposta e toque no card.</p>
    </main>`);
    t0 = performance.now();
    const fl = document.getElementById('flash');
    fl.onclick = () => { fl.classList.toggle('virado'); document.getElementById('resp').hidden = false; document.getElementById('pense').hidden = true; };
    document.getElementById('errei').onclick = () => responder(false);
    document.getElementById('acertei').onclick = () => responder(true);
  }
  function responder(ok) {
    const c = fila.shift();
    if (!jaErrou.has(c.id)) {           // conta só a 1ª tentativa de cada card
      registrar(c, 'card', ok, performance.now() - t0);
      atualizarCaixa(c.id, ok);
      ganhar(ok ? 5 : 1);
    }
    if (ok) { feitos++; if (!jaErrou.has(c.id)) acertos++; }
    else { jaErrou.add(c.id); fila.splice(Math.min(fila.length, 3), 0, c); }   // volta daqui a pouco
    mostrar();
  }
  function fim() {
    const pct = Math.round(100 * acertos / total);
    tela(`${cabecalho(true)}<main class="fim">
      <img src="mascote/${pct >= 70 ? 'joinha' : 'pensando'}.webp" alt="">
      <div class="grande">${acertos}/${total}</div>
      <p class="fala">${pct >= 90 ? 'MANDOU MUITO!' : pct >= 70 ? 'TÁ FICANDO FERA!' : 'BORA REVISAR DE NOVO?'}</p>
      <p>de primeira. Os que você errou voltam na Revisão do dia.</p>
      <div class="botoes">
        ${num ? `<button class="principal" id="denovo">Treinar de novo</button>` : ''}
        <button class="sec" data-acao="inicio">Voltar ao início</button>
      </div>
    </main>`);
    if (num) document.getElementById('denovo').onclick = () => telaAula(num);
  }
  mostrar();
}

// ---------------- quiz relâmpago ----------------
function jogarQuiz(A) {
  history.pushState({ t: 'jogo' }, '');
  const qs = embaralhar(A.quiz).slice(0, 10), TEMPO = 20000;
  let i = 0, pontos = 0, acertos = 0;
  const erradas = [];
  function mostrar() {
    if (i >= qs.length) return fim();
    const q = qs[i];
    const ordem = embaralhar(q.alternativas.map((t, k) => ({ t, k })));
    tela(`${cabecalho(true)}<main>
      <div class="topo"><div class="prog"><i style="width:${100 * i / qs.length}%"></i></div><span class="cont pontos">${pontos}</span></div>
      <div class="cron"><i id="cron"></i></div>
      <span class="chip">${i + 1} de ${qs.length} · ${esc(q.topico)}</span>
      <div class="enun">${q.enunciado}</div>${figuraDe(q)}
      <div class="alts">${ordem.map((o, n) => `<button class="alt" data-k="${o.k}"><span class="l">${'ABCD'[n]}</span><span>${o.t}</span></button>`).join('')}</div>
      <div id="depois"></div>
    </main>`);
    const t0 = performance.now(), barra = document.getElementById('cron');
    let vivo = true, raf = 0, to = 0;
    const tick = () => {
      if (!vivo) return;
      const resta = Math.max(0, TEMPO - (performance.now() - t0));
      barra.style.width = (100 * resta / TEMPO) + '%';
      if (resta <= 0) return responder(-1);
      raf = requestAnimationFrame(tick); clearTimeout(to); to = setTimeout(tick, 250);   // rAF para quando a aba some
    };
    tick();
    pararJogo = () => { vivo = false; cancelAnimationFrame(raf); clearTimeout(to); };
    raiz.querySelectorAll('.alt').forEach(b => b.onclick = () => responder(+b.dataset.k));
    function responder(k) {
      if (!vivo) return; pararJogo(); pararJogo = () => {};
      const ms = performance.now() - t0, ok = k === q.correta;
      raiz.querySelectorAll('.alt').forEach(b => {
        b.disabled = true;
        if (+b.dataset.k === q.correta) b.classList.add('certa');
        else if (+b.dataset.k === k) b.classList.add('errada');
      });
      let ganho = 0;
      if (ok) { acertos++; ganho = 100 + Math.round(100 * Math.max(0, TEMPO - ms) / TEMPO); pontos += ganho; }
      else erradas.push(q);
      registrar(q, 'quiz', ok, ms);
      ganhar(ok ? 10 : 1);
      document.getElementById('depois').innerHTML = `
        <div class="explic ${ok ? 'ok' : 'no'}"><b>${ok ? `Certo! +${ganho}` : k === -1 ? 'Tempo esgotado!' : 'Não foi dessa vez.'}</b><br>${q.explicacao}</div>
        <button class="principal" id="prox">${i + 1 < qs.length ? 'Próxima' : 'Ver resultado'}</button>`;
      document.getElementById('prox').onclick = () => { i++; mostrar(); };
      document.getElementById('prox').scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }
  function fim() {
    const chave = 'quiz-' + A.aula, rec = pontos > (P.recordes[chave] || 0);
    if (rec) { P.recordes[chave] = pontos; salvar(); }
    telaFim(pontos, `${acertos} de ${qs.length} certas`, rec, erradas.map(q => ({ t: q.enunciado, e: `Resposta: ${q.alternativas[q.correta]}. ${q.explicacao}` })), () => jogarQuiz(A), A.aula);
  }
  mostrar();
}

// ---------------- verdade ou mentira ----------------
function jogarVF(A) {
  history.pushState({ t: 'jogo' }, '');
  const TEMPO = 60000;
  let baralho = embaralhar(A.vf), pos = 0, pontos = 0, combo = 0, acertos = 0, total = 0;
  const erradas = [];
  tela(`${cabecalho(true)}<main>
    <div class="topo"><div class="prog"><i id="tempo" style="width:100%"></i></div><span class="cont pontos" id="pts">0</span></div>
    <div class="combo" id="combo"></div>
    <div class="vf-card" id="card"></div>
    <div class="vf-bt"><button class="mentira" id="bm">Mentira</button><button class="verdade" id="bv">Verdade</button></div>
    <p style="text-align:center;color:#556;font-size:14px">Teclado: ← mentira · → verdade</p>
  </main>`);
  const card = document.getElementById('card'), barra = document.getElementById('tempo');
  const t0 = performance.now(); let tq = t0, vivo = true, travado = false, raf = 0, to = 0;
  const atual = () => baralho[pos];
  const proxima = () => {
    pos++; if (pos >= baralho.length) { baralho = embaralhar(A.vf); pos = 0; }
    card.className = 'vf-card'; card.innerHTML = atual().afirmacao; tq = performance.now(); travado = false;
  };
  card.innerHTML = atual().afirmacao;
  function responder(v) {
    if (!vivo || travado) return; travado = true;
    const s = atual(), ok = v === s.verdadeira; total++;
    registrar(s, 'vf', ok, performance.now() - tq);
    if (ok) { acertos++; combo++; pontos += 10 * (1 + Math.floor(combo / 3)); }
    else { combo = 0; if (!erradas.includes(s)) erradas.push(s); }
    ganhar(ok ? 2 : 0);
    document.getElementById('pts').textContent = pontos;
    document.getElementById('combo').textContent = combo >= 3 ? `COMBO x${1 + Math.floor(combo / 3)}` : '';
    card.classList.add(ok ? 'ok' : 'no');
    setTimeout(proxima, ok ? 300 : 700);
  }
  document.getElementById('bm').onclick = () => responder(false);
  document.getElementById('bv').onclick = () => responder(true);
  const tecla = e => { if (e.key === 'ArrowLeft') responder(false); if (e.key === 'ArrowRight') responder(true); };
  document.addEventListener('keydown', tecla);
  const tick = () => {
    if (!vivo) return;
    const resta = Math.max(0, TEMPO - (performance.now() - t0));
    barra.style.width = (100 * resta / TEMPO) + '%';
    if (resta <= 0) return fim();
    raf = requestAnimationFrame(tick); clearTimeout(to); to = setTimeout(tick, 250);
  };
  pararJogo = () => { vivo = false; cancelAnimationFrame(raf); clearTimeout(to); document.removeEventListener('keydown', tecla); };
  tick();
  function fim() {
    pararJogo(); pararJogo = () => {};
    const chave = 'vf-' + A.aula, rec = pontos > (P.recordes[chave] || 0);
    if (rec) { P.recordes[chave] = pontos; salvar(); }
    telaFim(pontos, `${acertos} de ${total} certas`, rec, erradas.map(s => ({ t: s.afirmacao, e: `${s.verdadeira ? 'VERDADE' : 'MENTIRA'}. ${s.explicacao}` })), () => jogarVF(A), A.aula);
  }
}

// ---------------- questões (treino sem cronômetro) ----------------
// Banco = questões do quiz + as do campo "questoes" (questões mais longas, estilo prova), se a aula tiver.
const questoesDa = A => [...(A.quiz || []), ...(A.questoes || [])];
function resumoQ(lista) {
  const feitas = lista.filter(q => P.q?.[q.id]).length, err = lista.filter(q => P.q?.[q.id] && !P.q[q.id].ok).length;
  return feitas ? `${feitas} feitas, ${err} erradas` : 'nenhuma feita ainda';
}

function telaFiltroQuestoes(aulas) {
  history.pushState({ t: 'aula' }, '');
  const uma = aulas.length === 1;
  const todas = aulas.flatMap(n => questoesDa(AULAS[n]));
  const topicos = [...new Set(todas.map(q => q.topico))];
  tela(`${cabecalho(true)}<main>
    <span class="chip">${uma ? 'Aula ' + aulas[0] : 'Todas as aulas'}</span>
    <h1>Banco de <span>questões</span></h1>
    ${uma ? '' : `<label for="fa">Aula</label><select id="fa" class="sel"><option value="">Todas</option>${aulas.map(n => `<option value="${n}">${n} · ${esc(AULAS[n].titulo)}</option>`).join('')}</select>`}
    <label for="ft">Assunto</label><select id="ft" class="sel"></select>
    <label for="fs">Quais questões</label>
    <select id="fs" class="sel">
      <option value="todas">Todas</option><option value="novas">Só as que nunca fiz</option><option value="erradas">Só as que errei</option>
    </select>
    <p id="qtd" style="margin:14px 0 4px"></p>
    <button class="principal" id="ir">Começar</button>
  </main>`);
  const fa = document.getElementById('fa'), ft = document.getElementById('ft'), fs = document.getElementById('fs');
  const base = () => fa?.value ? questoesDa(AULAS[fa.value]) : todas;
  const filtrar = () => base().filter(q => (!ft.value || q.topico === ft.value) &&
    (fs.value === 'todas' || (fs.value === 'novas' ? !P.q?.[q.id] : P.q?.[q.id] && !P.q[q.id].ok)));
  const montarTopicos = () => {
    const ts = fa?.value ? [...new Set(base().map(q => q.topico))] : topicos;
    ft.innerHTML = `<option value="">Todos</option>` + ts.map(t => `<option>${esc(t)}</option>`).join('');
  };
  const contar = () => { const n = filtrar().length; document.getElementById('qtd').textContent = `${n} ${n === 1 ? 'questão' : 'questões'} nesse filtro.`; document.getElementById('ir').disabled = !n; };
  if (fa) fa.onchange = () => { montarTopicos(); contar(); };
  ft.onchange = fs.onchange = contar;
  montarTopicos(); contar();
  document.getElementById('ir').onclick = () => jogarQuestoes(embaralhar(filtrar()), () => telaFiltroQuestoes(aulas));
}

function jogarQuestoes(lista, voltar) {
  history.pushState({ t: 'jogo' }, '');
  P.q ||= {};
  let i = 0, acertos = 0;
  const erradas = [];
  function mostrar() {
    if (i >= lista.length) return fim();
    const q = lista[i];
    const ordem = embaralhar(q.alternativas.map((t, k) => ({ t, k })));
    const antes = P.q[q.id];
    tela(`${cabecalho(true)}<main>
      <div class="topo"><div class="prog"><i style="width:${100 * i / lista.length}%"></i></div><span class="cont">${i + 1}/${lista.length}</span></div>
      <span class="chip">Aula ${aulaDoItem(q.id)} · ${esc(q.topico)}${antes ? (antes.ok ? ' · você já acertou' : ' · você errou da última vez') : ''}</span>
      <div class="enun">${q.enunciado}</div>${figuraDe(q)}
      <div class="alts">${ordem.map((o, n) => `<button class="alt" data-k="${o.k}"><span class="l">${'ABCD'[n]}</span><span>${o.t}</span></button>`).join('')}</div>
      <div id="depois"></div>
      <button class="link" id="sair">Parar e ver resultado</button>
    </main>`);
    const t0 = performance.now();
    raiz.querySelectorAll('.alt').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === q.correta;
      raiz.querySelectorAll('.alt').forEach(x => {
        x.disabled = true;
        if (+x.dataset.k === q.correta) x.classList.add('certa'); else if (+x.dataset.k === k) x.classList.add('errada');
      });
      if (ok) acertos++; else erradas.push(q);
      P.q[q.id] = { ok, n: (antes?.n || 0) + 1 };
      registrar(q, 'questao', ok, performance.now() - t0);
      ganhar(ok ? 10 : 1);
      document.getElementById('depois').innerHTML = `
        <div class="explic ${ok ? 'ok' : 'no'}"><b>${ok ? 'Certo!' : 'Resposta certa: ' + q.alternativas[q.correta]}</b><br>${q.resolucao || q.explicacao}</div>
        <button class="principal" id="prox">${i + 1 < lista.length ? 'Próxima' : 'Ver resultado'}</button>`;
      document.getElementById('prox').onclick = () => { i++; mostrar(); };
      document.getElementById('prox').scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    document.getElementById('sair').onclick = fim;
  }
  function fim() {
    const feitas = acertos + erradas.length;
    tela(`${cabecalho(true)}<main class="fim">
      <img src="mascote/${!feitas || erradas.length > acertos ? 'pensando' : 'joinha'}.webp" alt="">
      <div class="grande">${acertos}/${feitas}</div>
      <p class="fala">${!feitas ? 'BORA COMEÇAR?' : erradas.length ? 'ERRAR AQUI É ACERTAR NA PROVA!' : 'GABARITOU!'}</p>
      ${erradas.length ? `<div class="revisar"><h2>Revise <span>estas</span></h2>${erradas.map(q => `<div><b>${q.enunciado}</b>Resposta: ${q.alternativas[q.correta]}. ${q.resolucao || q.explicacao}</div>`).join('')}</div>` : ''}
      <div class="botoes">
        <button class="principal" id="volta">Escolher mais questões</button>
        <button class="sec" data-acao="inicio">Voltar ao início</button>
      </div>
    </main>`);
    document.getElementById('volta').onclick = voltar;
  }
  mostrar();
}

function telaFim(pontos, sub, recorde, erradas, denovo, num) {
  tela(`${cabecalho(true)}<main class="fim">
    <img src="mascote/${recorde ? 'joinha' : erradas.length ? 'pensando' : 'confiante'}.webp" alt="">
    <div class="grande">${pontos}</div>
    <p class="fala">${recorde ? 'NOVO RECORDE!' : erradas.length ? 'QUASE LÁ!' : 'GABARITOU!'}</p>
    <p>${sub}</p>
    ${erradas.length ? `<div class="revisar"><h2>Revise <span>estas</span></h2>${erradas.map(x => `<div><b>${x.t}</b>${x.e}</div>`).join('')}</div>` : ''}
    <div class="botoes">
      <button class="principal" id="denovo">Jogar de novo</button>
      <button class="sec" id="volta">Voltar para a aula</button>
    </div>
  </main>`);
  document.getElementById('denovo').onclick = denovo;
  document.getElementById('volta').onclick = () => telaAula(num);
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
// iniciar() agora é chamado no fim de trilha.js
