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
    e.preventDefault(); // Evita il refresh della pagina

    let isValid = true;

    // Lista dei campi da validare
    const fields = [
        { id: "nome", message: "Il campo Nome è obbligatorio." },
        { id: "cognome", message: "Il campo Cognome è obbligatorio." },
        { id: "telefono", message: "Il campo Telefono è obbligatorio." },
        { id: "email", message: "Il campo Email è obbligatorio." },
        { id: "indirizzo", message: "Il campo Indirizzo è obbligatorio." }
    ];

    // Valida ogni campo e mostra l'errore se è vuoto
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

    // Verifica che almeno un corso sia selezionato
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

    // Verifica accettazione privacy
    
    const privacyCheck = document.getElementById("privacyCheck");
    if (!privacyCheck.checked) {
        privacyCheck.classList.add("is-invalid");
        isValid = false;
    } else {
        privacyCheck.classList.remove("is-invalid");
    }

    // Event listener per gestire il cambio di stato
    document.getElementById("privacyCheck").addEventListener("change", function() {
        if (this.checked) {
            this.classList.remove("is-invalid");
        }
    });

    // Se il form è valido, mostra il modal di successo
    if (isValid) {
        // Chiude il modal del form
        const applyModal = bootstrap.Modal.getInstance(document.getElementById("applyModal"));
        applyModal.hide();

        // Mostra il modal di successo
        const successModal = new bootstrap.Modal(document.getElementById("successModal"));
        successModal.show();

        // Reset del form
        document.getElementById("candidaturaForm").reset();
    }
});

// Gestione del form di login
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    let isValid = true;
    const username = document.getElementById("username");
    const password = document.getElementById("password");

    // Validazione username
    if (username.value.trim() === "") {
        username.classList.add("is-invalid");
        isValid = false;
    } else {
        username.classList.remove("is-invalid");
    }
    
    // Validazione password
    if (password.value.trim() === "") {
        password.classList.add("is-invalid");
        isValid = false;
    } else {
        password.classList.remove("is-invalid");
    }

    if (!isValid) return;

    // Simulazione del controllo delle credenziali
    if (username.value === "utente" && password.value === "password123") {
        document.getElementById("authLinks").innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userMenu" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Benvenuto, ${username.value}
                </a>
                <ul class="dropdown-menu" aria-labelledby="userMenu">
                    <li><a class="dropdown-item" href="#">Profilo</a></li>
                    <li><a class="dropdown-item" href="#">Calendario corsi</a></li>
                    <li><a class="dropdown-item" href="#">Assistenza</a></li>
                    <li><a class="dropdown-item" href="#" onclick="location.reload();">Logout</a></li>
                </ul>
            </li>`;
        
        // Chiude il modal login
        const loginModal = bootstrap.Modal.getInstance(document.getElementById("loginModal"));
        loginModal.hide();

        // Mostra il modal di successo login
        const loginSuccessModal = new bootstrap.Modal(document.getElementById("loginSuccessModal"));
        loginSuccessModal.show();

        document.getElementById("loginForm").reset();
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