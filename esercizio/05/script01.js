const productGrid = document.querySelector("#product-grid");

const API_URL = "https://dummyjson.com/products"; 

fetch(API_URL)
    .then(response => response.json())
    .then(data => {
        data.products.forEach(product => {
            productGrid.innerHTML += createProductCard(
                product.id,
                product.title,
                product.price,
                product.description,
                product.thumbnail
            );
        });
    })
    .catch(error => {
        console.error("Errore nel recupero dei prodotti:", error);
    })
    .finally(() => {
        console.log("Chiamata API completata.");
    });

function createProductCard(id, title, price, description, thumbnail) {
    return `
        <div>
            <p class="product-id">ID: ${id}</p>
            <img src="${thumbnail}" alt="${title}">
            <h3>${title}</h3>
            <p>${description}</p>
            <p class="price">$${price}</p>
        </div>
    `;
}