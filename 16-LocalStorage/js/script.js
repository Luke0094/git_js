class persona{
    constructor(nome, cognome){
        this.nome = nome;
        this.cognome= cognome
    }
}

let pers = new persona("Paolo", "Bianchi");

function salvaInLS(){
    let persJSON = JSON.stringify(pers);
    localStorage.setItem("persona", persJSON);
}

let btn = document.getElementById("btn");
btn.addEventListener("click", salvaInLS);

function recuperaDaLS(){
    let informazione = localStorage.getItem("persona");
    console.log(informazione);
    let infoOBJ = JSON.parse(informazione);
    console.log(infoOBJ);
    
}


let btnR = document.getElementById("btnR");
btnR.addEventListener("click", recuperaDaLS);

function pulisciLC(){
    localStorage.clear();
}

pulisciLS();


function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    }   else {
        console.log("Geolocation is nor supported by this browser.");
    }
}

function showPosition(position) {
    console.log("Latidute: " + position.coords.latitude +
    "Longitude: " + position.coords.longitude)
}

getLocation()
