let demo = document.querySelector("#demo");

let utenti = [];

const URL = "https://reqres.in/api/users";  //ENDPOINT

fetch(URL).then(data =>{
        return data.json();
    }).then(Response => {

        //nella response il dato è già parserizzato nel memotodo JSON()
        console.log(Response);

        console.log(Response.data[0].first_name);
        
        utenti = Response.data;


    // for(let i = 0; i < Response.data.length; i++){
    //     demo.innerHTML += "<li> " + Response.data[i].first_name + " " + Response.data[i].last_name + "<img src='" + Response.data[i].avatar + "'></li>";
    // });

    Response.data.forEach(user =>{
        demo.innerHTML += createRigaUser(user.first_name, user.last_name, user.avatar);
    });
    
    }).catch((e) => {
        console.log(e);
    })
    .finally(() => {
        
        console.log("Finito!"); 
    });


    function createRigaUser(nome, cognome, avatar){
        let riga = `<li> ${nome}, ${cognome},<img src='${avatar}'> </li>`;
        return riga;

    };
// setTimeout(() => {
//
//     console.log(utenti);
//
// }, 5000);