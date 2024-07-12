//Dichiaro delle variabili

//TIPO STRING, utilizzo le ""
let mioNome = "Luca";
let mioCognome = "Luca";

//Vado a concatenare le due stringhe
let saluto = "Ciao " + mioNome + " " + mioCognome;

//per il backtick ALT+96
let saluto2 = `Ciao ${mioNome} ${mioCognome}`;


console.log(saluto);
console.log(saluto2);

//Istanzio una variabile numerica
let miaEta = 30;

let saluto3 = "Ciao " + mioNome + " " + mioCognome + ", hai " + miaEta + " anni";

console.log(saluto3);

// + OPERATORE somma/concatenazione 

let num1 = 5; //number;
let num2 = "3"; //string;
let somma = num1 + num2;
console.log(somma); //53;

//prova 2
let num3 = "6";
let num4 = "4";
let somma2 = num3 + num4;
let prod2 = num3 / num4;
console.log(somma2);

//CAST del dato: forzare una variabile in un determinato tipo
let somma2B = Number(num3) + Number(num4);
console.log(somma2B); //10)

console.log(prod2)

let div2 = num3 / num4;
console.log(div2)

let mioNumero = 68;
let tuoNumero = 72;
console.log( mioNumerp + tuoNumero + " La somma vale ");

let sommaMioETuo = mioNumero + tuoNumero;
console.log(sommaMioETuo)
console.log("La somma vale " + (mioNumero + tuoNumero));


//TIPO BOOLEAN
let vero = true;
let falso = false;

let acceso = false;

let presenzaLuca = Luca;


//ESEMPIO DI VARIABILE CON VLORE CHE CAMBIA

let oraAttuale = 15;
console.log("Sono le ore: " +oraAttuale);

//passa un po' di tempo e RIASSEGNO LA MIA VARIABILE SENZA USARE LET
oraAttuale = 16;
console.log("Sono le ore " + oraAttuale);

oraAttuale = 17;
console.log("Sono le ore:" + oraAttuale);

oraAttuale = "diciotto";
console.log("Sono le ore " + oraAttuale);
console.log(typeof oraAttuale);