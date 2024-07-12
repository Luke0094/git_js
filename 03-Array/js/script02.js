//Leggere su Array
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

console.log(elencoStudenti);
//no!
// console.log(elencoStudenti[0]);

for (let i = 0; i < elencoStudenti.length; i++) {
    console.log("Ciao " + elencoStudenti[i]);
}

for (let i = 0; i < 5; i++) {
    console.log("l'indice vale: " + i);
    console.log("Sei al giro numero " + (i + 1));
}

for (let i = 1; i <= 5; i++) {
    console.log("l'indice vale: " + (i));
}

//Stampo il mio elenco studenti al contrario senza l'utilizzo del metodo reverse

for (let i = elencoStudenti.length -1; i >= 0; i--) {
    console.log("Nome: " + elencoStudenti[i]);
}

for (let i = 0 ; i < elencoStudenti.length; i++) {
let elencoStudentiArr = elencoStudenti[i].split(" ");
console.log("Nome: " + elencoStudentiArr[1] + " Cognome: " + elencoStudentiArr[0]);
}

console.log("/////FOREACH////////");
//il foreach è un costrutto tipico e utilizzato solo sugli array
elencoStudenti.forEach(studente => {
    console.log(studente);
})
i = 0;
elencoStudenti.forEach(studente => {
    console.log(studente + "indice " + i++);

})

console.log("Stampo nome e cognome");
elencoStudenti.forEach(studente =>{
    const [nome, cognome] = studente.split(" ");
    console.log(`nome: ${nome} Cognome: ${cognome}`);
})
