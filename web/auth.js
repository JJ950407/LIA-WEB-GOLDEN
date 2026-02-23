/**
 * LIA Pagaré Web - Sistema de Autenticación
 * Utilidades para manejo de JWT y sesión
 */

const AUTH_TOKEN_KEY = 'lia_auth_token';

/**
 * Obtiene el token almacenado
 */
function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Almacena el token
 */
function setToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Elimina el token (logout)
 */
function clearToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Verifica si existe un token
 */
function hasToken() {
  return !!getToken();
}

/**
 * Verifica el token con el servidor
 */
async function verifyTokenWithServer() {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Realiza logout: limpia token y redirige a login
 */
function logout() {
  clearToken();
  window.location.href = '/login.html';
}

/**
 * Redirige a login si no hay token válido
 * Usar al inicio de páginas protegidas
 */
async function requireAuth() {
  if (!hasToken()) {
    window.location.replace('/login.html');
    return false;
  }

  const isValid = await verifyTokenWithServer();
  if (!isValid) {
    clearToken();
    window.location.replace('/login.html');
    return false;
  }

  return true;
}

// Exponer funciones globalmente
window.LIA_AUTH = {
  getToken,
  setToken,
  clearToken,
  hasToken,
  verifyTokenWithServer,
  logout,
  requireAuth
};
