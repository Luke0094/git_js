//utilizzo una fuzione costruttore per poter creare il mio oggetto
function User(username, email, password){
    //creo delle proprietà alle uali associo il valore del parametro
    this.nomeInCodice = username
    this.postaElettronica = email
    this.codiceSegreto = password
    this.messaggio = this.messaggio;

    this.info = function(){
        return 'Ciao, io sono $(this.username) - $(this.email) $(this.messaggio)'
    }
}
//Queste sono istanze
let user1 = new User("Maria", "maria@maria.com", "sdfgfdgcs");
let user2 = new User("Pippo", "pippo@pippo.com", "sddsfgsdv");
let user3 = new User("Pippo", "pippo@pippo.com", "sddsfgsdv");

console.log(user1.username);
console.log(user1.email);
console.log(user1.info());
console.log(user2.info());
console.log(user3.info());

let utentiRegistrati = [
    user1,
    user2,
    user3,
    new User("Marco", "marco@bianchi.it", "0sgfdfgdff"),
    new User("geff", "geff@bbiiaa.it", "0fghdfvfd"),
]

//stampo rescondi di tutti i miei utenti
console.log("RESOCONTO");

utentiRegistrati.foreach(utente =>{
    console.log(utente.info());
})

let btnInvia = document.getElementById("btnInvia");
let btnStampa = document.getElementById("btnStampa");
let btndemo = document.getElementById("demo");

function registraUtente(){
let usurnname = document.getElementById("username").value;
let email = document.getElementById("email").value;
let password = document.getElementById("password").value;
let messaggio = document.getElementById("messaggio").value;


let user = new User(username, email, password, messaggio);

utentiRegistrati.push(user);

document.getElementById("mioForm").reset();
}
