// Variables globales
let selectedTimeSlot = null;
let calendar = null;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar calendario con un mensaje de debug
    console.log("Inicializando calendario...");
    calendar = new SimpleCalendar('calendar');
    
    if (!calendar) {
        console.error("Error: No se pudo inicializar el calendario");
    } else {
        console.log("Calendario inicializado correctamente");
    }

    // Manejar cambios en el tipo de tratamiento
    document.getElementById('treatmentType').addEventListener('change', () => {
        if (calendar && calendar.selectedDate) {
            calendar.onDateSelected(calendar.selectedDate);
        }
    });

    // Manejar envío del formulario
    document.getElementById('appointmentForm').addEventListener('submit', handleFormSubmit);
});

// Función para mostrar las horas disponibles
function displayTimeSlots(slots) {
    const container = document.getElementById('availableSlots');
    container.innerHTML = '';
    
    if (slots.length === 0) {
        container.innerHTML = '<p>No hay horas disponibles para esta fecha</p>';
        return;
    }

    slots.forEach(slot => {
        const time = new Date(slot);
        const button = document.createElement('button');
        button.className = 'time-slot';
        button.textContent = time.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        button.onclick = () => selectTimeSlot(slot);
        container.appendChild(button);
    });
}

// Función para seleccionar una hora
function selectTimeSlot(slot) {
    selectedTimeSlot = slot;
    
    // Actualizar UI - marcar visualmente la hora seleccionada
    const allButtons = document.querySelectorAll('.time-slot');
    allButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Asegurarse de que el elemento que disparó el evento quede marcado como seleccionado
    if (event && event.target) {
        event.target.classList.add('selected');
    } else {
        // Si no hay evento (o fue llamado programáticamente), buscar el botón correspondiente
        const slotTime = new Date(slot).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        allButtons.forEach(btn => {
            if (btn.textContent.trim() === slotTime) {
                btn.classList.add('selected');
            }
        });
    }
    
    // Mostrar formulario
    document.getElementById('appointmentForm').style.display = 'block';
}

// Función para manejar el envío del formulario
async function handleFormSubmit(event) {
    event.preventDefault();

    const appointmentData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        dateTime: selectedTimeSlot,
        treatmentType: document.getElementById('treatmentType').value,
        notes: document.getElementById('notes').value
    };

    try {
        const result = await submitAppointmentRequest(appointmentData);
        alert('Tu solicitud de cita ha sido enviada. La clínica se pondrá en contacto contigo pronto.');
        
        // Limpiar formulario
        event.target.reset();
        document.getElementById('appointmentForm').style.display = 'none';
        selectedTimeSlot = null;
        
        // Actualizar calendario
        if (calendar && calendar.selectedDate) {
            calendar.onDateSelected(calendar.selectedDate);
        }
    } catch (error) {
        alert('Ha ocurrido un error al enviar tu solicitud. Por favor, inténtalo de nuevo.');
    }
} 