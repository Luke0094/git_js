// ------------------- CLASSI -------------------

class Iscrizione {
    constructor(nome, cognome, telefono, email, indirizzo, corsiScelti) {
        this.id = Date.now();
        this.dataIscrizione = new Date().toISOString();
        this.datiPersonali = {
            nome: nome,
            cognome: cognome,
            telefono: telefono,
            email: email,
            indirizzo: indirizzo
        };
        this.corsiScelti = corsiScelti;
        this.privacyAccettata = true;
        this.stato = "In attesa";
    }

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

class Carousel {
    constructor(element) {
        this.element = element;
        this.currentIndex = 0;
        this.images = [
            { src: "./img/colorCoding.webp", alt: "Color Coding" },
            { src: "./img/signoraCreativa.webp", alt: "Signora Creativa" },
            { src: "./img/teamCreativness.jpg", alt: "Team Creativeness" }
        ];
        this.interval = null;
        this.init();
    }

    init() {
        this.setupCarouselStructure();
        this.startAutoplay();
        this.setupEventListeners();
    }

    setupCarouselStructure() {
        this.slideContainer = document.createElement('div');
        this.slideContainer.className = 'carousel-container';
        
        this.images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.alt;
            
            slide.appendChild(img);
            this.slideContainer.appendChild(slide);
        });

        this.element.appendChild(this.slideContainer);
        this.addControls();
        this.addIndicators();
    }

    addControls() {
        const prevButton = document.createElement('button');
        prevButton.className = 'carousel-control prev';
        prevButton.innerHTML = '&#10094;';
        prevButton.setAttribute('aria-label', 'Previous slide');

        const nextButton = document.createElement('button');
        nextButton.className = 'carousel-control next';
        nextButton.innerHTML = '&#10095;';
        nextButton.setAttribute('aria-label', 'Next slide');

        this.element.appendChild(prevButton);
        this.element.appendChild(nextButton);
    }

    addIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        
        this.images.forEach((_, index) => {
            const indicator = document.createElement('button');
            indicator.className = `carousel-indicator${index === 0 ? ' active' : ''}`;
            indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
            indicators.appendChild(indicator);
        });

        this.element.appendChild(indicators);
    }

    setupEventListeners() {
        const prevButton = this.element.querySelector('.prev');
        const nextButton = this.element.querySelector('.next');
        const indicators = this.element.querySelectorAll('.carousel-indicator');

        prevButton.addEventListener('click', () => this.prev());
        nextButton.addEventListener('click', () => this.next());
        
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        this.element.addEventListener('mouseenter', () => this.stopAutoplay());
        this.element.addEventListener('mouseleave', () => this.startAutoplay());
    }

    startAutoplay() {
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.next(), 5000);
    }

    stopAutoplay() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    updateSlide() {
        this.slideContainer.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        
        const indicators = this.element.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentIndex);
        });
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateSlide();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateSlide();
    }

    goToSlide(index) {
        this.currentIndex = index;
        this.updateSlide();
    }
}

// ------------------- GESTIONE DATI -------------------

async function saveCandidatura(iscrizione) {
    try {
        const response = await fetch('http://localhost:3000/iscrizioni', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(iscrizione)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const savedData = await response.json();
        console.log('Candidatura salvata con successo:', savedData);
        
        // Backup in localStorage
        let localCandidature = JSON.parse(localStorage.getItem('candidature') || '[]');
        localCandidature.push(iscrizione);
        localStorage.setItem('candidature', JSON.stringify(localCandidature));
        
        return true;
    } catch (error) {
        console.error('Errore nel salvataggio della candidatura:', error);
        // Fallback su localStorage
        let localCandidature = JSON.parse(localStorage.getItem('candidature') || '[]');
        localCandidature.push(iscrizione);
        localStorage.setItem('candidature', JSON.stringify(localCandidature));
        throw error;
    }
}

function getCandidature() {
    return JSON.parse(localStorage.getItem('candidature') || '[]');
}

function exportCandidature() {
    const candidature = getCandidature();
    const dataStr = JSON.stringify(candidature, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'candidature.json');
    exportLink.click();
}

// ------------------- GESTIONE UI -------------------

function updateNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');
    let navbarHtml = '';

    if (isLoggedIn === 'true' && username) {
        if (window.location.pathname.includes('Home.html')) {
            navbarHtml = `
                <ul class="navbar-nav me-auto">
                    <li class="nav-item"><a class="nav-link" href="Home.html">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="pages/Chi-Siamo.html">Chi Siamo</a></li>
                    <li class="nav-item"><a class="nav-link" href="pages/Progetti.html">Progetti</a></li>
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
                    <li class="nav-item"><a class="nav-link" href="../Home.html">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="Chi-Siamo.html">Chi Siamo</a></li>
                    <li class="nav-item"><a class="nav-link" href="Progetti.html">Progetti</a></li>
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
                    <li class="nav-item"><a class="nav-link" href="Home.html">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="pages/Chi-Siamo.html">Chi Siamo</a></li>
                    <li class="nav-item"><a class="nav-link" href="pages/Progetti.html">Progetti</a></li>
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
                    <li class="nav-item"><a class="nav-link" href="../Home.html">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="Chi-Siamo.html">Chi Siamo</a></li>
                    <li class="nav-item"><a class="nav-link" href="Progetti.html">Progetti</a></li>
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

function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    updateNavbar();
}

function clearModalBackdrop() {
    document.querySelector('.modal-backdrop')?.remove();
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

// ------------------- VALIDAZIONE -------------------

function validateForm() {
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

        if (!input.value.trim()) {
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
    const courseContainer = document.querySelector('.course-selection');
    const courseSelectionError = document.getElementById("courseSelectionError");

    if (selectedCourses.length === 0) {
        courseContainer.classList.add('is-invalid');
        courseSelectionError.style.display = "block";
        courseSelectionError.textContent = "Seleziona almeno un corso.";
        isValid = false;
    } else if (selectedCourses.length > 3) {
        courseContainer.classList.add('is-invalid');
        courseSelectionError.style.display = "block";
        courseSelectionError.textContent = "Puoi selezionare al massimo 3 corsi.";
        isValid = false;
    } else {
        courseContainer.classList.remove('is-invalid');
        courseSelectionError.style.display = "none";
    }

    const privacyCheck = document.getElementById("privacyCheck");
    if (!privacyCheck.checked) {
        privacyCheck.classList.add("is-invalid");
        isValid = false;
    } else {
        privacyCheck.classList.remove("is-invalid");
    }

    return isValid;
}

// ------------------- EVENT LISTENERS -------------------

document.addEventListener('DOMContentLoaded', function() {
    // Inizializza il carosello
    const carouselElement = document.querySelector('#carouselExample');
    if (carouselElement) {
        new Carousel(carouselElement);
    }

    // Gestione form di candidatura
    const candidaturaForm = document.getElementById("candidaturaForm");
    if (candidaturaForm) {
        candidaturaForm.addEventListener("submit", function(event) {
            event.preventDefault();
            
            if (validateForm()) {
                const iscrizione = Iscrizione.fromForm();
                
                saveCandidatura(iscrizione)
                    .then(() => {
                        // Chiudi il modal di candidatura
                        const applyModal = bootstrap.Modal.getInstance(document.getElementById("applyModal"));
                        if (applyModal) {
                            applyModal.hide();
                        }
 
                        // Mostra il modal di successo
                        const successModal = new bootstrap.Modal(document.getElementById("successModal"));
                        successModal.show();
 
                        // Reset del form
                        this.reset();
                        
                        // Rimuovi le classi di errore
                        document.querySelectorAll('.is-invalid').forEach(element => {
                            element.classList.remove('is-invalid');
                        });
                        document.querySelectorAll('.invalid-feedback, #courseSelectionError').forEach(element => {
                            element.style.display = 'none';
                        });
                        
                        document.querySelector('.course-selection')?.classList.remove('is-invalid');
                    })
                    .catch(error => {
                        console.error('Errore nel salvataggio:', error);
                        alert('Si è verificato un errore nel salvataggio della candidatura. I dati sono stati salvati localmente.');
                    });
            }
        });
    }
 
    // Gestione selezione corsi
    document.querySelectorAll(".course-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", function() {
            const selectedCheckboxes = document.querySelectorAll(".course-checkbox:checked");
            const courseContainer = document.querySelector('.course-selection');
            const errorDiv = document.getElementById("courseSelectionError");
 
            if (selectedCheckboxes.length > 3) {
                checkbox.checked = false;
                courseContainer.classList.add('is-invalid');
                errorDiv.style.display = "block";
                errorDiv.textContent = "Puoi selezionare al massimo 3 corsi.";
            } else {
                courseContainer.classList.remove('is-invalid');
                errorDiv.style.display = "none";
            }
        });
    });
 
    // Gestione privacy modal
    const privacyLink = document.querySelector('.privacy-link');
    if (privacyLink) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            const applyModal = document.getElementById("applyModal");
            const privacyModal = document.getElementById("privacyModal");
            
            bootstrap.Modal.getInstance(applyModal).hide();
            new bootstrap.Modal(privacyModal).show();
            
            privacyModal.addEventListener('hidden.bs.modal', function () {
                clearModalBackdrop();
                new bootstrap.Modal(applyModal).show();
                
                applyModal.addEventListener('hidden.bs.modal', function() {
                    clearModalBackdrop();
                }, { once: true });
            }, { once: true });
        });
    }
 
    // Gestione del form di login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function(e) {
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
    }
 
    // Gestione chiusura modali
    document.getElementById("applyModal")?.addEventListener('hidden.bs.modal', clearModalBackdrop);
 
    // Reset form dopo chiusura modal di successo
    document.getElementById('successModal')?.addEventListener('hidden.bs.modal', function () {
        document.querySelectorAll('.is-invalid').forEach(element => {
            element.classList.remove('is-invalid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(element => {
            element.style.display = 'none';
        });
    });
 
    // Reset login form dopo chiusura modal di successo
    document.getElementById('loginSuccessModal')?.addEventListener('hidden.bs.modal', function () {
        document.querySelectorAll('.is-invalid').forEach(element => {
            element.classList.remove('is-invalid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(element => {
            element.style.display = 'none';
        });
    });
 
    // Controlla lo stato del login al caricamento della pagina
    updateNavbar();
 });