// Configurazione
const CONFIG_API = {
    URL_BASE: 'http://localhost:3000',
    ENDPOINTS: {
        ORDERS: '/ordini'
    }
};

// Funzioni di utilità
class Utilita {
    static formattaPrezzo(prezzo) {
        return `€ ${Number(prezzo).toFixed(2)}`;
    }

    static formattaData(data) {
        return new Date(data).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
// Componente UI Dettagli Ordine
class DettagliOrdineUI {
    static creaDettagliOrdine(ordine, cliente) {
        return `
            <div class="alert alert-success mb-4">
                <h5 class="alert-heading">Grazie per il tuo acquisto, ${cliente.nome}!</h5>
                <p class="mb-0">Il tuo ordine #${ordine.numeroOrdine} è stato confermato.</p>
            </div>
            <h5 class="mb-3">Articoli ordinati:</h5>
            <div class="list-group mb-4">
                ${this.creaListaProdotti(ordine.prodotti)}
            </div>`;
    }

    static creaListaProdotti(prodotti) {
        return prodotti.map(prod => {
            const prezzoTotale = prod.prezzo * prod.quantita;
            return `
                <div class="list-group-item">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <img src="../${prod.image}" class="img-fluid rounded" alt="${prod.nome}"
                                 onerror="this.src='../img/placeholder.jpg'">
                        </div>
                        <div class="col-md-6">
                            <h6 class="mb-0">${prod.nome}</h6>
                            <small class="text-muted">Quantità: ${prod.quantita}</small>
                        </div>
                        <div class="col-md-4 text-end">
                            <p class="mb-0">${Utilita.formattaPrezzo(prezzoTotale)}</p>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }
}

// Componente UI Dettagli Spedizione
class DettagliSpedizioneUI {
    static creaDettagliSpedizione(cliente, ordine) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6>Dati Cliente:</h6>
                    <p class="mb-1">${cliente.nome} ${cliente.cognome}</p>
                    <p class="mb-1">${cliente.email}</p>
                    <p class="mb-1">${cliente.telefono}</p>
                    <p class="mb-3">${this.formattaMetodoPagamento(cliente)}</p>
                </div>
                ${this.creaInfoSpedizione(cliente)}
            </div>
            <div class="row mt-3">
                <div class="col-md-6">
                    <h6>Data Ordine:</h6>
                    <p>${Utilita.formattaData(ordine.dataOrdine)}</p>
                </div>
            </div>`;
    }

    static formattaMetodoPagamento(cliente) {
        let metodoPagamento;
        if (cliente.metodoPagamento === 'CC' && cliente.numeroCarta) {
            metodoPagamento = `Carta di Credito (${cliente.numeroCarta})`;
        } else {
            switch(cliente.metodoPagamento) {
                case 'PP':
                    metodoPagamento = 'PayPal';
                    break;
                case 'SP':
                    metodoPagamento = 'StaysPay';
                    break;
                default:
                    metodoPagamento = cliente.metodoPagamento;
            }
        }
        return `
            <div class="col-md-6">
                <h6>Metodo di pagamento:</h6>
                ${metodoPagamento}
            </div>`;
    }

    static creaInfoSpedizione(cliente) {
        if (cliente.modalitaConsegna === 'spedizione') {
            return `
                <div class="col-md-6">
                    <h6>Indirizzo di Spedizione:</h6>
                    <p class="mb-1">${cliente.via} ${cliente.civico}</p>
                    <p class="mb-1">${cliente.cap} ${cliente.citta} (${cliente.provincia})</p>
                </div>`;
        }
        return `
            <div class="col-md-6">
                <h6>Modalità di Consegna:</h6>
                <p class="mb-1">Ritiro in negozio</p>
            </div>`;
    }
}

// Componente UI Riepilogo Acquisto
class RiepilogoAcquistoUI {
    static creaRiepilogo(ordine, cliente) {
        let subtotale = 0;
        const prodottiHtml = ordine.prodotti.map(prod => {
            const prezzoTotaleProdotto = prod.prezzo * prod.quantita;
            subtotale += prezzoTotaleProdotto;
            return `
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <div>${prod.nome}</div>
                        <small class="text-muted">
                            ${Utilita.formattaPrezzo(prod.prezzo)} × ${prod.quantita}
                        </small>
                    </div>
                    <div class="text-end">
                        ${Utilita.formattaPrezzo(prezzoTotaleProdotto)}
                    </div>
                </div>
            `;
        }).join('');

        const iva = subtotale * 0.22;
        const totale = subtotale + iva;

        return `
            <div class="mb-3">
                ${prodottiHtml}
                <hr>
                <div class="d-flex justify-content-between mb-2">
                    <span>Subtotale</span>
                    <span>${Utilita.formattaPrezzo(subtotale)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>IVA (22%)</span>
                    <span>${Utilita.formattaPrezzo(iva)}</span>
                </div>
                <hr>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Totale</span>
                    <span>${Utilita.formattaPrezzo(totale)}</span>
                </div>
            </div>
            <div class="alert alert-info mb-0">
                <small class="d-block text-center">
                    <i class="fas fa-info-circle me-1"></i>
                    Riceverai una email di conferma all'indirizzo ${cliente.email}
                </small>
            </div>`;
    }
}

// Gestore Conferma Ordine
class GestoreConfermaOrdine {
    constructor() {
        this.dettagliOrdineEl = document.getElementById('dettagliOrdine');
        this.dettagliSpedizioneEl = document.getElementById('dettagliSpedizione');
        this.riepilogoAcquistoEl = document.getElementById('riepilogoAcquisto');
        this.inizializza();
    }

    inizializza() {
        const ordine = JSON.parse(localStorage.getItem('ultimoOrdine'));
        const cliente = JSON.parse(localStorage.getItem('datiCliente'));

        if (!ordine || !cliente) {
            window.location.href = '../index.html';
            return;
        }

        this.renderizzaDettagliOrdine(ordine, cliente);
        this.renderizzaDettagliSpedizione(cliente, ordine);
        this.renderizzaRiepilogoAcquisto(ordine, cliente);

        localStorage.removeItem('ultimoOrdine');
        localStorage.removeItem('datiCliente');
    }

    renderizzaDettagliOrdine(ordine, cliente) {
        if (this.dettagliOrdineEl) {
            this.dettagliOrdineEl.innerHTML = DettagliOrdineUI.creaDettagliOrdine(ordine, cliente);
        }
    }

    renderizzaDettagliSpedizione(cliente, ordine) {
        if (this.dettagliSpedizioneEl) {
            this.dettagliSpedizioneEl.innerHTML = DettagliSpedizioneUI.creaDettagliSpedizione(cliente, ordine);
        }
    }

    renderizzaRiepilogoAcquisto(ordine, cliente) {
        if (this.riepilogoAcquistoEl) {
            this.riepilogoAcquistoEl.innerHTML = RiepilogoAcquistoUI.creaRiepilogo(ordine, cliente);
        }
    }
}

// Inizializzazione dell'applicazione
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (document.readyState === 'complete') {
            new GestoreConfermaOrdine();
        } else {
            window.addEventListener('load', () => {
                new GestoreConfermaOrdine();
            });
        }
    } catch (errore) {
        console.error('Errore durante l\'inizializzazione:', errore);
        alert('Si è verificato un errore durante il caricamento della pagina');
    }
});