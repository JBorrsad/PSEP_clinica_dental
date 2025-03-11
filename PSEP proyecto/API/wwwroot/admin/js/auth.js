// Configuración
const API_URL = 'http://localhost:5021/api';

// Comprobar si hay un token guardado
function checkAuth() {
    const token = localStorage.getItem('staffToken');
    if (token) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadPendingRequests();
    }
}

// Manejar el inicio de sesión
document.getElementById('staffLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // VERSIÓN TEMPORAL: Aceptar cualquier usuario/contraseña para facilitar las pruebas
    if (username.trim() !== '' && password.trim() !== '') {
        // Crear un token falso para la demostración
        const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        localStorage.setItem('staffToken', fakeToken);
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadPendingRequests();
        return;
    }

    // Código original que se usará cuando el backend funcione correctamente
    try {
        const response = await fetch(`${API_URL}/Staff/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('staffToken', data.token);
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            loadPendingRequests();
        } else {
            alert('Usuario o contraseña incorrectos');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al iniciar sesión');
    }
});

// Manejar el cierre de sesión
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('staffToken');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
});

// Comprobar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', checkAuth); 