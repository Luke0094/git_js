//Gli array sono dei contenitori di elementi simili tra loro. Gliaaray hanno proprietà e metodi per poter lavorare con questi elementi.
//Gli array sono 0-based
//          0       1       2       3 ---> INDICI

let colori = ["rosso", "giallo", "blu", "verde"];

//Richiamo, LEGGO il valore dei miei colori
console.log(colori[0]); //rosso

let primoColore = colori[0];
console.log(primoColore);

let terzoColore = colori[2];
console.log(terzoColore);

//Aggiungo un elementoùcolori.push("viola");
colori.push("viola");


let numElementi = colori.length;
console.log("il mio array è composto da: " + numElementi + " colori");

console.log(colori);

let coloreInverso = colori.reverse();
console.log(coloreInverso);

//rimuovo l'ultimo elementi di coloriInverso
coloreInverso.pop();
console.log(coloreInverso);

let coloreInesistente = colori[10];
console.log(coloreInesistente);

//Per quanto sia possibile creare u array MISTO, non lo fate
let persona = ["Dario", "Mennillo", 35, true];
console.log(persona);

let numeri = [4,60,12,74,5]

let elencoStudenti = [
    "Mario Rossi",
    "Pippo Versi",
    "Laura Bianchi",
    "Anna Gialli",
    "Maria Neri"
];
//Voglio conoscere l'ultimo valore dell'elenco
console.log(elencoStudenti.sort());
console.log(elencoStudenti[elencoStudenti.length - 1]);

//Unire due array
let frutta = ["pesche", "anguria", "ciliegie", "nespole"];
let verdura = ["instalata", "zucchina", "melanzana", "peperone", "valeriana"];
let fruttaeverdura = frutta.concat(verdura);
console.log(fruttaeverdura);

let fruttaeverdura2 = [...frutta, ...verdura];
console.log(fruttaeverdura2);
fruttaeverdura2.forEach(elemento => {
    console.log(elemento);
})

//Unisco gli elementi di un array

let nomeArr = ["D", "A", "R", "I", "O"];
let nome = nomeArr.join("");
console.log(nome);

let cognome = "Mennillo";
//voglio trasformare una stringa in array
let cognomeArr = cognome.split("");
console.log(cognomeArr)

//Scrivi il tuo nome in una stringa, ottieni il nome al contrario
let mioNome = "Luca";
console.log(mioNome.split(""));

let mioNomeInv = mioNome.split("").reverse().join("").toLocaleUpperCase()  ;
console.log(mioNomeInv);
