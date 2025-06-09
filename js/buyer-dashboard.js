// Buyer Dashboard JavaScript

// Firebase is already initialized in auth.js, db is available globally

// DOM Elements
const userNameElement = document.getElementById('userName');
const userRoleElement = document.getElementById('userRole');
const userProfilePic = document.getElementById('userProfilePic');
const activeOrdersElement = document.getElementById('activeOrders');
const recentPurchasesElement = document.getElementById('recentPurchases');
const ordersListElement = document.getElementById('ordersList');
const wishlistGridElement = document.getElementById('wishlistGrid');

// Initialize dashboard
async function initializeDashboard() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            window.location.href = '/index.html';
            return;
        }

        // Get user data
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            console.error('User document not found');
            return;
        }

        const userData = userDoc.data();
        
        // Update profile info
        if (userNameElement) userNameElement.textContent = user.displayName || user.email;
        if (userRoleElement) userRoleElement.textContent = userData.role || 'Buyer';
        if (userProfilePic) {
            userProfilePic.src = user.photoURL || '/images/default-avatar.png';
            userProfilePic.alt = user.displayName || 'Profile Picture';
        }

        // Load dashboard statistics
        await loadDashboardStats(user.uid);
        
        // Load recent orders
        await loadRecentOrders(user.uid);

        // Set up real-time listener for wishlist updates
        setupWishlistListener(user.uid);

        // Initialize AOS
        AOS.init({
            duration: 1200,
            once: true
        });

    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Set up real-time listener for wishlist updates
function setupWishlistListener(userId) {
    console.log('Setting up wishlist listener for user:', userId);
    // Listen to the specific wishlist document for the user
    db.collection('wishlists').doc(userId)
        .onSnapshot(async (doc) => {
            console.log('Wishlist update received:', doc.exists ? doc.data() : 'No document');
            if (doc.exists) {
                const wishlist = doc.data();
                if (wishlist.products && wishlist.products.length > 0) {
                    console.log('Loading wishlist items:', wishlist.products);
                    await loadWishlistItems(wishlist.products);
                } else {
                    console.log('No products in wishlist');
                    showEmptyWishlist();
                }
            } else {
                console.log('No wishlist document exists');
                showEmptyWishlist();
            }
        }, (error) => {
            console.error('Error listening to wishlist updates:', error);
            showEmptyWishlist();
        });
}

// Load wishlist items
async function loadWishlistItems(productIds) {
    try {
        console.log('Starting to load wishlist items:', productIds);
        const productPromises = productIds.map(id => 
            db.collection('products').doc(id).get()
        );
        
        const productDocs = await Promise.all(productPromises);
        const products = productDocs
            .filter(doc => doc.exists)
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        console.log('Loaded product details:', products);

        if (wishlistGridElement) {
            if (products.length === 0) {
                console.log('No valid products found');
                showEmptyWishlist();
                return;
            }

            const productsHTML = products.map(product => `
                <div class="product__item" data-aos="fade-up">
                    <div class="product__header">
                        <img src="${product.imageUrl || './images/product-placeholder.png'}" alt="${product.name}" onerror="this.onerror=null;this.src='./images/product-placeholder.png';">
                    </div>
                    <div class="product__footer">
                        <h3>${product.name}</h3>
                        <div class="product__price">
                            <h4>₹${product.price}</h4>
                        </div>
                        <div class="product__actions">
                            <button onclick="removeFromWishlist('${product.id}')" class="remove-btn">
                                <svg>
                                    <use xlink:href="./images/sprite.svg#icon-heart"></use>
                                </svg>
                                Remove
                            </button>
                            <a href="./product-details.html?id=${product.id}" class="view-btn">View Details</a>
                        </div>
                    </div>
                </div>
            `).join('');

            console.log('Setting wishlist grid HTML');
            wishlistGridElement.innerHTML = productsHTML;
        } else {
            console.error('Wishlist grid element not found in DOM');
        }
    } catch (error) {
        console.error('Error loading wishlist items:', error);
        showEmptyWishlist();
    }
}

// Show empty wishlist message
function showEmptyWishlist() {
    if (wishlistGridElement) {
        wishlistGridElement.innerHTML = `
            <div class="empty-wishlist">
                <svg>
                    <use xlink:href="./images/sprite.svg#icon-heart-o"></use>
                </svg>
                <p>Your wishlist is empty</p>
                <a href="./index.html?noRedirect=true#category" class="primary-btn">Browse Products</a>
            </div>
        `;
    }
}

// Remove item from wishlist
async function removeFromWishlist(productId) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const wishlistRef = db.collection('wishlists').doc(user.uid);
        await wishlistRef.update({
            products: firebase.firestore.FieldValue.arrayRemove(productId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // The listener will automatically update the UI
    } catch (error) {
        console.error('Error removing item from wishlist:', error);
        alert('Error removing item from wishlist. Please try again.');
    }
}

// Load dashboard statistics
async function loadDashboardStats(userId) {
    try {
        // Get active orders count
        const activeOrders = await db.collection('orders')
            .where('buyerId', '==', userId)
            .where('status', '==', 'active')
            .get();
        
        if (activeOrdersElement) {
            activeOrdersElement.textContent = activeOrders.size;
        }

        // Get recent purchases count
        const recentPurchases = await db.collection('orders')
            .where('buyerId', '==', userId)
            .where('status', '==', 'completed')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (recentPurchasesElement) {
            recentPurchasesElement.textContent = recentPurchases.size;
        }

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load recent orders
async function loadRecentOrders(userId) {
    try {
        const ordersSnapshot = await db.collection('orders')
            .where('buyerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (ordersListElement) {
            if (ordersSnapshot.empty) {
                ordersListElement.innerHTML = '<p class="no-orders">No orders yet</p>';
                return;
            }

            const ordersHTML = ordersSnapshot.docs.map(doc => {
                const order = doc.data();
                return `
                    <div class="order__card" data-aos="fade-up">
                        <div class="order__header">
                            <h3>Order #${doc.id.slice(-6)}</h3>
                            <span class="order__status ${order.status}">${order.status}</span>
                        </div>
                        <div class="order__details">
                            <p>Date: ${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                            <p>Total: ₹${order.total || 0}</p>
                        </div>
                        <button onclick="viewOrderDetails('${doc.id}')" class="order__btn">View Details</button>
                    </div>
                `;
            }).join('');

            ordersListElement.innerHTML = ordersHTML;
        }

    } catch (error) {
        console.error('Error loading recent orders:', error);
        if (ordersListElement) {
            ordersListElement.innerHTML = '<p class="error-message">Error loading orders. Please try again later.</p>';
        }
    }
}

// View order details
function viewOrderDetails(orderId) {
    window.location.href = `/order-details.html?id=${orderId}`;
}

// Make removeFromWishlist available globally
window.removeFromWishlist = removeFromWishlist;

// Initialize dashboard when auth state changes
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        initializeDashboard();
    } else {
        window.location.href = '/index.html';
    }
}); 