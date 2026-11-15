// Camada de dados. Com Supabase configurado (config.js), fala com o banco;
// sem ele, roda em "modo teste" e guarda tudo neste aparelho.
const Backend = (() => {
  const cfg = window.CONFIG || {};
  const online = !!(cfg.supabaseUrl && cfg.supabaseKey);
  let sb = null;

  const ler = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  async function iniciar() {
    if (!online) return;
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }

  async function usuario() {
    if (!online) return ler('rev_teste_user', null);
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email, temSenha: !!u.user_metadata?.tem_senha } : null;
  }

  async function entrarComSenha(email, senha) {
    if (!online) { gravar('rev_teste_user', { id: 'teste', email, temSenha: true }); return { ok: true }; }
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (!error) return { ok: true };
    if (/invalid login|credentials/i.test(error.message))
      return { ok: false, erro: 'E-mail ou senha errados. Se é seu primeiro acesso ou você esqueceu a senha, toque em "Primeiro acesso / esqueci a senha".' };
    return { ok: false, erro: traduzir(error.message) };
  }

  // Depois de entrar pelo código: cria (ou troca) a senha deste aluno.
  async function criarSenha(senha) {
    if (!online) { const u = ler('rev_teste_user', {}); gravar('rev_teste_user', { ...u, temSenha: true }); return { ok: true }; }
    const { error } = await sb.auth.updateUser({ password: senha, data: { tem_senha: true } });
    if (!error) return { ok: true };
    if (/should be different|same/i.test(error.message)) {
      await sb.auth.updateUser({ data: { tem_senha: true } });
      return { ok: true };
    }
    if (/at least|short|weak/i.test(error.message)) return { ok: false, erro: 'Senha fraca: use pelo menos 6 caracteres.' };
    return { ok: false, erro: traduzir(error.message) };
  }

  async function pedirCodigo(email) {
    if (!online) return { ok: true };
    // emailRedirectTo: se o e-mail vier com link em vez de código, o link também entra no app
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
    return error ? { ok: false, erro: traduzir(error.message) } : { ok: true };
  }

  async function confirmarCodigo(email, codigo) {
    if (!online) { gravar('rev_teste_user', { id: 'teste', email }); return { ok: true }; }
    const { error } = await sb.auth.verifyOtp({ email, token: codigo, type: 'email' });
    return error ? { ok: false, erro: traduzir(error.message) } : { ok: true };
  }

  async function sair() {
    if (online) await sb.auth.signOut();
    try { localStorage.removeItem('rev_teste_user'); } catch {}
  }

  // 'professor' | 'aluno' | 'bloqueado'
  async function acesso() {
    if (!online) return 'professor';
    const { data, error } = await sb.rpc('meu_acesso');
    if (error) throw error;
    return data;
  }

  // ---------- conteúdo das aulas ----------
  // Online, o conteúdo fica no banco e só quem tem acesso lê (os arquivos de dados/ não são publicados).
  // No modo teste (e no PC do professor), vem dos arquivos de dados/.
  async function carregarIndice() {
    if (!online) return (await fetch('dados/indice.json')).json();
    const { data, error } = await sb.from('conteudo').select('aula, ordem, bloco, titulo').order('ordem');
    if (error) throw error;
    const blocos = [];
    for (const r of data) {
      let b = blocos.find(x => x.nome === r.bloco);
      if (!b) blocos.push(b = { nome: r.bloco, aulas: [] });
      b.aulas.push({ aula: r.aula, titulo: r.titulo });
    }
    return { blocos };
  }
  async function carregarAula(num, indice) {
    if (!online) {
      const a = indice.blocos.flatMap(b => b.aulas).find(x => x.aula === num);
      return (await fetch('dados/' + a.arquivo)).json();
    }
    const { data, error } = await sb.from('conteudo').select('dados').eq('aula', num).single();
    if (error) throw error;
    return data.dados;
  }
  // Professor: lê os arquivos de dados/ deste PC e grava no banco.
  async function enviarConteudo(aviso) {
    const indice = await (await fetch('dados/indice.json', { cache: 'reload' })).json();
    const linhas = []; let ordem = 0;
    for (const b of indice.blocos) for (const a of b.aulas) {
      const dados = await (await fetch('dados/' + a.arquivo, { cache: 'reload' })).json();
      linhas.push({ aula: a.aula, ordem: ++ordem, bloco: b.nome, titulo: a.titulo, dados, atualizado_em: new Date().toISOString() });
      aviso && aviso(`Lendo aula ${a.aula}…`);
    }
    const { error } = await sb.from('conteudo').upsert(linhas, { onConflict: 'aula' });
    if (error) throw error;
    // tira do banco as aulas que saíram do índice
    const { data } = await sb.from('conteudo').select('aula');
    const sobra = (data || []).map(r => r.aula).filter(x => !linhas.some(l => l.aula === x));
    if (sobra.length) await sb.from('conteudo').delete().in('aula', sobra);
    return linhas.length;
  }

  // ---------- respostas (o que alimenta o painel) ----------
  const FILA = 'rev_fila';
  function registrar(ev) {
    const r = { ...ev, criado_em: new Date().toISOString() };
    if (!online) { const log = ler('rev_log', []); log.push(r); gravar('rev_log', log.slice(-5000)); return; }
    const fila = ler(FILA, []); fila.push(r); gravar(FILA, fila);
    enviarFila();
  }
  let enviando = false;
  async function enviarFila() {
    if (!online || enviando) return;
    const fila = ler(FILA, []);
    if (!fila.length) return;
    enviando = true;
    try {
      const lote = fila.slice(0, 200);
      const { error } = await sb.from('respostas').insert(lote.map(r => ({
        item: r.item, tipo: r.tipo, aula: r.aula, topico: r.topico, acertou: r.acertou, ms: r.ms, criado_em: r.criado_em
      })));
      if (!error) { gravar(FILA, ler(FILA, []).slice(lote.length)); }
    } catch {} finally { enviando = false; }
    if (ler(FILA, []).length && navigator.onLine) setTimeout(enviarFila, 3000);
  }
  window.addEventListener('online', enviarFila);

  // ---------- progresso do aluno (caixas de revisão, XP, sequência) ----------
  async function carregarProgresso() {
    const local = ler('rev_prog', null);
    if (!online) return local;
    try {
      const { data } = await sb.from('progresso').select('dados, atualizado_em').maybeSingle();
      if (data && (!local || new Date(data.atualizado_em) > new Date(local.atualizado_em || 0))) return data.dados;
    } catch {}
    return local;
  }
  let timer = null;
  function salvarProgresso(p) {
    p.atualizado_em = new Date().toISOString();
    gravar('rev_prog', p);
    if (!online) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try { await sb.from('progresso').upsert({ dados: p, atualizado_em: p.atualizado_em }); } catch {}
    }, 1500);
  }

  // ---------- painel do professor ----------
  async function painelItens(dias) {
    if (!online) {
      const desde = dias ? Date.now() - dias * 864e5 : 0;
      const m = new Map();
      for (const r of ler('rev_log', [])) {
        if (new Date(r.criado_em).getTime() < desde) continue;
        const k = r.item;
        const o = m.get(k) || { item: r.item, tipo: r.tipo, aula: r.aula, topico: r.topico, tentativas: 0, erros: 0, alunos: 1 };
        o.tentativas++; if (!r.acertou) o.erros++;
        m.set(k, o);
      }
      return [...m.values()];
    }
    const { data, error } = await sb.rpc('painel_itens', { dias: dias || 36500 });
    if (error) throw error;
    return data.map(r => ({ ...r, tentativas: +r.tentativas, erros: +r.erros, alunos: +r.alunos }));
  }
  async function painelGeral(dias) {
    if (!online) {
      const itens = await painelItens(dias);
      const t = itens.reduce((s, i) => s + i.tentativas, 0), e = itens.reduce((s, i) => s + i.erros, 0);
      return { alunos: t ? 1 : 0, respostas: t, acertos: t - e };
    }
    const { data, error } = await sb.rpc('painel_geral', { dias: dias || 36500 });
    if (error) throw error;
    const r = data[0] || {};
    return { alunos: +r.alunos || 0, respostas: +r.respostas || 0, acertos: +r.acertos || 0 };
  }
  async function listarLiberados() {
    if (!online) return ler('rev_liberados', []);
    const { data, error } = await sb.from('liberados').select('email, nome, criado_em, expira_em').order('criado_em', { ascending: false });
    if (error) throw error;
    return data;
  }
  async function liberar(emails) {
    emails = [...new Set(emails.map(e => e.trim().toLowerCase()).filter(e => /^\S+@\S+\.\S+$/.test(e)))];
    if (!emails.length) return 0;
    if (!online) {
      const l = ler('rev_liberados', []);
      for (const e of emails) if (!l.some(x => x.email === e)) l.unshift({ email: e, criado_em: new Date().toISOString() });
      gravar('rev_liberados', l); return emails.length;
    }
    const { error } = await sb.from('liberados').upsert(emails.map(email => ({ email })), { onConflict: 'email', ignoreDuplicates: true });
    if (error) throw error;
    return emails.length;
  }
  async function bloquear(email) {
    if (!online) { gravar('rev_liberados', ler('rev_liberados', []).filter(x => x.email !== email)); return; }
    const { error } = await sb.from('liberados').delete().eq('email', email);
    if (error) throw error;
  }

  function traduzir(m) {
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
    if (/expired|invalid/i.test(m)) return 'Código errado ou vencido. Peça um novo.';
    if (/email/i.test(m) && /invalid/i.test(m)) return 'E-mail inválido.';
    return m;
  }

  return { online, iniciar, usuario, entrarComSenha, criarSenha, pedirCodigo, confirmarCodigo, sair, acesso, registrar, enviarFila,
    carregarIndice, carregarAula, enviarConteudo,
    carregarProgresso, salvarProgresso, painelItens, painelGeral, listarLiberados, liberar, bloquear, ler, gravar };
})();
