// prototipo-duolingo/enem-motor.js
// Plano ENEM — lógica pura (sem tela). Funciona no navegador (global EnemMotor) e no Node (testes).
(function (raiz) {
  const DIA = 864e5, PASSO = 0.25, VERDE = 0.8, AMARELO = 0.5, ESFRIA = [1, 3, 7, 15];
  const casaDoItem = id => String(id).split('-')[0];
  const novoEstado = () => ({ nivel: null, dom: {}, n: {}, seq: {}, prox: {}, vistos: {} });
  const domDe = (est, c) => est.dom[c] ?? 0.5;

  function responder(est, casa, ok, agora = Date.now()) {
    const d = domDe(est, casa);
    est.dom[casa] = d + PASSO * ((ok ? 1 : 0) - d);
    est.n[casa] = (est.n[casa] || 0) + 1;
    est.seq[casa] = ok ? (est.seq[casa] || 0) + 1 : 0;
    if (est.seq[casa] >= 3) est.prox[casa] = agora + ESFRIA[Math.min(est.seq[casa] - 3, ESFRIA.length - 1)] * DIA;
    else delete est.prox[casa];
    return est;
  }

  function aplicarNivelamento(est, respostas, tamanho, agora = Date.now()) {
    const por = {};
    for (const r of respostas) { (por[r.casa] ||= { a: 0, t: 0 }); por[r.casa].t++; if (r.ok) por[r.casa].a++; }
    for (const [c, { a, t }] of Object.entries(por)) {
      const teste = (a + 0.5) / (t + 1);
      est.dom[c] = est.n[c] ? (est.dom[c] + teste) / 2 : teste;
      est.n[c] = (est.n[c] || 0) + t;
    }
    est.nivel = { tamanho, data: agora, acertos: respostas.filter(r => r.ok).length, total: respostas.length };
    return est;
  }

  function cor(est, casa) {
    if (!est.n[casa]) return 'cinza';
    const d = domDe(est, casa);
    return d >= VERDE ? 'verde' : d >= AMARELO ? 'amarelo' : 'vermelho';
  }

  const casaPorId = (mapa, id) => mapa.casas.find(c => c.id === id);
  function aberta(mapa, est, id) {
    if (est.n[id]) return true;
    // pré-requisito que não está lançado (ou não existe no mapa) não trava a casa
    return (casaPorId(mapa, id).prereq || [])
      .filter(p => { const c = casaPorId(mapa, p); return c && c.lancada; })
      .every(p => est.n[p] && domDe(est, p) >= AMARELO);
  }
  const prioridade = (mapa, est, id) => casaPorId(mapa, id).peso * (1 - domDe(est, id));

  function ordemPlano(mapa, est) {
    const ls = mapa.casas.filter(c => c.lancada);
    const ab = ls.filter(c => aberta(mapa, est, c.id)).sort((a, b) => prioridade(mapa, est, b.id) - prioridade(mapa, est, a.id) || a.num - b.num);
    const fe = ls.filter(c => !aberta(mapa, est, c.id)).sort((a, b) => a.num - b.num);
    return [...ab, ...fe];
  }

  function dominioGeral(mapa, est) {
    const ls = mapa.casas.filter(c => c.lancada);
    const tot = ls.reduce((s, c) => s + c.peso, 0) || 1;
    const dom = ls.reduce((s, c) => s + c.peso * (est.n[c.id] ? domDe(est, c.id) : 0), 0);
    return Math.round(100 * dom / tot);
  }

  function embaralhar(a, rnd) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Cotas por maior resto: pesos já em ordem decrescente; caps = itens disponíveis por casa.
  // Mínimo 1 por casa enquanto n permitir (se n < nº de casas, só as n primeiras); sobra vai para a próxima com folga.
  function cotas(ws, caps, n) {
    n = Math.min(n, caps.reduce((a, b) => a + b, 0));
    const k = Math.min(n, ws.length), q = ws.map(() => 0);
    if (k <= 0) return q;
    const soma = ws.slice(0, k).reduce((a, b) => a + b, 0);
    const w = ws.slice(0, k).map(x => soma > 0 ? x : 1), sw = w.reduce((a, b) => a + b, 0);
    const ideal = w.map(x => n * x / sw);
    for (let i = 0; i < k; i++) q[i] = Math.max(1, Math.floor(ideal[i]));
    let tot = q.reduce((a, b) => a + b, 0);
    while (tot > n) { let m = 0; for (let i = 1; i < k; i++) if (q[i] > q[m]) m = i; q[m]--; tot--; }
    while (tot < n) { let m = 0; for (let i = 1; i < k; i++) if (ideal[i] - q[i] > ideal[m] - q[m]) m = i; q[m]++; tot++; }
    let sobra = 0;
    for (let i = 0; i < k; i++) if (q[i] > caps[i]) { sobra += q[i] - caps[i]; q[i] = caps[i]; }
    for (let i = 0; i < ws.length && sobra > 0; i++) { const d = Math.min(sobra, caps[i] - q[i]); q[i] += d; sobra -= d; }
    return q;
  }

  // Intercala: uma de cada casa por rodada, na ordem recebida, até esgotar as cotas.
  function intercalar(filas, q) {
    const out = [], r = q.slice();
    let andou = true;
    while (andou) {
      andou = false;
      filas.forEach((f, i) => { if (r[i] > 0 && f.length) { out.push({ i, it: f.shift() }); r[i]--; andou = true; } });
    }
    return out;
  }

  function montarNivelamento(mapa, pool, tamanho, rnd = Math.random) {
    const porCasa = {};
    for (const it of embaralhar(pool, rnd)) (porCasa[casaDoItem(it.id)] ||= []).push(it);
    const ordem = mapa.casas.filter(c => c.lancada && porCasa[c.id]).sort((a, b) => b.peso - a.peso || a.num - b.num);
    const filas = ordem.map(c => porCasa[c.id]);
    const q = cotas(ordem.map(c => c.peso), filas.map(f => f.length), tamanho);
    return intercalar(filas, q).map(x => x.it);
  }

  function revisaoDoDia(mapa, est, itensPorCasa, agora = Date.now(), n = 8) {
    n = Math.min(10, Math.max(5, n));
    const casas = ordemPlano(mapa, est)
      .filter(c => aberta(mapa, est, c.id) && est.n[c.id] && !(est.prox[c.id] > agora) && (itensPorCasa[c.id] || []).length);
    const filas = casas.map(c => {
      const its = itensPorCasa[c.id];
      const errados = new Set(its.filter(it => est.vistos[it.id] === 0 && it.topico != null).map(it => it.topico));
      // 0 = inédita de um tópico que ele errou (nova versão) · 1 = a própria errada · 2 = inédita · 3 = já acertada
      const peso = it => {
        const v = est.vistos[it.id];
        if (v === undefined) return it.topico != null && errados.has(it.topico) ? 0 : 2;
        return v === 0 ? 1 : 3;
      };
      return [...its].sort((a, b) => peso(a) - peso(b));
    });
    const q = cotas(casas.map(c => prioridade(mapa, est, c.id)), filas.map(f => f.length), n);
    return intercalar(filas, q).map(x => ({ casa: casas[x.i].id, item: x.it }));
  }

  const tamanhoIlha = (peso, max) => Math.round(44 + 56 * Math.min(1, max ? Math.max(0, peso) / max : 0));

  const API = { novoEstado, responder, aplicarNivelamento, cor, aberta, prioridade, ordemPlano, dominioGeral,
    montarNivelamento, revisaoDoDia, tamanhoIlha, casaDoItem };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else raiz.EnemMotor = API;
})(typeof window !== 'undefined' ? window : globalThis);
