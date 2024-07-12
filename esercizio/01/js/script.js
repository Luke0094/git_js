let nome = prompt("Inserisci il tuo Nome");
let cognome = prompt("inserisci il tuo Cognome");
let anno = prompt("Qual'e il tuo anno di nascita?");
console.log(nome);
console.log(cognome);
console.log(anno);



let annonascita = document.getElementById("annonascita");
annonascita.innerHTML = "Ciao " nome + cognome + "il tuo anno di nascita e: " + anno;


