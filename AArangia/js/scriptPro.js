// La classe Corsi può essere utile per la tipizzazione e validazione dei dati
class Corsi {
    constructor(name, description, duration, price, id, shortDescription, img) {
        this.name = name;
        this.description = description;
        this.duration = duration;
        this.price = price;
        this.id = id;
        this.shortDescription = shortDescription;
        this.img = img;
    }

    // Metodo statico per creare un'istanza da dati grezzi
    static fromJSON(data) {
        return new Corsi(
            data.name,
            data.description,
            data.duration,
            data.price,
            data.id,
            data.shortDescription,
            data.img
        );
    }
}

let currentCourses = [];
let isExpanded = false;

async function caricaCorsi() {
    try {
        const response = await fetch("http://localhost:3000/corsi");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        // Utilizziamo la classe Corsi per strutturare i dati
        currentCourses = (Array.isArray(data) ? data : data.corsi)
            .map(corso => Corsi.fromJSON(corso));
        displayCourses(0, 3);
    } catch (error) {
        document.querySelector("#rigaCorsi").innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger text-center">
                    Errore nel caricamento dei corsi: ${error.message}
                </div>
            </div>`;
    }
}

function showCourseDetails(courseId) {
    const course = currentCourses.find(c => Number(c.id) === Number(courseId));
    if (!course) return;

    const modalElement = document.getElementById('courseModal');
    if (!modalElement) return;

    try {
        const modal = new bootstrap.Modal(modalElement);
        modalElement.querySelector('.modal-title').textContent = course.name;
        modalElement.querySelector('.modal-body').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <img src="${course.img}" class="img-fluid mb-3" alt="${course.name}">
                </div>
                <div class="col-md-6">
                    <h5 class="mb-3">Descrizione:</h5>
                    <p class="mb-4">${course.description}</p>
                    <h5 class="mb-2">Durata:</h5>
                    <p class="mb-3">${course.duration}</p>
                    <h5 class="mb-2">Prezzo:</h5>
                    <p class="mb-0">€${course.price}</p>
                </div>
            </div>`;
        modal.show();
    } catch (error) {
        console.error('Errore nell\'apertura del modal:', error);
    }
}

function displayCourses(start, limit) {
    const rigaCorsi = document.querySelector("#rigaCorsi");
    rigaCorsi.innerHTML = '';
    
    currentCourses.slice(start, start + limit).forEach((corso, index) => {
        const cardCol = document.createElement("div");
        cardCol.className = "col-md-4 mb-4"; // Bootstrap grid class

        const card = `
            <div class="card h-100 shadow-sm">
                <div class="card-img-top bg-light" style="height: 200px;">
                    <img src="${corso.img}" 
                         class="w-100 h-100" 
                         style="object-fit: cover;" 
                         alt="${corso.name}">
                </div>
                <div class="card-body d-flex flex-column">
                    <h3 class="card-title h5">${corso.name}</h3>
                    <p class="card-text flex-grow-1">${corso.shortDescription}</p>
                    <div class="mt-auto">
                        <p class="card-text">
                            <small class="text-muted d-block">Durata: ${corso.duration}</small>
                            <small class="text-muted d-block mb-3">Prezzo: €${corso.price}</small>
                        </p>
                        <button class="btn btn-primary w-100" onclick="showCourseDetails(${corso.id})">
                            Dettagli
                        </button>
                    </div>
                </div>
            </div>`;

        cardCol.innerHTML = card;
        cardCol.style.opacity = "0";
        cardCol.style.transform = "translateY(20px)";
        
        rigaCorsi.appendChild(cardCol);
        
        setTimeout(() => {
            cardCol.style.transition = "all 0.5s ease-out";
            cardCol.style.opacity = "1";
            cardCol.style.transform = "translateY(0)";
        }, 100 * index);
    });
}

function toggleCourses() {
    isExpanded = !isExpanded;
    displayCourses(0, isExpanded ? 9 : 3);
    
    const spoilerBtn = document.querySelector("#spoilerBtn");
    if (spoilerBtn) {
        spoilerBtn.textContent = isExpanded ? "Mostra Meno" : "Mostra Tutti i Corsi";
        spoilerBtn.className = `btn btn-outline-primary ${isExpanded ? 'active' : ''}`;
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', caricaCorsi);

// Esporta le funzioni necessarie globalmente
Object.assign(window, { showCourseDetails, toggleCourses });