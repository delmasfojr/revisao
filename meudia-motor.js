// "Meu dia" — lógica pura (sem tela). Navegador: global MeuDiaMotor. Node: module.exports (testes).
// Horários internos em minutos desde 0h; nos dados guardados, 'HH:MM'.
(function (raiz) {
  const FOLGA = 15, MIN_JANELA = 10, MAX_BLOCO = 25, PAUSA = 5, MIN_PESADO = 20, GUARDA_DIAS = 14;
  const PESADOS = ['trilha', 'enem'];

  const hm = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const meioDia = data => new Date(data + 'T12:00:00');
  const diaDaSemana = data => meioDia(data).getDay();
  const somarDias = (data, n) => { const d = meioDia(data); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv'); };
  const ontem = data => somarDias(data, -1);

  // de [ini, fim) tira os intervalos ocupados; devolve os pedaços livres
  function subtrair(ini, fim, ocup) {
    const livres = []; let cur = ini;
    for (const [a, b] of [...ocup].sort((x, y) => x[0] - y[0])) {
      if (a > cur) livres.push([cur, Math.min(a, fim)]);
      cur = Math.max(cur, b);
    }
    if (cur < fim) livres.push([cur, fim]);
    return livres;
  }

  function janelasLivres(agenda, data, extras = [], desde = null, ocupados = []) {
    const acorda = hm(agenda.acorda), dorme = hm(agenda.dorme) > acorda ? hm(agenda.dorme) : 24 * 60;
    const ini = desde == null ? acorda : Math.max(acorda, Math.ceil(desde / 5) * 5);
    const dia = diaDaSemana(data);
    const comp = [...(agenda.fixos || []).filter(f => f.dias.includes(dia)), ...extras]
      .map(c => [hm(c.ini) - FOLGA, hm(c.fim) + FOLGA]);
    const ocup = [...comp, ...ocupados.map(o => [hm(o.ini), hm(o.fim)])];
    return subtrair(ini, dorme, ocup).filter(([a, b]) => b - a >= MIN_JANELA).map(([a, b]) => ({ ini: a, fim: b }));
  }

  // tempo médio por resposta (s): padrão 20 s por card; erro vale 3 cards (ler a resolução de novo)
  function segundosPorResposta(est) {
    const n = Object.values(est?.n || {}).reduce((s, x) => s + x, 0);
    if (n < 50) return { card: 20, erro: 60 };
    const card = Math.round(Math.max(10, Math.min(60, est.ms / n / 1000)));
    return { card, erro: 3 * card };
  }

  function montarFila(ctx) {
    const s = { card: 20, erro: 60, ...(ctx.seg || {}) }, f = [];
    const minDe = (n, seg, teto) => Math.max(5, Math.min(teto, Math.ceil(n * seg / 60)));
    if (ctx.cards > 0) f.push({ tipo: 'cards', alvo: null, qtd: Math.min(ctx.cards, Math.floor(25 * 60 / s.card)), min: minDe(ctx.cards, s.card, 25) });
    if (ctx.erros > 0) f.push({ tipo: 'erros', alvo: null, qtd: Math.min(ctx.erros, Math.floor(20 * 60 / s.erro)), min: minDe(ctx.erros, s.erro, 20) });
    for (const p of ctx.pend || []) f.push({ tipo: p.tipo, alvo: p.alvo ?? null, qtd: p.tipo === 'enem' ? 8 : 1, min: p.tipo === 'enem' ? 20 : 15, pend: true });
    if (ctx.temLicao) f.push({ tipo: 'trilha', alvo: null, qtd: 1, min: 15 });
    if (ctx.usaEnem) f.push({ tipo: 'enem', alvo: null, qtd: 8, min: 20 });
    if (ctx.fraco) f.push({ tipo: 'fraco', alvo: ctx.fraco, qtd: 10, min: 15 });
    return f;
  }

  const novoBloco = (it, ini) => ({ ini: fmt(ini), fim: fmt(ini + it.min), tipo: it.tipo, alvo: it.alvo ?? null,
    meta: it.qtd, feitos: 0, feito: false, manual: false, ...(it.pend ? { pend: true } : {}) });

  function encaixar(janelas, fila, maxMin = null, enche = []) {
    const orc = maxMin == null ? Infinity : maxMin;
    const cap = janelas.reduce((s, j) => s + j.fim - j.ini, 0);
    // 1) escolhe pela prioridade até o limite do dia; o que não cabe sai (o fim da fila sai primeiro)
    const escolhidos = []; let usado = 0;
    const tenta = it => {
      if (it.min > MAX_BLOCO || usado + it.min > orc || usado + it.min > cap) return false;
      escolhidos.push(it); usado += it.min; return true;
    };
    fila.forEach(tenta);
    // 2) sobrou tempo: enche alternando os tipos de "avançar"
    for (let i = 0; enche.length && i < 60; i++) {
      const t = enche[i % enche.length];
      if (!tenta({ tipo: t, alvo: null, qtd: t === 'enem' ? 8 : 1, min: t === 'enem' ? 20 : 15 })) break;
    }
    // 3) põe nas janelas: cada janela tem um cursor; entre dois blocos seguidos, pausa de 5 min
    const js = janelas.map(j => ({ ...j, cur: j.ini, n: 0 }));
    const livre = j => j.fim - j.cur - (j.n ? PAUSA : 0);
    const por = (j, it) => { const ini = j.cur + (j.n ? PAUSA : 0); j.cur = ini + it.min; j.n++; return novoBloco(it, ini); };
    const blocos = [];
    for (const it of escolhidos.filter(x => PESADOS.includes(x.tipo))) {          // pesados: janela ≥ 20 min, a mais cedo
      const j = js.find(j => j.fim - j.ini >= MIN_PESADO && livre(j) >= it.min);
      if (j) blocos.push(por(j, it));
    }
    const ordemLeve = [...js].sort((a, b) => (a.fim - a.ini) - (b.fim - b.ini) || b.ini - a.ini);   // curtas primeiro; empate → mais tarde
    for (const it of escolhidos.filter(x => !PESADOS.includes(x.tipo))) {
      const j = ordemLeve.find(j => livre(j) >= it.min);
      if (j) blocos.push(por(j, it));
    }
    return blocos.sort((a, b) => hm(a.ini) - hm(b.ini));
  }

  function planejar({ agenda, data, extras = [], agora = null, fila, enche = [], feitos = [] }) {
    const js = janelasLivres(agenda, data, extras, agora, feitos.map(b => ({ ini: b.ini, fim: b.fim })));
    const gasto = feitos.reduce((s, b) => s + hm(b.fim) - hm(b.ini), 0);
    const orc = agenda.maxMin == null ? null : Math.max(0, agenda.maxMin - gasto);
    return [...feitos, ...encaixar(js, fila, orc, enche)].sort((a, b) => hm(a.ini) - hm(b.ini));
  }

  function marcar(plano, tipo, n = 1, filtro = () => true) {
    const b = (plano?.blocos || []).find(b => b.tipo === tipo && !b.feito && filtro(b.alvo));
    if (!b) return null;
    b.feitos = (b.feitos || 0) + n;
    if (b.feitos >= b.meta) b.feito = true;
    return b;
  }
  function alternar(b) { b.feito = !b.feito; b.manual = true; return b; }

  function pendenciasDeOntem(planos, data) {
    const out = [];
    for (const b of planos[ontem(data)]?.blocos || [])
      if (PESADOS.includes(b.tipo) && !b.feito && !b.pend && !out.some(x => x.tipo === b.tipo)) out.push({ tipo: b.tipo, alvo: b.alvo ?? null });
    return out;
  }

  function limpar(planos, data, dias = GUARDA_DIAS) {
    const limite = somarDias(data, -dias);
    for (const k of Object.keys(planos)) if (k < limite) delete planos[k];
    return planos;
  }

  const API = { hm, fmt, diaDaSemana, ontem, janelasLivres, montarFila, segundosPorResposta, encaixar, planejar, marcar, alternar, pendenciasDeOntem, limpar, PESADOS, MAX_BLOCO, PAUSA, MIN_PESADO, GUARDA_DIAS, _somarDias: somarDias };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else raiz.MeuDiaMotor = API;
})(typeof window !== 'undefined' ? window : globalThis);
