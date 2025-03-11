// Configuración de la API
const API_URL = 'http://localhost:5021/api';

// Función para obtener las horas disponibles para una fecha
async function getAvailableSlots(date) {
    try {
        const response = await fetch(`${API_URL}/Appointments/Available/${date.toISOString()}`);
        if (!response.ok) {
            throw new Error('Error al obtener las horas disponibles');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// Función para enviar una solicitud de cita
async function submitAppointmentRequest(appointmentData) {
    try {
        const response = await fetch(`${API_URL}/Appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                patientName: appointmentData.name,
                contactPhone: appointmentData.phone,
                appointmentDateTime: appointmentData.dateTime,
                durationMinutes: getTreatmentDuration(appointmentData.treatmentType),
                treatmentType: appointmentData.treatmentType,
                notes: appointmentData.notes,
                isConfirmed: false
            })
        });

        if (!response.ok) {
            throw new Error('Error al enviar la solicitud de cita');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función auxiliar para obtener la duración del tratamiento
function getTreatmentDuration(treatmentType) {
    const durations = {
        'limpieza': 30,
        'revision': 30,
        'empaste': 45,
        'endodoncia': 90
    };
    return durations[treatmentType] || 30;
} 