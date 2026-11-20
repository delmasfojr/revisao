// Avatar do aluno com o estilo "Adventurer" (Lisa Wischofsky, CC BY 4.0) do DiceBear,
// guardado em libs/dicebear (não depende de site de fora). O avatar fica em P.avatar (vai junto com o progresso).
// A biblioteca é um módulo e chega logo depois deste arquivo: até lá, cada avatar aparece como uma bolinha
// e é desenhado assim que ela carrega (ver avDesenharPendentes).

let DB = null;   // { createAvatar, adventurer } — preenchido pelo <script type="module"> do index.html
const AV_CREDITO = 'Avatares: estilo “Adventurer” de Lisa Wischofsky (CC BY 4.0), via DiceBear.';

const avNum = (pre, n) => Array.from({ length: n }, (_, i) => pre + String(i + 1).padStart(2, '0'));
const AV = {
  pele: ['f2d3b1', 'ecad80', 'd08b5b', '9e5622', '763900'],
  // [cor, pontos para liberar]
  corCab: [['0e0e0e'], ['562306'], ['6a4e35'], ['ac6511'], ['cb6820'], ['ab2a18'], ['e5d7a3'], ['b9a05f'], ['afafaf'],
           ['ff7a00', 150], ['3eac2c', 150], ['85c2c6', 150], ['dba3be', 150], ['592454', 150]],
  fundo: ['ffe0c2', 'e6f1ff', 'ddf3e6', 'fce1ec', 'ffe9a8', 'fff6e6', 'ff7a00', '0f1b2d'],
  cabCurto: avNum('short', 19),
  cabLongo: avNum('long', 26),
  olhos: avNum('variant', 26),
  sobrancelha: avNum('variant', 15),
  boca: avNum('variant', 30),
  // [chave, nome, pontos]
  rosto: [['nada', 'Nada'], ['blush', 'Bochechas'], ['freckles', 'Sardas'], ['mustache', 'Bigode'], ['birthmark', 'Pintinha']],
  oculos: [['nada', 'Sem óculos'], ['variant01', 'Óculos 1'], ['variant02', 'Óculos 2'], ['variant03', 'Óculos 3', 50],
           ['variant04', 'Óculos 4', 100], ['variant05', 'Óculos 5', 200]],
  brinco: [['nada', 'Sem brinco'], ['variant01', 'Brinco 1'], ['variant02', 'Brinco 2'], ['variant03', 'Brinco 3'],
           ['variant04', 'Brinco 4', 100], ['variant05', 'Brinco 5', 150], ['variant06', 'Brinco 6', 300]]
};
const AV_PADRAO = { pele: 0, cabelo: 'short01', corCab: 2, olhos: 'variant26', sobrancelha: 'variant10', boca: 'variant26',
  rosto: 'nada', oculos: 'nada', brinco: 'nada', fundo: 1 };

// só aceita valores conhecidos (o que vem do banco nunca vai direto para o desenho)
function avDe(a) {
  a = { ...AV_PADRAO, ...(a && typeof a === 'object' ? a : {}) };
  const em = (v, lista, pad) => lista.includes(v) ? v : pad;
  const idx = (v, n, pad) => Number.isInteger(v) && v >= 0 && v < n ? v : pad;
  return {
    pele: idx(a.pele, AV.pele.length, 0), corCab: idx(a.corCab, AV.corCab.length, 2), fundo: idx(a.fundo, AV.fundo.length, 1),
    cabelo: em(a.cabelo, [...AV.cabCurto, ...AV.cabLongo, 'careca'], 'short01'),
    olhos: em(a.olhos, AV.olhos, 'variant26'), sobrancelha: em(a.sobrancelha, AV.sobrancelha, 'variant10'),
    boca: em(a.boca, AV.boca, 'variant26'),
    rosto: em(a.rosto, AV.rosto.map(x => x[0]), 'nada'), oculos: em(a.oculos, AV.oculos.map(x => x[0]), 'nada'),
    brinco: em(a.brinco, AV.brinco.map(x => x[0]), 'nada')
  };
}

function avOpcoes(a) {
  return {
    seed: 'delmao', radius: 50, size: 160,
    backgroundColor: [AV.fundo[a.fundo]], skinColor: [AV.pele[a.pele]], hairColor: [AV.corCab[a.corCab][0]],
    hair: a.cabelo === 'careca' ? ['short01'] : [a.cabelo], hairProbability: a.cabelo === 'careca' ? 0 : 100,
    eyes: [a.olhos], eyebrows: [a.sobrancelha], mouth: [a.boca],
    features: a.rosto === 'nada' ? ['blush'] : [a.rosto], featuresProbability: a.rosto === 'nada' ? 0 : 100,
    glasses: a.oculos === 'nada' ? ['variant01'] : [a.oculos], glassesProbability: a.oculos === 'nada' ? 0 : 100,
    earrings: a.brinco === 'nada' ? ['variant01'] : [a.brinco], earringsProbability: a.brinco === 'nada' ? 0 : 100
  };
}
const avUri = a => DB.createAvatar(DB.adventurer, avOpcoes(a)).toDataUri();

// devolve um <img> (isolado do CSS da página). Sem a biblioteca ainda, fica uma bolinha e é desenhado depois.
function avatarSVG(a, opt = {}) {
  a = avDe(a);
  const cls = `avatar ${opt.cls || ''}`;
  if (DB) return `<img class="${cls}" src="${avUri(a)}" alt="Avatar">`;
  return `<img class="${cls} av-espera" data-av="${esc(JSON.stringify(a))}" alt="Avatar"
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23${AV.fundo[a.fundo]}'/%3E%3C/svg%3E">`;
}
function avDesenharPendentes() {
  if (!DB) return;
  document.querySelectorAll('img.av-espera').forEach(im => {
    try { im.src = avUri(avDe(JSON.parse(im.dataset.av))); } catch {}
    im.classList.remove('av-espera');
  });
}
window.addEventListener('dicebear-pronto', avDesenharPendentes);

// ---------- tela: Meu avatar (perfil) ----------
const AV_ABAS = [
  ['pele', 'Pele'], ['cabelo', 'Cabelo'], ['olhos', 'Olhos'], ['sobrancelha', 'Sobrancelhas'], ['boca', 'Boca'],
  ['rosto', 'Rosto'], ['oculos', 'Óculos'], ['brinco', 'Brincos'], ['fundo', 'Fundo']
];
function avSorteio() {
  const r = arr => arr[Math.floor(Math.random() * arr.length)];
  const pts = P.xp || 0, livres = lista => lista.filter(x => !x[2] || pts >= x[2]).map(x => x[0]);
  const cores = AV.corCab.map((c, i) => [i, , c[1]]).filter(x => !x[2] || pts >= x[2]).map(x => x[0]);
  return avDe({ pele: Math.floor(Math.random() * AV.pele.length), cabelo: r([...AV.cabCurto, ...AV.cabLongo]), corCab: r(cores),
    olhos: r(AV.olhos), sobrancelha: r(AV.sobrancelha), boca: r(AV.boca),
    rosto: Math.random() < .35 ? r(livres(AV.rosto)) : 'nada', oculos: Math.random() < .25 ? r(livres(AV.oculos)) : 'nada',
    brinco: Math.random() < .2 ? r(livres(AV.brinco)) : 'nada', fundo: Math.floor(Math.random() * AV.fundo.length) });
}

function telaPerfil(abaIni) {
  history.replaceState({ t: 'perfil' }, '');
  let rasc = avDe(P.avatar), aba = abaIni || 'cabelo';
  const pts = P.xp || 0;
  const licoes = Object.values(P.trilha || {}).reduce((s, n) => s + n, 0);
  const trava = c => `${ic('cadeado')} ${c} pts`;

  const cores = (campo, lista) => `<div class="av-cores">${lista.map((c, i) => {
    const [cor, custo] = Array.isArray(c) ? c : [c];
    const fechado = custo && pts < custo;
    return `<button class="av-cor ${rasc[campo] === i ? 'on' : ''} ${fechado ? 'trava' : ''}" data-campo="${campo}" data-val="${i}"
      ${fechado ? `data-custo="${custo}"` : ''} style="--cor:#${cor}" aria-label="Cor ${i + 1}${fechado ? ' (bloqueada)' : ''}">${fechado ? ic('cadeado') : ''}</button>`;
  }).join('')}</div>`;
  // lista: só chaves (todas liberadas) ou [chave, nome, pontos]
  const pecas = (campo, lista, rotulo) => `<div class="av-grade">${lista.map((x, i) => {
    const [k, nome, custo] = Array.isArray(x) ? x : [x, rotulo ? `${rotulo} ${i + 1}` : ''];
    const fechado = custo && pts < custo;
    return `<button class="av-peca ${rasc[campo] === k ? 'on' : ''} ${fechado ? 'trava' : ''}" data-campo="${campo}" data-val="${k}" ${fechado ? `data-custo="${custo}"` : ''}>
      ${avatarSVG({ ...rasc, [campo]: k })}${nome || fechado ? `<small>${fechado ? trava(custo) : esc(nome)}</small>` : ''}</button>`;
  }).join('')}</div>`;
  const conteudo = () => ({
    pele: `<h3>Tom de pele</h3>${cores('pele', AV.pele)}`,
    cabelo: `<h3>Cor</h3>${cores('corCab', AV.corCab)}<h3>Curtos</h3>${pecas('cabelo', [...AV.cabCurto, ['careca', 'Careca']])}<h3>Compridos</h3>${pecas('cabelo', AV.cabLongo)}`,
    olhos: pecas('olhos', AV.olhos),
    sobrancelha: pecas('sobrancelha', AV.sobrancelha),
    boca: pecas('boca', AV.boca),
    rosto: pecas('rosto', AV.rosto),
    oculos: pecas('oculos', AV.oculos),
    brinco: `${pecas('brinco', AV.brinco)}<p class="av-obs">Os brincos aparecem melhor com cabelo curto.</p>`,
    fundo: `<h3>Cor do fundo</h3>${cores('fundo', AV.fundo)}`
  }[aba]);

  tela(`<div class="topo-trilha"><button class="av-voltar" id="av-voltar" aria-label="Voltar">←</button><div class="marca">Meu <span>avatar</span></div></div>
    <main class="perfil">
      <div class="av-palco"><div id="av-grande">${avatarSVG(rasc, { cls: 'grande' })}</div>
        <button class="av-dado" id="av-dado" title="Sortear">${ic('repetir')} Sortear</button></div>
      <div class="av-abas" role="tablist">${AV_ABAS.map(([k, n]) => `<button role="tab" class="${k === aba ? 'on' : ''}" data-aba="${k}">${n}</button>`).join('')}</div>
      <div class="av-painel" id="av-painel">${conteudo()}</div>
      <div class="av-stats"><div><b>${ic('estrela')} ${pts}</b><small>pontos</small></div><div><b>${ic('fogo')} ${sequenciaAtual()}</b><small>dias seguidos</small></div><div><b>${ic('trofeu')} ${licoes}</b><small>lições</small></div></div>
      <p class="av-obs">Junte pontos nas lições para liberar as peças com ${ic('cadeado')}.</p>
      <button class="link av-sair" id="av-sair">Sair da conta neste aparelho</button>
      <p class="av-credito">${AV_CREDITO.replace('CC BY 4.0', '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>')
        .replace('DiceBear', '<a href="https://www.dicebear.com" target="_blank" rel="noopener">DiceBear</a>')}</p>
    </main>
    <div class="av-rod"><button class="btn3d verde" id="av-salvar">SALVAR AVATAR</button></div>
    ${barraInferior('perfil')}`);
  ligarBarra();

  const redesenhar = (painelTambem = true) => {
    document.getElementById('av-grande').innerHTML = avatarSVG(rasc, { cls: 'grande' });
    if (painelTambem) { const pn = document.getElementById('av-painel'), y = window.scrollY; pn.innerHTML = conteudo(); window.scrollTo(0, y); }
  };
  raiz.querySelector('.av-abas').onclick = e => {
    const b = e.target.closest('[data-aba]'); if (!b) return;
    aba = b.dataset.aba;
    raiz.querySelectorAll('.av-abas button').forEach(x => x.classList.toggle('on', x === b));
    b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    redesenhar();
  };
  document.getElementById('av-painel').onclick = e => {
    const b = e.target.closest('[data-campo]'); if (!b) return;
    if (b.dataset.custo) { toast(`Junte ${b.dataset.custo} pontos para liberar (você tem ${pts}).`); return; }
    const v = b.dataset.val;
    rasc = avDe({ ...rasc, [b.dataset.campo]: /^\d+$/.test(v) ? +v : v });
    redesenhar();
  };
  document.getElementById('av-dado').onclick = () => { rasc = avSorteio(); redesenhar(); };
  document.getElementById('av-salvar').onclick = () => {
    P.avatar = rasc; salvar(); som('ok'); toast('Avatar salvo!');
    telaInicio();
  };
  document.getElementById('av-voltar').onclick = () => telaInicio();
  document.getElementById('av-sair').onclick = () => { if (confirm('Sair da sua conta neste aparelho?')) Backend.sair().then(() => telaLogin()); };
}
