// Painel do professor: o que os alunos mais erram (por assunto e por questão) e quem tem acesso.
const m = document.getElementById('m');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const semHtml = s => String(s ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
const TIPO = { card: 'Flashcard', quiz: 'Quiz', vf: 'Verdade ou mentira', questao: 'Questão' };
const MINIMO = Backend.online ? 5 : 1;   // abaixo disso a porcentagem ainda não diz nada
let ITENS = {}, AULAS = {};

function textoItem(id) {
  const it = ITENS[id]; if (!it) return { t: id, r: '' };
  if (it.frente) return { t: it.frente, r: it.verso };
  if (it.afirmacao) return { t: it.afirmacao, r: (it.verdadeira ? 'VERDADE. ' : 'MENTIRA. ') + it.explicacao };
  return { t: it.enunciado, r: 'Resposta: ' + it.alternativas[it.correta] + '. ' + (it.resolucao || it.explicacao) };
}

async function iniciar() {
  await Backend.iniciar();
  const u = await Backend.usuario();
  if (!u) { location.href = './'; return; }
  let acesso;
  try { acesso = await Backend.acesso(); } catch { m.innerHTML = '<p>Sem conexão com o servidor.</p>'; return; }
  if (acesso !== 'professor') { m.innerHTML = '<h1>Só para o <span>professor</span></h1><p>Esta conta não tem acesso ao painel.</p>'; return; }
  await carregarConteudo();
  // os arquivos de dados/ só existem no PC do professor (não são publicados)
  const temArquivos = Backend.online && await fetch('dados/indice.json', { cache: 'reload' }).then(r => r.ok).catch(() => false);
  m.innerHTML = `
    ${temArquivos ? `<div class="sec-p" style="margin-top:0"><h2>Conteúdo das <span>aulas</span></h2>
      <p class="vazio">O banco tem ${Object.keys(AULAS).length} aula${Object.keys(AULAS).length === 1 ? '' : 's'}. Depois que o Claude preparar aulas novas, toque aqui para mandar tudo o que está neste PC para o app dos alunos.</p>
      <button class="principal" id="enviar">Enviar aulas para o banco</button><p id="envst" class="vazio"></p></div>` : ''}
    ${Backend.online ? '' : '<div class="aviso"><b>Modo teste:</b> os números abaixo são só das respostas feitas neste aparelho.</div>'}
    <div class="filtro"><label for="dias" style="margin:0">Período</label>
      <select id="dias" class="sel"><option value="7">Últimos 7 dias</option><option value="30" selected>Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="0">Tudo</option></select></div>
    <div id="dados"></div>
    <div class="sec-p"><h2>Alunos com <span>acesso</span></h2>
      <p class="vazio">Cole os e-mails de quem comprou (um por linha). O aluno entra com esse e-mail e recebe um código.</p>
      <textarea id="novos" placeholder="aluno1@email.com&#10;aluno2@email.com"></textarea>
      <button class="principal" id="liberar" style="margin-top:10px">Liberar acesso</button>
      <div id="alunos" style="margin-top:12px"></div>
    </div>`;
  document.getElementById('dias').onchange = carregar;
  document.getElementById('liberar').onclick = liberar;
  const bt = document.getElementById('enviar');
  if (bt) bt.onclick = async () => {
    const st = document.getElementById('envst'); bt.disabled = true;
    try {
      const n = await Backend.enviarConteudo(t => st.textContent = t);
      await carregarConteudo();
      st.textContent = `✓ ${n} aula${n === 1 ? '' : 's'} no banco. Os alunos já veem a versão nova.`;
    } catch (e) { st.textContent = 'Erro: ' + e.message; }
    bt.disabled = false;
  };
  carregar(); listarAlunos();
}

async function carregarConteudo() {
  const indice = await Backend.carregarIndice();
  for (const a of indice.blocos.flatMap(b => b.aulas)) {
    const A = await Backend.carregarAula(a.aula, indice);
    AULAS[A.aula] = A;
    for (const x of [...A.cards, ...A.quiz, ...(A.questoes || []), ...A.vf]) ITENS[x.id] = x;
  }
}

async function carregar() {
  const dias = +document.getElementById('dias').value, d = document.getElementById('dados');
  d.innerHTML = '<p>Carregando…</p>';
  let itens, geral;
  try { [itens, geral] = await Promise.all([Backend.painelItens(dias), Backend.painelGeral(dias)]); }
  catch (e) { d.innerHTML = `<p class="erro">Erro ao carregar: ${esc(e.message)}</p>`; return; }

  // por assunto (aula + tópico)
  const porTopico = new Map();
  for (const i of itens) {
    const k = i.aula + '|' + i.topico;
    const o = porTopico.get(k) || { aula: i.aula, topico: i.topico, tentativas: 0, erros: 0 };
    o.tentativas += i.tentativas; o.erros += i.erros; porTopico.set(k, o);
  }
  const taxa = o => o.erros / o.tentativas;
  const topicos = [...porTopico.values()].filter(o => o.tentativas >= MINIMO).sort((a, b) => taxa(b) - taxa(a) || b.erros - a.erros).slice(0, 15);
  const questoes = itens.filter(o => o.tentativas >= MINIMO && o.erros > 0).sort((a, b) => taxa(b) - taxa(a) || b.erros - a.erros).slice(0, 25);
  const pct = geral.respostas ? Math.round(100 * geral.acertos / geral.respostas) : 0;

  d.innerHTML = `
    <div class="cards3">
      <div class="stat"><b>${geral.alunos}</b><small>alunos ativos</small></div>
      <div class="stat"><b>${geral.respostas}</b><small>respostas</small></div>
      <div class="stat"><b>${pct}%</b><small>de acerto</small></div>
    </div>
    <div class="sec-p"><h2>Assuntos que <span>mais erram</span></h2>
      ${topicos.length ? topicos.map(o => `<div class="linha">
        <div><div class="t">${esc(o.topico)}</div><small>Aula ${o.aula} · ${esc(AULAS[o.aula]?.titulo || '')} · ${o.erros} erro${o.erros === 1 ? "" : "s"} em ${o.tentativas} resposta${o.tentativas === 1 ? "" : "s"}</small></div>
        <div class="pct">${Math.round(100 * taxa(o))}%</div>
        <div class="bar"><i style="width:${100 * taxa(o)}%"></i></div></div>`).join('')
      : `<p class="vazio">Ainda não há respostas suficientes (mínimo de ${MINIMO} por assunto).</p>`}
    </div>
    <div class="sec-p"><h2>Questões que <span>mais erram</span></h2>
      ${questoes.length ? questoes.map((o, n) => { const tx = textoItem(o.item); return `<div class="linha">
        <div><small>${TIPO[o.tipo] || o.tipo} · Aula ${o.aula} · ${esc(o.topico)} · ${o.erros} erro${o.erros === 1 ? "" : "s"} em ${o.tentativas}${Backend.online ? ` · ${o.alunos} alunos` : ''}</small>
          <div class="q"><b>${tx.t}</b></div></div>
        <div class="pct">${Math.round(100 * taxa(o))}%</div>
        <div class="bar"><i style="width:${100 * taxa(o)}%"></i></div>
        <div class="acoes"><button class="mini" data-post="${n}">💡 Copiar ideia de post</button></div></div>`; }).join('')
      : '<p class="vazio">Nenhum erro registrado nesse período.</p>'}
    </div>`;
  d.querySelectorAll('[data-post]').forEach(b => b.onclick = async () => {
    const o = questoes[+b.dataset.post], tx = textoItem(o.item);
    const texto = `IDEIA DE POST: assunto que meus alunos mais erram\n` +
      `Aula ${o.aula} · ${AULAS[o.aula]?.titulo || ''} · ${o.topico}\n` +
      `${Math.round(100 * taxa(o))}% de erro em ${o.tentativas} respostas\n\n` +
      `Pergunta: ${semHtml(tx.t)}\n${semHtml(tx.r)}`;
    try { await navigator.clipboard.writeText(texto); b.textContent = '✓ Copiado! Cole no app de carrosséis'; }
    catch { prompt('Copie o texto:', texto); }
  });
}

async function listarAlunos() {
  const el = document.getElementById('alunos');
  try {
    const l = await Backend.listarLiberados();
    el.innerHTML = `<p class="vazio">${l.length} aluno${l.length === 1 ? '' : 's'} com acesso.</p>` +
      l.map(a => `<div class="aluno"><span>${esc(a.email)}</span><button data-tirar="${esc(a.email)}">tirar acesso</button></div>`).join('');
    el.querySelectorAll('[data-tirar]').forEach(b => b.onclick = async () => {
      if (!confirm(`Tirar o acesso de ${b.dataset.tirar}?`)) return;
      await Backend.bloquear(b.dataset.tirar); listarAlunos();
    });
  } catch (e) { el.innerHTML = `<p class="erro">${esc(e.message)}</p>`; }
}

async function liberar() {
  const t = document.getElementById('novos');
  try {
    const n = await Backend.liberar(t.value.split(/[\s,;]+/));
    t.value = ''; listarAlunos();
    alert(n ? `${n} e-mail${n > 1 ? 's' : ''} liberado${n > 1 ? 's' : ''}.` : 'Nenhum e-mail válido.');
  } catch (e) { alert('Erro: ' + e.message); }
}

iniciar();
