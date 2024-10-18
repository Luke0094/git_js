let listaCarrello = document.querySelector("#listaCarrello");
let totaleCarrello = document.querySelector("#totaleCarrello");

function caricaCarrello() {
    const URLCarrello = "http://localhost:3000/carrello";

    fetch(URLCarrello)
    .then(data => data.json())
    .then(response => {
        let totale = 0;
        listaCarrello.innerHTML = '';

        response.forEach(prod => {
            listaCarrello.innerHTML += `
                <li class='list-group-item' data-id="${prod.id}">
                    <div class="row g-2 align-items-center">
                        <div class="col-12 col-sm-6 col-md-4">
                            <strong>${prod.nome}</strong>
                        </div>
                        <div class="col-4 col-sm-2 col-md-2 text-end text-sm-start">
                            € ${prod.prezzo}
                        </div>
                        <div class="col-8 col-sm-4 col-md-3">
                            <div class="btn-group btn-group-sm w-100" role="group" aria-label="Quantity control">
                                <button class="btn btn-outline-secondary quantity-btn" data-action="decrease">-</button>
                                <span class="btn btn-outline-secondary quantity-value" style="pointer-events: none;">${prod.quantita}</span>
                                <button class="btn btn-outline-secondary quantity-btn" data-action="increase">+</button>
                            </div>
                        </div>
                        <div class="col-8 col-sm-4 col-md-3">
                            <button class="btn btn-sm btn-outline-danger remove-btn w-100">Rimuovi</button>
                        </div>
                    </div>
                </li>
            `;
            totale += parseFloat(prod.prezzo) * prod.quantita;
        });
        totaleCarrello.textContent = `Totale: € ${totale.toFixed(2)}`;
    });
}

function modificaQuantita(id, nuovaQuantita) {
    if (nuovaQuantita < 1) {
        rimuoviDalCarrello(id);
        return;
    }

    const URLCarrello = `http://localhost:3000/carrello/${id}`;

    fetch(URLCarrello, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantita: nuovaQuantita })
    })
    .then(() => caricaCarrello())
    .catch(err => console.error('Errore durante l\'aggiornamento della quantità:', err));
}

function rimuoviDalCarrello(id) {
    const URLCarrello = `http://localhost:3000/carrello/${id}`;

    fetch(URLCarrello, {
        method: 'DELETE',
    })
    .then(() => caricaCarrello())
    .catch(err => console.error('Errore durante la rimozione:', err));
}

document.addEventListener("DOMContentLoaded", () => {
    caricaCarrello();

    // Event delegation for quantity buttons and remove button
    listaCarrello.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('quantity-btn') || target.classList.contains('remove-btn')) {
            const listItem = target.closest('li');
            const id = listItem.dataset.id;
            
            if (target.classList.contains('quantity-btn')) {
                const quantitySpan = listItem.querySelector('.quantity-value');
                let currentQuantity = parseInt(quantitySpan.textContent);
                
                if (target.dataset.action === 'increase') {
                    modificaQuantita(id, currentQuantity + 1);
                } else if (target.dataset.action === 'decrease') {
                    modificaQuantita(id, currentQuantity - 1);
                }
            } else if (target.classList.contains('remove-btn')) {
                rimuoviDalCarrello(id);
            }
        }
    });

    const formAcquisto = document.getElementById('formAcquisto');
    const metodoPagamento = document.getElementById('metodoPagamento');
    const campoCartaCredito = document.getElementById('campoCartaCredito');
    const numeroCartaCredito = document.getElementById('numeroCartaCredito');

    metodoPagamento.addEventListener('change', (e) => {
        if (e.target.value === 'CC') {
            campoCartaCredito.classList.remove('d-none');
            numeroCartaCredito.setAttribute('required', 'required');
        } else {
            campoCartaCredito.classList.add('d-none');
            numeroCartaCredito.removeAttribute('required');
        }
    });

    formAcquisto.addEventListener('submit', (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const metodoPagamentoSelezionato = metodoPagamento.value;
        const numeroCarta = metodoPagamentoSelezionato === 'CC' ? numeroCartaCredito.value : '';

        const dettagliAcquisto = {
            nome,
            email,
            metodoPagamento: metodoPagamentoSelezionato,
            numeroCarta
        };

        fetch('http://localhost:3000/carrello')
        .then(response => response.json())
        .then(elementiCarrello => {
            const datiAcquisto = {
                ...dettagliAcquisto,
                articoli: elementiCarrello
            };

            fetch('http://localhost:3000/acquisti', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datiAcquisto)
            })
            .then(() => {
                // Svuota il carrello eliminando tutti gli elementi
                return Promise.all(elementiCarrello.map(item => 
                    fetch(`http://localhost:3000/carrello/${item.id}`, {
                        method: 'DELETE'
                    })
                ));
            })
            .then(() => {
                localStorage.setItem('riepilogoAcquisto', JSON.stringify(datiAcquisto));
                window.location.href = 'riepilogo.html';
            })
            .catch(err => console.error('Errore:', err));
        });
    });
});