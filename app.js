const products = [
  { id: "obsidian-001", name: "Obsidian 001", category: "Corrida", price: 479.9, oldPrice: 599.9, discount: 20, tag: "DROP 01", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85" },
  { id: "mono-run", name: "Mono Run", category: "Corrida", price: 389.9, oldPrice: 469.9, discount: 17, tag: "BEST SELLER", tagTone: "dark", image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85" },
  { id: "shadow-low", name: "Shadow Low", category: "Lifestyle", price: 329.9, oldPrice: 399.9, discount: 18, tag: "NOVO", tagTone: "dark", image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85" },
  { id: "core-knit", name: "Aero Knit Runner", category: "Treino", price: 299.9, oldPrice: 349.9, discount: 14, tag: "ESSENTIAL", tagTone: "dark", image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=900&q=85" },
  { id: "silver-frame", name: "Apex Silver", category: "Lifestyle", price: 359.9, oldPrice: 429.9, discount: 16, tag: "LIMITED", tagTone: "dark", image: "assets/apex-silver-reference.png" },
  { id: "studio-trainer", name: "Pulse Sprint", category: "Treino", price: 419.9, oldPrice: 499.9, discount: 16, tag: "PERFORMANCE", image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=85" }
];

const state = { filter: "Todos", sortAsc: true, cart: JSON.parse(localStorage.getItem("sneakup-cart") || "[]") };
const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const findProduct = (id) => products.find((product) => product.id === id);
const productGrid = document.querySelector("#product-grid");
const cartDrawer = document.querySelector(".cart-drawer");
const toast = document.querySelector(".toast");

function renderProducts() {
  const filtered = products.filter((product) => state.filter === "Todos" || product.category === state.filter);
  const visible = state.sortAsc ? filtered : [...filtered].reverse();
  productGrid.innerHTML = visible.map((product, index) => `
    <article class="product-card" style="animation-delay:${index * 55}ms">
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='assets/sneakup-shoe-placeholder.svg'" />
        <span class="image-shade"></span><span class="product-tag ${product.tagTone === "dark" ? "product-tag-dark" : ""}">${product.tag}</span>
        <button class="quick-add" data-add="${product.id}" type="button" aria-label="Adicionar ${product.name}">+</button>
      </div>
      <div class="product-info">
        <div class="product-title-row"><div><h3 class="product-title">${product.name}</h3><p class="product-category">${product.category}</p></div><div class="product-prices"><span class="product-price">${money(product.price)}</span><span class="product-old-price">${money(product.oldPrice)}</span></div></div>
        <p class="discount-badge"><strong>${product.discount}% OFF</strong> · ou em até 6x sem juros</p>
      </div>
    </article>`).join("");
}

function saveCart() { localStorage.setItem("sneakup-cart", JSON.stringify(state.cart)); }
function cartCount() { return state.cart.reduce((total, item) => total + item.quantity, 0); }

function renderCart() {
  const items = document.querySelector("#cart-items");
  const count = cartCount();
  const total = state.cart.reduce((sum, item) => sum + findProduct(item.id).price * item.quantity, 0);
  document.querySelector(".bag-count").textContent = count;
  document.querySelector(".bag-count").setAttribute("aria-label", `${count} itens`);
  document.querySelector(".cart-heading-count").textContent = `(${count})`;
  document.querySelector(".subtotal strong").textContent = money(total);
  const remaining = Math.max(0, 499 - total);
  document.querySelector(".shipping-remaining").textContent = remaining ? `Faltam ${money(remaining)}` : "Frete grátis liberado";
  document.querySelector(".meter-track span").style.width = `${Math.min(100, (total / 499) * 100)}%`;
  items.innerHTML = state.cart.map((item) => {
    const product = findProduct(item.id);
    return `<div class="cart-item"><img class="cart-item-image" src="${product.image}" alt="${product.name}" /><div><h3 class="cart-item-name">${product.name}</h3><span class="cart-item-detail">${product.category} · Preto / 40</span><div class="qty-controls"><button type="button" data-decrease="${product.id}" aria-label="Diminuir quantidade">−</button><span>${item.quantity}</span><button type="button" data-increase="${product.id}" aria-label="Aumentar quantidade">+</button></div><button type="button" class="remove-item" data-remove="${product.id}">Remover</button></div><span class="cart-item-price">${money(product.price * item.quantity)}</span></div>`;
  }).join("");
}

function notify(message) { toast.textContent = message; toast.classList.add("show"); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => toast.classList.remove("show"), 2200); }

function addToCart(id) {
  const current = state.cart.find((item) => item.id === id);
  if (current) current.quantity += 1; else state.cart.push({ id, quantity: 1 });
  saveCart(); renderCart(); notify(`${findProduct(id).name} adicionado à bag`);
}

function openCart() { document.body.classList.add("cart-open"); cartDrawer.setAttribute("aria-hidden", "false"); }
function closeCart() { document.body.classList.remove("cart-open"); cartDrawer.setAttribute("aria-hidden", "true"); }

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) addToCart(addButton.dataset.add);
  if (event.target.closest("[data-open-cart]")) openCart();
  if (event.target.closest("[data-close-cart]")) closeCart();

  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    state.filter = filterButton.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((button) => button.classList.toggle("is-active", button === filterButton));
    renderProducts();
  }
  if (event.target.closest("[data-sort]")) { state.sortAsc = !state.sortAsc; renderProducts(); notify(state.sortAsc ? "Mais relevantes primeiro" : "Ordem invertida"); }

  const decrease = event.target.closest("[data-decrease]");
  const increase = event.target.closest("[data-increase]");
  const remove = event.target.closest("[data-remove]");
  if (decrease || increase || remove) {
    const id = (decrease || increase || remove).dataset.decrease || (decrease || increase || remove).dataset.increase || (decrease || increase || remove).dataset.remove;
    const item = state.cart.find((entry) => entry.id === id);
    if (remove || (decrease && item?.quantity === 1)) state.cart = state.cart.filter((entry) => entry.id !== id);
    else if (decrease) item.quantity -= 1;
    else if (increase) item.quantity += 1;
    saveCart(); renderCart();
  }
  if (event.target.closest(".checkout-button")) notify(state.cart.length ? "Checkout conectado em breve — sua bag está salva." : "Adicione um produto para continuar.");
});

document.querySelector(".theme-toggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("sneakup-theme", document.body.classList.contains("light") ? "light" : "dark");
});
if (localStorage.getItem("sneakup-theme") === "light") document.body.classList.add("light");

document.querySelector("#newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const feedback = document.querySelector(".form-feedback");
  feedback.textContent = "Você entrou. O próximo drop chega primeiro por aqui.";
  event.currentTarget.reset();
});

document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeCart(); });

function setupHoverMotion() {
  document.querySelectorAll(".model-hover-motion").forEach((model) => {
    let settleTimer;
    model.addEventListener("mouseenter", () => {
      window.clearTimeout(settleTimer);
      model.classList.add("is-hovering");
    });
    model.addEventListener("mouseleave", () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => model.classList.remove("is-hovering"), 700);
    });
  });
}

renderProducts();
renderCart();
setupHoverMotion();
