// Classe per la gestione dei dati di iscrizione
class Iscrizione {
    constructor(nome, cognome, telefono, email, indirizzo, corsiScelti) {
        this.id = Date.now();
        this.dataIscrizione = new Date().toISOString();
        this.nome = nome;
        this.cognome = cognome;
        this.telefono = telefono;
        this.email = email;
        this.indirizzo = indirizzo;
        this.corsiScelti = corsiScelti;
        this.privacyAccettata = true;
    }

    // Metodo statico per creare un'istanza da un form
    static fromForm() {
        return new Iscrizione(
            document.getElementById("nome").value,
            document.getElementById("cognome").value,
            document.getElementById("telefono").value,
            document.getElementById("email").value,
            document.getElementById("indirizzo").value,
            Array.from(document.querySelectorAll(".course-checkbox:checked")).map(checkbox => checkbox.value)
        );
    }
}

// Funzione per inviare l'iscrizione al server
async function gestisciIscrizione(event) {
    event.preventDefault();

    if (isValid) {
        const iscrizione = Iscrizione.fromForm();

        try {
            await salvaIscrizioneSuServer(iscrizione);
            saveCandidatura(iscrizione);
            console.log('Candidatura salvata:', iscrizione);

            const applyModal = bootstrap.Modal.getInstance(document.getElementById("applyModal"));
            if (applyModal) applyModal.hide();

            const successModal = new bootstrap.Modal(document.getElementById("successModal"));
            successModal.show();

            document.getElementById("idForm").reset();
        } catch (error) {
            console.error('Errore nel salvataggio della candidatura:', error);
            alert('Si è verificato un errore nel salvataggio della candidatura sul server. I dati sono stati salvati localmente.');
        }
    }
}



// Funzione per aggiornare la navbar
function updateNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');
    let navbarHtml = '';

    if (isLoggedIn === 'true' && username) {
        if (window.location.pathname.includes('Home.html')) {
            navbarHtml = `
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="Home.html">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="pages/Progetti.html">Progetti</a>
                    </li>
                </ul>
                <ul class="navbar-nav">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="userMenu" role="button" 
                           data-bs-toggle="dropdown" aria-expanded="false">
                            Benvenuto, ${username}
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="userMenu">
                            <li><a class="dropdown-item" href="#">Profilo</a></li>
                            <li><a class="dropdown-item" href="#">Calendario corsi</a></li>
                            <li><a class="dropdown-item" href="#">Assistenza</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" onclick="handleLogout()">Logout</a></li>
                        </ul>
                    </li>
                </ul>`;
        } else {
            navbarHtml = `
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="../Home.html">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="Progetti.html">Progetti</a>
                    </li>
                </ul>
                <ul class="navbar-nav">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="userMenu" role="button" 
                           data-bs-toggle="dropdown" aria-expanded="false">
                            Benvenuto, ${username}
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="userMenu">
                            <li><a class="dropdown-item" href="#">Profilo</a></li>
                            <li><a class="dropdown-item" href="#">Calendario corsi</a></li>
                            <li><a class="dropdown-item" href="#">Assistenza</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" onclick="handleLogout()">Logout</a></li>
                        </ul>
                    </li>
                </ul>`;
        }
    } else {
        if (window.location.pathname.includes('Home.html')) {
            navbarHtml = `
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="Home.html">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="pages/Progetti.html">Progetti</a>
                    </li>
                </ul>
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#applyModal">Candidati</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">Accedi</a>
                    </li>
                </ul>`;
        } else {
            navbarHtml = `
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="../Home.html">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="Progetti.html">Progetti</a>
                    </li>
                </ul>
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#applyModal">Candidati</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">Accedi</a>
                    </li>
                </ul>`;
        }
    }

    document.getElementById("navbarNav").innerHTML = navbarHtml;
}

// Funzione per il logout
function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    updateNavbar();
}

// Limita la selezione a un massimo di 3 corsi
document.querySelectorAll(".course-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
        const selectedCheckboxes = document.querySelectorAll(".course-checkbox:checked");
        const errorDiv = document.getElementById("courseSelectionError");

        if (selectedCheckboxes.length > 3) {
            checkbox.checked = false;
            errorDiv.style.display = "block";
            errorDiv.textContent = "Puoi selezionare al massimo 3 corsi.";
        } else if (selectedCheckboxes.length === 0) {
            errorDiv.style.display = "block";
            errorDiv.textContent = "Seleziona almeno un corso.";
        } else {
            errorDiv.style.display = "none";
        }
    });
});

// Gestione del form di candidatura
document.getElementById("candidaturaForm").addEventListener("submit", function (e) {
    e.preventDefault();

    let isValid = true;

    const fields = [
        { id: "nome", message: "Il campo Nome è obbligatorio." },
        { id: "cognome", message: "Il campo Cognome è obbligatorio." },
        { id: "telefono", message: "Il campo Telefono è obbligatorio." },
        { id: "email", message: "Il campo Email è obbligatorio." },
        { id: "indirizzo", message: "Il campo Indirizzo è obbligatorio." }
    ];

    fields.forEach((field) => {
        const input = document.getElementById(field.id);
        const errorDiv = input.nextElementSibling;

        if (input.value.trim() === "") {
            input.classList.add("is-invalid");
            errorDiv.style.display = "block";
            errorDiv.textContent = field.message;
            isValid = false;
        } else {
            input.classList.remove("is-invalid");
            errorDiv.style.display = "none";
        }
    });

    const selectedCourses = document.querySelectorAll(".course-checkbox:checked");
    const courseSelectionError = document.getElementById("courseSelectionError");

    if (selectedCourses.length === 0) {
        courseSelectionError.style.display = "block";
        courseSelectionError.textContent = "Seleziona almeno un corso.";
        isValid = false;
    } else if (selectedCourses.length > 3) {
        courseSelectionError.style.display = "block";
        courseSelectionError.textContent = "Puoi selezionare al massimo 3 corsi.";
        isValid = false;
    } else {
        courseSelectionError.style.display = "none";
    }

    const privacyCheck = document.getElementById("privacyCheck");
    if (!privacyCheck.checked) {
        privacyCheck.classList.add("is-invalid");
        isValid = false;
    } else {
        privacyCheck.classList.remove("is-invalid");
    }

    // Funzione per salvare i dati delle candidature
function saveCandidatura(formData) {
    // Prendi le candidature esistenti o inizializza un array vuoto
    let candidature = JSON.parse(localStorage.getItem('candidature') || '[]');
    candidature.push(formData);
    localStorage.setItem('candidature', JSON.stringify(candidature));
}

// Nel gestore del form, sostituisci il blocco if (isValid) con questo:
if (isValid) {
    // Raccogli i dati del form
    const formData = {
        id: Date.now(), // ID univoco basato sul timestamp
        dataIscrizione: new Date().toISOString(),
        nome: document.getElementById("nome").value,
        cognome: document.getElementById("cognome").value,
        telefono: document.getElementById("telefono").value,
        email: document.getElementById("email").value,
        indirizzo: document.getElementById("indirizzo").value,
        corsiScelti: Array.from(document.querySelectorAll(".course-checkbox:checked"))
            .map(checkbox => checkbox.value),
        privacyAccettata: true
    };

    try {
        saveCandidatura(formData);
        console.log('Candidatura salvata:', formData); // Per debug

        const applyModal = bootstrap.Modal.getInstance(document.getElementById("applyModal"));
        applyModal.hide();

        const successModal = new bootstrap.Modal(document.getElementById("successModal"));
        successModal.show();

        this.reset();
    } catch (error) {
        console.error('Errore nel salvataggio della candidatura:', error);
        alert('Si è verificato un errore nel salvataggio della candidatura');
    }
}

function getCandidature() {
    return JSON.parse(localStorage.getItem('candidature') || '[]');
}

// Funzione per esportare le candidature in formato JSON
function exportCandidature() {
    const candidature = getCandidature();
    const dataStr = JSON.stringify(candidature, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'candidature.json');
    exportLink.click();
}

// Funzione per visualizzare le candidature (opzionale)
function visualizzaCandidature() {
    const candidature = getCandidature();
    console.table(candidature); // Visualizza in console in formato tabella
    return candidature;
}

});

// Gestione del form di login
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    let isValid = true;
    const username = document.getElementById("username");
    const password = document.getElementById("password");

    if (username.value.trim() === "") {
        username.classList.add("is-invalid");
        isValid = false;
    } else {
        username.classList.remove("is-invalid");
    }
    
    if (password.value.trim() === "") {
        password.classList.add("is-invalid");
        isValid = false;
    } else {
        password.classList.remove("is-invalid");
    }

    if (!isValid) return;

    if (username.value === "utente" && password.value === "password123") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username.value);
        
        updateNavbar();

        const loginModal = bootstrap.Modal.getInstance(document.getElementById("loginModal"));
        loginModal.hide();

        const loginSuccessModal = new bootstrap.Modal(document.getElementById("loginSuccessModal"));
        loginSuccessModal.show();

        this.reset();
    } else {
        const errorMsg = document.getElementById("loginError");
        errorMsg.style.display = "block";
    }
});

// Gestione apertura privacy modal
document.querySelector('.privacy-link').addEventListener('click', function(e) {
    e.preventDefault();
    const formModal = bootstrap.Modal.getInstance(document.getElementById("applyModal"));
    formModal.hide();
    
    const privacyModal = new bootstrap.Modal(document.getElementById("privacyModal"));
    privacyModal.show();
    
    document.getElementById('privacyModal').addEventListener('hidden.bs.modal', function () {
        formModal.show();
    }, { once: true });
});

// Reset form dopo chiusura modal di successo
document.getElementById('successModal').addEventListener('hidden.bs.modal', function () {
    document.getElementById("candidaturaForm").reset();
    document.querySelectorAll('.is-invalid').forEach(element => {
        element.classList.remove('is-invalid');
    });
    document.querySelectorAll('.invalid-feedback').forEach(element => {
        element.style.display = 'none';
    });
});

// Reset login form dopo chiusura modal di successo login
document.getElementById('loginSuccessModal').addEventListener('hidden.bs.modal', function () {
    document.querySelectorAll('.is-invalid').forEach(element => {
        element.classList.remove('is-invalid');
    });
    document.querySelectorAll('.invalid-feedback').forEach(element => {
        element.style.display = 'none';
    });
});

// Controlla lo stato del login al caricamento della pagina
document.addEventListener('DOMContentLoaded', function() {
    updateNavbar();
});

document.addEventListener('DOMContentLoaded', caricaCandidature);