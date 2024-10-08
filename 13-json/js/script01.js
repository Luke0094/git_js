//notazione letterale
let studente = {
    nome: "Pippp",
    cognome: "rossi",
    matricola: 1,
    email: "pippo@rossi.it",
    presenza: true,
    corsi: ["HTML & CSS", "JavaScript", "Python"]
}

console.log(studente.nome);
console.log(typeof studente);

//scrivo lo studente in formato json (praticamente una stringa)
let studentejson = '("nome":"pippo", "cognome":"rossi", "matricola":1, "email":"pippo@rossi.it", "matricola": 1, "corsi":["HTML", "js", "py"]}';

console.log(studentejson.nome);
console.log(typeof studentejson);
console.log(studentejson);

//docente
class Docente {
    constructor(nome, cognome, materia) {
        this.nome = nome;
        this.cognome = cognome;
        this.materia = materia;
    }

    insegna(){
        return "insegno sul corso di " + this.materia;
    }
}

let docente = new Docente("Dario", "Manillo", "JS");
console.log("Questo docente: ", docente1, "è di tipo " + typeof docente1);

//trasformo questo oggetti in json

let docentejson = JSON.stringify(docente);
console.log(docentejson);

//respo corso
let respoCorso = '{"nome": "Egle", "cognome": "Risola", "corsi": ["Python", "TSS", "Smistamento Reti"] }';

let respocorsojson = JSON.parse(respoCorso);

console.log(respoCorsojson);