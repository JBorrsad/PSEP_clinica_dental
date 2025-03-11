// Script de depuración para el dashboard
console.log("Script de depuración cargado");

// Sobrescribir console.log para mostrar en la página
(function() {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Crear contenedor para logs si no existe
    document.addEventListener('DOMContentLoaded', function() {
        if (!document.getElementById('debug-console')) {
            const debugConsole = document.createElement('div');
            debugConsole.id = 'debug-console';
            debugConsole.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; max-height: 200px; overflow-y: auto; background-color: rgba(0,0,0,0.8); color: white; font-family: monospace; font-size: 12px; padding: 10px; z-index: 9999;';
            
            const clearButton = document.createElement('button');
            clearButton.textContent = 'Limpiar';
            clearButton.style.cssText = 'position: absolute; top: 5px; right: 5px; background-color: #f44336; color: white; border: none; padding: 5px 10px; cursor: pointer;';
            clearButton.onclick = function() {
                const logContainer = document.getElementById('debug-log-container');
                if (logContainer) {
                    logContainer.innerHTML = '';
                }
            };
            
            const logContainer = document.createElement('div');
            logContainer.id = 'debug-log-container';
            logContainer.style.cssText = 'margin-top: 30px;';
            
            debugConsole.appendChild(clearButton);
            debugConsole.appendChild(logContainer);
            document.body.appendChild(debugConsole);
        }
    });
    
    // Función para agregar mensaje al contenedor
    function addLogMessage(message, type = 'log') {
        const logContainer = document.getElementById('debug-log-container');
        if (!logContainer) return;
        
        const logEntry = document.createElement('div');
        logEntry.style.cssText = 'margin: 2px 0; padding: 2px 5px; border-left: 3px solid ';
        
        switch (type) {
            case 'error':
                logEntry.style.borderColor = '#f44336';
                break;
            case 'warn':
                logEntry.style.borderColor = '#ff9800';
                break;
            default:
                logEntry.style.borderColor = '#4caf50';
        }
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    // Sobrescribir métodos de consola
    console.log = function() {
        const args = Array.from(arguments);
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        addLogMessage(message, 'log');
        originalConsoleLog.apply(console, arguments);
    };
    
    console.error = function() {
        const args = Array.from(arguments);
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        addLogMessage(message, 'error');
        originalConsoleError.apply(console, arguments);
    };
    
    console.warn = function() {
        const args = Array.from(arguments);
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        addLogMessage(message, 'warn');
        originalConsoleWarn.apply(console, arguments);
    };
})();

// Monitorear peticiones fetch
(function() {
    const originalFetch = window.fetch;
    
    window.fetch = async function() {
        const url = arguments[0];
        const options = arguments[1] || {};
        
        console.log(`Fetch: ${options.method || 'GET'} ${url}`);
        
        try {
            const response = await originalFetch.apply(this, arguments);
            
            // Clonar la respuesta para poder leerla
            const clone = response.clone();
            
            // Intentar leer el cuerpo como JSON
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await clone.json();
                    console.log(`Respuesta de ${url}:`, JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : ''));
                } else {
                    console.log(`Respuesta de ${url}: [No es JSON]`);
                }
            } catch (e) {
                console.log(`Error al leer respuesta de ${url}: ${e.message}`);
            }
            
            return response;
        } catch (error) {
            console.error(`Error en fetch a ${url}: ${error.message}`);
            throw error;
        }
    };
})();

// Agregar botones de depuración
document.addEventListener('DOMContentLoaded', function() {
    const debugPanel = document.createElement('div');
    debugPanel.style.cssText = 'position: fixed; top: 10px; right: 10px; background-color: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; z-index: 9999;';
    
    const createButton = (text, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = 'margin: 5px; padding: 5px 10px; background-color: #4caf50; color: white; border: none; cursor: pointer;';
        button.onclick = onClick;
        return button;
    };
    
    // Botón para cargar solicitudes pendientes
    const loadPendingBtn = createButton('Cargar Pendientes', function() {
        if (typeof loadPendingRequests === 'function') {
            console.log('Ejecutando loadPendingRequests() manualmente');
            loadPendingRequests();
        } else {
            console.error('Función loadPendingRequests no encontrada');
        }
    });
    
    // Botón para cargar historial
    const loadHistoryBtn = createButton('Cargar Historial', function() {
        if (typeof loadRequestHistory === 'function') {
            console.log('Ejecutando loadRequestHistory() manualmente');
            loadRequestHistory();
        } else {
            console.error('Función loadRequestHistory no encontrada');
        }
    });
    
    // Botón para mostrar token
    const showTokenBtn = createButton('Mostrar Token', function() {
        const token = localStorage.getItem('authToken');
        console.log('Token actual:', token ? token.substring(0, 20) + '...' : 'No hay token');
    });
    
    // Botón para reiniciar dashboard
    const resetDashboardBtn = createButton('Reiniciar Dashboard', function() {
        if (typeof initializeDashboard === 'function') {
            console.log('Ejecutando initializeDashboard() manualmente');
            initializeDashboard();
        } else {
            console.error('Función initializeDashboard no encontrada');
        }
    });
    
    // Agregar botones al panel
    debugPanel.appendChild(loadPendingBtn);
    debugPanel.appendChild(loadHistoryBtn);
    debugPanel.appendChild(showTokenBtn);
    debugPanel.appendChild(resetDashboardBtn);
    
    // Agregar panel al documento
    document.body.appendChild(debugPanel);
}); 