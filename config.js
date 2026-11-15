// Ligação com o banco (Supabase). Enquanto estiver vazio, o app roda em MODO TESTE:
// qualquer e-mail e qualquer código entram, e tudo fica salvo só neste aparelho.
// Depois de criar o projeto no Supabase, cole aqui a URL e a chave "anon/publishable"
// (essa chave é pública por natureza; quem protege os dados são as regras do banco).
window.CONFIG = {
  supabaseUrl: 'https://nkokuwqvmlnbllgwisvh.supabase.co',
  supabaseKey: 'sb_publishable_ACmFXHkQWS2SXA9_BMiuMw_VD9I_jIH',
  linkCompra: ''   // página de venda do acesso (aparece para quem entrar sem ter comprado)
};
