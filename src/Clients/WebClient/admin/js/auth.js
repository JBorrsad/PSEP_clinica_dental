// Configuración
// Usar URL absoluta para que funcione en cualquier entorno
const API_URL = window.location.origin + '/api';

// Variables globales
let authToken = null;

// Comprobar si hay un token guardado y verificar su validez
function checkAuth() {
    console.log("Verificando autenticación...");
    
    const token = localStorage.getItem('authToken');
    if (token) {
        console.log("Token encontrado, procediendo a validarlo");
        authToken = token;
        
        // Validar que el token sea válido
        validateToken(token)
            .then(isValid => {
                if (isValid) {
                    console.log("Token válido, actualizando interfaz");
                    
                    // Mostrar la información del usuario
                    showUserInfo();
                    
                    // Inicializar el dashboard si la función está disponible
                    if (typeof initializeDashboard === 'function') {
                        console.log("Inicializando dashboard desde auth.js");
                        initializeDashboard();
                    } else {
                        console.error("Función initializeDashboard no encontrada");
                    }
                } else {
                    console.log("Token inválido, redirigiendo a login");
                    localStorage.removeItem('authToken');
                    authToken = null;
                    window.location.href = '/login.html';
                }
            })
            .catch(error => {
                console.error("Error al validar token:", error);
                localStorage.removeItem('authToken');
                authToken = null;
                window.location.href = '/login.html';
            });
    } else {
        console.log("No hay token guardado, redirigiendo a login");
        window.location.href = '/login.html';
    }
}

// Validar token con el servidor
async function validateToken(token) {
    try {
        console.log(`Validando token: ${token.substring(0, 15)}...`);
        
        const response = await fetch(`${API_URL}/Auth/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Validación exitosa:", data);
            return data.isValid;
        } else {
            console.error(`Error al validar token: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error("Error al validar token:", error);
        return false;
    }
}

// Mostrar información del usuario
function showUserInfo() {
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement) {
        try {
            // Obtener el email del token (JWT)
            const token = localStorage.getItem('authToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const email = payload.email || 'Administrador';
                userEmailElement.textContent = email;
            } else {
                userEmailElement.textContent = 'Usuario';
            }
        } catch (error) {
            console.error("Error al decodificar token:", error);
            userEmailElement.textContent = 'Usuario';
        }
    }
}

// Manejar el cierre de sesión
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Cerrar sesión
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('authToken');
    authToken = null;
    window.location.href = '/login.html';
}

// Inicializar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado, inicializando autenticación");
    checkAuth();
    setupLogout();
}); 