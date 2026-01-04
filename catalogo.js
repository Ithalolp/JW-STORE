/* --- MÓDULO DE DADOS DOS PRODUTOS --- */
const ProductService = {
  data: [
    {
      id: 1,
      name: "Imagem Camiseta",
      price: 129.9,
      category: "tshirts",
      image: "src/imagem-insta.png",
    },
    {
      id: 2,
      name: "Imagem Camiseta 2",
      price: 289.9,
      category: "hoodies",
      image: "",
    },
    {
      id: 3,
      name: "Imagem shorts",
      price: 199.9,
      category: "bottoms",
      image: "",
    },
    {
      id: 4,
      name: "Imagem Acessório",
      price: 89.9,
      category: "accessories",
      image: "",
    },
    {
      id: 5,
      name: "Imagem Camiseta 3",
      price: 119.9,
      category: "tshirts",
      image: "",
    },
    {
      id: 6,
      name: "Imagem Acessório 2",
      price: 159.9,
      category: "accessories",
      image: "",
    },
  ],

  // Simula uma chamada assíncrona de API
  getAll: function () {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.data), 800);
    });
  },
};
