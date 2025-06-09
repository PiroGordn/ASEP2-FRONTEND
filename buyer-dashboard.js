// Get recommended products based on user's purchase history
async function getRecommendedProducts(userId) {
    try {
        console.log('Fetching recommended products for user:', userId);
        
        // Get all products without any filters first
        const productsSnapshot = await db.collection('products')
            .limit(12)
            .get();

        if (productsSnapshot.empty) {
            console.log('No products found in database');
            return [];
        }

        const allProducts = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).filter(product => product.status === 'active'); // Filter active products client-side

        // Get user's purchase history
        const purchasesSnapshot = await db.collection('orders')
            .where('buyerId', '==', userId)
            .get();
        
        const purchasedCategories = new Set();
        purchasesSnapshot.docs.forEach(doc => {
            const order = doc.data();
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.category) purchasedCategories.add(item.category);
                });
            }
        });

        // If user has purchase history, prioritize products from those categories
        if (purchasedCategories.size > 0) {
            const categoryProducts = allProducts.filter(product => 
                product.category && purchasedCategories.has(product.category)
            );
            
            if (categoryProducts.length > 0) {
                return categoryProducts.slice(0, 6);
            }
        }

        // If no category matches or no purchase history, return random active products
        return allProducts.slice(0, 6);

    } catch (error) {
        console.error('Error getting recommended products:', error);
        throw error;
    }
}

// Display recommended products
function displayRecommendedProducts(products) {
    const recommendedProductsElement = document.getElementById('recommendedProducts');
    if (!recommendedProductsElement) {
        console.error('Recommended products container not found');
        return;
    }

    if (!products || products.length === 0) {
        recommendedProductsElement.innerHTML = `
            <div class="empty-state" data-aos="fade-up">
                <p>No products available at the moment. Check back later!</p>
            </div>
        `;
        return;
    }

    recommendedProductsElement.innerHTML = products.map(product => {
        if (!product.name || !product.price) {
            console.warn('Product missing required fields:', product);
            return '';
        }

        // Use a relative path for the default image
        const defaultImage = '../images/products/default-product.png';
        const productImage = product.image || defaultImage;

        return `
            <div class="product" data-aos="fade-up" data-aos-delay="100">
                <div class="product__header">
                    <img src="${productImage}" alt="${product.name}" onerror="this.src='${defaultImage}'">
                </div>
                <div class="product__footer">
                    <h3>${product.name}</h3>
                    <div class="rating">
                        ${generateRatingStars(product.rating || 0)}
                    </div>
                    <div class="product__price">
                        <h4>₹${product.price}</h4>
                    </div>
                    <button type="button" class="product__btn" onclick="addToCart('${product.id}')">Add To Cart</button>
                </div>
                <ul>
                    <li>
                        <a data-tip="Quick View" data-place="left" href="product-details.html?id=${product.id}">
                            <svg>
                                <use xlink:href="./images/sprite.svg#icon-eye"></use>
                            </svg>
                        </a>
                    </li>
                    <li>
                        <a data-tip="Add To Wishlist" data-place="left" href="#" onclick="addToWishlist('${product.id}'); return false;">
                            <svg>
                                <use xlink:href="./images/sprite.svg#icon-heart-o"></use>
                            </svg>
                        </a>
                    </li>
                    <li>
                        <a data-tip="Add To Compare" data-place="left" href="#">
                            <svg>
                                <use xlink:href="./images/sprite.svg#icon-loop2"></use>
                            </svg>
                        </a>
                    </li>
                </ul>
            </div>
        `;
    }).join('');
} 