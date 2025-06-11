// js/admin.js (Complete, Corrected, and Final Version)

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const ADMIN_PASSWORD = "1"; // CHANGE THIS to a strong password
    const CLOUDINARY_CLOUD_NAME = "dsiktr6hj"; // Your Cloudinary cloud name
    const CLOUDINARY_UPLOAD_PRESET = "mohid_store_unsigned"; // Your unsigned upload preset

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
    const addVariantBtn = document.getElementById('add-variant-btn');

    // --- STATE ---
    // Create a deep copy to avoid modifying the original data until we're ready to save
    let productsDataStore = JSON.parse(JSON.stringify(productsData));

    // --- EVENT LISTENERS ---
    loginForm?.addEventListener('submit', handleLogin);
    addNewProductBtn?.addEventListener('click', () => showForm());
    closeFormBtn?.addEventListener('click', hideForm);
    productForm?.addEventListener('submit', handleFormSubmit);
    saveDataBtn?.addEventListener('click', saveAndDownloadData);
    document.getElementById('image-upload')?.addEventListener('change', handleImageUpload);
    addVideoBtn?.addEventListener('click', handleAddVideo);
    addVariantBtn?.addEventListener('click', handleAddVariantType);

    // --- FUNCTIONS ---
    function handleLogin(e) {
        e.preventDefault();
        if (document.getElementById('password').value === ADMIN_PASSWORD) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            renderProductList();
        } else {
            alert('Incorrect password!');
        }
    }

    function renderProductList() {
        if (!productListContainer) return;
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
        
        if (productId) {
            document.getElementById('form-title').textContent = 'Edit Product';
            const product = productsDataStore.find(p => p.id === productId);
            if (!product) { console.error("Product not found!"); return; }
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-desc').value = product.description;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-sale-price').value = product.salePrice || '';
            document.getElementById('product-category').value = product.category;
            renderImagePreviews(product.images || []);
            renderVideoPreviews(product.videoUrls || []);
            renderVariantInputs(product.variants || []);
        } else {
            document.getElementById('form-title').textContent = 'Add New Product';
            renderImagePreviews([]);
            renderVideoPreviews([]);
            renderVariantInputs([]);
        }
        formContainer.style.display = 'flex';
    }

    function hideForm() {
        formContainer.style.display = 'none';
    }

    function renderImagePreviews(images) {
        const container = document.querySelector('#image-previews .image-preview-list');
        if (!container) return;
        container.innerHTML = images.map(imgUrl => `<div class="image-preview"><img src="${imgUrl}" alt="Preview"><button type="button" class="delete-btn-icon" data-url="${imgUrl}">×</button></div>`).join('');
        document.querySelectorAll('.image-preview .delete-btn-icon').forEach(btn => btn.addEventListener('click', (e) => e.target.parentElement.remove()));
    }

    function renderVideoPreviews(videoUrls) {
        const container = document.querySelector('#video-previews .video-preview-list');
        if (!container) return;
        container.innerHTML = videoUrls.map(url => `<div class="video-preview"><span>${url}</span><button type="button" class="delete-btn-icon" data-url="${url}">×</button></div>`).join('');
        document.querySelectorAll('.video-preview .delete-btn-icon').forEach(btn => btn.addEventListener('click', (e) => e.target.parentElement.remove()));
    }

    function renderVariantInputs(variants) {
        const container = document.getElementById('variants-container');
        if (!container) return;
        container.innerHTML = variants.map(variant => `
            <div class="variant-group card" style="margin-bottom:1rem;background:var(--bg-color);">
                <div class="form-group"><label>Feature Name</label><input type="text" class="form-control variant-name-input" value="${variant.name}"></div>
                <div class="form-group"><label>Options (comma-separated)</label><input type="text" class="form-control variant-options-input" value="${variant.options.join(', ')}"></div>
                <button type="button" class="btn btn-danger remove-variant-btn">Remove Feature</button>
            </div>`).join('');
        document.querySelectorAll('.remove-variant-btn').forEach(btn => btn.addEventListener('click', (e) => e.target.closest('.variant-group').remove()));
    }
    
    function handleAddVideo() {
        const input = document.getElementById('video-url-input');
        const url = input.value.trim();
        if (url && url.includes('youtube.com/embed/')) {
            const container = document.querySelector('#video-previews .video-preview-list');
            const newPreview = document.createElement('div');
            newPreview.className = 'video-preview';
            newPreview.innerHTML = `<span>${url}</span><button type="button" class="delete-btn-icon" data-url="${url}">×</button>`;
            newPreview.querySelector('.delete-btn-icon').addEventListener('click', (e) => e.target.parentElement.remove());
            container.appendChild(newPreview);
            input.value = '';
        } else {
            alert('Please enter a valid YouTube Embed URL (must contain "youtube.com/embed/").');
        }
    }

    function handleAddVariantType() {
        const nameInput = document.getElementById('new-variant-name');
        const variantName = nameInput.value.trim();
        if (!variantName) return alert('Please enter a feature name.');
        const container = document.getElementById('variants-container');
        const newGroup = document.createElement('div');
        newGroup.className = 'variant-group card';
        newGroup.style.cssText = 'margin-bottom:1rem;background:var(--bg-color);';
        newGroup.innerHTML = `<div class="form-group"><label>Feature Name</label><input type="text" class="form-control variant-name-input" value="${variantName}"></div><div class="form-group"><label>Options (comma-separated)</label><input type="text" class="form-control variant-options-input" value=""></div><button type="button" class="btn btn-danger remove-variant-btn">Remove Feature</button>`;
        newGroup.querySelector('.remove-variant-btn').addEventListener('click', (e) => e.target.closest('.variant-group').remove());
        container.appendChild(newGroup);
        nameInput.value = '';
    }

    function handleDeleteProduct(e) {
        const productId = e.target.dataset.id;
        if (confirm('Are you sure you want to delete this product?')) {
            productsDataStore = productsDataStore.filter(p => p.id !== productId);
            renderProductList();
        }
    }

    // --- CORRECTED and COMPLETE handleFormSubmit ---
    function handleFormSubmit(e) {
        e.preventDefault();
        const productId = document.getElementById('product-id').value;
        
        const remainingImageUrls = Array.from(document.querySelectorAll('.image-preview img')).map(img => img.src);
        const remainingVideoUrls = Array.from(document.querySelectorAll('.video-preview span')).map(span => span.textContent);
        
        const variantGroups = document.querySelectorAll('.variant-group');
        const variantsData = Array.from(variantGroups).map(group => {
            const name = group.querySelector('.variant-name-input').value.trim();
            const options = group.querySelector('.variant-options-input').value
                .split(',')
                .map(opt => opt.trim())
                .filter(Boolean); // Cleans up options: splits by comma, removes whitespace, and filters out any empty strings.
            return { name, options };
        });

        const productData = {
            id: productId || `prod_${Date.now()}`,
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-desc').value,
            price: parseFloat(document.getElementById('product-price').value),
            salePrice: parseFloat(document.getElementById('product-sale-price').value) || null,
            category: document.getElementById('product-category').value,
            images: remainingImageUrls,
            videoUrls: remainingVideoUrls,
            variants: variantsData
        };
        
        if (productId) {
            const index = productsDataStore.findIndex(p => p.id === productId);
            if (index > -1) {
                productsDataStore[index] = productData;
            } else {
                // This case handles if an edit was made on a product that somehow got deleted.
                productsDataStore.push(productData);
            }
        } else {
            productsDataStore.push(productData);
        }
        
        renderProductList();
        hideForm();
        alert('Product saved locally. Remember to "Save & Download" to make changes permanent.');
    }

    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const uploadStatus = document.getElementById('upload-status');
        uploadStatus.textContent = 'Uploading...';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);
            const data = await response.json();
            const container = document.querySelector('#image-previews .image-preview-list');
            const newPreview = document.createElement('div');
            newPreview.className = 'image-preview';
            newPreview.innerHTML = `<img src="${data.secure_url}" alt="Preview"><button type="button" class="delete-btn-icon" data-url="${data.secure_url}">×</button>`;
            newPreview.querySelector('.delete-btn-icon').addEventListener('click', (e) => e.target.parentElement.remove());
            container.appendChild(newPreview);
            uploadStatus.textContent = 'Upload successful!';
        } catch (error) {
            console.error('Cloudinary Upload Error:', error);
            uploadStatus.textContent = 'Error uploading image. Check console for details.';
        }
    }

    function saveAndDownloadData() {
        if (!confirm('This will generate a new data.js file. You must replace the old file in your project with this new one. Continue?')) return;
        // The `null, 2` part makes the JSON nicely formatted and readable in the file.
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
