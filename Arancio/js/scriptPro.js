class Corsi{
    constructor(name, description, duration, price, id, shortDescription, img){
        
        this.name = name;
        this.description = description;
        this.duration = duration;
        this.price = price;
        this.id = id;
        this.shortDescription = shortDescription;
        this.img = img;
    }
  }
  
  function caricaCorsi(){
    // fetch
    const URL = "http://localhost:3000/corsi";
  
    fetch(URL)
    .then(data =>{
        return data.json();
  
    }).then(response =>{
        console.log(response);
        response.forEach(corso => {
            let mioCorso = new Corsi(corso.name, corso.description, corso.duration, corso.price, corso.id, corso.shortDescription, corso.img)
            rigaCorsi.appendChild(creaCard(mioCorso));
        });
    })
  }
  
  
  document.addEventListener("DOMContentLoaded", caricaCorsi);
  
  let rigaCorsi = document.querySelector("#rigaCorsi");
  
  
  /**
   * 
   * @param {Corsi} corso
   * @returns object
   */
  
  function creaCard(corso){
  
    let cardCol = document.createElement("div");
      cardCol.setAttribute("class", "col-md-4 mb-3");
  
      let card = document.createElement("div");
      card.setAttribute("class", "card");
  
      card.innerHTML = `<img class="card-img-top" src=${corso.img} alt="" />
                           <div class="card-body">
                               <h3 class="card-title">${corso.name}</h3>
                               <p class="card-text">Id: ${corso.id}</p>
                               <p class="card-text">Description: ${corso.description}</p>
                           </div>`;
  
    cardCol.appendChild(card);
  
    return cardCol;
  }