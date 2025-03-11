class SimpleCalendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.selectedDate = null;
        this.render();
    }

    render() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        let html = '<div class="calendar">';
        
        // Cabecera del calendario
        html += '<div class="calendar-header">';
        html += `<button onclick="calendar.previousMonth()">&lt;</button>`;
        html += `<span>${this.currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>`;
        html += `<button onclick="calendar.nextMonth()">&gt;</button>`;
        html += '</div>';
        
        // Días de la semana
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        html += '<div class="calendar-days">';
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';

        // Días del mes
        html += '<div class="calendar-dates">';
        
        // Espacios en blanco para el primer día
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="calendar-date"></div>';
        }

        // Días del mes
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), i);
            const isSelected = this.selectedDate && 
                             date.toDateString() === this.selectedDate.toDateString();
            const isPast = date < new Date().setHours(0,0,0,0);
            const classes = [
                'calendar-date',
                isSelected ? 'selected' : '',
                isPast ? 'past' : ''
            ].filter(Boolean).join(' ');

            html += `<div class="${classes}" onclick="calendar.selectDate(${i})">${i}</div>`;
        }
        html += '</div></div>';

        this.container.innerHTML = html;
    }

    selectDate(day) {
        const selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        
        // No permitir seleccionar fechas pasadas
        if (selectedDate < new Date().setHours(0,0,0,0)) {
            return;
        }

        this.selectedDate = selectedDate;
        this.render();
        this.onDateSelected(this.selectedDate);
    }

    onDateSelected(date) {
        // Cargar horas disponibles
        getAvailableSlots(date)
            .then(slots => {
                displayTimeSlots(slots);
                document.getElementById('timeSlots').style.display = 'block';
            })
            .catch(error => {
                console.error('Error al cargar las horas disponibles:', error);
            });
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }
} 