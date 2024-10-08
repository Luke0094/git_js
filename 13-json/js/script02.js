//Questi dati copiati sono solo un esempio. Non verranno mai copiati all'interno degli script ma, per farne uso, chiameremo direttamente la risorsa prestabilita.
let datiJSON = '{"page":1,"per_page":6,"total":12,"total_pages":2,"data":[{"id":1,"email":"george.bluth@reqres.in","first_name":"George","last_name":"Bluth","avatar":"https://reqres.in/img/faces/1-image.jpg"},{"id":2,"email":"janet.weaver@reqres.in","first_name":"Janet","last_name":"Weaver","avatar":"https://reqres.in/img/faces/2-image.jpg"},{"id":3,"email":"emma.wong@reqres.in","first_name":"Emma","last_name":"Wong","avatar":"https://reqres.in/img/faces/3-image.jpg"},{"id":4,"email":"eve.holt@reqres.in","first_name":"Eve","last_name":"Holt","avatar":"https://reqres.in/img/faces/4-image.jpg"},{"id":5,"email":"charles.morris@reqres.in","first_name":"Charles","last_name":"Morris","avatar":"https://reqres.in/img/faces/5-image.jpg"},{"id":6,"email":"tracey.ramos@reqres.in","first_name":"Tracey","last_name":"Ramos","avatar":"https://reqres.in/img/faces/6-image.jpg"}],"support":{"url":"https://reqres.in/#support-heading","text":"To keep ReqRes free, contributions towards server costs are appreciated!"}}';

let dati = JSON.parse(datiJSON);
console.log("numero di utenti: ", dati.total);
console.log(dati);

console.log(dati.data[0].first_name, dati.data[0].last_name);
console.log(dati.data[1].first_name, dati.data[1].last_name);
console.log(dati.data[2].first_name, dati.data[2].last_name);
console.log(dati.data[3].first_name, dati.data[3].last_name);

//faccio un ciclo for su dati.data

for(let i = 0; i < dati.data.length; i++){
    //demo.innerhtml += "<li>" + dati.data[i].first_name + " " + dati.data[i].last_name + "</li>";
    demo.innerHTML += `<li>  ${dati.data[i].first_name}, ${dati.data[i].last_name},<img src='${dati.data[i].avatar}'> </li>`;
}