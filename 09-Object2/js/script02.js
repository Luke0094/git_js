class Studente{
    constructor(nome, cognome, matricola){
        this.nome = nome;
        this.cognome = cognome;
        this.matricola = matricola;

        this.info = function(){
            rturn `Ciao, mi chiamo ${this.nome} ${this.cognome}, matri: ${this.matricola}`;
        }

        this.studia = function(materia){
            return this.info() + " sto studiando " + materia;
        }
    }
    //i metodi static appartengono solo alla classe
    static miometodo = function(){
        return"Ciao dal metodo static"
    }
}

//Nel momento in cui utilizzo la parola chiave NEW viene creata una nuova istanta della classe Studente, Viene creato un nuovo oggetto di TIPO studente

let studente1 = new Studente("Dario", "Menillo", 1);
console.log(studente1.info)
console.log(studente1.studia("informatica"));
console.log(Studente.miometodo());
