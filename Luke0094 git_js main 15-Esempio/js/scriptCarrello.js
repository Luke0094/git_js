console.log('Script carrello caricato');
// Configurazione
const CONFIG_API = {
    URL_BASE: 'http://localhost:3000',
    ENDPOINTS: {
        CARRELLO: '/carrello',
        ORDINI: '/ordini',
        PLANTS: '/plants'
    }
};

class Utilita {
    static formattaPrezzo(prezzo) {
        return `€ ${Number(prezzo).toFixed(2)}`;
    }

    static async chiamaAPI(url, opzioni = {}) {
        const risposta = await fetch(url, opzioni);
        if (!risposta.ok) throw new Error(`Errore HTTP! stato: ${risposta.status}`);
        return risposta.json();
    }

    static verificaLuhn(numero) {
        let somma = 0;
        let isPari = false;
        
        for (let i = numero.length - 1; i >= 0; i--) {
            let cifra = parseInt(numero[i]);
            if (isPari) {
                cifra *= 2;
                if (cifra > 9) cifra -= 9;
            }
            somma += cifra;
            isPari = !isPari;
        }
        return somma % 10 === 0;
    }
}

class ElementoCarrelloUI {
    static creaElementoLista(prod) {
        console.log('Dati prodotto ricevuti:', prod);
        const elementoLista = document.createElement('li');
        elementoLista.className = 'list-group-item py-3';
        elementoLista.dataset.prodottoId = prod.id;
        elementoLista.innerHTML = `
            <style>
                .quantity-input::-webkit-outer-spin-button,
                .quantity-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .quantity-input[type=number] {
                    -moz-appearance: textfield;
                }
                .remove-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }
            </style>
            <div class="row g-3 align-items-center">
                <div class="col-12 col-sm-2">
                    <img src="../${prod.image}" class="img-fluid rounded" alt="${prod.nome}" 
                         onerror="this.src='../img/placeholder.jpg'">
                </div>
                <div class="col-12 col-sm-4">
                    <h5 class="mb-1">${prod.nome}</h5>
                    <p class="text-muted mb-0">${Utilita.formattaPrezzo(prod.prezzo)}</p>
                </div>
                <div class="col-12 col-sm-4">
                    <div class="input-group input-group-sm">
                        <button class="btn btn-outline-secondary quantity-btn" data-action="decrease">−</button>
                        <input type="number" class="form-control text-center quantity-input" value="${prod.quantita}" min="1" aria-label="Quantità">
                        <button class="btn btn-outline-secondary quantity-btn" data-action="increase">+</button>
                    </div>
                </div>
                <div class="col-12 col-sm-2 text-end">
                    <button class="btn btn-outline-danger btn-sm remove-btn">
                        <i class="fas fa-trash-alt"></i>
                        Rimuovi
                    </button>
                </div>
            </div>`;
        return elementoLista;
    }
}

class GestoreCarrello {
    constructor() {
        this.listaCarrello = document.querySelector("#listaCarrello");
        this.totaleCarrello = document.querySelector("#totaleCarrello");
        this.inizializza();
    }

    async inizializza() {
        await this.caricaCarrello();
        this.configuraEventi();
    }

    configuraEventi() {
        if (this.listaCarrello) {
            this.listaCarrello.addEventListener('click', async (e) => {
                const elementoLista = e.target.closest('li');
                if (!elementoLista) return;
                
                const prodottoId = elementoLista.dataset.prodottoId;
                
                if (e.target.classList.contains('quantity-btn')) {
                    const inputQuantita = elementoLista.querySelector('.quantity-input');
                    const quantitaAttuale = parseInt(inputQuantita.value);
                    const azione = e.target.dataset.action;
                    const nuovaQuantita = azione === 'increase' ? quantitaAttuale + 1 : quantitaAttuale - 1;
                    await this.aggiornaQuantita(prodottoId, nuovaQuantita);
                } else if (e.target.classList.contains('remove-btn') || e.target.closest('.remove-btn')) {
                    if (confirm('Sei sicuro di voler rimuovere questo articolo dal carrello?')) {
                        await this.rimuoviDalCarrello(prodottoId);
                    }
                }
            });

            this.listaCarrello.addEventListener('change', async (e) => {
                if (e.target.classList.contains('quantity-input')) {
                    const nuovaQuantita = parseInt(e.target.value);
                    const elementoLista = e.target.closest('li');
                    const prodottoId = elementoLista.dataset.prodottoId;
                    if (!isNaN(nuovaQuantita) && nuovaQuantita >= 1) {
                        await this.aggiornaQuantita(prodottoId, nuovaQuantita);
                    } else {
                        await this.aggiornaQuantita(prodottoId, 1);
                    }
                }
            });
        }

        const btnMostraRiepilogo = document.querySelector('#mostraRiepilogo');
        if (btnMostraRiepilogo) {
            btnMostraRiepilogo.addEventListener('click', () => this.mostraRiepilogoOrdine());
        }
    }

    async recuperaDatiProdotto(prodottoId) {
        try {
            const response = await fetch(`${CONFIG_API.URL_BASE}/plants/${prodottoId}`);
            if (!response.ok) throw new Error('Prodotto non trovato');
            return await response.json();
        } catch (errore) {
            console.error('Errore nel recupero dati prodotto:', errore);
            return null;
        }
    }

    async caricaCarrello() {
        console.log('Tentativo di caricamento carrello...');
        try {
            const carrello = await this.recuperaCarrello();
            console.log('Carrello recuperato:', carrello);
            let subtotale = 0;
            this.listaCarrello.innerHTML = '';

            if (!carrello || carrello.length === 0) {
                this.mostraCarrelloVuoto();
                return;
            }

            const prodotti = await fetch(`${CONFIG_API.URL_BASE}/plants`).then(res => res.json());
            console.log('Lista completa prodotti:', prodotti);

            carrello.forEach(prodCarrello => {
                const prodottoCompleto = prodotti.find(p => p.id === prodCarrello.prodottoId);
                if (prodottoCompleto) {
                    const prodottoMostrato = {
                        id: prodCarrello.id,
                        prodottoId: prodCarrello.prodottoId,
                        nome: prodottoCompleto.name,
                        image: prodottoCompleto.image,
                        prezzo: Number(prodottoCompleto.price),
                        quantita: prodCarrello.quantita
                    };
                    
                    subtotale += prodottoCompleto.price * prodCarrello.quantita;
                    this.listaCarrello.appendChild(ElementoCarrelloUI.creaElementoLista(prodottoMostrato));
                }
            });

            this.aggiornaTotale(subtotale);
        } catch (errore) {
            console.error('Errore nel caricamento del carrello:', errore);
            this.mostraErroreCarrello();
        }
    }

    async recuperaCarrello() {
        return Utilita.chiamaAPI(`${CONFIG_API.URL_BASE}${CONFIG_API.ENDPOINTS.CARRELLO}`);
    }

    async aggiornaQuantita(prodottoId, nuovaQuantita) {
        try {
            if (nuovaQuantita < 1) return;
            
            await Utilita.chiamaAPI(`${CONFIG_API.URL_BASE}${CONFIG_API.ENDPOINTS.CARRELLO}/${prodottoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantita: nuovaQuantita })
            });

            await this.caricaCarrello();
        } catch (errore) {
            console.error('Errore nell\'aggiornamento della quantità:', errore);
            alert('Si è verificato un errore durante l\'aggiornamento della quantità');
        }
    }

    async rimuoviDalCarrello(prodottoId) {
        try {
            await Utilita.chiamaAPI(`${CONFIG_API.URL_BASE}${CONFIG_API.ENDPOINTS.CARRELLO}/${prodottoId}`, {
                method: 'DELETE'
            });
            
            await this.caricaCarrello();
        } catch (errore) {
            console.error('Errore nella rimozione dal carrello:', errore);
            alert('Si è verificato un errore durante la rimozione del prodotto');
        }
    }

    async mostraRiepilogoOrdine() {
        try {
            const carrello = await this.recuperaCarrello();
            if (!carrello || carrello.length === 0) {
                alert('Il carrello è vuoto');
                return;
            }

            const riepilogo = this.generaHTMLRiepilogo(carrello);
            const corpoModale = document.querySelector('#riepilogoModal .modal-body');
            corpoModale.innerHTML = riepilogo;
            
            const modaleRiepilogo = new bootstrap.Modal(document.getElementById('riepilogoModal'));
            modaleRiepilogo.show();
        } catch (errore) {
            console.error('Errore nel caricamento del riepilogo:', errore);
            alert('Si è verificato un errore nel caricamento del riepilogo');
        }
    }

    generaHTMLRiepilogo(carrello) {
        let subtotale = 0;
        let htmlRiepilogo = '<h4>Riepilogo Ordine</h4><ul class="list-unstyled">';

        carrello.forEach(item => {
            const totaleProdotto = item.prezzo * item.quantita;
            subtotale += totaleProdotto;
            htmlRiepilogo += `
                <li class="mb-3">
                    <strong>${item.nome}</strong>
                    <br>Quantità: ${item.quantita}
                    <br>Prezzo unitario: ${Utilita.formattaPrezzo(item.prezzo)}
                    <br>Totale: ${Utilita.formattaPrezzo(totaleProdotto)}
                </li>`;
        });

        const iva = subtotale * 0.22;
        const totale = subtotale + iva;

        htmlRiepilogo += `</ul>
            <hr>
            <p>Subtotale: ${Utilita.formattaPrezzo(subtotale)}</p>
            <p>IVA (22%): ${Utilita.formattaPrezzo(iva)}</p>
            <p><strong>Totale: ${Utilita.formattaPrezzo(totale)}</strong></p>`;

        return htmlRiepilogo;
    }

    mostraCarrelloVuoto() {
        this.listaCarrello.innerHTML = `
            <li class="list-group-item text-center py-4">
                <p class="mb-0">Il carrello è vuoto</p>
            </li>`;
        this.aggiornaTotale(0);
    }

    mostraErroreCarrello() {
        this.listaCarrello.innerHTML = `
            <li class="list-group-item text-center py-4">
                <p class="mb-0 text-danger">Si è verificato un errore nel caricamento del carrello</p>
            </li>`;
        this.aggiornaTotale(0);
    }

    aggiornaTotale(subtotale) {
        const totaleElement = this.totaleCarrello;
        if (totaleElement) {
            const iva = subtotale * 0.22;
            const totale = subtotale + iva;

            const subtotaleEl = totaleElement.querySelector('.subtotale');
            const ivaEl = totaleElement.querySelector('.iva');
            const totaleEl = totaleElement.querySelector('.totale');

            if (subtotaleEl) subtotaleEl.textContent = Utilita.formattaPrezzo(subtotale);
            if (ivaEl) ivaEl.textContent = Utilita.formattaPrezzo(iva);
            if (totaleEl) totaleEl.textContent = Utilita.formattaPrezzo(totale);
        }
    }

    getTotale() {
        const subtotaleEl = this.totaleCarrello.querySelector('.subtotale');
        const subtotaleText = subtotaleEl.textContent.replace('€', '').trim();
        const subtotale = parseFloat(subtotaleText) || 0;
        const iva = subtotale * 0.22;
        return Number((subtotale + iva).toFixed(2));
    }

    async svuotaCarrello() {
        const prodotti = await this.recuperaCarrello();
        await Promise.all(
            prodotti.map(prodotto =>
                Utilita.chiamaAPI(`${CONFIG_API.URL_BASE}${CONFIG_API.ENDPOINTS.CARRELLO}/${prodotto.id}`, {
                    method: 'DELETE'
                })
            )
        );
    }
}

class GestoreForm {
    constructor(form) {
        this.form = form;
        this.configuraValidazione();
    }

    configuraValidazione() {
        this.form.querySelectorAll('input, select').forEach(campo => {
            campo.addEventListener('blur', () => this.validaCampo(campo));
            campo.addEventListener('input', () => {
                if (campo.classList.contains('is-invalid')) {
                    this.validaCampo(campo);
                }
            });
        });
    }

    validaCampo(campo) {
        const isValido = campo.checkValidity();
        campo.classList.toggle('is-invalid', !isValido);
        campo.classList.toggle('is-valid', isValido);
        return isValido;
    }

    validaForm() {
        let isValido = true;
        this.form.querySelectorAll('input:required, select:required').forEach(campo => {
            if (!this.validaCampo(campo)) {
                isValido = false;
            }
        });
        return isValido;
    }

    getDatiForm() {
        const formData = new FormData(this.form);
        return Object.fromEntries(formData.entries());
    }
}

class GestoreCheckout {
    constructor(gestoreCarrello) {
        this.gestoreCarrello = gestoreCarrello;
        this.configuraModaleCheckout();
        this.configuraEventi();
    }

    configuraModaleCheckout() {
        this.modaleCheckout = new bootstrap.Modal(document.getElementById('modalCheckout'));
        this.form = document.getElementById('formCheckout');
        if (this.form) {
            this.gestoreForm = new GestoreForm(this.form);
        }
    }

    configuraEventi() {
        const btnProcedi = document.querySelector('#btnProcediCheckout');
        if (btnProcedi) {
            btnProcedi.addEventListener('click', () => this.modaleCheckout.show());
        }

        const selectConsegna = document.getElementById('selectConsegna');
        if (selectConsegna) {
            selectConsegna.addEventListener('change', (e) => this.gestisciCambioConsegna(e));
        }

        const selectPagamento = document.getElementById('selectPagamento');
        if (selectPagamento) {
            selectPagamento.addEventListener('change', (e) => this.gestisciCambioPagamento(e));
        }

        const btnConferma = document.getElementById('btnConfermaAcquisto');
        if (btnConferma) {
            btnConferma.addEventListener('click', () => this.gestisciCheckout());
        }

        this.configuraCampiSpeciali();
    }

    gestisciCambioConsegna(e) {
        const isSpedizione = e.target.value === 'spedizione';
        const datiSpedizione = document.getElementById('datiSpedizione');
        datiSpedizione.classList.toggle('d-none', !isSpedizione);
        
        ['inputVia', 'inputCivico', 'inputCap', 'inputCitta', 'inputProvincia'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.required = isSpedizione;
            }
        });
    }

    gestisciCambioPagamento(e) {
        const isCartaCredito = e.target.value === 'CC';
        const datiCartaCredito = document.getElementById('datiCartaCredito');
        datiCartaCredito.classList.toggle('d-none', !isCartaCredito);
        
        ['inputNumeroCarta', 'inputScadenza', 'inputCvv'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.required = isCartaCredito;
            }
        });
    }

    configuraCampiSpeciali() {
        const inputNumeroCarta = document.getElementById('inputNumeroCarta');
        if (inputNumeroCarta) {
            inputNumeroCarta.addEventListener('blur', () => {
                if (inputNumeroCarta.value && !Utilita.verificaLuhn(inputNumeroCarta.value)) {
                    inputNumeroCarta.setCustomValidity('Numero carta non valido');
                } else {
                    inputNumeroCarta.setCustomValidity('');
                }
            });
        }

        const inputScadenza = document.getElementById('inputScadenza');
        if (inputScadenza) {
            inputScadenza.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                }
                e.target.value = value;
            });
        }
    }

    async gestisciCheckout() {
        if (!this.gestoreForm.validaForm()) return;

        try {
            const carrello = await this.gestoreCarrello.recuperaCarrello();
            if (!carrello || carrello.length === 0) {
                alert('Il carrello è vuoto');
                return;
            }

            const datiForm = this.gestoreForm.getDatiForm();
            const ordine = await this.processaOrdine(datiForm, carrello);
            
            if (ordine) {
                this.salvaDatiOrdine(ordine, datiForm);
                await this.gestoreCarrello.svuotaCarrello();
                this.modaleCheckout.hide();
                window.location.href = './conferma-ordine.html';
            }
        } catch (errore) {
            this.gestisciErrore(errore);
        }
    }

    async processaOrdine(datiForm, carrello) {
        try {
            const prodotti = await fetch(`${CONFIG_API.URL_BASE}/plants`).then(res => res.json());
            
            let datiOrdine = {
                id: Date.now().toString(),
                nome: datiForm.nome,
                cognome: datiForm.cognome,
                email: datiForm.email,
                telefono: datiForm.telefono,
                modalitaConsegna: datiForm.modalitaConsegna,
                stato: 'pending' 
            };

            // Aggiungiamo i campi di spedizione solo se necessario
            if (datiForm.modalitaConsegna === 'spedizione') {
                datiOrdine.via = datiForm.via;
                datiOrdine.civico = datiForm.civico;
                datiOrdine.cap = datiForm.cap;
                datiOrdine.citta = datiForm.citta;
                datiOrdine.provincia = datiForm.provincia;
            }

            datiOrdine.metodoPagamento = datiForm.metodoPagamento;

            // Aggiungiamo il numero della carta solo se il metodo è CC
            if (datiForm.metodoPagamento === 'CC' && datiForm.numeroCarta) {
                datiOrdine.numeroCarta = '****-****-****-' + datiForm.numeroCarta.slice(-4);
            }

            datiOrdine.stato = 'confermato';

            // Creazione array prodotti senza duplicazioni
            const prodottiCompleti = carrello.map(prodCarrello => {
                const prodottoCompleto = prodotti.find(p => p.id === prodCarrello.prodottoId);
                return {
                    id: prodCarrello.id,
                    prodottoId: prodCarrello.prodottoId,
                    nome: prodottoCompleto ? prodottoCompleto.name : '',
                    image: prodottoCompleto ? prodottoCompleto.image : '',
                    prezzo: prodottoCompleto ? Number(Number(prodottoCompleto.price).toFixed(2)) : 0,
                    quantita: prodCarrello.quantita
                };
            });

            datiOrdine.prodotti = prodottiCompleti;

            const ordine = await Utilita.chiamaAPI(`${CONFIG_API.URL_BASE}${CONFIG_API.ENDPOINTS.ORDINI}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datiOrdine)
            });
    
            // Simula processo di pagamento
            if (datiForm.metodoPagamento === 'CC') {
                window.location.href = './processPayment.html?orderId=' + ordine.id;
                return null; // Il reindirizzamento verrà gestito dalla pagina di processing
            }
    
            // Per altri metodi di pagamento, procedi normalmente
            return ordine;
        } catch (errore) {
            console.error('Errore durante il processamento dell\'ordine:', errore);
            throw errore;
        }
    }

    salvaDatiOrdine(ordine, datiForm) {
        let datiCliente = {
            nome: datiForm.nome,
            cognome: datiForm.cognome,
            email: datiForm.email,
            telefono: datiForm.telefono,
            metodoPagamento: datiForm.metodoPagamento,
            modalitaConsegna: datiForm.modalitaConsegna
        };

        if (datiForm.modalitaConsegna === 'spedizione') {
            datiCliente.via = datiForm.via;
            datiCliente.civico = datiForm.civico;
            datiCliente.cap = datiForm.cap;
            datiCliente.citta = datiForm.citta;
            datiCliente.provincia = datiForm.provincia;
        }

        if (datiForm.metodoPagamento === 'CC' && datiForm.numeroCarta) {
            datiCliente.numeroCarta = '****-****-****-' + datiForm.numeroCarta.slice(-4);
        }

        localStorage.setItem('datiCliente', JSON.stringify(datiCliente));
        localStorage.setItem('ultimoOrdine', JSON.stringify({
            numeroOrdine: ordine.id,
            dataOrdine: new Date().toISOString(),
            prodotti: ordine.prodotti,
            subtotale: ordine.subtotale,
            iva: ordine.iva,
            totale: ordine.totale
        }));
    }

    gestisciErrore(errore) {
        console.error('Errore durante il checkout:', errore);
        
        const alertElement = document.createElement('div');
        alertElement.className = 'alert alert-danger alert-dismissible fade show';
        alertElement.role = 'alert';
        alertElement.innerHTML = `
            <strong>Errore!</strong> Si è verificato un problema durante il checkout.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const modalBody = document.querySelector('.modal-body');
        modalBody.insertAdjacentElement('afterbegin', alertElement);
    }
}

// Inizializzazione dell'applicazione
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente caricato');
    try {
        console.log('Inizializzazione gestori...');
        const gestoreCarrello = new GestoreCarrello();
        const gestoreCheckout = new GestoreCheckout(gestoreCarrello);
        
        const btnProcediCheckout = document.querySelector('#btnProcediCheckout');
        if (btnProcediCheckout) {
            gestoreCarrello.recuperaCarrello().then(carrello => {
                btnProcediCheckout.disabled = !carrello || carrello.length === 0;
            });
        }
    } catch (errore) {
        console.error('Errore durante l\'inizializzazione:', errore);
        console.error('Stack trace completo:', errore.stack);
        alert('Si è verificato un errore durante il caricamento della pagina');
    }
});

// Esportazione delle classi per uso modulare
export {
    GestoreCarrello,
    GestoreCheckout,
    GestoreForm,
    Utilita,
    ElementoCarrelloUI,
    CONFIG_API
};