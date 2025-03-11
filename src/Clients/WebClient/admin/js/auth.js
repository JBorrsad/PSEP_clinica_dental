// Configuración
// Usar URL absoluta para que funcione en cualquier entorno
const API_URL = window.location.origin + '/api';

// Variables globales
let authInitialized = false;
let authCallbacks = [];

// Función para registrar callbacks para cuando se completa la autenticación
function onAuthComplete(callback) {
    if (typeof callback === 'function') {
        if (authInitialized) {
            // Si la autenticación ya se completó, ejecutar callback inmediatamente
            callback();
        } else {
            // Caso contrario, guardar para ejecutar después
            authCallbacks.push(callback);
        }
    }
}

// Función para ejecutar callbacks pendientes
function triggerAuthCallbacks() {
    authInitialized = true;
    authCallbacks.forEach(callback => {
        try {
            callback();
        } catch (error) {
            console.error("Error al ejecutar callback de autenticación:", error);
        }
    });
    authCallbacks = []; // Limpiar después de ejecutar
}

// Función para verificar la autenticación
function checkAuth() {
    const token = localStorage.getItem('staffToken');
    if (token) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        // No llamar a loadPendingRequests aquí, se llamará desde dashboard.js
        
        // Notificar que la autenticación está completa
        triggerAuthCallbacks();
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
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
        
        // Notificar que la autenticación está completa
        triggerAuthCallbacks();
        return;
    }

    // Código original que se usará cuando el backend funcione correctamente
    try {
        const response = await fetch(`${API_URL}/Auth/login`, {
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
            
            // Notificar que la autenticación está completa
            triggerAuthCallbacks();
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
    authInitialized = false; // Reiniciar estado de autenticación
});

// Comprobar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', checkAuth);

// Hacer disponible la función onAuthComplete globalmente
window.onAuthComplete = onAuthComplete; 