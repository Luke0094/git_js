document.addEventListener("DOMContentLoaded", () => {
    const riepilogoAcquisto = JSON.parse(localStorage.getItem('riepilogoAcquisto'));
    
    if (riepilogoAcquisto) {
        const riepilogoDiv = document.getElementById('riepilogoAcquisto');
        let articoliHTML = '<h3>Articoli Acquistati:</h3><ul class="list-group mb-3">';
        let totale = 0;
        
        riepilogoAcquisto.articoli.forEach(articolo => {
            const subtotale = articolo.prezzo * articolo.quantita;
            totale += subtotale;
            articoliHTML += `
                <li class="list-group-item">
                    ${articolo.nome} - € ${articolo.prezzo} x ${articolo.quantita} = € ${subtotale.toFixed(2)}
                </li>`;
        });

        articoliHTML += `</ul><p><strong>Totale Complessivo: € ${totale.toFixed(2)}</strong></p>`;
        riepilogoDiv.innerHTML = `
            <p><strong>Nome:</strong> ${riepilogoAcquisto.nome}</p>
            <p><strong>Email:</strong> ${riepilogoAcquisto.email}</p>
            <p><strong>Metodo di Pagamento:</strong> ${riepilogoAcquisto.metodoPagamento}</p>
            ${articoliHTML}
        `;
    } else {
        document.getElementById('riepilogoAcquisto').innerHTML = '<p>Nessun acquisto trovato.</p>';
    }
});