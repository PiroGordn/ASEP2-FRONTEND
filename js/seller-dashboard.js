import { auth, db } from "./auth.js";
// Seller Dashboard JavaScript

// DOM Elements
const totalProductsElement = document.getElementById('totalProducts');
const activeOrdersElement = document.getElementById('activeOrders');
const totalSalesElement = document.getElementById('totalSales');
const productsListElement = document.getElementById('productsList');
const ordersListElement = document.getElementById('ordersList');
const topProductsElement = document.getElementById('topProducts');
const salesChartElement = document.getElementById('salesChart');
const addProductBtn = document.getElementById('addProductBtn');
const addProductModal = document.getElementById('addProductModal');
const addProductForm = document.getElementById('addProductForm');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const closeModalBtn = addProductModal.querySelector('.close');

// Initialize dashboard
function initializeDashboard() {
    // Check if user is authenticated and is a seller
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            if (userData.role !== 'seller') {
                // Redirect to buyer dashboard if user is a buyer
                window.location.href = '/buyer-dashboard.html';
                return;
            }

            // Load dashboard data
            loadDashboardData(user.uid);
            setupEventListeners(user.uid);
        } else {
            // Redirect to home if not logged in
            window.location.href = '/index.html';
        }
    });
}

// Setup event listeners
function setupEventListeners(userId) {
    // Add Product Modal
    addProductBtn.onclick = () => {
        addProductModal.style.display = 'block';
    }

    // Close modal
    closeModalBtn.onclick = () => {
        addProductModal.style.display = 'none';
        addProductForm.reset();
    }

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === addProductModal) {
            addProductModal.style.display = 'none';
            addProductForm.reset();
        }
    }

    // Add Product Form
    addProductForm.onsubmit = async (e) => handleAddProduct(e, userId);

    // Filters
    categoryFilter.onchange = () => filterProducts(userId);
    statusFilter.onchange = () => filterProducts(userId);
}

// Load dashboard data
async function loadDashboardData(userId) {
    try {
        // Load products count
        const products = await getProducts(userId);
        totalProductsElement.textContent = products.length;

        // Load active orders
        const activeOrders = await getActiveOrders(userId);
        activeOrdersElement.textContent = activeOrders.length;

        // Calculate total sales
        const totalSales = await calculateTotalSales(userId);
        totalSalesElement.textContent = `₹${totalSales.toLocaleString()}`;

        // Display products
        displayProducts(products);

        // Display orders
        displayOrders(activeOrders);

        // Load and display analytics
        const analytics = await getAnalytics(userId);
        displayAnalytics(analytics);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Get seller's products
async function getProducts(userId, category = 'all', status = 'all') {
    let query = db.collection('products').where('sellerId', '==', userId);
    
    if (category !== 'all') {
        query = query.where('category', '==', category);
    }
    
    if (status !== 'all') {
        query = query.where('status', '==', status);
    }
    
    const productsSnapshot = await query.get();
    return productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// Get active orders for seller's products
async function getActiveOrders(userId) {
    const ordersSnapshot = await db.collection('orders')
        .where('sellerId', '==', userId)
        .where('status', 'in', ['pending', 'processing', 'shipped'])
        .get();
    
    return ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// Calculate total sales
async function calculateTotalSales(userId) {
    const ordersSnapshot = await db.collection('orders')
        .where('sellerId', '==', userId)
        .where('status', '==', 'delivered')
        .get();
    
    return ordersSnapshot.docs.reduce((total, doc) => {
        const order = doc.data();
        return total + order.total;
    }, 0);
}

// Get analytics data
async function getAnalytics(userId) {
    // Get top selling products
    const topProducts = await db.collection('orders')
        .where('sellerId', '==', userId)
        .where('status', '==', 'delivered')
        .get()
        .then(snapshot => {
            const productSales = {};
            snapshot.docs.forEach(doc => {
                const order = doc.data();
                order.items.forEach(item => {
                    productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
                });
            });
            return Object.entries(productSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);
        });

    // Get sales trend (last 7 days)
    const salesTrend = await db.collection('orders')
        .where('sellerId', '==', userId)
        .where('status', '==', 'delivered')
        .where('deliveredAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .get()
        .then(snapshot => {
            const dailySales = {};
            snapshot.docs.forEach(doc => {
                const order = doc.data();
                const date = order.deliveredAt.toDate().toLocaleDateString();
                dailySales[date] = (dailySales[date] || 0) + order.total;
            });
            return dailySales;
        });

    return { topProducts, salesTrend };
}

// Display products in the products list
function displayProducts(products) {
    productsListElement.innerHTML = products.map(product => `
        <div class="product__card ${product.status}">
            <img src="${product.imageUrl}" alt="${product.name}">
            <div class="product__info">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="product__meta">
                    <span class="price">₹${product.price}</span>
                    <span class="stock">Stock: ${product.stock}</span>
                    <span class="status">${product.status}</span>
                </div>
                <div class="product__actions">
                    <button onclick="editProduct('${product.id}')" class="edit-btn">Edit</button>
                    <button onclick="toggleProductStatus('${product.id}')" class="status-btn">
                        ${product.status === 'active' ? 'Inactivate' : 'Activate'}
                    </button>
                    <button onclick="deleteProduct('${product.id}')" class="delete-btn">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Display orders in the orders list
function displayOrders(orders) {
    ordersListElement.innerHTML = orders.map(order => `
        <div class="order__card">
            <div class="order__header">
                <h3>Order #${order.id.slice(-6)}</h3>
                <span class="order__date">${new Date(order.createdAt.toDate()).toLocaleDateString()}</span>
            </div>
            <div class="order__items">
                ${order.items.map(item => `
                    <div class="order__item">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="item__details">
                            <h4>${item.name}</h4>
                            <p>₹${item.price} x ${item.quantity}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order__footer">
                <p>Total: ₹${order.total}</p>
                <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Display analytics data
function displayAnalytics(analytics) {
    // Display top products
    displayTopProducts(analytics.topProducts);
    
    // Display sales trend
    displaySalesTrend(analytics.salesTrend);
}

// Display top products
async function displayTopProducts(topProducts) {
    const productDetails = await Promise.all(
        topProducts.map(async ([productId, quantity]) => {
            const doc = await db.collection('products').doc(productId).get();
            return { ...doc.data(), quantity };
        })
    );

    topProductsElement.innerHTML = productDetails.map(product => `
        <div class="top-product__item">
            <img src="${product.image}" alt="${product.name}">
            <div class="product__details">
                <h4>${product.name}</h4>
                <p>Sold: ${product.quantity} units</p>
            </div>
        </div>
    `).join('');
}

// Display sales trend
function displaySalesTrend(salesTrend) {
    // Implementation would depend on the charting library you choose
    // For this example, we'll just show the raw data
    salesChartElement.innerHTML = `
        <div class="sales-trend">
            ${Object.entries(salesTrend).map(([date, amount]) => `
                <div class="trend__item">
                    <span class="date">${date}</span>
                    <span class="amount">₹${amount.toLocaleString()}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Handle Add Product Form Submission
async function handleAddProduct(e, userId) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to add products');
        return;
    }

    try {
        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value,
            stock: parseInt(document.getElementById('productStock').value),
            imageUrl: document.getElementById('productImageUrl').value,
            condition: document.getElementById('productCondition').value,
            tags: document.getElementById('productTags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0),
            sellerId: user.uid,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validate required fields
        if (!productData.name || !productData.description || !productData.price || 
            !productData.category || !productData.stock || !productData.imageUrl) {
            alert('Please fill in all required fields');
            return;
        }

        // Add product to Firestore
        await db.collection('products').add(productData);
        
        // Close modal and reset form
        addProductModal.style.display = 'none';
        addProductForm.reset();
        
        // Refresh products list
        const products = await getProducts(userId);
        displayProducts(products);
        
        // Update total products count
        totalProductsElement.textContent = products.length;
        
        alert('Product added successfully!');
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Error adding product. Please try again.');
    }
}

// Filter products
async function filterProducts(userId) {
    const category = categoryFilter.value;
    const status = statusFilter.value;
    
    const products = await getProducts(userId, category, status);
    displayProducts(products);
}

// Edit product
async function editProduct(productId) {
    try {
        // Get product data
        const productRef = db.collection('products').doc(productId);
        const productDoc = await productRef.get();
        const product = productDoc.data();

        // Create and show edit modal
        const editModal = document.createElement('div');
        editModal.className = 'modal';
        editModal.id = 'editProductModal';
        editModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit Product</h2>
                <form id="editProductForm">
                    <div class="form-group">
                        <input type="text" id="editProductName" value="${product.name}" required>
                    </div>
                    <div class="form-group">
                        <textarea id="editProductDescription" required>${product.description}</textarea>
                    </div>
                    <div class="form-group">
                        <input type="number" id="editProductPrice" value="${product.price}" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <select id="editProductCategory" required>
                            <option value="electronics" ${product.category === 'electronics' ? 'selected' : ''}>Electronics</option>
                            <option value="books" ${product.category === 'books' ? 'selected' : ''}>Books</option>
                            <option value="clothing" ${product.category === 'clothing' ? 'selected' : ''}>Clothing</option>
                            <option value="other" ${product.category === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="number" id="editProductStock" value="${product.stock}" required>
                    </div>
                    <div class="form-group">
                        <input type="text" id="editProductImageUrl" value="${product.imageUrl}" required>
                    </div>
                    <div class="form-group">
                        <select id="editProductCondition" required>
                            <option value="new" ${product.condition === 'new' ? 'selected' : ''}>New</option>
                            <option value="like-new" ${product.condition === 'like-new' ? 'selected' : ''}>Like New</option>
                            <option value="good" ${product.condition === 'good' ? 'selected' : ''}>Good</option>
                            <option value="fair" ${product.condition === 'fair' ? 'selected' : ''}>Fair</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="text" id="editProductTags" value="${product.tags.join(', ')}" placeholder="Tags (comma-separated)">
                    </div>
                    <button type="submit">Update Product</button>
                </form>
            </div>
        `;

        document.body.appendChild(editModal);
        editModal.style.display = 'block';

        // Close modal functionality
        const closeBtn = editModal.querySelector('.close');
        closeBtn.onclick = () => {
            editModal.remove();
        };

        window.onclick = (event) => {
            if (event.target === editModal) {
                editModal.remove();
            }
        };

        // Handle form submission
        const editForm = document.getElementById('editProductForm');
        editForm.onsubmit = async (e) => {
            e.preventDefault();

            try {
                const updatedProduct = {
                    name: document.getElementById('editProductName').value,
                    description: document.getElementById('editProductDescription').value,
                    price: parseFloat(document.getElementById('editProductPrice').value),
                    category: document.getElementById('editProductCategory').value,
                    stock: parseInt(document.getElementById('editProductStock').value),
                    imageUrl: document.getElementById('editProductImageUrl').value,
                    condition: document.getElementById('editProductCondition').value,
                    tags: document.getElementById('editProductTags').value
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Validate required fields
                if (!updatedProduct.name || !updatedProduct.description || !updatedProduct.price || 
                    !updatedProduct.category || !updatedProduct.stock || !updatedProduct.imageUrl) {
                    alert('Please fill in all required fields');
                    return;
                }

                // Update product in Firestore
                await productRef.update(updatedProduct);
                
                // Close modal
                editModal.remove();
                
                // Refresh products list
                const products = await getProducts(auth.currentUser.uid);
                displayProducts(products);
                
                alert('Product updated successfully!');
            } catch (error) {
                console.error('Error updating product:', error);
                alert('Error updating product. Please try again.');
            }
        };
    } catch (error) {
        console.error('Error loading product for edit:', error);
        alert('Error loading product details. Please try again.');
    }
}

// Toggle product status
async function toggleProductStatus(productId) {
    try {
        const productRef = db.collection('products').doc(productId);
        const product = await productRef.get();
        const newStatus = product.data().status === 'active' ? 'inactive' : 'active';
        
        await productRef.update({
            status: newStatus
        });
        
        // Reload products
        const products = await getProducts(auth.currentUser.uid);
        displayProducts(products);
    } catch (error) {
        console.error('Error toggling product status:', error);
        alert('Failed to update product status');
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        if (newStatus === 'delivered') {
            // Reload dashboard data to update total sales
            loadDashboardData(auth.currentUser.uid);
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Failed to update order status');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }

    try {
        // Delete the product from Firestore
        await db.collection('products').doc(productId).delete();
        
        // Reload products
        const products = await getProducts(auth.currentUser.uid);
        displayProducts(products);
        
        // Update total products count
        totalProductsElement.textContent = products.length;
        
        alert('Product deleted successfully!');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
    }
}

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Expose functions to global scope for inline onclick handlers
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.toggleProductStatus = toggleProductStatus; 