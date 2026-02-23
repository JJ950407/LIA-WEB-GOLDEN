/**
 * LIA Pagaré Web - Lógica de Login
 */

(function() {
  const loginForm = document.getElementById('login-form');
  const loginButton = document.getElementById('login-button');
  const errorDisplay = document.getElementById('login-error');

  // Si ya está autenticado, redirigir al dashboard
  if (window.LIA_AUTH && window.LIA_AUTH.hasToken()) {
    window.location.replace('/');
    return;
  }

  function showError(message) {
    errorDisplay.textContent = message;
  }

  function clearError() {
    errorDisplay.textContent = '';
  }

  function setLoading(loading) {
    loginButton.disabled = loading;
    loginButton.textContent = loading ? 'Entrando...' : 'Entrar';
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearError();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Validación básica
    if (!username || !password) {
      showError('Por favor ingresa usuario y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Guardar token y redirigir
      if (window.LIA_AUTH && data.token) {
        window.LIA_AUTH.setToken(data.token);
        window.location.replace('/');
      } else {
        throw new Error('Error interno: no se recibió token');
      }

    } catch (error) {
      setLoading(false);
      showError(error.message || 'Usuario o contraseña incorrectos');
    }
  }

  // Event listeners
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Permitir submit con Enter en cualquier campo
  const inputs = document.querySelectorAll('.login-form input');
  inputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin(e);
      }
    });
  });
})();
