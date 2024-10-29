const CONFIG_API = {
    URL_BASE: 'http://localhost:3000',
    ENDPOINTS: {
        ORDERS: '/ordini',
        CARRELLO: '/carrello'
    }
};

async function svuotaCarrello() {
    try {
        const carrelloResponse = await fetch(`${CONFIG_API.URL_BASE}/carrello`);
        const prodotti = await carrelloResponse.json();
        
        await Promise.all(
            prodotti.map(prodotto =>
                fetch(`${CONFIG_API.URL_BASE}/carrello/${prodotto.id}`, {
                    method: 'DELETE'
                })
            )
        );
    } catch (error) {
        console.error('Errore nello svuotamento del carrello:', error);
        throw error;
    }
}

async function processPayment() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId');
        
        if (!orderId) {
            window.location.href = './carrello.html';
            return;
        }

        // Recupera i dati dell'ordine
        const orderResponse = await fetch(`${CONFIG_API.URL_BASE}/ordini/${orderId}`);
        const orderData = await orderResponse.json();

        // Aggiorna lo stato dell'ordine
        const updateResponse = await fetch(`${CONFIG_API.URL_BASE}/ordini/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato: 'confermato' })
        });

        const updatedOrder = await updateResponse.json();

        // Svuota il carrello
        await svuotaCarrello();

        // Salva i dati necessari nel localStorage
        localStorage.setItem('ultimoOrdine', JSON.stringify({
            numeroOrdine: updatedOrder.id,
            dataOrdine: new Date().toISOString(),
            prodotti: updatedOrder.prodotti,
            subtotale: updatedOrder.subtotale,
            iva: updatedOrder.iva,
            totale: updatedOrder.totale
        }));

        // Assicurati che i datiCliente siano già presenti
        const datiCliente = localStorage.getItem('datiCliente');
        if (!datiCliente) {
            localStorage.setItem('datiCliente', JSON.stringify({
                nome: updatedOrder.nome,
                cognome: updatedOrder.cognome,
                email: updatedOrder.email,
                telefono: updatedOrder.telefono,
                metodoPagamento: updatedOrder.metodoPagamento,
                modalitaConsegna: updatedOrder.modalitaConsegna,
                numeroCarta: orderData.numeroCarta,
                ...(updatedOrder.modalitaConsegna === 'spedizione' && {
                    via: updatedOrder.via,
                    civico: updatedOrder.civico,
                    cap: updatedOrder.cap,
                    citta: updatedOrder.citta,
                    provincia: updatedOrder.provincia
                })
            }));
        }

        // Reindirizza alla pagina di conferma
        window.location.href = './conferma-ordine.html';
    } catch (error) {
        console.error('Errore durante l\'elaborazione:', error);
        alert('Si è verificato un errore durante l\'elaborazione del pagamento');
        window.location.href = './carrello.html';
    }
}

// Avvia il processo dopo un breve ritardo
setTimeout(processPayment, 3000);