export async function mostrarLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page" style="background: linear-gradient(135deg, #0056b3 0%, #004494 100%); min-height: 100vh; display: flex; align-items: center;">
      <div class="login-box" style="width: 400px; margin: auto;">
        <div class="card card-outline card-primary">
          <div class="card-header text-center">
            <h1 style="color: #0056b3; margin: 0;"><i class="fas fa-hashtag"></i> AgN</h1>
            <p class="mb-0" style="color: #666;">Sistema de Numeração AgSUS</p>
          </div>
          <div class="card-body">
            <form id="formLogin">
              <div class="input-group mb-3">
                <input type="email" id="loginEmail" class="form-control" placeholder="E-mail" required>
                <div class="input-group-append"><span class="input-group-text"><i class="fas fa-envelope"></i></span></div>
              </div>
              <div class="input-group mb-3">
                <input type="password" id="loginSenha" class="form-control" placeholder="Senha" required>
                <div class="input-group-append"><span class="input-group-text"><i class="fas fa-lock"></i></span></div>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Entrar</button>
            </form>
            
            <div class="social-auth-links text-center mt-3">
              <a href="#" class="btn btn-link" onclick="mostrarEsqueciSenha()">
                <i class="fas fa-key mr-2"></i> Esqueci minha senha
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const data = await resp.json();
      
      if (!resp.ok) throw new Error(data.erro);

      localStorage.setItem('agn_token', data.token);
      localStorage.setItem('agn_usuario', JSON.stringify(data.usuario));
      
      // Recarrega pra mostrar shell
      location.reload();
      
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  });
}

window.mostrarEsqueciSenha = async () => {
  const email = prompt('Digite seu e-mail para resetar a senha:');
  if (!email) return;
  
  try {
    const resp = await fetch('/api/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    alert('Link de reset enviado para ' + email);
  } catch (err) {
    alert('Erro ao enviar link.');
  }
};

export function initLogin() {
  // Verifica token válido
  const token = localStorage.getItem('agn_token');
  if (!token) return mostrarLogin();
}
