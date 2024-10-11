let demo = document.querySelector("#demo");

let products = [];

const URL = "https://dummyjson.com/products"; 

fetch(URL).then(products =>{
    return products.json();
    }).then(Response => {

        console.log(Response);

        console.log(Response.products[0].title);
    
        products = Response.products;

    Response.products.forEach(products =>{
        demo.innerHTML += createRigaProducts(products.id, products.title, products.price, products.description, products.thumbnail);
    });

    }).catch((e) => {
        console.log(e);
    })
    .finally(() => {
    
    console.log("END!"); 
    });

function createRigaProducts(id, title, price, description, thumbnail){
    let riga = `<div> ${id}, ${title}, ${price}, ${description},<img src='${thumbnail}'> </div>`;
    return riga;
};