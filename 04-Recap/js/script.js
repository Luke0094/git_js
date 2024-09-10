// voglio creare una lista di tecnologe da stampare all'interno della pagina

let Tecnologie = ["Html", "JS", "Angular", "React", "CSS"];

//recupero, attraverso il suo id, l'elemento html nel quale stamperò questo array
//getElementByid() --> metodo
let elTecnologie = document.getElementById("listaTecnologie");
//let elTecnologie = document.querySelector("#listaTecnologie")

//innerHTML --> proprietà
elTecnologie = Tecnologie;

for(Let i = 0; i < Tecnologie.length; i++){
    elTecnologie.innerHTML += "<li>" + Tecnologie[i] + "</li>"
}

let avatarImg = document.getElementById("avatarImg");
avatarImg.src = "../images/avatar2.png";