/* --- MÓDULO DO CARRINHO ORIGINAL (Compatibilidade) --- */
const CartManager = {
  items: [],

  init() {
    const saved = localStorage.getItem("jw_cart");
    if (saved) this.items = JSON.parse(saved);
    this.notify();
  },

  add(product) {
    const exists = this.items.find((i) => i.id === product.id);
    if (exists) {
      exists.qty++;
    } else {
      this.items.push({ ...product, qty: 1 });
    }
    this.save();
    this.notify();
  },

  remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    this.save();
    this.notify();
  },

  updateQty(id, delta) {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) this.remove(id);
      else {
        this.save();
        this.notify();
      }
    }
  },

  save() {
    localStorage.setItem("jw_cart", JSON.stringify(this.items));
  },

  getTotal() {
    return this.items.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
  },

  getCount() {
    return this.items.reduce((acc, curr) => acc + curr.qty, 0);
  },

  // Padrão Observer simplificado para atualizar UI
  notify() {
    document.dispatchEvent(new CustomEvent("cart-updated"));
  },
};

/* --- MÓDULO DE INTERFACE DO USUÁRIO --- */
const UIManager = {
  selectors: {
    grid: document.getElementById("productsGrid"),
    filters: document.getElementById("filtersContainer"),
    cartBody: document.getElementById("cartBody"),
    cartTotal: document.getElementById("cartTotal"),
    cartCount: document.getElementById("cartCount"),
    cartCountSidebar: document.getElementById("cartCountSidebar"),
    cartOverlay: document.getElementById("cartOverlay"),
    cartSidebar: document.getElementById("cartSidebar"),
    body: document.body,
  },

  // Formata preço para o padrão brasileiro
  formatPrice(value) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  },

  // Renderiza a lista de produtos
  renderProducts(products) {
    this.selectors.grid.innerHTML = products
      .map(
        (p) => `
                <article class="product-card">
                    <div class="product-image-wrapper">
                        <img src="${p.image}" alt="${
          p.name
        }" class="product-img" loading="lazy">
                        <button class="quick-add-btn" onclick="App.addToCart(${
                          p.id
                        })" aria-label="Adicionar ao carrinho">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${p.category}</span>
                        <h3>${p.name}</h3>
                        <div class="product-price">${this.formatPrice(
                          p.price
                        )}</div>
                    </div>
                </article>
            `
      )
      .join("");
  },

  // Renderiza os filtros de categoria
  renderFilters(categories, activeCat) {
    const allBtn = `<button class="filter-btn ${
      activeCat === "all" ? "active" : ""
    }" onclick="App.filter('all')">Todos</button>`;
    const cats = categories
      .map(
        (c) => `
                <button class="filter-btn ${
                  activeCat === c ? "active" : ""
                }" onclick="App.filter('${c}')">
                    ${c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
            `
      )
      .join("");
    this.selectors.filters.innerHTML = allBtn + cats;
  },

  // Renderiza os itens do carrinho
  renderCart(items) {
    const advancedItems = AdvancedCartManager.getItems();

    if (items.length === 0) {
      this.selectors.cartBody.innerHTML = `
                  <div style="text-align:center; margin-top: 50px; opacity: 0.5;">
                      <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 20px;"></i>
                      <p>Sua sacola está vazia.</p>
                  </div>
              `;
    } else {
      this.selectors.cartBody.innerHTML = items
        .map((item, index) => {
          const advancedItem = advancedItems[index] || {};
          return `
                  <div class="cart-item">
                      <img src="${item.image}" alt="${item.name}">
                      <div class="cart-item-details">
                          <div>
                              <h4 style="font-size: 0.9rem;">${item.name}</h4>
                              ${
                                advancedItem.size
                                  ? `<span class="cart-item-size">${advancedItem.size}</span>`
                                  : ""
                              }
                              ${
                                advancedItem.delivery
                                  ? `
                              <div class="cart-item-delivery">
                                  ${
                                    advancedItem.delivery === "delivery"
                                      ? '<i class="fas fa-truck"></i> Entrega'
                                      : '<i class="fas fa-store"></i> Retirada'
                                  }
                              </div>`
                                  : ""
                              }
                              <p style="font-size: 0.8rem; color: #888;">${this.formatPrice(
                                item.price
                              )}</p>
                          </div>
                          <div class="qty-control">
                              <button onclick="App.changeQty(${
                                item.id
                              }, -1)">-</button>
                              <span style="font-size: 0.9rem;">${
                                item.qty
                              }</span>
                              <button onclick="App.changeQty(${
                                item.id
                              }, 1)">+</button>
                          </div>
                      </div>
                      <button onclick="App.removeFromCart(${
                        item.id
                      })" style="align-self: flex-start; color: #999;">
                          <i class="fas fa-trash"></i>
                      </button>
                  </div>
              `;
        })
        .join("");
    }

    // Atualiza totais e contadores
    const total = this.formatPrice(CartManager.getTotal());
    const count = CartManager.getCount();

    this.selectors.cartTotal.innerText = total;
    this.selectors.cartCount.innerText = count;
    this.selectors.cartCountSidebar.innerText = count;
  },

  // Abre/fecha o sidebar do carrinho
  toggleSidebar(isOpen) {
    if (isOpen) {
      this.selectors.body.classList.add("cart-open");
      this.selectors.body.style.overflow = "hidden";
    } else {
      this.selectors.body.classList.remove("cart-open");
      this.selectors.body.style.overflow = "";
    }
  },
};

/* --- MÓDULO PRINCIPAL DA APLICAÇÃO --- */
const App = {
  allProducts: [],
  activeCategory: "all",

  async init() {
    // Inicializa carrinho
    CartManager.init();

    // Vincula eventos do carrinho
    this.bindCartEvents();

    // Newsletter
    document
      .getElementById("newsletterForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        const input = e.target.querySelector("input");
        if (input.value.includes("@")) {
          alert(`Bem-vindo ao clube, ${input.value}!`);
          input.value = "";
        }
      });

    // Efeito de scroll no header
    window.addEventListener("scroll", () => {
      const header = document.getElementById("header");
      if (window.scrollY > 50) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    });

    // Carrega produtos
    try {
      this.allProducts = await ProductService.getAll();
      this.setupFilters();
      this.filter("all");
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      document.getElementById("productsGrid").innerHTML =
        "<p>Erro ao carregar catálogo.</p>";
    }
  },

  // Configura eventos do carrinho
  bindCartEvents() {
    document.addEventListener("cart-updated", () => {
      UIManager.renderCart(CartManager.items);
    });

    document
      .getElementById("cartBtn")
      .addEventListener("click", () => UIManager.toggleSidebar(true));
    document
      .getElementById("closeCartBtn")
      .addEventListener("click", () => UIManager.toggleSidebar(false));
    document
      .getElementById("cartOverlay")
      .addEventListener("click", () => UIManager.toggleSidebar(false));
  },

  // Configura filtros
  setupFilters() {
    const categories = [...new Set(this.allProducts.map((p) => p.category))];
    UIManager.renderFilters(categories, this.activeCategory);
  },

  // Filtra produtos por categoria
  filter(category) {
    this.activeCategory = category;
    const filtered =
      category === "all"
        ? this.allProducts
        : this.allProducts.filter((p) => p.category === category);

    UIManager.renderProducts(filtered);
    this.setupFilters(); // Re-renderiza para atualizar estado ativo
  },

  // Métodos públicos chamados via onclick
  addToCart(id) {
    const product = this.allProducts.find((p) => p.id === id);
    if (product) {
      ProductModal.open(product);
    }
  },

  removeFromCart(id) {
    CartManager.remove(id);
  },

  changeQty(id, delta) {
    CartManager.updateQty(id, delta);
  },
};

/* ==========================================================================
 * SISTEMA AVANÇADO: PERSISTÊNCIA, MODAL E CHECKOUT
 * ==========================================================================
 */

/* --- MÓDULO DE PERSISTÊNCIA DE USUÁRIO --- */
const UserStorage = {
  KEY: "jw_store_user",

  // Salva dados do usuário no localStorage
  save(data) {
    try {
      const current = this.get();
      const updated = { ...current, ...data };
      localStorage.setItem(this.KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error("Erro ao salvar dados do usuário:", e);
      return false;
    }
  },

  // Obtém dados do usuário do localStorage
  get() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data
        ? JSON.parse(data)
        : {
            name: "",
            phone: "",
            address: {
              street: "",
              number: "",
              complement: "",
              district: "",
              city: "",
            },
          };
    } catch (e) {
      console.error("Erro ao ler dados do usuário:", e);
      return {
        name: "",
        phone: "",
        address: {
          street: "",
          number: "",
          complement: "",
          district: "",
          city: "",
        },
      };
    }
  },

  // Remove todos os dados do usuário
  clear() {
    localStorage.removeItem(this.KEY);
  },
};

/* --- MÓDULO DO MODAL DE PRODUTO --- */
const ProductModal = {
  currentProduct: null,
  quantity: 1,
  selectedSize: null,
  deliveryType: "pickup",

  elements: {},

  // Inicializa o modal
  init() {
    this.cacheElements();
    this.bindEvents();
  },

  // Cache de elementos DOM
  cacheElements() {
    this.elements = {
      overlay: document.getElementById("productModalOverlay"),
      modal: document.getElementById("productModal"),
      closeBtn: document.getElementById("modalCloseBtn"),
      productImage: document.getElementById("modalProductImage"),
      productName: document.getElementById("modalProductName"),
      productPrice: document.getElementById("modalProductPrice"),
      productDesc: document.getElementById("modalProductDesc"),
      form: document.getElementById("productModalForm"),
      userName: document.getElementById("userName"),
      userPhone: document.getElementById("userPhone"),
      sizeSelector: document.getElementById("sizeSelector"),
      sizeOptions: document.querySelectorAll(".modal-size-option"),
      deliveryRadio: document.getElementById("deliveryRadio"),
      pickupRadio: document.getElementById("pickupRadio"),
      addressFields: document.getElementById("addressFields"),
      decreaseQty: document.getElementById("decreaseQty"),
      increaseQty: document.getElementById("increaseQty"),
      productQty: document.getElementById("productQty"),
      modalSubtotal: document.getElementById("modalSubtotal"),
      addToCartBtn: document.getElementById("addToCartBtn"),
      errorMessages: {
        name: document.getElementById("nameError"),
        phone: document.getElementById("phoneError"),
        size: document.getElementById("sizeError"),
      },
    };
  },

  // Vincula eventos aos elementos
  bindEvents() {
    // Fechar modal
    this.elements.closeBtn.addEventListener("click", () => this.close());
    this.elements.overlay.addEventListener("click", (e) => {
      if (e.target === this.elements.overlay) this.close();
    });

    // Seleção de tamanho
    this.elements.sizeOptions.forEach((option) => {
      option.addEventListener("click", (e) => {
        this.selectSize(e.target.dataset.size);
      });
    });

    // Opção de entrega
    this.elements.deliveryRadio.addEventListener("change", () => {
      this.setDeliveryType("delivery");
    });

    this.elements.pickupRadio.addEventListener("change", () => {
      this.setDeliveryType("pickup");
    });

    // Controle de quantidade
    this.elements.decreaseQty.addEventListener("click", () => {
      this.changeQuantity(-1);
    });

    this.elements.increaseQty.addEventListener("click", () => {
      this.changeQuantity(1);
    });

    // Formulário
    this.elements.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleAddToCart();
    });

    // Mascara de telefone
    this.elements.userPhone.addEventListener("input", (e) => {
      this.formatPhoneNumber(e.target);
    });

    // Salvar dados ao sair do campo
    this.elements.userName.addEventListener("blur", () => this.saveUserData());
    this.elements.userPhone.addEventListener("blur", () => this.saveUserData());
  },

  // Abre o modal com informações do produto
  open(product) {
    if (!product) return;

    this.currentProduct = product;
    this.quantity = 1;
    this.selectedSize = null;
    this.deliveryType = "pickup";

    // Atualiza informações do produto
    this.elements.productImage.src = product.image;
    this.elements.productImage.alt = product.name;
    this.elements.productName.textContent = product.name;
    this.elements.productPrice.textContent = this.formatPrice(product.price);

    // Reseta UI
    this.resetForm();
    this.updateSubtotal();

    // Carrega dados do usuário
    const hasSavedData = this.loadUserData();

    // Atualiza o aviso de dados salvos
    this.updateDataSavedInfo(hasSavedData);

    // Mostra modal
    this.elements.overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  // Fecha o modal
  close() {
    this.elements.overlay.classList.remove("active");
    document.body.style.overflow = "";

    // Reseta seleções
    this.currentProduct = null;
    this.quantity = 1;
    this.selectedSize = null;
    this.deliveryType = "pickup";
  },

  // Reseta o formulário
  resetForm() {
    // Reseta tamanhos
    this.elements.sizeOptions.forEach((option) => {
      option.classList.remove("active");
    });

    // Reseta entrega
    this.elements.pickupRadio.checked = true;
    this.setDeliveryType("pickup");

    // Reseta quantidade
    this.elements.productQty.textContent = "1";

    // Limpa erros
    Object.values(this.elements.errorMessages).forEach((el) => {
      el.classList.remove("show");
      el.textContent = "";
    });

    // Limpa campos de erro
    this.elements.userName.classList.remove("error");
    this.elements.userPhone.classList.remove("error");
  },

  // Carrega dados do usuário salvos
  loadUserData() {
    const user = UserStorage.get();
    let hasSavedData = false;

    if (user.name && user.name.trim() !== "") {
      this.elements.userName.value = user.name;
      hasSavedData = true;
    }

    if (user.phone && user.phone.trim() !== "") {
      this.elements.userPhone.value = user.phone;
      hasSavedData = true;
    }

    // Verifica endereço
    if (user.address) {
      const hasAddress =
        user.address.street ||
        user.address.number ||
        user.address.district ||
        user.address.city;
      if (hasAddress) {
        // Preenche campos de endereço
        if (user.address.street)
          document.getElementById("addressStreet").value = user.address.street;
        if (user.address.number)
          document.getElementById("addressNumber").value = user.address.number;
        if (user.address.complement)
          document.getElementById("addressComplement").value =
            user.address.complement;
        if (user.address.district)
          document.getElementById("addressDistrict").value =
            user.address.district;
        if (user.address.city)
          document.getElementById("addressCity").value = user.address.city;
        hasSavedData = true;
      }
    }

    return hasSavedData;
  },

  // Atualiza o aviso de dados salvos
  updateDataSavedInfo(hasSavedData) {
    const dataSavedInfo = document.getElementById("dataSavedInfo");

    if (!hasSavedData) {
      // Se NÃO tem dados: mostra apenas a mensagem sem botão
      if (dataSavedInfo) {
        dataSavedInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-save" style="font-size: 0.7rem;"></i>
              <span>Seus dados serão salvos automaticamente ao preencher</span>
            </div>
          `;
        dataSavedInfo.style.display = "flex";
        dataSavedInfo.style.justifyContent = "flex-start";
      }
    } else {
      // Se TEM dados: mostra mensagem + botão de excluir
      if (dataSavedInfo) {
        dataSavedInfo.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <i class="fas fa-save" style="font-size: 0.7rem;"></i>
              <span>Seus dados são salvos automaticamente para futuras compras</span>
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <button 
                type="button" 
                id="clearDataBtn"
                style="
                  background: none;
                  border: none;
                  color: var(--color-error);
                  font-size: 0.7rem;
                  cursor: pointer;
                  padding: 4px 12px;
                  border-radius: 3px;
                  transition: all 0.2s;
                  border: 1px solid rgba(255, 59, 48, 0.3);
                "
                onmouseover="this.style.background='rgba(255, 59, 48, 0.1)'; this.style.borderColor='var(--color-error)'"
                onmouseout="this.style.background='none'; this.style.borderColor='rgba(255, 59, 48, 0.3)'"
              >
                <i class="fas fa-trash-alt" style="margin-right: 5px;"></i>
                Excluir meus dados
              </button>
            </div>
          `;
        dataSavedInfo.style.display = "block";
        dataSavedInfo.style.justifyContent = "space-between";

        // Vincula evento ao botão criado dinamicamente
        setTimeout(() => {
          const clearBtn = document.getElementById("clearDataBtn");
          if (clearBtn) {
            clearBtn.addEventListener("click", () => this.clearUserData());
          }
        }, 10);
      }
    }
  },

  // Salva dados do usuário
  saveUserData() {
    const name = this.elements.userName.value.trim();
    const phone = this.elements.userPhone.value.trim();
    const street = document.getElementById("addressStreet").value.trim();
    const number = document.getElementById("addressNumber").value.trim();

    const userData = {
      name: name,
      phone: phone,
      address: {
        street: street,
        number: number,
        complement: document.getElementById("addressComplement").value.trim(),
        district: document.getElementById("addressDistrict").value.trim(),
        city: document.getElementById("addressCity").value.trim(),
      },
    };

    // Verifica se há dados para salvar
    const hasDataToSave = name || phone || street || number;

    if (hasDataToSave) {
      UserStorage.save(userData);

      // Atualiza o aviso (agora mostrará com botão)
      setTimeout(() => this.updateDataSavedInfo(true), 100);
    }
  },

  // Seleciona tamanho do produto
  selectSize(size) {
    this.selectedSize = size;

    // Atualiza UI
    this.elements.sizeOptions.forEach((option) => {
      option.classList.remove("active");
      if (option.dataset.size === size) {
        option.classList.add("active");
      }
    });

    // Limpa erro de tamanho
    this.elements.errorMessages.size.classList.remove("show");
  },

  // Define tipo de entrega
  setDeliveryType(type) {
    this.deliveryType = type;

    if (type === "delivery") {
      this.elements.addressFields.classList.add("show");
    } else {
      this.elements.addressFields.classList.remove("show");
    }
  },

  // Altera quantidade
  changeQuantity(delta) {
    const newQty = this.quantity + delta;
    if (newQty >= 1 && newQty <= 10) {
      this.quantity = newQty;
      this.elements.productQty.textContent = newQty;
      this.updateSubtotal();
    }
  },

  // Atualiza subtotal
  updateSubtotal() {
    if (!this.currentProduct) return;

    const subtotal = this.currentProduct.price * this.quantity;
    this.elements.modalSubtotal.textContent = this.formatPrice(subtotal);
  },

  // Formata preço
  formatPrice(value) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  },

  // Aplica máscara de telefone
  formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, "");

    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    if (value.length > 10) {
      // Formato: (11) 99999-9999
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    } else if (value.length > 0) {
      value = value.replace(/^(\d{0,2}).*/, "($1");
    }

    input.value = value;
  },

  // Valida formulário
  validateForm() {
    let isValid = true;

    // Valida nome - deve ter nome e sobrenome
    const name = this.elements.userName.value.trim();
    const nameParts = name.split(" ").filter((part) => part.length > 0);

    if (nameParts.length < 2) {
      this.elements.userName.classList.add("error");
      this.elements.errorMessages.name.textContent = "Digite nome e sobrenome";
      this.elements.errorMessages.name.classList.add("show");
      isValid = false;
    } else if (name.length < 6) {
      this.elements.userName.classList.add("error");
      this.elements.errorMessages.name.textContent =
        "Nome muito curto (mínimo 6 caracteres)";
      this.elements.errorMessages.name.classList.add("show");
      isValid = false;
    } else {
      this.elements.userName.classList.remove("error");
      this.elements.errorMessages.name.classList.remove("show");
    }

    // Valida telefone
    const phone = this.elements.userPhone.value.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      this.elements.userPhone.classList.add("error");
      this.elements.errorMessages.phone.textContent = "WhatsApp inválido";
      this.elements.errorMessages.phone.classList.add("show");
      isValid = false;
    } else {
      this.elements.userPhone.classList.remove("error");
      this.elements.errorMessages.phone.classList.remove("show");
    }

    // Valida tamanho
    if (!this.selectedSize) {
      this.elements.errorMessages.size.textContent = "Selecione um tamanho";
      this.elements.errorMessages.size.classList.add("show");
      isValid = false;
    } else {
      this.elements.errorMessages.size.classList.remove("show");
    }

    // Valida endereço se for entrega
    if (this.deliveryType === "delivery") {
      const street = document.getElementById("addressStreet").value.trim();
      const number = document.getElementById("addressNumber").value.trim();

      if (!street || !number) {
        alert("Preencha o endereço completo para entrega");
        isValid = false;
      }
    }

    return isValid;
  },

  // Processa adição ao carrinho
  handleAddToCart() {
    if (!this.validateForm()) {
      return;
    }

    // Salva dados do usuário
    this.saveUserData();

    // Cria item do carrinho avançado
    const cartItem = {
      id: Date.now(), // ID único
      productId: this.currentProduct.id,
      name: this.currentProduct.name,
      price: this.currentProduct.price,
      image: this.currentProduct.image,
      category: this.currentProduct.category,
      quantity: this.quantity,
      size: this.selectedSize,
      delivery: this.deliveryType,
      user: {
        name: this.elements.userName.value.trim(),
        phone: this.elements.userPhone.value.trim(),
      },
      address:
        this.deliveryType === "delivery"
          ? {
              street: document.getElementById("addressStreet").value.trim(),
              number: document.getElementById("addressNumber").value.trim(),
              complement: document
                .getElementById("addressComplement")
                .value.trim(),
              district: document.getElementById("addressDistrict").value.trim(),
              city: document.getElementById("addressCity").value.trim(),
            }
          : null,
    };

    // Adiciona ao carrinho avançado
    AdvancedCartManager.addItem(cartItem);

    // Fecha modal
    this.close();

    // Feedback visual
    const originalText = this.elements.addToCartBtn.innerHTML;
    this.elements.addToCartBtn.innerHTML =
      '<i class="fas fa-check"></i> Adicionado!';
    this.elements.addToCartBtn.disabled = true;

    setTimeout(() => {
      this.elements.addToCartBtn.innerHTML = originalText;
      this.elements.addToCartBtn.disabled = false;
    }, 1500);

    // Abre carrinho
    setTimeout(() => {
      UIManager.toggleSidebar(true);
    }, 500);
  },

  // Limpa dados do usuário
  clearUserData() {
    if (
      confirm(
        "Tem certeza que deseja excluir todos os seus dados salvos?\n\nIsso inclui:\n• Seu nome\n• Seu WhatsApp\n• Seu endereço\n\nOs dados serão removidos permanentemente."
      )
    ) {
      // Limpa dados do usuário
      UserStorage.clear();

      // Limpa os campos do formulário
      this.elements.userName.value = "";
      this.elements.userPhone.value = "";
      document.getElementById("addressStreet").value = "";
      document.getElementById("addressNumber").value = "";
      document.getElementById("addressComplement").value = "";
      document.getElementById("addressDistrict").value = "";
      document.getElementById("addressCity").value = "";

      // Atualiza o aviso (agora mostrará sem botão)
      this.updateDataSavedInfo(false);

      // Resetar entrega para pickup (já que não tem mais endereço)
      this.setDeliveryType("pickup");

      // Feedback
      this.showNotification(
        "Seus dados foram excluídos com sucesso.",
        "success"
      );
    }
  },

  // Mostra notificação
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${
          type === "success" ? "var(--color-success)" : "var(--color-error)"
        };
        color: white;
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-sm);
        z-index: 3000;
        animation: slideIn 0.3s ease;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 300px;
      `;

    notification.innerHTML = `
        <i class="fas ${
          type === "success" ? "fa-check-circle" : "fa-info-circle"
        }"></i>
        <span>${message}</span>
      `;

    document.body.appendChild(notification);

    // Remove após 3 segundos
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  },
};

/* --- GESTOR AVANÇADO DO CARRINHO --- */
const AdvancedCartManager = {
  STORAGE_KEY: "jw_store_advanced_cart",

  // Obtém itens do carrinho avançado
  getItems() {
    try {
      const items = localStorage.getItem(this.STORAGE_KEY);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      console.error("Erro ao ler carrinho avançado:", e);
      return [];
    }
  },

  // Salva itens no carrinho avançado
  saveItems(items) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      this.notifyUpdate();
      return true;
    } catch (e) {
      console.error("Erro ao salvar carrinho avançado:", e);
      return false;
    }
  },

  // Adiciona item ao carrinho avançado
  addItem(item) {
    const items = this.getItems();

    // Verifica se item similar já existe
    const existingIndex = items.findIndex(
      (i) =>
        i.productId === item.productId &&
        i.size === item.size &&
        i.delivery === item.delivery
    );

    if (existingIndex > -1) {
      // Atualiza quantidade do item existente
      items[existingIndex].quantity += item.quantity;
    } else {
      // Adiciona novo item
      items.push(item);
    }

    this.saveItems(items);

    // Atualiza contador do carrinho original
    CartManager.items = this.getItems().map((item) => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      qty: item.quantity,
    }));

    CartManager.save();
    CartManager.notify();
  },

  // Remove item do carrinho
  removeItem(itemId) {
    const items = this.getItems().filter((item) => item.id !== itemId);
    this.saveItems(items);

    // Atualiza carrinho original
    CartManager.items = items.map((item) => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      qty: item.quantity,
    }));

    CartManager.save();
    CartManager.notify();
  },

  // Atualiza quantidade de um item
  updateQuantity(itemId, delta) {
    const items = this.getItems();
    const itemIndex = items.findIndex((item) => item.id === itemId);

    if (itemIndex > -1) {
      items[itemIndex].quantity += delta;

      if (items[itemIndex].quantity <= 0) {
        // Remove item se quantidade for zero
        this.removeItem(itemId);
        return;
      }

      this.saveItems(items);

      // Atualiza carrinho original
      CartManager.items = items.map((item) => ({
        id: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
        qty: item.quantity,
      }));

      CartManager.save();
      CartManager.notify();
    }
  },

  // Limpa todo o carrinho
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.notifyUpdate();
  },

  // Calcula total do carrinho
  getTotal() {
    const items = this.getItems();
    return items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  },

  // Conta total de itens no carrinho
  getItemCount() {
    const items = this.getItems();
    return items.reduce((count, item) => count + item.quantity, 0);
  },

  // Notifica atualizações
  notifyUpdate() {
    document.dispatchEvent(new CustomEvent("advanced-cart-updated"));
  },
};

/* --- MÓDULO DE CHECKOUT VIA WHATSAPP --- */
const WhatsAppCheckout = {
  STORE_PHONE: "558582312325", // Substituir pelo número real da loja

  // Processa checkout via WhatsApp
  openCheckout() {
    try {
      const cartItems = AdvancedCartManager.getItems();

      if (cartItems.length === 0) {
        alert("Adicione produtos ao carrinho antes de finalizar.");
        return;
      }

      const user = UserStorage.get();
      if (!user.name || !user.phone) {
        alert("Complete seus dados antes de finalizar a compra.");
        const advancedItems = AdvancedCartManager.getItems();
        if (advancedItems.length > 0) {
          ProductModal.open({
            id: advancedItems[0].productId,
            name: advancedItems[0].name,
            price: advancedItems[0].price,
            image: advancedItems[0].image,
            category: advancedItems[0].category,
          });
        }
        return;
      }

      // Salva os itens antes de limpar
      const itemsToCheckout = [...cartItems];
      const message = this.generateMessage();
      const url = `https://wa.me/${this.STORE_PHONE}?text=${message}`;

      // Primeiro limpa os carrinhos
      this.clearCartImmediately();

      // Depois abre o WhatsApp
      window.open(url, "_blank");

      // Feedback visual
      this.showCheckoutSuccess();
    } catch (error) {
      console.error("Erro no checkout WhatsApp:", error);
      alert("Erro ao gerar pedido. Por favor, tente novamente.");
    }
  },

  // Gera mensagem formatada para WhatsApp
  generateMessage() {
    const cartItems = AdvancedCartManager.getItems();
    const user = UserStorage.get();

    if (cartItems.length === 0) {
      throw new Error("Carrinho vazio");
    }

    let message = `*🛒 NOVO PEDIDO - JW STORE*%0A`;
    message += `──────────────────────────%0A%0A`;

    // Dados do cliente
    message += `*👤 CLIENTE:*%0A`;
    message += `Nome: ${user.name || "Não informado"}%0A`;
    message += `WhatsApp: ${user.phone || "Não informado"}%0A%0A`;

    // Itens do pedido
    message += `*📋 ITENS DO PEDIDO:*%0A`;

    cartItems.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      message += `${index + 1}. ${item.name}%0A`;
      message += `   Tamanho: ${item.size} | Qtd: ${item.quantity}%0A`;
      message += `   Valor: ${item.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} un.%0A`;
      message += `   Subtotal: ${itemTotal.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}%0A`;

      message += `──────────────────────────%0A%0A`;
      message += `*📋 ENTREGA:*%0A`;
      message += `   Entrega: ${
        item.delivery === "delivery" ? "📦 Entregar" : "🏪 Retirar na loja"
      }%0A`;

      if (item.delivery === "delivery" && item.address) {
        message += `   Endereço: ${item.address.street}, ${item.address.number}`;
        if (item.address.complement) {
          message += ` - ${item.address.complement}`;
        }
        message += `%0A`;
        message += `   Bairro: ${item.address.district}, ${item.address.city}%0A`;
      }

      message += `%0A`;
    });

    // Resumo
    message += `──────────────────────────%0A`;
    message += `*💰 VALOR TOTAL:* ${AdvancedCartManager.getTotal().toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    )}%0A`;
    message += `*📦 ITENS:* ${AdvancedCartManager.getItemCount()}%0A%0A`;

    // Método de entrega
    const deliveryTypes = cartItems.map((item) => item.delivery);
    const hasDelivery = deliveryTypes.includes("delivery");

    message += `*📍 ENTREGA:* ${
      hasDelivery ? "Entrega no endereço" : "Retirada na Loja"
    }%0A%0A`;

    // Observações
    message += `_Pedido gerado automaticamente via JW Store_`;

    return message;
  },

  // Limpa carrinhos imediatamente
  clearCartImmediately() {
    // 1. Limpa carrinho avançado do localStorage
    localStorage.removeItem("jw_store_advanced_cart");

    // 2. Limpa carrinho original do localStorage
    localStorage.removeItem("jw_cart");

    // 3. Limpa as variáveis em memória
    AdvancedCartManager.saveItems([]);
    CartManager.items = [];
    CartManager.save();

    // 4. Dispara eventos de atualização
    CartManager.notify();
    document.dispatchEvent(new CustomEvent("advanced-cart-updated"));
  },

  // Mostra feedback de sucesso
  showCheckoutSuccess() {
    // Fecha sidebar do carrinho
    UIManager.toggleSidebar(false);

    // Feedback visual no botão
    const btn = document.getElementById("whatsappCheckoutBtn");
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Pedido Enviado!';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 3000);
    }

    // Atualiza a UI do carrinho imediatamente
    setTimeout(() => {
      const cartBody = document.getElementById("cartBody");
      const cartCount = document.getElementById("cartCount");
      const cartCountSidebar = document.getElementById("cartCountSidebar");
      const cartTotal = document.getElementById("cartTotal");

      if (cartBody) {
        cartBody.innerHTML = `
            <div style="text-align:center; margin-top: 50px; padding: 20px;">
              <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--color-success); margin-bottom: 20px;"></i>
              <h4 style="margin-bottom: 10px;">Pedido enviado com sucesso!</h4>
              <p style="color: var(--color-gray-medium); font-size: 0.9rem;">
                Seu pedido foi enviado para o WhatsApp da loja.<br>
                Em breve entraremos em contato para confirmar.
              </p>
            </div>
          `;
      }

      if (cartCount) cartCount.textContent = "0";
      if (cartCountSidebar) cartCountSidebar.textContent = "0";
      if (cartTotal) cartTotal.textContent = "R$ 0,00";
    }, 100);
  },

  // Inicializa botão de checkout
  injectCheckoutButton() {
    // Botão já está fixo no HTML, só precisamos vincular o evento
    const whatsappBtn = document.getElementById("whatsappCheckoutBtn");
    if (whatsappBtn) {
      whatsappBtn.addEventListener("click", () => this.openCheckout());
    }
  },
};

/* ==========================================================================
 * INTEGRAÇÃO E INICIALIZAÇÃO
 * ==========================================================================
 */

// Sobrescreve função de adicionar ao carrinho para abrir modal
const originalAddToCart = App.addToCart;
App.addToCart = function (id) {
  const product = this.allProducts.find((p) => p.id === id);
  if (product) {
    ProductModal.open(product);
  }
};

// Atualiza renderização do carrinho para lidar com itens avançados
const originalRenderCart = UIManager.renderCart;
UIManager.renderCart = function (items) {
  originalRenderCart.call(this, items);

  // Atualiza controles de quantidade para usar o sistema avançado
  this.updateCartControls();
};

// Atualiza controles do carrinho
UIManager.updateCartControls = function () {
  const qtyButtons = this.selectors.cartBody.querySelectorAll(
    ".qty-control button"
  );
  qtyButtons.forEach((button) => {
    const oldOnclick = button.getAttribute("onclick");
    if (oldOnclick) {
      button.removeAttribute("onclick");
      const match = oldOnclick.match(/App\.changeQty\((\d+),\s*(-?\d+)\)/);
      if (match) {
        const productId = parseInt(match[1]);
        const delta = parseInt(match[2]);

        // Encontra o item avançado correspondente
        const advancedItems = AdvancedCartManager.getItems();
        const advancedItem = advancedItems.find(
          (item) => item.productId === productId
        );

        if (advancedItem) {
          button.addEventListener("click", () => {
            AdvancedCartManager.updateQuantity(advancedItem.id, delta);
          });
        }
      }
    }
  });

  // Atualiza botões de remover
  const removeButtons = this.selectors.cartBody.querySelectorAll(
    'button[onclick*="removeFromCart"]'
  );
  removeButtons.forEach((button) => {
    const oldOnclick = button.getAttribute("onclick");
    if (oldOnclick) {
      button.removeAttribute("onclick");
      const match = oldOnclick.match(/App\.removeFromCart\((\d+)\)/);
      if (match) {
        const productId = parseInt(match[1]);

        // Encontra o item avançado correspondente
        const advancedItems = AdvancedCartManager.getItems();
        const advancedItem = advancedItems.find(
          (item) => item.productId === productId
        );

        if (advancedItem) {
          button.addEventListener("click", () => {
            AdvancedCartManager.removeItem(advancedItem.id);
          });
        }
      }
    }
  });
};

/* --- INICIALIZAÇÃO DA APLICAÇÃO --- */
document.addEventListener("DOMContentLoaded", () => {
  // Inicializa App original
  App.init();

  // Inicializa novos módulos
  ProductModal.init();
  WhatsAppCheckout.injectCheckoutButton();

  // Carrega carrinho avançado no carrinho existente
  const advancedItems = AdvancedCartManager.getItems();
  if (advancedItems.length > 0) {
    CartManager.items = advancedItems.map((item) => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      qty: item.quantity,
    }));

    CartManager.save();
    CartManager.notify();
  }

  // Vincula eventos de atualização do carrinho
  document.addEventListener("advanced-cart-updated", () => {
    const advancedItems = AdvancedCartManager.getItems();
    CartManager.items = advancedItems.map((item) => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      qty: item.quantity,
    }));

    CartManager.save();
    CartManager.notify();
  });
});

// Exporta funções globais para acesso
window.ProductModal = ProductModal;
window.AdvancedCartManager = AdvancedCartManager;
window.WhatsAppCheckout = WhatsAppCheckout;
window.UserStorage = UserStorage;
