// Comunicação com o servidor local do PyForge.

function lerToken() {
  const m = location.hash.match(/t=([0-9a-f]+)/);
  if (m) {
    sessionStorage.setItem('pyforge-token', m[1]);
    history.replaceState(null, '', location.pathname + '#/');
  }
  return sessionStorage.getItem('pyforge-token') || '';
}

export const TOKEN = lerToken();

export async function api(caminho, corpo, metodo, signal) {
  const opcoes = { method: metodo || (corpo !== undefined ? 'POST' : 'GET'), headers: { 'X-PyForge-Token': TOKEN }, signal };
  if (corpo !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }
  const r = await fetch('/api/' + caminho, opcoes);
  let dados = null;
  try { dados = await r.json(); } catch { dados = null; }
  if (!r.ok) {
    const msg = (dados && dados.erro) || ('Erro ' + r.status);
    const e = new Error(msg);
    e.status = r.status;
    throw e;
  }
  return dados;
}

export function q(obj) {
  return Object.entries(obj).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
}

// Acompanha uma tarefa (processo) ao vivo. Devolve uma função para parar de ouvir.
export function ouvirJob(id, aoEvento) {
  const es = new EventSource('/api/job/stream?' + q({ id, t: TOKEN }));
  es.onmessage = (m) => {
    let ev;
    try { ev = JSON.parse(m.data); } catch { return; }
    aoEvento(ev);
    if (ev.t === 'fim') es.close();
  };
  es.onerror = () => { es.close(); aoEvento({ t: 'fim', c: -2, perdido: true }); };
  return () => es.close();
}

export async function iniciarJob(pedido, aoEvento) {
  const r = await api('job/iniciar', pedido);
  if (r.id) ouvirJob(r.id, aoEvento);
  return r;
}

// Conversa com a IA em streaming (POST + leitura do corpo).
export async function conversarIA(corpo, aoTexto, sinal, aoStatus) {
  const r = await fetch('/api/ia/chat', {
    method: 'POST',
    headers: { 'X-PyForge-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: sinal,
  });
  if (!r.ok || !r.body) throw new Error('Não consegui falar com a IA (' + r.status + ')');
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const bloco = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const linha of bloco.split('\n')) {
        if (!linha.startsWith('data:')) continue;
        let ev;
        try { ev = JSON.parse(linha.slice(5)); } catch { continue; }
        if (ev.erro) { const e = new Error(ev.erro); e.codigo = ev.codigo || ''; throw e; }
        if (ev.status !== undefined && aoStatus) aoStatus(ev.status);
        if (ev.velocidade && aoStatus) aoStatus(undefined, ev.velocidade);
        if (ev.t) aoTexto(ev.t);
        if (ev.fim) return;
      }
    }
  }
}
