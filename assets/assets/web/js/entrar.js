// Tela de conta: entrar, criar conta e trocar a senha (com código enviado por email).
import { api } from './api.js';
import { el, esc, ic, fmt, toast } from './ui.js';

const LOGO = () => `<div class="ent-marca"><span class="logo">${ic('logo', 20)}</span><span>PyForge</span></div>`;

// Mostra a tela até a pessoa entrar. Devolve o estado da conta (o mesmo de /api/conta).
export function telaConta(app, estadoConta) {
  return new Promise((pronto) => {
    const raiz = el('<div class="ent"><div class="ent-card" data-card></div><div class="ent-rodape">pyforge.online</div></div>');
    app.innerHTML = '';
    app.appendChild(raiz);
    const card = raiz.querySelector('[data-card]');
    let email = '';
    let timer = null;

    const terminar = async (r) => {
      clearInterval(timer);
      const c = await api('conta').catch(() => ({ logado: true, conta: r.conta, acesso: r.acesso }));
      if (c.acesso && c.acesso.liberado === false) { bloqueio(c); return; }
      const nome = (c.conta && c.conta.nome) || '';
      toast(nome ? fmt('Que bom te ver, {nome}!', { nome: nome.split(' ')[0] }) : 'Tudo certo, você entrou!', 'ok');
      raiz.remove();
      pronto(c);
    };

    const erro = (msg) => {
      const e = card.querySelector('[data-erro]');
      e.textContent = msg || '';
      e.hidden = !msg;
    };

    const ocupado = (botao, sim) => {
      botao.disabled = sim;
      botao.classList.toggle('carregando', sim);
    };

    const olho = (form) => form.querySelectorAll('[data-olho]').forEach((b) => {
      b.onclick = () => {
        const campo = b.parentElement.querySelector('input');
        const ver = campo.type === 'password';
        campo.type = ver ? 'text' : 'password';
        b.innerHTML = ic(ver ? 'olhoFechado' : 'olho', 16);
        b.title = ver ? 'Esconder a senha' : 'Mostrar a senha';
      };
    });

    const campoSenha = (nome, rotulo, auto) => `<label class="ent-rot">${rotulo}<span class="ent-senha"><input class="campo" name="${nome}" type="password" autocomplete="${auto}" minlength="8" maxlength="128" required><button type="button" class="ent-olho" data-olho title="Mostrar a senha">${ic('olho', 16)}</button></span></label>`;

    // ---------- entrar ----------
    function telaEntrar() {
      clearInterval(timer);
      card.innerHTML = `${LOGO()}
        <div class="ent-abas"><button class="on" type="button">Entrar​</button><button type="button" data-ir-criar>Criar conta</button></div>
        <h1>Entrar na sua conta</h1>
        <form class="ent-form" novalidate>
          <label class="ent-rot">Email<input class="campo" name="email" type="email" autocomplete="email" required></label>
          ${campoSenha('senha', 'Senha', 'current-password')}
          <button type="button" class="ent-link" data-esqueci>Esqueci a senha</button>
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>Continuar</button>
        </form>
        <p class="ent-nota">Vamos mandar um código para o seu email para confirmar que é você.</p>`;
      const f = card.querySelector('form');
      f.email.value = email;
      olho(f);
      card.querySelector('[data-ir-criar]').onclick = telaCriar;
      card.querySelector('[data-esqueci]').onclick = () => { email = f.email.value.trim(); telaEsqueci(); };
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        erro('');
        email = f.email.value.trim();
        if (!email || !f.senha.value) { erro('Preencha o email e a senha.'); return; }
        const b = f.querySelector('[data-ok]');
        ocupado(b, true);
        try {
          const r = await api('conta/entrar/iniciar', { email, senha: f.senha.value });
          telaCodigo('entrar', r);
        } catch (e) { erro(e.message); ocupado(b, false); }
      };
      (email ? f.senha : f.email).focus();
    }

    // ---------- criar conta ----------
    function telaCriar() {
      clearInterval(timer);
      card.innerHTML = `${LOGO()}
        <div class="ent-abas"><button type="button" data-ir-entrar>Entrar​</button><button class="on" type="button">Criar conta</button></div>
        <h1>Criar sua conta</h1>
        <form class="ent-form" novalidate>
          <label class="ent-rot"><span>Seu nome <span class="dim">(opcional)</span></span><input class="campo" name="nome" type="text" autocomplete="name" maxlength="60"></label>
          <label class="ent-rot">Email<input class="campo" name="email" type="email" autocomplete="email" required></label>
          ${campoSenha('senha', 'Crie uma senha', 'new-password')}
          ${campoSenha('senha2', 'Repita a senha', 'new-password')}
          <div class="ent-forca" data-forca><i></i><span>Pelo menos 8 caracteres</span></div>
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>Criar conta</button>
        </form>
        <p class="ent-nota"><span class="ent-gratis">Grátis</span> Criar conta e usar o PyForge é de graça durante o lançamento.</p>`;
      const f = card.querySelector('form');
      f.email.value = email;
      olho(f);
      card.querySelector('[data-ir-entrar]').onclick = telaEntrar;
      const forca = card.querySelector('[data-forca]');
      f.senha.oninput = () => {
        const s = f.senha.value;
        let n = 0;
        if (s.length >= 8) n++;
        if (s.length >= 12) n++;
        if (/[A-Z]/.test(s) && /[a-z]/.test(s)) n++;
        if (/\d/.test(s) && /[^A-Za-z0-9]/.test(s)) n++;
        forca.dataset.n = s ? String(n) : '';
        forca.querySelector('span').textContent = !s || s.length < 8 ? 'Pelo menos 8 caracteres' : n <= 1 ? 'Senha fraca' : n === 2 ? 'Senha boa' : 'Senha forte';
      };
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        erro('');
        email = f.email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { erro('Digite um email válido.'); return; }
        if (f.senha.value.length < 8) { erro('A senha precisa ter pelo menos 8 caracteres.'); return; }
        if (f.senha.value !== f.senha2.value) { erro('As duas senhas não são iguais.'); return; }
        const b = f.querySelector('[data-ok]');
        ocupado(b, true);
        try {
          const r = await api('conta/cadastro/iniciar', { email, senha: f.senha.value, nome: f.nome.value.trim() });
          telaCodigo('cadastro', r);
        } catch (e) { erro(e.message); ocupado(b, false); }
      };
      f.nome.focus();
    }

    // ---------- esqueci a senha ----------
    function telaEsqueci() {
      clearInterval(timer);
      card.innerHTML = `${LOGO()}
        <h1>Trocar a senha</h1>
        <p class="ent-sub">Digite o email da sua conta. Vamos mandar um código para você escolher uma senha nova.</p>
        <form class="ent-form" novalidate>
          <label class="ent-rot">Email<input class="campo" name="email" type="email" autocomplete="email" required></label>
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>Enviar código</button>
          <button type="button" class="btn ghost" data-voltar>${ic('esquerda', 14)}Voltar</button>
        </form>`;
      const f = card.querySelector('form');
      f.email.value = email;
      card.querySelector('[data-voltar]').onclick = telaEntrar;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        erro('');
        email = f.email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { erro('Digite um email válido.'); return; }
        const b = f.querySelector('[data-ok]');
        ocupado(b, true);
        try {
          const r = await api('conta/senha/iniciar', { email });
          telaCodigo('senha', r);
        } catch (e) { erro(e.message); ocupado(b, false); }
      };
      f.email.focus();
    }

    // ---------- código do email ----------
    function telaCodigo(finalidade, r) {
      clearInterval(timer);
      const novaSenha = finalidade === 'senha';
      card.innerHTML = `${LOGO()}
        <div class="ent-icone">${ic('enviar', 26)}</div>
        <h1>Confira seu email</h1>
        <p class="ent-sub">${fmt('Mandamos um código de 6 dígitos para {email}.', { email: `<b>${esc(email)}</b>` })} ${novaSenha ? 'Se existir uma conta com este email, o código chega em instantes.' : ''}</p>
        <form class="ent-form" novalidate>
          <input class="campo ent-codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000" aria-label="Código de 6 dígitos" required>
          ${novaSenha ? campoSenha('senhaNova', 'Senha nova', 'new-password') : ''}
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>${finalidade === 'cadastro' ? 'Confirmar e criar conta' : novaSenha ? 'Salvar senha nova' : 'Confirmar e entrar'}</button>
          <div class="ent-linha"><button type="button" class="ent-link" data-reenviar></button><button type="button" class="ent-link" data-voltar>Usar outro email</button></div>
        </form>
        <p class="ent-nota">Não chegou? Olhe a caixa de spam. O código vale por 10 minutos.</p>`;
      const f = card.querySelector('form');
      olho(f);
      const reenviar = card.querySelector('[data-reenviar]');
      let espera = (r && r.reenvioEm) || 60;
      const contar = () => {
        if (espera > 0) { reenviar.disabled = true; reenviar.textContent = fmt('Reenviar código em {s}s', { s: espera }); espera--; } else { reenviar.disabled = false; reenviar.textContent = 'Reenviar código'; }
      };
      contar();
      timer = setInterval(contar, 1000);
      reenviar.onclick = async () => {
        erro('');
        reenviar.disabled = true;
        try { const x = await api('conta/codigo/reenviar', { email, finalidade }); espera = x.reenvioEm || 60; contar(); toast('Mandamos um código novo.', 'ok'); } catch (e) { erro(e.message); reenviar.disabled = false; }
      };
      card.querySelector('[data-voltar]').onclick = () => (finalidade === 'cadastro' ? telaCriar() : finalidade === 'senha' ? telaEsqueci() : telaEntrar());
      const enviar = async () => {
        erro('');
        const codigo = f.codigo.value.replace(/\D/g, '');
        if (codigo.length !== 6) { erro('O código tem 6 dígitos.'); return; }
        if (novaSenha && f.senhaNova.value.length < 8) { erro('A senha precisa ter pelo menos 8 caracteres.'); return; }
        const b = f.querySelector('[data-ok]');
        ocupado(b, true);
        try {
          const caminho = finalidade === 'cadastro' ? 'conta/cadastro/confirmar' : novaSenha ? 'conta/senha/confirmar' : 'conta/entrar/confirmar';
          const res = await api(caminho, novaSenha ? { email, codigo, senhaNova: f.senhaNova.value } : { email, codigo });
          await terminar(res);
        } catch (e) {
          erro(e.message);
          ocupado(b, false);
          f.codigo.select();
        }
      };
      f.codigo.oninput = () => {
        const d = f.codigo.value.replace(/\D/g, '').slice(0, 6);
        f.codigo.value = d;
        if (d.length === 6 && !novaSenha) enviar();
      };
      f.onsubmit = (ev) => { ev.preventDefault(); enviar(); };
      f.codigo.focus();
    }

    // ---------- teste grátis acabou (quando a cobrança for ligada) ----------
    function bloqueio(c) {
      clearInterval(timer);
      card.innerHTML = `${LOGO()}
        <h1>Seu teste grátis acabou</h1>
        <p class="ent-sub">${fmt('Continue usando o PyForge por {preco}.', { preco: esc((c.acesso && c.acesso.preco) || 'US$ 5') })} O pagamento ainda vai abrir: acompanhe em pyforge.online.</p>
        <div class="ent-form"><button class="btn grande" data-sair>Sair da conta</button></div>`;
      card.querySelector('[data-sair]').onclick = async () => { await api('conta-sair', {}).catch(() => {}); telaEntrar(); };
    }

    if (estadoConta && estadoConta.logado && estadoConta.acesso && estadoConta.acesso.liberado === false) bloqueio(estadoConta);
    else if (estadoConta && estadoConta.motivo === 'sessao_expirada') { email = estadoConta.ultimoEmail || ''; telaEntrar(); erro('Sua sessão acabou. Entre de novo.'); }
    else if (estadoConta && estadoConta.ultimoEmail) { email = estadoConta.ultimoEmail; telaEntrar(); }
    else telaCriar();
  });
}

// Painel da conta (Configurações › Conta).
export async function painelConta(alvo) {
  alvo.innerHTML = '<div class="card muted" style="padding:20px">Carregando…</div>';
  let c;
  try { c = await api('conta'); } catch (e) { alvo.innerHTML = `<div class="card err" style="padding:20px">${esc(e.message)}</div>`; return; }
  const conta = c.conta || {};
  const plano = !c.acesso ? '' : c.acesso.plano === 'gratis' ? 'Grátis (lançamento)' : c.acesso.plano === 'teste' ? 'Teste grátis' : c.acesso.plano === 'pago' ? 'Pago' : c.acesso.plano === 'offline' ? 'Sem conexão agora' : '';
  alvo.innerHTML = '';
  const card = el(`<div class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px">
    <div class="flex" style="gap:14px"><span class="avatar" style="width:44px;height:44px;font-size:15px" data-ini></span>
      <div class="grow"><div style="font-weight:700;font-size:15px" data-nome></div><div class="muted" data-email></div></div>
      ${plano ? `<span class="pill ok">${esc(plano)}</span>` : ''}</div>
    <div class="muted" style="font-size:12.5px">Esta conta fica conectada neste computador. Para entrar em outro computador, use o mesmo email e senha.</div>
    <div class="flex" style="gap:8px"><span class="muted grow" style="font-size:12.5px">Esqueceu a senha? Saia da conta e use “Esqueci a senha”.</span><button class="btn perigo" data-sair>Sair da conta</button></div>
  </div>`);
  card.querySelector('[data-nome]').textContent = conta.nome || 'Sem nome';
  card.querySelector('[data-email]').textContent = conta.email || '';
  card.querySelector('[data-ini]').textContent = ((conta.nome || conta.email || '?').trim()[0] || '?').toUpperCase();
  card.querySelector('[data-sair]').onclick = async () => { await api('conta-sair', {}).catch(() => {}); location.reload(); };
  alvo.appendChild(card);
}
