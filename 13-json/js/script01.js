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
let studenteJSON = '("nome": "pippo", "cognome": "rossi", "matricola": 1, "email": "pippo@rossi.it", "corsi": ["HTML", "js", "py"]}';

console.log(studenteJSON.nome);
console.log(typeof studenteJSON);
console.log(studenteJSON);

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

let docente1 = new Docente("Dario", "Manillo", "JS");
console.log("Questo docente: ", docente1, "è di tipo " + typeof docente1);

//trasformo questo oggetti in json
let docente = '{"nome": Dario", "cognome": "Manillo", "corsi": ["JS"] }';

let docenteJSON = JSON.stringify(docente1);
console.log(docenteJSON);

//responsabile corso
let respoCorso = '{"nome": "Egle", "cognome": "Risola", "corsi": ["Python", "TSS", "Smistamento Reti"] }';

let respoCorsoJSON = JSON.parse(respoCorso);

console.log(respoCorso , "è un oggetto di tipo " + typeof respoCorso);