// Configuración
// Usar URL absoluta para que funcione en cualquier entorno
const API_URL = window.location.origin + '/api';

// Variables globales
let authToken = null;

// Función para verificar la autenticación
function checkAuth() {
    console.log("Verificando autenticación...");
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        console.log("No hay token de autenticación. Redirigiendo a login.");
        window.location.href = 'login.html';
        return;
    }
    
    // Validar el token
    validateToken(token)
        .then(isValid => {
            if (!isValid) {
                console.log("Token inválido. Redirigiendo a login.");
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return;
            }
            
            console.log("Token válido. Mostrando panel de administración.");
            // Mostrar información del usuario
            showUserInfo();
            
            // Configurar logout
            setupLogout();
        })
        .catch(error => {
            console.error("Error al validar token:", error);
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        });
}

// Función para validar el token
async function validateToken(token) {
    try {
        console.log("Validando token con el servidor...");
        const response = await fetch(`${API_URL}/Auth/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
            console.log("Error al validar token:", response.status);
            return false;
        }
        
        const data = await response.json();
        console.log("Respuesta de validación:", data);
        // La propiedad en la respuesta es 'valid'
        return data.valid;
    } catch (error) {
        console.error("Error de conexión al validar token:", error);
        return false;
    }
}

// Función para mostrar la información del usuario
function showUserInfo() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        // Decodificar el token (formato simple JWT)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) return;
        
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log("Información del usuario:", payload);
        
        // Mostrar email del usuario
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement && payload.email) {
            userEmailElement.textContent = payload.email;
        } else if (userEmailElement && payload.name) {
            userEmailElement.textContent = payload.name;
        }
    } catch (error) {
        console.error("Error al mostrar información del usuario:", error);
    }
}

// Función para configurar el botón de logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Función para cerrar sesión
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

// Iniciar verificación de autenticación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log("Documento cargado. Iniciando verificación de autenticación.");
    checkAuth();
}); 