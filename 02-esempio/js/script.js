//Chiedo all'utente dei numeri da sommare tramite prompt
let primoNum = prompt("Inserisci il primo numero");
let secondoNum = prompt("inserisci un altro numero");

console.log(primoNum);
console.log(secondoNum);

//ATT: quello che acquisisco attraverso un prompt è una STRING (usa number prima se numerazione)
let somma = Number(primoNum) + Number(secondoNum);
console.log("la somma vale " + somma);

//Acquisisco il div id="elRisultato" per scirvere dentro il risulato della somma

let elRisultato= document.getElementById("elRisultato");
//Scrivo nel div  appena recuperato
elRisultato.innerHTML = "La somma vale " + somma;


////////////////////////////////
let elBenvuto = document.getElementById("elBenvenuto");
let nomeCognome = prompt("inserisci il tuo nome e cognome");
let annoNascita = prompt ("inserisci il tuo anno di nasciata");

let eta = 2024 - Number(annoNascita);

elBenvuto.innerHTML = "Ciao " nomeCognome + ", hai " + eta + "anni"