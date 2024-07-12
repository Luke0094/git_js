//Recupero l'elemento nel quale stamperò la lista
let elElencoStudenti = document.getElementById("elElencoStudenti");
let ElnumStudenti = document.getElementById("elNumStudenti")

let elencoStudenti = [
    "Avagliano Simone",
    "Currà Domenico",
    "Espinosa Jesse",
    "Monello Luca",
    "Palazzo Mattia",
    "Pia Martina",
    "Pistone Daniele",
    "Puorpuou Lorenzo",
    "Sette Francesca",
    "Tripodi Lorenzo",
    "Adrianò Roberto",
    "Gilardi Francesco",
    "Khallaf Hanza"
];

//elElencoStudenti.innerHTML = "<li>" + elencoStudenti[0] + "</li>";
//elElencoStudenti.innerHTML = "<li>" + elencoStudenti[1] + "</li>";

elencoStudenti.push("Pierluigi Pierantola");

elencoStudenti.sort()

for(let i = 0; i < elencoStudenti.length; i++){
    elElencoStudenti.innerHTML += "<li>" + elencoStudenti[i] + "</li>";
}

ElNumStudenti.innerHTML = "Studenti Iscritti " + elencoStudenti.length

//giochino delle ore
//ottenere il risultato della somma di tutte le ore presenti presenti in un giorno
let sommaOre = 0;

for (let i = 0; i <= 24; i++){
    sommaOre += i;
}
console.log(sommaOre);

//con foreah
let oreDelGiorno = [];

for (let i = 0; i <= 24; i++){
    oreDelGiorno.push(i);
}
console.log(oreDelGiorno);

let totaleOre = 0;

oreDelGiorno.forEach(ora => {
    totaleOre += ora;
})
console.log(totaleOre)