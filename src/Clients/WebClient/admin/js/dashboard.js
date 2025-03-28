// Versión corregida

// Configuración
// No redeclarar API_URL, ya está definida en auth.js
// const API_URL = window.location.origin + '/api';

// Variables globales
let currentAppointment = null;
let webSocket = null;
let requestHistory = [];
let adminCalendar = null;

// Obtener token de autenticación
function getAuthToken() {
    return localStorage.getItem('staffToken');
}

// Inicialización del dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado. Inicializando dashboard...");
    
    // Registrar callbacks para cuando la autenticación esté completa
    if (window.onAuthComplete) {
        window.onAuthComplete(function() {
            console.log("Autenticación completada, iniciando dashboard...");
            loadPendingRequests();
            initializeDashboard();
        });
    } else {
        console.error("La función onAuthComplete no está disponible");
    }
});

// Inicializar el panel de administración
function initializeDashboard() {
    console.log("Inicializando dashboard...");
    
    try {
        // Verificar que los elementos del DOM existen
        const requiredContainers = [
            { id: 'adminCalendar', name: 'Calendario' },
            { id: 'requestHistory', name: 'Historial de solicitudes' },
            { id: 'dailyAppointmentsList', name: 'Citas del día' },
            { id: 'pendingRequests', name: 'Solicitudes pendientes' }
        ];
        
        for (const container of requiredContainers) {
            if (!document.getElementById(container.id)) {
                throw new Error(`No se encontró el contenedor: ${container.name} (${container.id})`);
            }
        }
        
        console.log("Verificación de contenedores exitosa");
        
        // Inicializar el calendario
        console.log("Iniciando calendario administrativo...");
        window.adminCalendar = new AdminCalendar('adminCalendar');
        
        if (!window.adminCalendar) {
            throw new Error("Error al crear instancia del calendario");
        }
        
        // Configurar callback para cuando se selecciona una fecha
        window.adminCalendar.setOnDateSelected(function(date) {
            console.log("Fecha seleccionada en calendario:", date);
            loadAppointmentsForDate(date);
        });
        
        // Inicializar calendario
        window.adminCalendar.initialize();
        
        // Configurar secciones colapsables
        setupCollapsibleSections();
        
        // Cargar datos iniciales
        loadPendingRequests();
        loadRequestHistory();
        
        // Configurar WebSocket para notificaciones en tiempo real
        setupWebSocketConnection();
        
        console.log("Dashboard inicializado correctamente");
    } catch (error) {
        console.error("Error al inicializar el dashboard:", error);
        alert("Error al inicializar el panel: " + error.message);
    }
}

/**
 * WEBSOCKET: Conexión de WebSocket para notificaciones en tiempo real
 */
function setupWebSocketConnection() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    
    console.log(`[WebSocket] Conectando a: ${wsUrl}`);
    
    try {
        webSocket = new WebSocket(wsUrl);
    
        webSocket.onopen = function() {
            console.log('[WebSocket] ✅ Conexión establecida');
            
            // Indicar visualmente que la conexión está establecida
            const statusIndicator = document.createElement('div');
            statusIndicator.id = 'ws-status-indicator';
            statusIndicator.className = 'ws-status connected';
            statusIndicator.title = 'Conectado a notificaciones en tiempo real';
            statusIndicator.innerHTML = '<i class="fas fa-wifi"></i>';
            document.body.appendChild(statusIndicator);
        };
        
        webSocket.onmessage = function(event) {
            console.log('[WebSocket] 📨 Mensaje recibido:', event.data);
            
            // Parpadear indicador para mostrar actividad
            const statusIndicator = document.getElementById('ws-status-indicator');
            if (statusIndicator) {
                statusIndicator.classList.add('active');
                setTimeout(() => statusIndicator.classList.remove('active'), 1000);
            }
            
            try {
                // Intentar parsear el mensaje como JSON
                const data = JSON.parse(event.data);
                
                // Estructura esperada: { Action: "...", Timestamp: "...", Data: {...} }
                console.log('[WebSocket] Datos parseados:', data);
                
                // Verificar si el mensaje tiene la estructura esperada
                if (data.Action) {
                    // Es una notificación directa
                    processWebSocketNotification(data);
                }
                // También verificar si es un envoltorio de notificación (cuando Type="notification")
                else if (data.Type && data.Type.toLowerCase() === 'notification') {
                    processWebSocketNotification(data);
                }
                else {
                    console.log('[WebSocket] Formato de mensaje no reconocido');
                }
            } catch (error) {
                console.error('[WebSocket] Error al procesar mensaje:', error);
            }
        };
        
        webSocket.onclose = function(event) {
            console.log('[WebSocket] ❌ Conexión cerrada:', event);
            
            // Actualizar indicador visual
            const statusIndicator = document.getElementById('ws-status-indicator');
            if (statusIndicator) {
                statusIndicator.className = 'ws-status disconnected';
                statusIndicator.title = 'Desconectado - Intentando reconectar...';
            }
            
            // Reconectar después de un retraso
            setTimeout(setupWebSocketConnection, 5000);
        };
        
        webSocket.onerror = function(error) {
            console.error('[WebSocket] 🛑 Error:', error);
            
            // Actualizar indicador visual
            const statusIndicator = document.getElementById('ws-status-indicator');
            if (statusIndicator) {
                statusIndicator.className = 'ws-status error';
                statusIndicator.title = 'Error en la conexión';
            }
        };
    } catch (error) {
        console.error('[WebSocket] Error al inicializar conexión:', error);
    }
    
    // Añadir estilos para el indicador de estado
    const wsStatusStyles = document.createElement('style');
    wsStatusStyles.textContent = `
    .ws-status {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        z-index: 9999;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    .ws-status.connected {
        background-color: #4CAF50;
    }
    
    .ws-status.disconnected {
        background-color: #FFC107;
    }
    
    .ws-status.error {
        background-color: #F44336;
    }
    
    .ws-status.active {
        transform: scale(1.2);
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.7);
    }
    `;
    document.head.appendChild(wsStatusStyles);
}

/**
 * Procesa una notificación recibida por WebSocket
 */
function processWebSocketNotification(notification) {
    // Determinar la acción de la notificación
    let action = '';
    
    // Manejar tanto el formato directo como el envuelto
    if (notification.Action) {
        action = notification.Action.toLowerCase();
    } else if (notification.Type && notification.Action) {
        action = notification.Action.toLowerCase();
    }
    
    console.log(`[WebSocket] Procesando notificación de tipo: ${action}`);
    
    if (!action) {
        console.log('[WebSocket] Notificación sin acción definida, ignorando');
        return;
    }
    
    // Mostrar notificación visual
    showNotificationAlert(`Nueva actividad: ${getNotificationMessage(action)}`, action);
    
    // Reproducir sonido para nuevas citas
    if (action === 'created' || action.includes('creat')) {
        playNotificationSound();
    }
    
    // SIEMPRE actualizar todos los datos independientemente del tipo de notificación
    console.log('[WebSocket] Actualizando interfaz...');
    
    // Actualizar listas de citas pendientes e historial
    loadPendingRequests();
    loadRequestHistory();
    
    // Actualizar el calendario si existe
    if (window.adminCalendar) {
        console.log('[WebSocket] Recargando datos del calendario...');
        window.adminCalendar.loadAppointmentsData();
    }
    
    // Si hay una fecha seleccionada, actualizar la vista de citas del día
    const selectedDateElem = document.getElementById('selectedDate');
    if (selectedDateElem && selectedDateElem.textContent && window.adminCalendar) {
        const dateStr = window.adminCalendar.getSelectedDate();
        if (dateStr) {
            console.log(`[WebSocket] Actualizando citas para la fecha ${dateStr}...`);
            loadAppointmentsForDate(dateStr);
        }
    }
    
    console.log('[WebSocket] Actualización completada');
}

// Mostrar notificación visual
function showNotification(notification) {
    let message = '';
    let color = '';
    
    switch(notification.Action) {
        case 'created':
            message = 'Nueva solicitud de cita recibida';
            color = '#4CAF50'; // Verde
            // Reproducir sonido de notificación
            playNotificationSound();
            break;
        case 'updated':
            message = 'Una cita ha sido actualizada';
            color = '#2196F3'; // Azul
            break;
        case 'deleted':
            message = 'Una cita ha sido cancelada';
            color = '#f44336'; // Rojo
            break;
    }
    
    // Crear elemento de notificación
    const notificationElement = document.createElement('div');
    notificationElement.style.position = 'fixed';
    notificationElement.style.top = '20px';
    notificationElement.style.right = '20px';
    notificationElement.style.backgroundColor = color;
    notificationElement.style.color = 'white';
    notificationElement.style.padding = '15px 20px';
    notificationElement.style.borderRadius = '5px';
    notificationElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notificationElement.style.zIndex = '1000';
    notificationElement.textContent = message;
    
    // Añadir al DOM
    document.body.appendChild(notificationElement);
    
    // Eliminar después de 5 segundos
    setTimeout(() => {
        notificationElement.style.opacity = '0';
        notificationElement.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notificationElement);
        }, 500);
    }, 5000);
}

// Reproducir sonido de notificación
function playNotificationSound() {
    try {
        // Crear un oscilador de audio (beep) para la notificación
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Frecuencia más alta para un sonido de notificación
        gainNode.gain.value = 0.1; // Volumen bajo
        
        oscillator.start();
        
        // Detener después de 0.2 segundos
        setTimeout(() => {
            oscillator.stop();
            // Reproduzca un segundo beep más bajo para el efecto de notificación
            const oscillator2 = audioContext.createOscillator();
            oscillator2.connect(gainNode);
            oscillator2.type = 'sine';
            oscillator2.frequency.value = 600;
            oscillator2.start();
            setTimeout(() => oscillator2.stop(), 100);
        }, 200);
    } catch (err) {
        console.log('No se pudo reproducir el sonido de notificación', err);
    }
}

// Cargar las citas para una fecha específica
async function loadAppointmentsForDate(date) {
    console.log("Cargando citas para fecha:", date);
    
    const container = document.getElementById('dailyAppointmentsList');
    if (!container) {
        console.error("Contenedor de citas diarias no encontrado");
        return;
    }
    
    // Mostrar mensaje de carga
    container.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando citas...</p>
        </div>
    `;
    
    try {
        // Formatear fecha si es un objeto Date
        let dateStr = date;
        if (date instanceof Date) {
            // Asegurarse de usar la fecha correcta sin ajustes por zona horaria
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
        }
        
        // Actualizar fecha seleccionada en la interfaz
        const selectedDateEl = document.getElementById('selectedDate');
        if (selectedDateEl) {
            const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            selectedDateEl.textContent = formattedDate;
        }
        
        const token = getAuthToken();
        if (!token) {
            throw new Error("No hay token de autenticación");
        }
        
        const response = await fetch(`${API_URL}/Appointments/ForDate/${dateStr}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error al cargar citas: ${response.status}`);
        }
        
        const appointments = await response.json();
        console.log("Citas recibidas para fecha:", appointments);
        
        // Mostrar citas
        displayDailyAppointments(appointments, dateStr);
        
    } catch (error) {
        console.error("Error al cargar citas del día:", error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar citas: ${error.message}</p>
                <button onclick="loadAppointmentsForDate('${date}')">Reintentar</button>
            </div>
        `;
    }
}

// Cargar solicitudes pendientes
async function loadPendingRequests() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/Appointments/Pending`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const appointments = await response.json();
            displayAppointments(appointments);
        } else {
            throw new Error('Error al cargar las solicitudes pendientes');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las solicitudes pendientes');
    }
}

// Cargar historial de solicitudes
async function loadRequestHistory() {
    const container = document.getElementById('requestHistory');
    
    // Mostrar mensaje de carga
    container.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <p style="color: #0c5460 !important;">Cargando historial...</p>
        </div>
    `;
    
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error("No hay token de autenticación");
        }
        
        const response = await fetch(`${API_URL}/Appointments/History`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error al cargar historial: ${response.status}`);
        }
        
        const history = await response.json();
        console.log("Historial recibido:", history);
        
        // Mostrar historial
        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-message">
                    <p style="color: #333 !important;">No hay solicitudes confirmadas o canceladas en el historial</p>
                </div>
            `;
            return;
        }
        
        // Limpiar contenedor
        container.innerHTML = '';
        
        // Mostrar cada solicitud en el historial
        history.forEach(appointment => {
            const card = document.createElement('div');
            card.className = 'request-card';
            
            // Aplicar estilos inline para forzar la visibilidad
            card.style.backgroundColor = '#f9f9f9';
            card.style.border = '1px solid #aaa';
            card.style.padding = '15px';
            card.style.marginBottom = '10px';
            card.style.color = '#000';
            card.style.borderRadius = '5px';
            
            // Determinar clase de estado - Mostrar información detallada para depuración
            console.log(`Cita ${appointment.id} - ${appointment.patientName}:`, {
                status: appointment.status,
                isConfirmed: appointment.isConfirmed
            });
            
            // Determinar clase de estado de manera más estricta
            let statusClass = 'pending';
            let statusText = 'Pendiente';
            
            if (appointment.status === 'Canceled' || appointment.status === 'Cancelada') {
                statusClass = 'rejected';
                statusText = 'Cancelada';
            } else if (appointment.isConfirmed === true || appointment.status === 'Confirmada') {
                statusClass = 'confirmed';
                statusText = 'Confirmada';
            }
            
            const appointmentDate = new Date(appointment.appointmentDateTime);
            let formattedDate = 'Fecha no disponible';
            
            // Verificar si la fecha es válida antes de formatearla
            if (!isNaN(appointmentDate.getTime())) {
                formattedDate = appointmentDate.toLocaleString('es-ES', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                console.warn(`Fecha inválida para cita ${appointment.id}:`, appointment.appointmentDateTime);
            }
            
            card.innerHTML = `
                <div class="status-badge status-${statusClass}" style="color: white !important; font-weight: bold !important;">
                    ${statusText}
                </div>
                <h3 style="color: #000 !important; font-weight: bold !important; margin-bottom: 8px !important;">${appointment.patientName}</h3>
                <p style="color: #000 !important; margin-bottom: 5px !important;"><strong style="color: #000 !important;">Fecha:</strong> ${formattedDate}</p>
                <p style="color: #000 !important; margin-bottom: 5px !important;"><strong style="color: #000 !important;">Tratamiento:</strong> ${appointment.treatmentType || 'No especificado'}</p>
                <p style="color: #000 !important; margin-bottom: 5px !important;"><strong style="color: #000 !important;">Teléfono:</strong> ${appointment.contactPhone || 'No disponible'}</p>
            `;
            
            // Añadir al contenedor
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error al cargar historial:", error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p style="color: #721c24 !important;">Error al cargar historial: ${error.message}</p>
                <button onclick="loadRequestHistory()" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Reintentar</button>
            </div>
        `;
    }
}

// Mostrar las citas en el dashboard
function displayAppointments(appointments) {
    const container = document.getElementById('pendingRequests');
    container.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p style="color: #333 !important;">No hay solicitudes pendientes de revisión</p>
            </div>
        `;
        return;
    }

    appointments.forEach(appointment => {
        // Determinar clase de estado - Mostrar información para depuración
        console.log(`Cita pendiente ${appointment.id} - ${appointment.patientName}:`, {
            status: appointment.status,
            isConfirmed: appointment.isConfirmed
        });
        
        // Determinar clase de estado
        let statusClass = 'pending';
        let statusText = 'Pendiente';
        
        if (appointment.status === 'Canceled' || appointment.status === 'Cancelada') {
            statusClass = 'rejected';
            statusText = 'Cancelada';
        } else if (appointment.isConfirmed === true || appointment.status === 'Confirmada') {
            statusClass = 'confirmed';
            statusText = 'Confirmada';
        }
        
        const appointmentDate = new Date(appointment.appointmentDateTime);
        let formattedDate = 'Fecha no disponible';
        
        // Verificar si la fecha es válida antes de formatearla
        if (!isNaN(appointmentDate.getTime())) {
            formattedDate = appointmentDate.toLocaleString('es-ES', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            console.warn(`Fecha inválida para cita ${appointment.id}:`, appointment.appointmentDateTime);
        }
        
        const card = document.createElement('div');
        card.className = 'request-card';
        card.style.backgroundColor = '#f9f9f9';
        card.style.border = '1px solid #aaa';
        card.style.color = '#000';
        card.innerHTML = `
            <div class="status-badge status-${statusClass}" style="color: white !important; font-weight: bold !important;">
                ${statusText}
            </div>
            <h3 style="color: #000 !important; font-weight: bold !important;">${appointment.patientName}</h3>
            <p style="color: #000 !important;"><strong style="color: #000 !important;">Fecha:</strong> ${formattedDate}</p>
            <p style="color: #000 !important;"><strong style="color: #000 !important;">Tratamiento:</strong> ${appointment.treatmentType || 'No especificado'}</p>
            <p style="color: #000 !important;"><strong style="color: #000 !important;">Teléfono:</strong> ${appointment.contactPhone || 'No disponible'}</p>
        `;
        card.onclick = () => openAppointmentModal(appointment);
        container.appendChild(card);
    });
}

// Mostrar las citas del día seleccionado
function displayDailyAppointments(appointments, dateStr) {
    const container = document.getElementById('dailyAppointmentsList');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No hay citas para esta fecha</p>
            </div>
        `;
        return;
    }
    
    // Ordenar todas las citas cronológicamente
    appointments.sort((a, b) => {
        const dateA = new Date(a.appointmentDateTime);
        const dateB = new Date(b.appointmentDateTime);
        return dateA - dateB;
    });
    
    // Agrupar por estado
    const pendingAppointments = [];
    const confirmedAppointments = [];
    
    appointments.forEach(appointment => {
        if (appointment.status === 'Canceled' || appointment.status === 'Cancelada') {
            // No mostrar las canceladas
        } else if (appointment.isConfirmed === true || appointment.status === 'Confirmada') {
            confirmedAppointments.push(appointment);
        } else {
            pendingAppointments.push(appointment);
        }
    });
    
    // Construir HTML para mostrar las citas
    let html = '';
    
    // Sección de citas pendientes
    if (pendingAppointments.length > 0) {
        html += `<h3 style="color: #f39c12; margin-top: 20px; margin-bottom: 10px;">Citas Pendientes (${pendingAppointments.length})</h3>`;
        
        pendingAppointments.forEach(appointment => {
            const appointmentTime = new Date(appointment.appointmentDateTime);
            const formattedTime = appointmentTime.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            html += `
                <div class="appointment-item pending" style="border-left: 4px solid #f39c12; cursor: pointer;" 
                     onclick="openAppointmentModal(${JSON.stringify(appointment).replace(/"/g, '&quot;')})">
                    <div class="appointment-time">
                        <i class="fas fa-clock"></i>
                        <span>${formattedTime}</span>
                    </div>
                    <div class="appointment-details">
                        <strong style="color: #000 !important;">${appointment.patientName}</strong>
                        <span style="color: #000 !important;">${appointment.treatmentType || 'Consulta general'}</span>
                    </div>
                </div>
            `;
        });
    }
    
    // Sección de citas confirmadas
    if (confirmedAppointments.length > 0) {
        html += `<h3 style="color: #2ecc71; margin-top: 20px; margin-bottom: 10px;">Citas Confirmadas (${confirmedAppointments.length})</h3>`;
        
        confirmedAppointments.forEach(appointment => {
            const appointmentTime = new Date(appointment.appointmentDateTime);
            const formattedTime = appointmentTime.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            html += `
                <div class="appointment-item confirmed" style="border-left: 4px solid #2ecc71; cursor: pointer;" 
                     onclick="openAppointmentModal(${JSON.stringify(appointment).replace(/"/g, '&quot;')})">
                    <div class="appointment-time">
                        <i class="fas fa-clock"></i>
                        <span>${formattedTime}</span>
                    </div>
                    <div class="appointment-details">
                        <strong style="color: #000 !important;">${appointment.patientName}</strong>
                        <span style="color: #000 !important;">${appointment.treatmentType || 'Consulta general'}</span>
                    </div>
                </div>
            `;
        });
    }
    
    // Si no hay citas ni pendientes ni confirmadas (puede que solo haya canceladas)
    if (pendingAppointments.length === 0 && confirmedAppointments.length === 0) {
        html = `
            <div class="empty-message">
                <p>No hay citas pendientes ni confirmadas para esta fecha</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Abrir modal de cita
function openAppointmentModal(appointment) {
    currentAppointment = appointment;
    
    // Llenar el formulario con los datos de la cita
    document.getElementById('patientName').value = appointment.patientName;
    document.getElementById('contactPhone').value = appointment.contactPhone;
    
    // Convertir fecha y hora para el input datetime-local
    const appointmentDate = new Date(appointment.appointmentDateTime);
    const formattedDate = appointmentDate.toISOString().slice(0, 16);
    document.getElementById('appointmentDateTime').value = formattedDate;
    
    document.getElementById('treatmentType').value = appointment.treatmentType;
    document.getElementById('notes').value = appointment.notes || '';
    
    // Mostrar el modal
    const modal = document.getElementById('requestModal');
    modal.style.display = 'block';
    
    // Configurar los botones según el estado de la cita
    const acceptBtn = document.getElementById('acceptBtn');
    const rescheduleBtn = document.getElementById('rescheduleBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    const isConfirmed = appointment.isConfirmed;
    const isCanceled = appointment.status === 'Canceled' || appointment.status === 'Cancelada';
    
    if (isConfirmed || isCanceled) {
        // Si ya está confirmada o cancelada, deshabilitar todos los botones
        acceptBtn.disabled = true;
        rescheduleBtn.disabled = true;
        rejectBtn.disabled = true;
        document.getElementById('appointmentDateTime').disabled = true;
        document.getElementById('notes').disabled = true;
    } else {
        // Si está pendiente, habilitar todos los botones
        acceptBtn.disabled = false;
        rescheduleBtn.disabled = false;
        rejectBtn.disabled = false;
        document.getElementById('appointmentDateTime').disabled = false;
        document.getElementById('notes').disabled = false;
    }
}

// Función para cerrar el modal
function hideModal() {
    document.getElementById('requestModal').style.display = 'none';
    currentAppointment = null;
}

// Agregar event listener al botón de cerrar
document.querySelector('.close').addEventListener('click', hideModal);

// Cerrar el modal al hacer clic fuera de él
window.addEventListener('click', function(event) {
    const modal = document.getElementById('requestModal');
    if (event.target === modal) {
        hideModal();
    }
});

// Configurar secciones colapsables
function setupCollapsibleSections() {
    const pendingHeader = document.getElementById('pendingRequestsHeader');
    const historyHeader = document.getElementById('requestHistoryHeader');
    
    if (pendingHeader) {
        pendingHeader.addEventListener('click', () => {
            const content = document.getElementById('pendingRequests');
            content.classList.toggle('active');
            pendingHeader.classList.toggle('active');
        });
    }
    
    if (historyHeader) {
        historyHeader.addEventListener('click', () => {
            const content = document.getElementById('requestHistory');
            content.classList.toggle('active');
            historyHeader.classList.toggle('active');
        });
    }
}

// Manejar acciones de citas
document.getElementById('acceptBtn').onclick = async () => {
    await updateAppointment('accept');
};

document.getElementById('rejectBtn').onclick = async () => {
    await updateAppointment('reject');
};

document.getElementById('rescheduleBtn').onclick = async () => {
    await updateAppointment('reschedule');
};

// Función para actualizar una cita
async function updateAppointment(action) {
    try {
        if (!currentAppointment) {
            throw new Error('No hay una cita seleccionada');
        }
        
        const token = getAuthToken();
        let endpoint = '';
        let method = '';
        let body = {};
        
        if (action === 'accept') {
            endpoint = `${API_URL}/Appointments/${currentAppointment.id}/confirm`;
            method = 'PUT';
        } else if (action === 'reschedule') {
            endpoint = `${API_URL}/Appointments/${currentAppointment.id}`;
            method = 'PUT';
            const notes = document.getElementById('notes').value;
            const newDateTime = document.getElementById('appointmentDateTime').value;
            body = {
                ...currentAppointment,
                appointmentDateTime: newDateTime,
                notes: notes
            };
        } else if (action === 'reject') {
            endpoint = `${API_URL}/Appointments/${currentAppointment.id}/cancel`;
            method = 'PUT';
        } else {
            throw new Error('Acción no reconocida');
        }
        
        const requestOptions = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (method === 'PUT' && Object.keys(body).length > 0) {
            requestOptions.body = JSON.stringify(body);
        }
        
        const response = await fetch(endpoint, requestOptions);
        
        if (!response.ok) {
            throw new Error(`Error al actualizar la cita: ${response.status}`);
        }
        
        // Cerrar modal
        hideModal();
        
        // Mostrar notificación
        showNotification({
            title: 'Éxito',
            message: `La cita ha sido ${action === 'accept' ? 'aceptada' : (action === 'reschedule' ? 'reprogramada' : 'rechazada')} exitosamente`,
            type: 'success'
        });
        
        // Recargar datos
        await loadPendingRequests();
        await loadRequestHistory();
        
        // Recargar datos del calendario para actualizar los indicadores
        if (window.adminCalendar) {
            window.adminCalendar.loadAppointmentsData();
        }
        
        // Si hay una fecha seleccionada, recargar las citas para esa fecha
        const selectedDateElem = document.getElementById('selectedDate');
        if (selectedDateElem && selectedDateElem.textContent) {
            const dateStr = adminCalendar.getSelectedDate();
            if (dateStr) {
                await loadAppointmentsForDate(dateStr);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification({
            title: 'Error',
            message: error.message,
            type: 'error'
        });
    }
}

// Actualizar la lista de citas cada minuto como respaldo por si falla WebSocket
setInterval(loadPendingRequests, 60000);

/**
 * Muestra una notificación de alerta más visible en la interfaz
 */
function showNotificationAlert(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification-alert ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="close-btn">&times;</button>
    `;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Configurar cierre
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    });
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

/**
 * Obtiene el icono adecuado según el tipo de notificación
 */
function getNotificationIcon(type) {
    switch(type) {
        case 'created':
            return 'fa-calendar-plus';
        case 'updated':
            return 'fa-calendar-check';
        case 'deleted':
        case 'canceled':
            return 'fa-calendar-times';
        case 'error':
            return 'fa-exclamation-circle';
        default:
            return 'fa-bell';
    }
}

/**
 * Obtiene un mensaje descriptivo según el tipo de acción
 */
function getNotificationMessage(action) {
    switch(action) {
        case 'created':
            return '¡Nueva solicitud de cita recibida!';
        case 'updated':
            return 'Una cita ha sido actualizada';
        case 'deleted':
            return 'Una cita ha sido cancelada';
        default:
            return 'Cambio en las citas detectado';
    }
}

// Agregar estilos para las notificaciones
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
.notification-alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background-color: #fff;
    border-left: 4px solid #4CAF50;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    z-index: 9999;
    min-width: 300px;
    max-width: 400px;
    transform: translateX(110%);
    transition: transform 0.3s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 4px;
}

.notification-alert.show {
    transform: translateX(0);
}

.notification-alert.created {
    border-color: #4CAF50;
}

.notification-alert.updated {
    border-color: #2196F3;
}

.notification-alert.deleted {
    border-color: #F44336;
}

.notification-alert .notification-content {
    display: flex;
    align-items: center;
}

.notification-alert i {
    margin-right: 10px;
    font-size: 1.2em;
}

.notification-alert .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #999;
}

.notification-alert .close-btn:hover {
    color: #333;
}
`;
document.head.appendChild(notificationStyles);

/**
 * Actualiza todos los datos relevantes de la interfaz
 */
function refreshAllData() {
    // Recargar solicitudes pendientes
    loadPendingRequests();
    
    // Recargar historial de solicitudes
    loadRequestHistory();
    
    // Actualizar el calendario 
    if (window.adminCalendar) {
        window.adminCalendar.loadAppointmentsData();
    }
    
    // Si hay una fecha seleccionada, actualizar las citas del día
    const selectedDateElem = document.getElementById('selectedDate');
    if (selectedDateElem && selectedDateElem.textContent && window.adminCalendar) {
        const dateStr = window.adminCalendar.getSelectedDate();
        if (dateStr) {
            loadAppointmentsForDate(dateStr);
        }
    }
} 
