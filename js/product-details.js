import { auth, db } from "./auth.js";
// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// DOM Elements
const productImage = document.getElementById('productImage');
const productCategory = document.getElementById('productCategory');
const productName = document.getElementById('productName');
const productPrice = document.getElementById('productPrice');
const productDescription = document.getElementById('productDescription');
const productCondition = document.getElementById('productCondition');
const productTags = document.getElementById('productTags');
const stockStatus = document.getElementById('stockStatus');
const quantityInput = document.getElementById('quantity');
const addToCartBtn = document.getElementById('addToCartBtn');
const addToWishlistBtn = document.getElementById('addToWishlistBtn');
const sellerProfilePic = document.getElementById('sellerProfilePic');
const sellerName = document.getElementById('sellerName');
const sellerRating = document.getElementById('sellerRating');
const reviewsList = document.getElementById('reviewsList');
const addReviewForm = document.getElementById('addReviewForm');
const reviewForm = document.getElementById('reviewForm');
const dashboardLink = document.getElementById('dashboardLink');

// Load product details
async function loadProductDetails() {
    if (!productId) {
        window.location.href = '/index.html';
        return;
    }

    try {
        const productDoc = await db.collection('products').doc(productId).get();
        
        if (!productDoc.exists) {
            window.location.href = '/index.html';
            return;
        }

        const product = productDoc.data();
        
        // Update UI with product details
        document.title = `${product.name} - College Store`;
        productImage.src = product.imageUrl;
        productImage.alt = product.name;
        productCategory.textContent = product.category;
        productName.textContent = product.name;
        productPrice.textContent = `₹${product.price}`;
        productDescription.textContent = product.description;
        productCondition.textContent = product.condition || 'New';
        
        // Check wishlist status
        await checkWishlistStatus();

        // Update stock status
        if (product.stock > 0) {
            stockStatus.textContent = `In Stock (${product.stock} available)`;
            stockStatus.className = 'stock-status in-stock';
            quantityInput.max = product.stock;
            addToCartBtn.disabled = false;
        } else {
            stockStatus.textContent = 'Out of Stock';
            stockStatus.className = 'stock-status out-of-stock';
            quantityInput.max = 0;
            addToCartBtn.disabled = true;
        }

        // Display tags
        if (product.tags && product.tags.length > 0) {
            productTags.innerHTML = product.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');
        }

        // Load seller information
        const sellerDoc = await db.collection('users').doc(product.sellerId).get();
        const seller = sellerDoc.data();
        
        sellerProfilePic.src = seller.photoURL || './images/default-avatar.png';
        sellerName.textContent = seller.displayName || seller.email;
        
        // Load reviews
        loadReviews();
        
        // Show review form for buyers who haven't reviewed
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.data();
                
                if (userData.role === 'buyer') {
                    const reviewDoc = await db.collection('reviews')
                        .where('productId', '==', productId)
                        .where('userId', '==', user.uid)
                        .get();
                    
                    if (reviewDoc.empty) {
                        addReviewForm.style.display = 'block';
                    }
                }

                // Handle Dashboard Link Visibility
                if (dashboardLink) {
                    dashboardLink.style.display = 'block';
                    if (userData.role === 'buyer') {
                        dashboardLink.href = '/buyer-dashboard.html';
                    } else if (userData.role === 'seller') {
                        dashboardLink.href = '/seller-dashboard.html';
                    }
                }

            } else {
                // User is not logged in, hide dashboard link
                if (dashboardLink) {
                    dashboardLink.style.display = 'none';
                }
            }
        });

    } catch (error) {
        console.error('Error loading product details:', error);
        alert('Error loading product details. Please try again later.');
    }
}

// Load product reviews
async function loadReviews() {
    try {
        const reviewsSnapshot = await db.collection('reviews')
            .where('productId', '==', productId)
            .orderBy('createdAt', 'desc')
            .get();

        const reviews = reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate average rating
        if (reviews.length > 0) {
            const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
            document.getElementById('productRating').innerHTML = getStarRating(avgRating);
            document.getElementById('reviewCount').textContent = `(${reviews.length} reviews)`;
        }

        // Display reviews
        reviewsList.innerHTML = reviews.map(review => `
            <div class="review">
                <div class="review__header">
                    <div class="review__rating">${getStarRating(review.rating)}</div>
                    <div class="review__author">${review.userName}</div>
                    <div class="review__date">${new Date(review.createdAt.toDate()).toLocaleDateString()}</div>
                </div>
                <div class="review__content">${review.text}</div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Helper function to generate star rating HTML
function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
        ${`<svg class="star-full"><use xlink:href="./images/sprite.svg#icon-star-full"></use></svg>`.repeat(fullStars)}
        ${hasHalfStar ? `<svg class="star-half"><use xlink:href="./images/sprite.svg#icon-star-half"></use></svg>` : ''}
        ${`<svg class="star-empty"><use xlink:href="./images/sprite.svg#icon-star-empty"></use></svg>`.repeat(emptyStars)}
    `;
}

// Quantity selector handlers
document.getElementById('decreaseQuantity').onclick = () => {
    const currentValue = parseInt(quantityInput.value);
    if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
    }
};

document.getElementById('increaseQuantity').onclick = () => {
    const currentValue = parseInt(quantityInput.value);
    const maxValue = parseInt(quantityInput.max);
    if (currentValue < maxValue) {
        quantityInput.value = currentValue + 1;
    }
};

// Add to cart handler
addToCartBtn.onclick = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to add items to cart');
        return;
    }

    try {
        const quantity = parseInt(quantityInput.value);
        const productDoc = await db.collection('products').doc(productId).get();
        const product = productDoc.data();

        if (quantity > product.stock) {
            alert('Not enough stock available');
            return;
        }

        // Add to cart collection
        await db.collection('carts').add({
            userId: user.uid,
            productId: productId,
            quantity: quantity,
            price: product.price,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Product added to cart successfully!');
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding to cart. Please try again.');
    }
};

// Check if product is in wishlist
async function checkWishlistStatus() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const wishlistDoc = await db.collection('wishlists').doc(user.uid).get();
        if (wishlistDoc.exists) {
            const wishlist = wishlistDoc.data();
            if (wishlist.products && wishlist.products.includes(productId)) {
                addToWishlistBtn.classList.add('in-wishlist');
                addToWishlistBtn.innerHTML = `
                    <svg>
                        <use xlink:href="./images/sprite.svg#icon-heart"></use>
                    </svg>
                    In Wishlist
                `;
            }
        }
    } catch (error) {
        console.error('Error checking wishlist status:', error);
    }
}

// Add to wishlist handler
addToWishlistBtn.onclick = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to add items to wishlist');
        return;
    }

    try {
        const wishlistRef = db.collection('wishlists').doc(user.uid);
        const wishlistDoc = await wishlistRef.get();

        if (wishlistDoc.exists && wishlistDoc.data().products?.includes(productId)) {
            // Remove from wishlist
            await wishlistRef.update({
                products: firebase.firestore.FieldValue.arrayRemove(productId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            addToWishlistBtn.classList.remove('in-wishlist');
            addToWishlistBtn.innerHTML = `
                <svg>
                    <use xlink:href="./images/sprite.svg#icon-heart-o"></use>
                </svg>
                Add to Wishlist
            `;
            alert('Product removed from wishlist');
            
        } else {
            // Add to wishlist
            if (!wishlistDoc.exists) {
                // Create new wishlist document if it doesn't exist
                await wishlistRef.set({
                    products: [productId],
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Update existing wishlist document
                await wishlistRef.update({
                    products: firebase.firestore.FieldValue.arrayUnion(productId),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            addToWishlistBtn.classList.add('in-wishlist');
            addToWishlistBtn.innerHTML = `
                <svg>
                    <use xlink:href="./images/sprite.svg#icon-heart"></use>
                </svg>
                In Wishlist
            `;
            alert('Product added to wishlist');
        }
    } catch (error) {
        console.error('Error updating wishlist:', error);
        alert('Error updating wishlist. Please try again.');
    }
};

// Handle review submission
if (reviewForm) {
    reviewForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to submit a review');
            return;
        }

        try {
            const rating = parseInt(document.getElementById('rating').value);
            const text = document.getElementById('reviewText').value;

            await db.collection('reviews').add({
                productId: productId,
                userId: user.uid,
                userName: user.displayName || user.email,
                rating: rating,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('Review submitted successfully!');
            reviewForm.reset();
            addReviewForm.style.display = 'none';
            loadReviews(); // Reload reviews
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Error submitting review. Please try again.');
        }
    };
}

// Load product details when page loads
loadProductDetails(); 