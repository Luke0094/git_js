class ContattoForm {
    constructor() {
        this.form = document.getElementById('contactForm');
        if (!this.form) {
            console.log('Form non trovato');
            return;
        }
        
        this.setupEventListeners();
        this.isSubmitting = false;
    }

    setupEventListeners() {
        // Gestione del submit del form
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!this.isSubmitting) {
                this.handleSubmit(e);
            }
        });

        // Gestione input per rimozione errori
        this.form.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.style.display = 'none';
                }
            });
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) return;
        
        if (this.validateForm()) {
            this.isSubmitting = true;
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (!submitButton) return;

            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Invio in corso...';
            submitButton.disabled = true;

            const formData = this.getFormData();

            // Simula invio al server e mostra successo
            setTimeout(() => {
                try {
                    this.saveLocally(formData);
                    this.showSuccess();
                    this.form.reset();
                } catch (error) {
                    this.showError('Si è verificato un errore durante il salvataggio dei dati');
                } finally {
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                    this.isSubmitting = false;
                }
            }, 1000);
        }
    }

    
    getFormData() {
        return {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            nome: this.getFieldValue('contactName'),
            email: this.getFieldValue('contactEmail'),
            telefono: this.getFieldValue('contactPhone'),
            messaggio: this.getFieldValue('contactMessage')
        };
    }

    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
    }

    validateForm() {
        let isValid = true;
        const validations = {
            contactName: {
                test: value => value.trim().length >= 3,
                message: 'Il nome deve contenere almeno 3 caratteri'
            },
            contactEmail: {
                test: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
                message: 'Inserisci un indirizzo email valido'
            },
            contactPhone: {
                test: value => /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(value),
                message: 'Inserisci un numero di telefono valido'
            },
            contactMessage: {
                test: value => value.trim().length >= 10,
                message: 'Il messaggio deve contenere almeno 10 caratteri'
            }
        };

        Object.entries(validations).forEach(([fieldId, {test, message}]) => {
            const field = document.getElementById(fieldId);
            if (!field) return;

            const feedback = field.nextElementSibling;
            if (!test(field.value)) {
                field.classList.add('is-invalid');
                if (feedback) {
                    feedback.textContent = message;
                    feedback.style.display = 'block';
                }
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
                if (feedback) {
                    feedback.style.display = 'none';
                }
            }
        });

        return isValid;
    }

    saveLocally(data) {
        try {
            let messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
            messages.push(data);
            localStorage.setItem('contactMessages', JSON.stringify(messages));
        } catch (error) {
            console.error('Errore nel salvataggio locale:', error);
            throw error;
        }
    }

    cleanForm() {
        // Reset del form
        this.form.reset();
        
        // Rimuovi tutte le classi is-invalid
        this.form.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid');
            // Pulisci esplicitamente il valore
            input.value = '';
            
            // Resetta i feedback
            const feedback = input.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.style.display = 'none';
            }
        });
        // Per i textarea
        const textarea = this.form.querySelector('textarea');
        if (textarea) {
            textarea.value = '';
            textarea.classList.remove('is-invalid');
        }
        // Forza il blur su tutti i campi
        document.activeElement.blur();
    }

    showSuccess() {
        this.removeExistingAlerts();
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-2"></i>
                <div>
                    Messaggio inviato con successo! Ti contatteremo presto.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            </div>
        `;

        this.showAlert(alertDiv);
    }

    showError(message) {
        this.removeExistingAlerts();
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <div>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            </div>
        `;

        this.showAlert(alertDiv);
    }

    showAlert(alertDiv) {
        this.form.parentNode.insertBefore(alertDiv, this.form);
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 150);
            }
        }, 5000);
    }

    removeExistingAlerts() {
        const existingAlerts = this.form.parentNode.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
    }
}

// Inizializzazione sicura
document.addEventListener('DOMContentLoaded', () => {
    new ContattoForm();
});