// js/app.js (Final, Robust, and Complete Version)

// --- Constants ---
const DELIVERY_CHARGES = {
    karachi: 300,
    other: 500
};
const ADVANCE_PAYMENT_DISCOUNT = 0.01; // 1%

// --- Global State ---
let currentFilters = {
    searchTerm: '',
    category: 'all'
};

// --- Main Initializer ---
document.addEventListener('DOMContentLoaded', main);

function main() {
    // Global initializations that are safe for all pages
    initTheme();

    // Page-specific routing
    const path = window.location.pathname;

    // Run these inits on pages that have the main header and sidebar
    if (path.endsWith('/') || path.endsWith('index.html') || path.includes('product.html')) {
        initLoginSystem();
        initCartSidebar();
        initBackToTop();
    }
    
    // Run page-specific render functions
    if (path.endsWith('/') || path.endsWith('index.html')) {
        initFilters();
        renderHomePage();
    } else if (path.includes('product.html')) {
        renderProductPage();
    } else if (path.includes('order.html')) {
        renderCheckoutPage();
    }
}

// ===================================================================
// --- LOCALSTORAGE & HELPERS ---
// ===================================================================
const ls = {
    get: (key) => {
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    remove: (key) => localStorage.removeItem(key)
};

const formatPrice = (price) => `Rs ${Math.round(price).toLocaleString()}`;

function openModal(id) {
    document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

// ===================================================================
// --- GLOBAL UI INITIALIZERS ---
// ===================================================================
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return; // Makes this function safe to call on any page

    const storedTheme = ls.get('theme') || 'light';
    document.documentElement.setAttribute('data-theme', storedTheme);
    
    themeToggle.innerHTML = storedTheme === 'dark' ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
    
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        ls.set('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
    });
}

function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (btn) window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 300));
}

// ===================================================================
// --- LOGIN & USER MANAGEMENT (with Geocoding) ---
// ===================================================================
function initLoginSystem() {
    const authSection = document.getElementById('user-auth-section');
    if (!authSection) return;
    
    const user = ls.get('userInfo');
    authSection.innerHTML = (user && user.name) 
        ? `<span id="user-greeting" style="cursor:pointer;">Hi, ${user.name.split(' ')[0]}</span>`
        : `<button class="login-btn" id="login-btn" title="Login"><i class='bx bx-user'></i></button>`;
    
    // Allow logged-in user to click their name to open the modal and edit info
    authSection.addEventListener('click', () => openModal('login-modal-overlay'));
    
    document.getElementById('close-modal-btn')?.addEventListener('click', () => closeModal('login-modal-overlay'));
    document.getElementById('user-info-form')?.addEventListener('submit', saveUserInfo);
    document.getElementById('get-location-btn')?.addEventListener('click', getUserLocationWithCity);
}

function saveUserInfo(e) {
    e.preventDefault();
    ls.set('userInfo', {
        name: document.getElementById('user-name').value,
        phone: document.getElementById('user-phone').value,
        location: document.getElementById('user-location').value
    });
    alert('Information saved!');
    closeModal('login-modal-overlay');
    initLoginSystem(); // Re-render header to show greeting
}

async function getUserLocationWithCity(event) {
    const btn = event.target;
    const form = btn.closest('form');
    const locationInput = form.querySelector('#user-location');
    
    if (!navigator.geolocation) return alert('Geolocation is not supported by this browser.');

    btn.textContent = "Locating...";
    btn.disabled = true;

    try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
        const { latitude, longitude } = position.coords;
        locationInput.value = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        btn.textContent = "Finding City...";
        const geoResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const geoData = await geoResponse.json();
        
        const citySelect = document.getElementById('city-select');
        if (citySelect) { // This will only exist on the checkout page
            citySelect.value = (geoData.city?.toLowerCase() === 'karachi') ? 'karachi' : 'other';
            citySelect.dispatchEvent(new Event('change')); // Trigger summary update
        }
        btn.textContent = `Found (${geoData.city || 'OK'})`;
    } catch (error) {
        alert('Could not get location. Please enable location services and try again.');
        btn.textContent = "Get Location";
    } finally {
        btn.disabled = false;
    }
}

// ===================================================================
// --- CART MANAGEMENT (WITH VARIANT SUPPORT) ---
// ===================================================================
function initCartSidebar() {
    renderCartSidebar();
    document.getElementById('cart-btn')?.addEventListener('click', () => openModal('cart-sidebar'));
    document.getElementById('close-cart-btn')?.addEventListener('click', () => closeModal('cart-sidebar'));
    const checkoutBtn = document.querySelector('.cart-footer a');
    if(checkoutBtn) checkoutBtn.href = 'order.html'; // Correct link
}

function getCart() { return ls.get('cart') || []; }

function saveCart(cart) {
    ls.set('cart', cart);
    renderCartSidebar();
    if (window.location.pathname.includes('order.html')) {
        updateCheckoutSummary();
    }
}

function addToCart(cartItem) {
    const cart = getCart();
    const existingItem = cart.find(item => item.cartId === cartItem.cartId);
    if (existingItem) {
        existingItem.quantity += cartItem.quantity;
    } else {
        cart.push(cartItem);
    }
    saveCart(cart);
    openModal('cart-sidebar');
}

function updateCartItemQuantity(cartId, newQuantity) {
    let cart = getCart();
    if (newQuantity < 1) {
        cart = cart.filter(item => item.cartId !== cartId);
    } else {
        const item = cart.find(i => i.cartId === cartId);
        if (item) item.quantity = newQuantity;
    }
    saveCart(cart);
}

function renderCartSidebar() {
    const cart = getCart();
    const cartBody = document.getElementById('cart-body');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartCountEl = document.getElementById('cart-count');
    
    if (!cartBody) return;

    if (cart.length === 0) {
        cartBody.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
        if(cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(0);
        if(cartCountEl) { cartCountEl.textContent = 0; cartCountEl.classList.remove('visible'); }
        return;
    }

    let subtotal = 0;
    cartBody.innerHTML = cart.map(item => {
        const product = productsData.find(p => p.id === item.productId);
        if (!product) return '';
        const price = product.salePrice || product.price;
        subtotal += price * item.quantity;
        return `
            <div class="cart-item">
                <img src="${product.images[0]}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p class="price">${formatPrice(price)}</p>
                    <div class="cart-item-actions">
                        <div class="quantity-modifier">
                            <button class="quantity-btn" data-id="${item.cartId}" data-action="decrease">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" data-id="${item.cartId}" data-action="increase">+</button>
                        </div>
                        <button class="remove-item-btn quantity-btn" data-id="${item.cartId}" data-action="remove">×</button>
                    </div>
                </div>
            </div>`;
    }).join('');

    if(cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(subtotal);
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if(cartCountEl) { cartCountEl.textContent = totalItems; cartCountEl.classList.add('visible'); }
    
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const item = getCart().find(i => i.cartId === id);
            if (!item) return;
            if (action === 'increase') updateCartItemQuantity(id, item.quantity + 1);
            if (action === 'decrease') updateCartItemQuantity(id, item.quantity - 1);
            if (action === 'remove') updateCartItemQuantity(id, 0);
        });
    });
}

// ===================================================================
// --- SEARCH & FILTER LOGIC ---
// ===================================================================
function initFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    
    const categories = [...new Set(productsData.map(p => p.category))];
    if(categoryFilter) {
        categoryFilter.innerHTML += categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            renderProductGrid();
        });
    }
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentFilters.searchTerm = e.target.value.toLowerCase();
            renderProductGrid();
        });
    }
}

function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    
    const filteredProducts = productsData.filter(product => {
        const matchesCategory = currentFilters.category === 'all' || product.category === currentFilters.category;
        const matchesSearch = product.name.toLowerCase().includes(currentFilters.searchTerm);
        return matchesCategory && matchesSearch;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No products match your criteria.</p>';
        return;
    }
    
    grid.innerHTML = filteredProducts.map(product => {
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
    gsap.utils.toArray('.product-card').forEach(card => {
        gsap.from(card, {
            scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" },
            duration: 0.8, y: 100, opacity: 0, ease: "power3.out"
        });
    });
}

// ===================================================================
// --- PAGE RENDERING (Home, Product, Checkout) ---
// ===================================================================
function renderHomePage() {
    renderProductGrid(); // Initial render
    // Animations
    gsap.from(".hero-title", { duration: 1, y: 50, opacity: 0, ease: "power3.out" });
    gsap.from(".hero-subtitle", { duration: 1, y: 50, opacity: 0, ease: "power3.out", delay: 0.2 });
}

// In js/app.js, replace the existing renderProductPage function with this one.

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

    document.title = `${product.name} | MDS QuicklyYours`;
    const priceHTML = product.salePrice ? `<span class="sale-badge">${formatPrice(product.salePrice)}</span> <span class="original-price">${formatPrice(product.price)}</span>` : `<span>${formatPrice(product.price)}</span>`;
    
    // --- Build HTML Strings ---
    const imageThumbnailsHTML = product.images.map((img, index) => 
        `<div class="thumbnail ${index === 0 ? 'active' : ''}" data-image="${img}">
            <img src="${img}" alt="Thumbnail ${index + 1}">
         </div>`
    ).join('');

    const videoThumbnailHTML = (product.videoUrls && product.videoUrls.length > 0) 
        ? `<!-- In product.html, replace the old iframe with this one -->
<iframe id="video-iframe" src="" title="Product Video Player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` 
        : '';

    const variantsHTML = (product.variants && product.variants.length > 0) ? `
        <div class="variants-container">
            ${product.variants.map(variant => `
                <div class="variant-group">
                    <label>${variant.name}:</label>
                    <div class="variant-options">
                        ${variant.options.map((opt, index) => 
                            `<button class="variant-btn ${index === 0 ? 'selected' : ''}" data-option-value="${opt}">${opt}</button>`
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';
    
    // --- Render the Full HTML Structure ---
    container.innerHTML = `
        <div class="product-page-layout">
            <div class="product-gallery">
                <div class="main-image-container"><img src="${product.images[0]}" id="main-product-image" alt="${product.name}"></div>
                <div class="thumbnail-container" id="product-thumbnails">${imageThumbnailsHTML}${videoThumbnailHTML}</div>
            </div>
            <div class="product-info">
                <h1>${product.name}</h1>
                <p class="price">${priceHTML}</p>
                <p class="description">${product.description}</p>
                ${variantsHTML}
                <div class="quantity-control">
                    <label for="quantity">Quantity:</label>
                    <input type="number" id="quantity" value="1" min="1" max="50" class="form-control" style="width:80px;">
                </div>
                <button class="btn" id="add-to-cart-btn" style="width:100%;">Add to Cart</button>
            </div>
        </div>
    `;

    // =============================================================
    // --- ACTIVATE ALL EVENT LISTENERS for the rendered content ---
    // =============================================================

    // 1. Image Gallery Thumbnail Clicks (This was the missing part)
    const mainImage = document.getElementById('main-product-image');
    document.querySelectorAll('.thumbnail:not(.video-thumbnail)').forEach(thumb => {
        thumb.addEventListener('click', () => {
            // Get the new image source from the clicked thumbnail
            const newImageSrc = thumb.dataset.image;
            // Update the main image
            mainImage.src = newImageSrc;
            
            // Update the 'active' class on all thumbnails
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    // 2. Video Modal Logic
// 2. Video Modal Logic (REVISED AND CORRECTED)
const videoThumbnail = document.getElementById('video-thumbnail');
if (videoThumbnail) {
    videoThumbnail.addEventListener('click', () => {
        // Only proceed if the product actually has a video URL
        if (product.videoUrls && product.videoUrls.length > 0) {
            // Pass the URL to a dedicated function to open the modal
            openVideoModal(product.videoUrls[0]);
        }
    });
}
    // Add these new functions inside js/app.js, near openModal and closeModal
function openVideoModal(videoUrl) {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-iframe');
    
    if (modal && iframe) {
        // Set the src for the YouTube embed. The '?autoplay=1' is crucial.
        iframe.src = `${videoUrl}?autoplay=1&rel=0`; 
        modal.classList.add('visible');
        
        // Attach closing listeners ONLY when the modal is opened
        const closeModalBtn = document.getElementById('video-modal-close');
        
        // Define a function to close and clean up
        const closeAndCleanup = () => {
            modal.classList.remove('visible');
            iframe.src = ""; // IMPORTANT: This stops the video and resets the iframe
            modal.removeEventListener('click', overlayClickHandler); // Clean up listener
        };

        const overlayClickHandler = (e) => {
            if (e.target === modal) {
                closeAndCleanup();
            }
        };
        
        closeModalBtn.onclick = closeAndCleanup;
        modal.addEventListener('click', overlayClickHandler);
    }
}

        // 3. Variant Button Clicks
    document.querySelectorAll('.variant-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // In the same group, deselect other buttons
            btn.parentElement.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
            // Select the clicked one
            btn.classList.add('selected');
        });
    });

    // 4. "Add to Cart" Button Click
    document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
        const selectedOptions = Array.from(document.querySelectorAll('.variant-btn.selected'))
            .map(btn => btn.dataset.optionValue);

        const cartItem = {
            cartId: `${product.id}_${selectedOptions.join('_')}`.replace(/\s+/g, '-'),
            productId: product.id,
            name: selectedOptions.length > 0 ? `${product.name} (${selectedOptions.join(', ')})` : product.name,
            quantity: parseInt(document.getElementById('quantity').value, 10)
        };
        
        addToCart(cartItem);
    });

    // 5. Render Related Products
    renderRelatedProducts(product.category, product.id);
}

function renderCheckoutPage() {
    const user = ls.get('userInfo');
    if (user) {
        document.getElementById('user-name').value = user.name || '';
        document.getElementById('user-phone').value = user.phone || '';
        document.getElementById('user-address').value = user.address || '';
        document.getElementById('user-location').value = user.location || '';
    }
    
    document.getElementById('city-select')?.addEventListener('change', updateCheckoutSummary);
    document.querySelectorAll('.payment-option').forEach(opt => opt.addEventListener('click', () => {
        document.querySelector('.payment-option.selected').classList.remove('selected');
        opt.classList.add('selected');
        updateCheckoutSummary();
    }));
    document.getElementById('checkout-form')?.addEventListener('submit', handlePlaceOrder);
    document.getElementById('get-location-btn')?.addEventListener('click', getUserLocationWithCity);

    updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const container = document.getElementById('checkout-container');
    const cart = getCart();
    if (cart.length === 0) {
        container.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;"><h2>Your cart is empty.</h2><a href="index.html" class="btn">Continue Shopping</a></div>`;
        return;
    }
    
    document.getElementById('order-items-list').innerHTML = cart.map(item => {
        const product = productsData.find(p => p.id === item.productId);
        return `<div class="summary-row"><span>${item.name} (x${item.quantity})</span><span>${formatPrice((product.salePrice || product.price) * item.quantity)}</span></div>`;
    }).join('');

    const subtotal = cart.reduce((sum, item) => sum + (productsData.find(p => p.id === item.productId).salePrice || productsData.find(p => p.id === item.productId).price) * item.quantity, 0);
    const city = document.getElementById('city-select').value;
    const deliveryCharge = city ? DELIVERY_CHARGES[city] : 0;
    const paymentMethod = document.querySelector('.payment-option.selected').dataset.payment;
    const discount = (paymentMethod === 'advance') ? subtotal * ADVANCE_PAYMENT_DISCOUNT : 0;
    
    document.getElementById('subtotal-price').textContent = formatPrice(subtotal);
    document.getElementById('delivery-charge').textContent = formatPrice(deliveryCharge);
    document.getElementById('discount-row').style.display = discount > 0 ? 'flex' : 'none';
    document.getElementById('discount-amount').textContent = `- ${formatPrice(discount)}`;
    document.getElementById('total-price').textContent = formatPrice(subtotal + deliveryCharge - discount);
}

function handlePlaceOrder(e) {
    e.preventDefault();
    const customer = {
        name: document.getElementById('user-name').value,
        phone: document.getElementById('user-phone').value,
        address: document.getElementById('user-address').value,
        location: document.getElementById('user-location').value,
        city: document.getElementById('city-select').value
    };
    
    if (!customer.location) return alert('GPS Location is required. Please click the "Get" button.');
    if (!customer.city) return alert('Please select your city.');

    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (productsData.find(p => p.id === item.productId).salePrice || productsData.find(p => p.id === item.productId).price) * item.quantity, 0);
    const deliveryCharge = DELIVERY_CHARGES[customer.city] || 0;
    const paymentMethod = document.querySelector('.payment-option.selected').dataset.payment;
    const discount = (paymentMethod === 'advance') ? subtotal * ADVANCE_PAYMENT_DISCOUNT : 0;
    const total = subtotal + deliveryCharge - discount;

    const orderDetails = cart.map(item => `*${item.name}* (Qty: ${item.quantity})`).join('\n');

    const message = `*New Order from MDS QuicklyYours!*\n\n*Customer:* ${customer.name}\n*Phone:* ${customer.phone}\n*Address:* ${customer.address}\n*GPS:* ${customer.location}\n\n--- *Order Summary* ---\n${orderDetails}\n-----------------------------\n*Subtotal:* ${formatPrice(subtotal)}\n*Delivery:* ${formatPrice(deliveryCharge)}\n${discount > 0 ? `*Discount:* -${formatPrice(discount)}\n` : ''}*TOTAL:* *${formatPrice(total)}*\n\n*Payment Method:* ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Advance Payment'}\n---\nPlease confirm my order. Thank you!`;
    
    const whatsappURL = `https://wa.me/923211217548?text=${encodeURIComponent(message.trim())}`;
    window.open(whatsappURL, '_blank');
    
    ls.remove('cart');
    document.getElementById('checkout-container').innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center;"><h2>Thank You!</h2><p>Your order details have been prepared. Please send the message in WhatsApp to finalize your order.</p><a href="index.html" class="btn" style="margin-top: 1rem;">Continue Shopping</a></div>`;
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
