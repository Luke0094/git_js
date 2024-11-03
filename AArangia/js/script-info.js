// ------------------- FORM VALIDATOR -------------------
class FormValidator {
    static validations = {
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

    static validate(form) {
        let isValid = true;

        Object.entries(this.validations).forEach(([fieldId, {test, message}]) => {
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
}

// ------------------- UI MANAGER -------------------
class UIManager {
    static showLoadingState(button) {
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Invio in corso...';
        button.disabled = true;
    }

    static resetButton(button, originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
    }

    static showAlert(form, type, message, icon) {
        this.removeExistingAlerts(form);
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-${icon} me-2"></i>
                <div>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            </div>
        `;

        form.parentNode.insertBefore(alertDiv, form);
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 150);
            }
        }, 5000);
    }

    static removeExistingAlerts(form) {
        form.parentNode.querySelectorAll('.alert').forEach(alert => alert.remove());
    }

    static cleanForm(form) {
        form.reset();
        
        form.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid');
            input.value = '';
            
            const feedback = input.nextElementSibling;
            if (feedback?.classList.contains('invalid-feedback')) {
                feedback.style.display = 'none';
            }
        });

        const textarea = form.querySelector('textarea');
        if (textarea) {
            textarea.value = '';
            textarea.classList.remove('is-invalid');
        }

        document.activeElement.blur();
    }
}

// ------------------- DATA MANAGER -------------------
class DataManager {
    static async saveMessage(data) {
        try {
            const response = await fetch('http://localhost:3000/messaggi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const savedData = await response.json();
            console.log('Messaggio salvato con successo:', savedData);
            
            // Backup in localStorage
            this.saveLocally(data);
            
            return savedData;
        } catch (error) {
            console.error('Errore nel salvataggio su server:', error);
            // Fallback su localStorage
            this.saveLocally(data);
            throw error;
        }
    }

    static saveLocally(data) {
        try {
            let messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
            messages.push(data);
            localStorage.setItem('contactMessages', JSON.stringify(messages));
        } catch (error) {
            console.error('Errore nel salvataggio locale:', error);
            throw error;
        }
    }
}

// ------------------- MAIN FORM CLASS -------------------
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
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!this.isSubmitting) {
                this.handleSubmit(e);
            }
        });

        this.form.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback?.classList.contains('invalid-feedback')) {
                    feedback.style.display = 'none';
                }
            });
        });
    }

    getFormData() {
        return {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            nome: this.getFieldValue('contactName'),
            email: this.getFieldValue('contactEmail'),
            telefono: this.getFieldValue('contactPhone'),
            messaggio: this.getFieldValue('contactMessage'),
            stato: "Non letto"
        };
    }

    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) return;
        
        if (FormValidator.validate(this.form)) {
            this.isSubmitting = true;
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (!submitButton) return;

            const originalButtonText = submitButton.innerHTML;
            UIManager.showLoadingState(submitButton);

            try {
                const formData = this.getFormData();
                await DataManager.saveMessage(formData);
                UIManager.showAlert(this.form, 'success', 'Messaggio inviato con successo! Ti contatteremo presto.', 'check-circle-fill');
                UIManager.cleanForm(this.form);
            } catch (error) {
                console.error('Errore:', error);
                UIManager.showAlert(this.form, 'danger', 'Si è verificato un errore durante il salvataggio dei dati', 'exclamation-triangle-fill');
            } finally {
                UIManager.resetButton(submitButton, originalButtonText);
                this.isSubmitting = false;
            }
        }
    }
}

// Inizializzazione al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    new ContattoForm();
});