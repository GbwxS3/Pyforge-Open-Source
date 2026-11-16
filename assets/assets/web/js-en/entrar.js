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
      toast(nome ? fmt('Good to see you, {nome}!', { nome: nome.split(' ')[0] }) : 'All set, you\'re in!', 'ok');
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
        b.title = ver ? 'Hide password' : 'Show password';
      };
    });

    const campoSenha = (nome, rotulo, auto) => `<label class="ent-rot">${rotulo}<span class="ent-senha"><input class="campo" name="${nome}" type="password" autocomplete="${auto}" minlength="8" maxlength="128" required><button type="button" class="ent-olho" data-olho title="Show password">${ic('olho', 16)}</button></span></label>`;

    // ---------- entrar ----------
    function telaEntrar() {
      clearInterval(timer);
      card.innerHTML = `${LOGO()}
        <div class="ent-abas"><button class="on" type="button">Log in</button><button type="button" data-ir-criar>Create account</button></div>
        <h1>Log in to your account</h1>
        <form class="ent-form" novalidate>
          <label class="ent-rot">Email<input class="campo" name="email" type="email" autocomplete="email" required></label>
          ${campoSenha('senha', 'Password', 'current-password')}
          <button type="button" class="ent-link" data-esqueci>Forgot password</button>
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>Continue</button>
        </form>
        <p class="ent-nota">We'll send a code to your email to confirm it's you.</p>`;
      const f = card.querySelector('form');
      f.email.value = email;
      olho(f);
      card.querySelector('[data-ir-criar]').onclick = telaCriar;
      card.querySelector('[data-esqueci]').onclick = () => { email = f.email.value.trim(); telaEsqueci(); };
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        erro('');
        email = f.email.value.trim();
        if (!email || !f.senha.value) { erro('Fill in your email and password.'); return; }
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
        <div class="ent-abas"><button type="button" data-ir-entrar>Log in</button><button class="on" type="button">Create account</button></div>
        <h1>Create your account</h1>
        <form class="ent-form" novalidate>
          <label class="ent-rot"><span>Your name <span class="dim">(optional)</span></span><input class="campo" name="nome" type="text" autocomplete="name" maxlength="60"></label>
          <label class="ent-rot">Email<input class="campo" name="email" type="email" autocomplete="email" required></label>
          ${campoSenha('senha', 'Create a password', 'new-password')}
          ${campoSenha('senha2', 'Repeat the password', 'new-password')}
          <div class="ent-forca" data-forca><i></i><span>At least 8 characters</span></div>
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>Create account</button>
        </form>
        <p class="ent-nota"><span class="ent-gratis">Free</span> Creating an account and using PyForge is free during the launch.</p>`;
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
        forca.querySelector('span').textContent = !s || s.length < 8 ? 'At least 8 characters' : n <= 1 ? 'Weak password' : n === 2 ? 'Good password' : 'Strong password';
      };
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        erro('');
        email = f.email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { erro('Enter a valid email.'); return; }
        if (f.senha.value.length < 8) { erro('The password needs at least 8 characters.'); return; }
        if (f.senha.value !== f.senha2.value) { erro('The two passwords don\'t match.'); return; }
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
        <h1>Reset your password</h1>
        <p class="ent-sub">Enter your account email. We'll send you a code to choose a new password.</p>
        <form class="ent-form" novalidate>
          <label class="ent-rot">Email<input class="campo" name="email" type="email" autocomplete="email" required></label>
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>Send code</button>
          <button type="button" class="btn ghost" data-voltar>${ic('esquerda', 14)}Back</button>
        </form>`;
      const f = card.querySelector('form');
      f.email.value = email;
      card.querySelector('[data-voltar]').onclick = telaEntrar;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        erro('');
        email = f.email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { erro('Enter a valid email.'); return; }
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
        <h1>Check your email</h1>
        <p class="ent-sub">${fmt('We sent a 6-digit code to {email}.', { email: `<b>${esc(email)}</b>` })} ${novaSenha ? 'If an account exists for this email, the code will arrive shortly.' : ''}</p>
        <form class="ent-form" novalidate>
          <input class="campo ent-codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000" aria-label="6-digit code" required>
          ${novaSenha ? campoSenha('senhaNova', 'New password', 'new-password') : ''}
          <div class="ent-erro" data-erro hidden></div>
          <button class="btn pri grande" type="submit" data-ok>${finalidade === 'cadastro' ? 'Confirm and create account' : novaSenha ? 'Save new password' : 'Confirm and log in'}</button>
          <div class="ent-linha"><button type="button" class="ent-link" data-reenviar></button><button type="button" class="ent-link" data-voltar>Use another email</button></div>
        </form>
        <p class="ent-nota">Didn't get it? Check your spam folder. The code is valid for 10 minutes.</p>`;
      const f = card.querySelector('form');
      olho(f);
      const reenviar = card.querySelector('[data-reenviar]');
      let espera = (r && r.reenvioEm) || 60;
      const contar = () => {
        if (espera > 0) { reenviar.disabled = true; reenviar.textContent = fmt('Resend code in {s}s', { s: espera }); espera--; } else { reenviar.disabled = false; reenviar.textContent = 'Resend code'; }
      };
      contar();
      timer = setInterval(contar, 1000);
      reenviar.onclick = async () => {
        erro('');
        reenviar.disabled = true;
        try { const x = await api('conta/codigo/reenviar', { email, finalidade }); espera = x.reenvioEm || 60; contar(); toast('We sent a new code.', 'ok'); } catch (e) { erro(e.message); reenviar.disabled = false; }
      };
      card.querySelector('[data-voltar]').onclick = () => (finalidade === 'cadastro' ? telaCriar() : finalidade === 'senha' ? telaEsqueci() : telaEntrar());
      const enviar = async () => {
        erro('');
        const codigo = f.codigo.value.replace(/\D/g, '');
        if (codigo.length !== 6) { erro('The code has 6 digits.'); return; }
        if (novaSenha && f.senhaNova.value.length < 8) { erro('The password needs at least 8 characters.'); return; }
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
        <h1>Your free trial has ended</h1>
        <p class="ent-sub">${fmt('Keep using PyForge for {preco}.', { preco: esc((c.acesso && c.acesso.preco) || 'US$ 5') })} Payment isn't open yet: follow pyforge.online for updates.</p>
        <div class="ent-form"><button class="btn grande" data-sair>Log out</button></div>`;
      card.querySelector('[data-sair]').onclick = async () => { await api('conta-sair', {}).catch(() => {}); telaEntrar(); };
    }

    if (estadoConta && estadoConta.logado && estadoConta.acesso && estadoConta.acesso.liberado === false) bloqueio(estadoConta);
    else if (estadoConta && estadoConta.motivo === 'sessao_expirada') { email = estadoConta.ultimoEmail || ''; telaEntrar(); erro('Your session ended. Please log in again.'); }
    else if (estadoConta && estadoConta.ultimoEmail) { email = estadoConta.ultimoEmail; telaEntrar(); }
    else telaCriar();
  });
}

// Painel da conta (Configurações › Conta).
export async function painelConta(alvo) {
  alvo.innerHTML = '<div class="card muted" style="padding:20px">Loading…</div>';
  let c;
  try { c = await api('conta'); } catch (e) { alvo.innerHTML = `<div class="card err" style="padding:20px">${esc(e.message)}</div>`; return; }
  const conta = c.conta || {};
  const plano = !c.acesso ? '' : c.acesso.plano === 'gratis' ? 'Free (launch)' : c.acesso.plano === 'teste' ? 'Free trial' : c.acesso.plano === 'pago' ? 'Paid' : c.acesso.plano === 'offline' ? 'Offline right now' : '';
  alvo.innerHTML = '';
  const card = el(`<div class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px">
    <div class="flex" style="gap:14px"><span class="avatar" style="width:44px;height:44px;font-size:15px" data-ini></span>
      <div class="grow"><div style="font-weight:700;font-size:15px" data-nome></div><div class="muted" data-email></div></div>
      ${plano ? `<span class="pill ok">${esc(plano)}</span>` : ''}</div>
    <div class="muted" style="font-size:12.5px">This account stays logged in on this computer. To use another computer, log in with the same email and password.</div>
    <div class="flex" style="gap:8px"><span class="muted grow" style="font-size:12.5px">Forgot your password? Log out and use “Forgot password”.</span><button class="btn perigo" data-sair>Log out</button></div>
  </div>`);
  card.querySelector('[data-nome]').textContent = conta.nome || 'No name';
  card.querySelector('[data-email]').textContent = conta.email || '';
  card.querySelector('[data-ini]').textContent = ((conta.nome || conta.email || '?').trim()[0] || '?').toUpperCase();
  card.querySelector('[data-sair]').onclick = async () => { await api('conta-sair', {}).catch(() => {}); location.reload(); };
  alvo.appendChild(card);
}
