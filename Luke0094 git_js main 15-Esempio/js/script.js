class Pianta{
    constructor(id, name, price, descAlt, produttore, img){
        this.id = id;
        this.name = name;
        this.price = price;
        this.descAlt = descAlt;
        this.produttore = produttore;
        this.img = img;
    }
}

class ObjPerCarrello{
    constructor(id, prezzo, nome){
        this.id = id;
        this.prezzo = prezzo;
        this.nome = nome;
    }
}


//Creo una funzione per caricare le informazioni delle piante sulla index. Le info sono contenute nel mio db.json
function caricaPiante(){

    //fetch
    const URL = "http://localhost:3000/plants";

    fetch(URL)
    .then(data =>{
        return data.json();
    }).then(response =>{
        console.log(response);
        response.forEach(pianta => {
            let miaPianta = new Pianta(pianta.id, pianta.name, pianta.price, pianta.descAlt, pianta.produttore, pianta.image)
            rigaProd.appendChild(creaCard(miaPianta));
        });
    })

}

document.addEventListener("DOMContentLoaded", caricaPiante);

let rigaProd = document.querySelector("#rigaProd");


/**
 * 
 * @param {Pianta} pianta 
 * @returns object
 */
function creaCard(pianta){
    // let card = `<div class="col-md-4 mb-3">
    //                 <div class="card">
    //                     <img class="card-img-top" src=${pianta.image} alt='${pianta.descAlt}' />
    //                     <div class="card-body">
    //                         <h3 class="card-title">${pianta.name}</h3>
    //                         <p class="card-text">Id: ${pianta.id}</p>
    //                     </div>
    //                     <button id='mioBtn${pianta.id}' class="btn btn-primary">Compra a ${pianta.price} €</button>
    //                 </div>
    //             </div>`;

    let cardCol = document.createElement("div");
    cardCol.setAttribute("class", "col-md-4 mb-3");

    let card = document.createElement("div");
    card.setAttribute("class", "card");

    card.innerHTML = `<img class="card-img-top" src=${pianta.img} alt='${pianta.descAlt}' />
                       <div class="card-body">
                             <h3 class="card-title">${pianta.name}</h3>
                             <p class="card-text">Id: ${pianta.id}</p>
                     </div>`;

    let buttonCompra = document.createElement("button");
    buttonCompra.setAttribute("class", "btn btn-primary");
    buttonCompra.textContent = `Compra ${pianta.price} €`;

    buttonCompra.addEventListener("click", function(){
        addACarrello(pianta.id, pianta.price, pianta.name);
    });

    card.appendChild(buttonCompra);
    cardCol.appendChild(card);

    return cardCol;
}



function addACarrello(id, prezzo, nome) {
    const URLCarrello = "http://localhost:3000/carrello";

    fetch(URLCarrello)
        .then(response => response.json())
        .then(carrello => {
            const esistente = carrello.find(item => item.prodottoId === id);
            if (esistente) {
                return fetch(`${URLCarrello}/${esistente.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ quantita: esistente.quantita + 1 })
                });
            } else {
                return fetch(URLCarrello, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ prodottoId: id, nome, prezzo, quantita: 1 })
                });
            }
        })
        .then(response => response.json())
        .then(() => {
            console.log("Prodotto aggiunto o aggiornato nel carrello");
        })
        .catch(error => console.error('Errore:', error));
    }