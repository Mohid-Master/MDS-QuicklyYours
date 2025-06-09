
// js/app.js

// --- Constants ---
const DELIVERY_CHARGES = {
    karachi: 300,
    other: 500
};
const ADVANCE_PAYMENT_DISCOUNT = 0.01; // 1%

// --- Main Initializer ---
document.addEventListener('DOMContentLoaded', main);

function main() {
    // --- Global Initializations that are safe for all pages ---
    initTheme();
    initLoginSystem(); // Made safe to run on all pages
    initCartSidebar(); // Made safe to run on all pages
    initBackToTop(); // Made safe to run on all pages
    
    // --- Page-Specific Logic (Routing) ---
    const path = window.location.pathname;
    
    if (path.endsWith('/') || path.endsWith('index.html') || path === '') {
        renderHomePage();
    } else if (path.includes('product.html')) {
        renderProductPage();
    } else if (path.includes('order.html') || path.includes('order')) {
        renderCheckoutPage();
    }
}


// ===================================================================
// --- LOCALSTORAGE HELPERS (Robust Version) ---
// ===================================================================
const ls = {
    get: (key) => {
        const value = localStorage.getItem(key);
        if (value === null) return null;
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    remove: (key) => localStorage.removeItem(key)
};

// ===================================================================
// --- GENERIC & HELPER FUNCTIONS ---
// ===================================================================
const formatPrice = (price) => `Rs ${Math.round(price).toLocaleString()}`;

function openModal(id) {
    document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return; // <-- DEFENSIVE CHECK

    const storedTheme = ls.get('theme') || 'light';
    document.documentElement.setAttribute('data-theme', storedTheme);
    
    themeToggle.innerHTML = storedTheme === 'dark' ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        ls.set('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
    });
}

function initBackToTop() {
    const backToTopButton = document.getElementById('back-to-top');
    if (!backToTopButton) return; // <-- DEFENSIVE CHECK

    window.addEventListener('scroll', () => {
        backToTopButton.classList.toggle('visible', window.scrollY > 300);
    });
}


// ===================================================================
// --- LOGIN & USER MANAGEMENT (with Geocoding) ---
// ===================================================================
function initLoginSystem() {
    const authSection = document.getElementById('user-auth-section');
    if (!authSection) return;
    const user = ls.get('userInfo');
    if (user && user.name) {
        authSection.innerHTML = `<span id="user-greeting">Hi, ${user.name.split(' ')[0]}</span>`;
    } else {
        authSection.innerHTML = `<button class="login-btn" id="login-btn"><i class='bx bx-user'></i></button>`;
        document.getElementById('login-btn')?.addEventListener('click', () => openModal('login-modal-overlay'));
    }
    document.getElementById('close-modal-btn')?.addEventListener('click', () => closeModal('login-modal-overlay'));
    document.getElementById('user-info-form')?.addEventListener('submit', saveUserInfo);
    document.getElementById('get-location-btn')?.addEventListener('click', getUserLocationWithCity);
}

function saveUserInfo(e) {
    e.preventDefault();
    const userInfo = {
        name: document.getElementById('user-name').value,
        phone: document.getElementById('user-phone').value,
        location: document.getElementById('user-location').value
    };
    ls.set('userInfo', userInfo);
    alert('Information saved!');
    closeModal('login-modal-overlay');
    initLoginSystem();
}

async function getUserLocationWithCity() {
    const locationBtn = document.getElementById('get-location-btn');
    const locationInput = document.getElementById('user-location');
    if (!locationBtn || !locationInput) return;

    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    locationBtn.textContent = "Locating...";
    locationBtn.disabled = true;

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        
        const { latitude, longitude } = position.coords;
        locationInput.value = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        // --- REVERSE GEOCODING TO FIND CITY ---
        locationBtn.textContent = "Finding City...";
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const data = await response.json();
        
        // On the checkout page, automatically select the city
        const citySelect = document.getElementById('city-select');
        if (citySelect) {
            if (data.city && data.city.toLowerCase() === 'karachi') {
                citySelect.value = 'karachi';
            } else {
                citySelect.value = 'other';
            }
            // Trigger change event to update summary
            citySelect.dispatchEvent(new Event('change'));
        }
        
        locationBtn.textContent = `Location Found (${data.city || 'Unknown'})`;

    } catch (error) {
        alert('Could not get location. Please enable location services and try again.');
        locationBtn.textContent = "Get My Location";
    } finally {
        locationBtn.disabled = false;
    }
}

// ===================================================================
// --- CART MANAGEMENT (NOW SAFE) ---
// ===================================================================
function initCartSidebar() {
    renderCartSidebar();
    document.getElementById('cart-btn')?.addEventListener('click', () => openModal('cart-sidebar'));
    document.getElementById('close-cart-btn')?.addEventListener('click', () => closeModal('cart-sidebar'));
}

function getCart() { return ls.get('cart') || []; }

function saveCart(cart) {
    ls.set('cart', cart);
    renderCartSidebar();
    if (window.location.pathname.includes('order.html') || window.location.pathname.includes('order') ) {
        updateCheckoutSummary();
    }
}

function addToCart(productId, quantity) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ id: productId, quantity });
    }
    saveCart(cart);
    openModal('cart-sidebar');
}

function updateCartItemQuantity(productId, newQuantity) {
    let cart = getCart();
    if (newQuantity < 1) {
        cart = cart.filter(item => item.id !== productId);
    } else {
        const item = cart.find(i => i.id === productId);
        if (item) item.quantity = newQuantity;
    }
    saveCart(cart);
}

function renderCartSidebar() {
    const cartBody = document.getElementById('cart-body');
    if (!cartBody) return; // <-- DEFENSIVE CHECK

    const cart = getCart();
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartCountEl = document.getElementById('cart-count');

    if (cart.length === 0) {
        cartBody.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
        if (cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(0);
        if (cartCountEl) {
            cartCountEl.textContent = 0;
            cartCountEl.classList.remove('visible');
        }
        return;
    }

    let subtotal = 0;
    cartBody.innerHTML = cart.map(item => {
        const product = productsData.find(p => p.id === item.id);
        if (!product) return '';
        const price = product.salePrice || product.price;
        subtotal += price * item.quantity;
        return `
            <div class="cart-item">
                <img src="${product.images[0]}" alt="${product.name}">
                <div class="cart-item-info">
                    <h4>${product.name}</h4>
                    <p class="price">${formatPrice(price)}</p>
                    <div class="cart-item-actions">
                        <div class="quantity-modifier">
                            <button class="quantity-btn" data-id="${product.id}" data-action="decrease">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" data-id="${product.id}" data-action="increase">+</button>
                        </div>
                        <button class="remove-item-btn quantity-btn" data-id="${product.id}" data-action="remove">×</button>
                    </div>
                </div>
            </div>`;
    }).join('');

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(subtotal);
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountEl) {
        cartCountEl.textContent = totalItems;
        cartCountEl.classList.add('visible');
    }
    
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const item = getCart().find(i => i.id === id);
            if (!item) return;
            
            if (action === 'increase') updateCartItemQuantity(id, item.quantity + 1);
            if (action === 'decrease') updateCartItemQuantity(id, item.quantity - 1);
            if (action === 'remove') updateCartItemQuantity(id, 0);
        });
    });
}


// ===================================================================
// --- CHECKOUT PAGE LOGIC (UPGRADED) ---
// ===================================================================
function renderCheckoutPage() {
    const user = ls.get('userInfo');
    if (user) {
        document.getElementById('user-name').value = user.name || '';
        document.getElementById('user-phone').value = user.phone || '';
        document.getElementById('user-address').value = user.address || '';
        const locationInput = document.getElementById('user-location');
        if (locationInput) {
            locationInput.value = user.location || '';
            // If location exists, try to auto-detect city
            if(user.location) {
                const coords = user.location.split('?q=')[1];
                if(coords) {
                    const [latitude, longitude] = coords.split(',');
                    autoSelectCityFromCoords(latitude, longitude);
                }
            }
        }
    }

    document.getElementById('city-select')?.addEventListener('change', updateCheckoutSummary);
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            updateCheckoutSummary();
        });
    });
    
    document.getElementById('checkout-form')?.addEventListener('submit', handlePlaceOrder);
    updateCheckoutSummary();
}

async function autoSelectCityFromCoords(latitude, longitude) {
    const citySelect = document.getElementById('city-select');
    if (!citySelect) return;
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const data = await response.json();
        if (data.city && data.city.toLowerCase() === 'karachi') {
            citySelect.value = 'karachi';
        } else {
            citySelect.value = 'other';
        }
        citySelect.dispatchEvent(new Event('change'));
    } catch (error) {
        console.error("Could not auto-detect city:", error);
    }
}
function updateCheckoutSummary() {
    const checkoutContainer = document.getElementById('checkout-container');
    if (!checkoutContainer) return;

    const cart = getCart();
    const listContainer = document.getElementById('order-items-list');

    if (cart.length === 0) {
        checkoutContainer.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center;">
                <h2>Your cart is empty.</h2>
                <a href="index.html" class="btn" style="margin-top: 1rem;">Continue Shopping</a>
            </div>`;
        return;
    }
    
    if(listContainer) {
        listContainer.innerHTML = cart.map(item => {
            const product = productsData.find(p => p.id === item.id);
            if (!product) return '';
            return `
                <div class="summary-row">
                    <span>${product.name} (x${item.quantity})</span>
                    <span>${formatPrice((product.salePrice || product.price) * item.quantity)}</span>
                </div>`;
        }).join('');
    }

    const subtotal = cart.reduce((sum, item) => {
        const product = productsData.find(p => p.id === item.id);
        return sum + (product.salePrice || product.price) * item.quantity;
    }, 0);

    const city = document.getElementById('city-select')?.value;
    const deliveryCharge = city ? DELIVERY_CHARGES[city] : 0;
    
    const selectedPaymentEl = document.querySelector('.payment-option.selected');
    const paymentMethod = selectedPaymentEl ? selectedPaymentEl.dataset.payment : 'cod';
    const discount = (paymentMethod === 'advance') ? subtotal * ADVANCE_PAYMENT_DISCOUNT : 0;
    
    const total = subtotal + deliveryCharge - discount;

    document.getElementById('subtotal-price').textContent = formatPrice(subtotal);
    document.getElementById('delivery-charge').textContent = formatPrice(deliveryCharge);
    const discountRow = document.getElementById('discount-row');
    if (discountRow) {
        if (discount > 0) {
            document.getElementById('discount-amount').textContent = `- ${formatPrice(discount)}`;
            discountRow.style.display = 'flex';
        } else {
            discountRow.style.display = 'none';
        }
    }
    document.getElementById('total-price').textContent = formatPrice(total);
}

function handlePlaceOrder(e) {
    e.preventDefault();
    const yourWhatsAppNumber = '923211217548';
    const cart = getCart();

    const customer = {
        name: document.getElementById('user-name').value,
        phone: document.getElementById('user-phone').value,
        address: document.getElementById('user-address').value,
        location: document.getElementById('user-location').value,
        city: document.getElementById('city-select').value
    };
    
    if(!customer.location) {
        alert('GPS Location is required. Please go to the home page, click the user icon, and save your info.');
        return;
    }
    if(!customer.city) {
        alert('Please select your city to calculate delivery charges.');
        return;
    }

    
    const subtotal = cart.reduce((sum, item) => {
        const product = productsData.find(p => p.id === item.id);
        return sum + (product.salePrice || product.price) * item.quantity;
    }, 0);
    const deliveryCharge = customer.city ? DELIVERY_CHARGES[customer.city] : 0;
    const paymentMethod = document.querySelector('.payment-option.selected').dataset.payment;
    const discount = (paymentMethod === 'advance') ? subtotal * ADVANCE_PAYMENT_DISCOUNT : 0;
    const total = subtotal + deliveryCharge - discount;

    let orderDetails = cart.map(item => {
        const product = productsData.find(p => p.id === item.id);
        return `*${product.name}* (Qty: ${item.quantity}) - ${formatPrice((product.salePrice || product.price) * item.quantity)}`;
    }).join('\n');

    const message = `
*New Order from Mohid's Store!*

*Customer:* ${customer.name}
*Phone:* ${customer.phone}
*Address:* ${customer.address}
*GPS:* ${customer.location}

--- *Order Summary* ---
${orderDetails}
-----------------------------
*Subtotal:* ${formatPrice(subtotal)}
*Delivery:* ${formatPrice(deliveryCharge)}
${discount > 0 ? `*Discount:* -${formatPrice(discount)}` : ''}
*TOTAL:* *${formatPrice(total)}*

*Payment Method:* ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Advance Payment'}
---
Please confirm my order. Thank you!`;

    const whatsappURL = `https://wa.me/${yourWhatsAppNumber}?text=${encodeURIComponent(message.trim())}`;
    window.open(whatsappURL, '_blank');
    
    ls.remove('cart');
    document.getElementById('checkout-container').innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center;">
            <h2>Thank You!</h2>
            <p>Your order details have been prepared. Please send the message in WhatsApp to finalize your order.</p>
            <a href="index.html" class="btn" style="margin-top: 1rem;">Continue Shopping</a>
        </div>`;
}

// ===================================================================
// --- PAGE RENDERING (Home & Product) ---
// ===================================================================
function renderHomePage() {
    // Render Product Grid
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = productsData.map(product => {
        const priceHTML = product.salePrice ? `<span class="sale-badge">${formatPrice(product.salePrice)}</span> <span class="original-price">${formatPrice(product.price)}</span>` : `<span>${formatPrice(product.price)}</span>`;
        return `
            <a href="product.html?id=${product.id}" class="product-card">
                <div class="product-card__image"><img src="${product.images[0]}" alt="${product.name}"></div>
                <div class="product-card__content">
                    <h3 class="product-card__name">${product.name}</h3>
                    <p class="product-card__price">${priceHTML}</p>
                </div>
            </a>`;
    }).join('');
    
    // Animations with GSAP
    gsap.from(".hero-title", { duration: 1, y: 50, opacity: 0, ease: "power3.out" });
    gsap.from(".hero-subtitle", { duration: 1, y: 50, opacity: 0, ease: "power3.out", delay: 0.2 });
    gsap.from(".hero .btn", { duration: 1, y: 50, opacity: 0, ease: "power3.out", delay: 0.4 });
    gsap.utils.toArray('.product-card').forEach(card => {
        gsap.from(card, {
            scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" },
            duration: 0.8, y: 100, opacity: 0, ease: "power3.out"
        });
    });
}

function renderProductPage() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const product = productsData.find(p => p.id === productId);

    if (!product) {
        container.innerHTML = '<h2>Product not found!</h2><a href="index.html" class="btn">Back to Shop</a>';
        return;
    }

    document.title = `${product.name} | Mohid's Store`;
    const priceHTML = product.salePrice ? `<span class="sale-badge">${formatPrice(product.salePrice)}</span> <span class="original-price"><s style="font-size: 70%;">${formatPrice(product.price)}</s></span>` : `<span>${formatPrice(product.price)}</span>`;
    
    const imageThumbnailsHTML = product.images.map((img, index) => `<div class="thumbnail ${index === 0 ? 'active' : ''}" data-image="${img}"><img src="${img}" alt="Thumbnail ${index + 1}"></div>`).join('');
    const videoThumbnailHTML = (product.videoUrls && product.videoUrls.length > 0) ? `<div class="thumbnail video-thumbnail" id="video-thumbnail"><i class='bx bx-play play-icon'></i></div>` : '';

    container.innerHTML = `
        <div class="product-page-layout">
            <div class="product-gallery">
                <div class="main-image-container"><img src="${product.images[0]}" id="main-product-image" alt="${product.name}"></div>
                <div class="thumbnail-container" id="product-thumbnails">
                    ${imageThumbnailsHTML}
                    ${videoThumbnailHTML}
                </div>
            </div>
            <div class="product-info">
                <h1>${product.name}</h1>
                <p class="price">${priceHTML}</p>
                <p class="description">${product.description}</p>
                <div class="quantity-control">
                    <label for="quantity">Quantity:</label>
                    <input type="number" id="quantity" value="1" min="1" max="50" class="form-control">
                </div>
                <button class="btn" id="add-to-cart-btn">Add to Cart</button>
            </div>
        </div>
    `;
    
    const mainImage = document.getElementById('main-product-image');
    const thumbnails = document.querySelectorAll('.thumbnail:not(.video-thumbnail)');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            mainImage.src = thumb.dataset.image;
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    const videoModal = document.getElementById('video-modal');
    const videoIframe = document.getElementById('video-iframe');
    const videoThumbnail = document.getElementById('video-thumbnail');
    
    if (videoThumbnail) {
        videoThumbnail.addEventListener('click', () => {
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            videoThumbnail.classList.add('active');
            videoIframe.src = product.videoUrls[0]; 
            videoModal.classList.add('visible');
        });
    }

    document.getElementById('video-modal-close')?.addEventListener('click', () => {
        videoModal.classList.remove('visible');
        videoIframe.src = "";
    });
    videoModal?.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            videoModal.classList.remove('visible');
            videoIframe.src = "";
        }
    });

    document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        addToCart(product.id, quantity);
    });

    renderRelatedProducts(product.category, product.id);
}

function renderRelatedProducts(category, currentProductId) {
    const container = document.getElementById('related-products-container');
    if (!container) return;
    const related = productsData.filter(p => p.category === category && p.id !== currentProductId).slice(0, 3);
    if (related.length === 0) return;
    
    container.innerHTML = `<div class="container">
        <h2 class="section-title">You Might Also Like</h2>
        <div class="product-grid">${related.map(product => {
            const priceHTML = product.salePrice ? `<span class="sale-badge">${formatPrice(product.salePrice)}</span><span class="original-price">${formatPrice(product.price)}</span>`:`<span>${formatPrice(product.price)}</span>`;
            return `
                <a href="product.html?id=${product.id}" class="product-card">
                    <div class="product-card__image"><img src="${product.images[0]}" alt="${product.name}"></div>
                    <div class="product-card__content">
                        <h3 class="product-card__name">${product.name}</h3>
                        <p class="product-card__price">${priceHTML}</p>
                    </div>
                </a>`;
        }).join('')}</div>
    </div>`;
}
