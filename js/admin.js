// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const ADMIN_PASSWORD = "1"; // CHANGE THIS to a strong password
    const CLOUDINARY_CLOUD_NAME = "dsiktr6hj"; // CHANGE THIS to your Cloudinary cloud name
    const CLOUDINARY_UPLOAD_PRESET = "mohid_store_unsigned"; // CHANGE THIS to your unsigned upload preset name

    // --- DOM ELEMENTS ---
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('login-form');
    const productListContainer = document.getElementById('product-list');
    const formContainer = document.getElementById('edit-form-container');
    const productForm = document.getElementById('product-form');
    const closeFormBtn = document.getElementById('close-form-btn');
    const addNewProductBtn = document.getElementById('add-new-product-btn');
    const saveDataBtn = document.getElementById('save-data-btn');
    const addVideoBtn = document.getElementById('add-video-btn');

    // --- STATE ---
    let productsDataStore = JSON.parse(JSON.stringify(productsData)); 

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    addNewProductBtn.addEventListener('click', () => showForm());
    closeFormBtn.addEventListener('click', hideForm);
    productForm.addEventListener('submit', handleFormSubmit);
    saveDataBtn.addEventListener('click', saveAndDownloadData);
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    addVideoBtn.addEventListener('click', handleAddVideo);

    // --- FUNCTIONS ---
    function handleLogin(e) { /* ... same as before ... */
        e.preventDefault();
        const password = document.getElementById('password').value;
        if (password === ADMIN_PASSWORD) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            renderProductList();
        } else {
            alert('Incorrect password!');
        }
    }

    function renderProductList() { /* ... same as before ... */
        productListContainer.innerHTML = '';
        productsDataStore.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-list-item';
            item.innerHTML = `<span class="product-name">${product.name}</span><div class="actions"><button class="btn btn-primary edit-btn" data-id="${product.id}">Edit</button><button class="btn btn-danger delete-btn" data-id="${product.id}">Delete</button></div>`;
            productListContainer.appendChild(item);
        });
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => showForm(e.target.dataset.id)));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteProduct));
    }
    
    function showForm(productId = null) {
        productForm.reset();
        document.getElementById('product-id').value = productId || '';
        document.getElementById('upload-status').textContent = '';
        
        const formTitle = document.getElementById('form-title');
        
        if (productId) {
            formTitle.textContent = 'Edit Product';
            const product = productsDataStore.find(p => p.id === productId);
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-desc').value = product.description;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-sale-price').value = product.salePrice || '';
            document.getElementById('product-category').value = product.category;
            renderImagePreviews(product.images);
            // NEW: Render video previews
            renderVideoPreviews(product.videoUrls || []);
        } else {
            formTitle.textContent = 'Add New Product';
            renderImagePreviews([]);
            renderVideoPreviews([]);
        }
        formContainer.style.display = 'flex';
    }

    function hideForm() { formContainer.style.display = 'none'; }
    
    function renderImagePreviews(images) { /* ... same as before ... */
        const container = document.querySelector('#image-previews .image-preview-list');
        container.innerHTML = images.map(imgUrl => `<div class="image-preview"><img src="${imgUrl}" alt="Preview"><button type="button" class="delete-btn-icon" data-url="${imgUrl}">×</button></div>`).join('');
        document.querySelectorAll('.image-preview .delete-btn-icon').forEach(btn => btn.addEventListener('click', (e) => e.target.parentElement.remove()));
    }

    // NEW: Function to render video previews
    function renderVideoPreviews(videoUrls) {
        const container = document.querySelector('#video-previews .video-preview-list');
        container.innerHTML = videoUrls.map(url => `<div class="video-preview"><span>${url}</span><button type="button" class="delete-btn-icon" data-url="${url}">×</button></div>`).join('');
        document.querySelectorAll('.video-preview .delete-btn-icon').forEach(btn => btn.addEventListener('click', (e) => e.target.parentElement.remove()));
    }

    // NEW: Function to handle adding a video URL
    function handleAddVideo() {
        const input = document.getElementById('video-url-input');
        const url = input.value.trim();
        if (url && url.includes('youtube.com/embed/')) {
            const container = document.querySelector('#video-previews .video-preview-list');
            const newPreview = document.createElement('div');
            newPreview.className = 'video-preview';
            newPreview.innerHTML = `<span>${url}</span><button type="button" class="delete-btn-icon" data-url="${url}">×</button>`;
            container.appendChild(newPreview);
            newPreview.querySelector('.delete-btn-icon').addEventListener('click', (e) => e.target.parentElement.remove());
            input.value = ''; // Clear input
        } else {
            alert('Please enter a valid YouTube Embed URL (must contain "youtube.com/embed/").');
        }
    }

    function handleDeleteProduct(e) { /* ... same as before ... */
        const productId = e.target.dataset.id;
        if (confirm('Are you sure you want to delete this product?')) {
            productsDataStore = productsDataStore.filter(p => p.id !== productId);
            renderProductList();
        }
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const productId = document.getElementById('product-id').value;
        const remainingImageUrls = Array.from(document.querySelectorAll('.image-preview img')).map(img => img.src);
        // NEW: Get remaining video URLs
        const remainingVideoUrls = Array.from(document.querySelectorAll('.video-preview span')).map(span => span.textContent);

        const productData = {
            id: productId || `prod_${Date.now()}`,
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-desc').value,
            price: parseFloat(document.getElementById('product-price').value),
            salePrice: parseFloat(document.getElementById('product-sale-price').value) || null,
            category: document.getElementById('product-category').value,
            images: remainingImageUrls,
            videoUrls: remainingVideoUrls // NEW: Save video URLs
        };
        
        if (productId) {
            const index = productsDataStore.findIndex(p => p.id === productId);
            productsDataStore[index] = productData;
        } else {
            productsDataStore.push(productData);
        }
        
        renderProductList();
        hideForm();
    }

    async function handleImageUpload(e) { /* ... same as before ... */
        const file = e.target.files[0];
        if (!file) return;
        const uploadStatus = document.getElementById('upload-status');
        uploadStatus.textContent = 'Uploading...';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            const container = document.querySelector('#image-previews .image-preview-list');
            const newPreview = document.createElement('div');
            newPreview.className = 'image-preview';
            newPreview.innerHTML = `<img src="${data.secure_url}" alt="Preview"><button type="button" class="delete-btn-icon" data-url="${data.secure_url}">×</button>`;
            container.appendChild(newPreview);
            newPreview.querySelector('.delete-btn-icon').addEventListener('click', (e) => e.target.parentElement.remove());
            uploadStatus.textContent = 'Upload successful!';
        } catch (error) {
            console.error('Upload Error:', error);
            uploadStatus.textContent = 'Error uploading image.';
        }
    }

    function saveAndDownloadData() { /* ... same as before ... */
        if (!confirm('This will generate a new data.js file. You must replace the old file in your project with this new one. Continue?')) return;
        const fileContent = `const productsData = ${JSON.stringify(productsDataStore, null, 2)};`;
        const blob = new Blob([fileContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});