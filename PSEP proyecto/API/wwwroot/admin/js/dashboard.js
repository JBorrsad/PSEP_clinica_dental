// Variables globales
let currentAppointment = null;
let webSocket = null;

// Configurar conexión WebSocket
function setupWebSocketConnection() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    
    console.log(`Conectando a WebSocket: ${wsUrl}`);
    webSocket = new WebSocket(wsUrl);
    
    webSocket.onopen = function() {
        console.log('Conexión WebSocket establecida');
        // Podríamos enviar un mensaje de identificación si fuera necesario
    };
    
    webSocket.onmessage = function(event) {
        console.log('Mensaje recibido:', event.data);
        try {
            const notification = JSON.parse(event.data);
            if (notification.Type === 'notification') {
                // Actualizar panel automáticamente al recibir una notificación
                console.log(`Recibida notificación de tipo ${notification.Action}`);
                loadPendingRequests();
                
                // Mostrar notificación visual
                showNotification(notification);
            }
        } catch (error) {
            console.error('Error al procesar notificación:', error);
        }
    };
    
    webSocket.onclose = function(event) {
        console.log('Conexión WebSocket cerrada:', event);
        // Reconectar después de un retraso
        setTimeout(setupWebSocketConnection, 5000);
    };
    
    webSocket.onerror = function(error) {
        console.error('Error en WebSocket:', error);
    };
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

// Cargar solicitudes pendientes
async function loadPendingRequests() {
    try {
        const token = localStorage.getItem('staffToken');
        const response = await fetch(`${API_URL}/Appointments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const appointments = await response.json();
            displayAppointments(appointments);
        } else {
            throw new Error('Error al cargar las solicitudes');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las solicitudes');
    }
}

// Mostrar las citas en el dashboard
function displayAppointments(appointments) {
    const container = document.getElementById('pendingRequests');
    container.innerHTML = '';

    appointments.forEach(appointment => {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.innerHTML = `
            <div class="status-badge status-${appointment.isConfirmed ? 'confirmed' : 'pending'}">
                ${appointment.isConfirmed ? 'Confirmada' : 'Pendiente'}
            </div>
            <h3>${appointment.patientName}</h3>
            <p>Fecha: ${new Date(appointment.appointmentDateTime).toLocaleString()}</p>
            <p>Tratamiento: ${appointment.treatmentType}</p>
            <p>Teléfono: ${appointment.contactPhone}</p>
        `;
        card.onclick = () => openAppointmentModal(appointment);
        container.appendChild(card);
    });
}

// Abrir modal de cita
function openAppointmentModal(appointment) {
    currentAppointment = appointment;
    const modal = document.getElementById('requestModal');
    
    // Rellenar datos en el modal
    document.getElementById('patientName').value = appointment.patientName;
    document.getElementById('contactPhone').value = appointment.contactPhone;
    
    // Formatear correctamente la fecha para el campo datetime-local
    try {
        const appointmentDate = new Date(appointment.appointmentDateTime);
        if (!isNaN(appointmentDate.getTime())) {
            // Formatear a YYYY-MM-DDThh:mm (formato requerido por datetime-local)
            const localDatetime = appointmentDate.toISOString().slice(0, 16);
            document.getElementById('appointmentDateTime').value = localDatetime;
            console.log("Fecha formateada:", localDatetime);
        } else {
            console.error("Fecha inválida:", appointment.appointmentDateTime);
            document.getElementById('appointmentDateTime').value = "";
        }
    } catch (error) {
        console.error("Error al formatear la fecha:", error);
        document.getElementById('appointmentDateTime').value = "";
    }
    
    document.getElementById('treatmentType').value = appointment.treatmentType;
    document.getElementById('notes').value = appointment.notes || '';

    modal.style.display = 'block';
}

// Cerrar modal
document.querySelector('.close').onclick = function() {
    document.getElementById('requestModal').style.display = 'none';
}

// Manejar acciones de citas
document.getElementById('acceptBtn').onclick = async () => {
    await updateAppointment('confirm');
};

document.getElementById('rejectBtn').onclick = async () => {
    await updateAppointment('reject');
};

document.getElementById('rescheduleBtn').onclick = async () => {
    await updateAppointment('reschedule');
};

// Función para actualizar una cita
async function updateAppointment(action) {
    if (!currentAppointment) return;

    const token = localStorage.getItem('staffToken');
    const updatedData = {
        ...currentAppointment,
        appointmentDateTime: document.getElementById('appointmentDateTime').value,
        notes: document.getElementById('notes').value,
        isConfirmed: action === 'confirm'
    };

    try {
        const response = await fetch(`${API_URL}/Appointments/${currentAppointment.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            document.getElementById('requestModal').style.display = 'none';
            loadPendingRequests();
            alert(action === 'confirm' ? 'Cita confirmada' : 
                  action === 'reject' ? 'Cita rechazada' : 
                  'Cita reprogramada');
        } else {
            throw new Error('Error al actualizar la cita');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la cita');
    }
}

// Iniciar la conexión WebSocket cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupWebSocketConnection();
});

// Actualizar la lista de citas cada minuto como respaldo por si falla WebSocket
setInterval(loadPendingRequests, 60000); 