import { auth, db } from "./auth.js"; // Adjust path as needed

// Get products from Firebase
const getProducts = async () => {
  try {
    const productsSnapshot = await db.collection('products')
      .where('status', '==', 'active')
      .get();
    
    return productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error('Error fetching products:', err);
    return [];
  }
};

/*
=============
Load Category Products
=============
 */
const categoryCenter = document.querySelector(".category__center");

window.addEventListener("DOMContentLoaded", async function () {
  const products = await getProducts();
  displayProductItems(products);
  updateCartTotal(); // Ensure cart total is updated on page load
});

const displayProductItems = items => {
  let displayProduct = items.map(
    product => ` 
                  <div class="product category__products" data-id="${product.id}">
                    <div class="product__header">
                      <img src="${product.imageUrl}" alt="${product.name}">
                    </div>
                    <div class="product__footer">
                      <h3>${product.name}</h3>
                      <div class="rating">
                        <svg>
                          <use xlink:href="./images/sprite.svg#icon-star-full"></use>
                        </svg>
                        <svg>
                          <use xlink:href="./images/sprite.svg#icon-star-full"></use>
                        </svg>
                        <svg>
                          <use xlink:href="./images/sprite.svg#icon-star-full"></use>
                        </svg>
                        <svg>
                          <use xlink:href="./images/sprite.svg#icon-star-full"></use>
                        </svg>
                        <svg>
                          <use xlink:href="./images/sprite.svg#icon-star-empty"></use>
                        </svg>
                      </div>
                      <div class="product__price">
                        <h4>₹${product.price}</h4>
                      </div>
                      <button type="button" class="product__btn" data-id="${product.id}">Add To Cart</button>
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
                        <a data-tip="Add To Wishlist" data-place="left" href="#" class="add-to-wishlist-btn">
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
                  `
  );

  displayProduct = displayProduct.join("");
  if (categoryCenter) {
    categoryCenter.innerHTML = displayProduct;

    // Add event listener for Add To Cart buttons using event delegation
    categoryCenter.addEventListener('click', async (e) => {
      const target = e.target.closest('.product__btn');
      if (target && target.textContent.includes('Add To Cart')) {
        const productId = target.dataset.id;
        await addToCart(productId);
      }
      const wishlistTarget = e.target.closest('.add-to-wishlist-btn');
      if (wishlistTarget) {
        e.preventDefault(); // Prevent default scroll-to-top behavior
        const productCard = wishlistTarget.closest('.product');
        if (productCard) {
          const productId = productCard.dataset.id;
          await addToWishlist(e, productId); // Pass event and productId
        }
      }
    });
  }
};

/*
=============
Filtering
=============
 */

const filterBtn = document.querySelectorAll(".filter-btn");
const categoryContainer = document.getElementById("category");

if (categoryContainer) {
  categoryContainer.addEventListener("click", async e => {
    const target = e.target.closest(".section__title");
    if (!target) return;

    const id = target.dataset.id;
    const products = await getProducts();

    if (id) {
      // remove active from buttons
      Array.from(filterBtn).forEach(btn => {
        btn.classList.remove("active");
      });
      target.classList.add("active");

      // Load Products
      let menuCategory = products.filter(product => {
        if (id === "All Products") {
          return true;
        }
        return product.category === id;
      });

      displayProductItems(menuCategory);
    }
  });
}

/*
=============
Product Details Left
=============
 */
const pic1 = document.getElementById("pic1");
const pic2 = document.getElementById("pic2");
const pic3 = document.getElementById("pic3");
const pic4 = document.getElementById("pic4");
const pic5 = document.getElementById("pic5");
const picContainer = document.querySelector(".product__pictures");
const zoom = document.getElementById("zoom");
const pic = document.getElementById("pic");

// Picture List
const picList = [pic1, pic2, pic3, pic4, pic5];

// Active Picture
let picActive = 1;

["mouseover", "touchstart"].forEach(event => {
  if (picContainer) {
    picContainer.addEventListener(event, e => {
      const target = e.target.closest("img");
      if (!target) return;
      const id = target.id.slice(3);
      changeImage(`./images/products/iPhone/iphone${id}.jpeg`, id);
    });
  }
});

// change active image
const changeImage = (imgSrc, n) => {
  // change the main image
  pic.src = imgSrc;
  // change the background-image
  zoom.style.backgroundImage = `url(${imgSrc})`;
  //   remove the border from the previous active side image
  picList[picActive - 1].classList.remove("img-active");
  // add to the active image
  picList[n - 1].classList.add("img-active");
  //   update the active side picture
  picActive = n;
};

/*
=============
Product Details Bottom
=============
 */

const btns = document.querySelectorAll(".detail-btn");
const detail = document.querySelector(".product-detail__bottom");
const contents = document.querySelectorAll(".content");

if (detail) {
  detail.addEventListener("click", e => {
    const target = e.target.closest(".detail-btn");
    if (!target) return;

    const id = target.dataset.id;
    if (id) {
      Array.from(btns).forEach(btn => {
        // remove active from all btn
        btn.classList.remove("active");
        e.target.closest(".detail-btn").classList.add("active");
      });
      // hide other active
      Array.from(contents).forEach(content => {
        content.classList.remove("active");
      });
      const element = document.getElementById(id);
      element.classList.add("active");
    }
  });
}

// Add to wishlist function
async function addToWishlist(event, productId) {
  event.preventDefault(); // Prevent default anchor link behavior (page jump to top)
  const user = auth.currentUser;
  if (!user) {
    alert('Please log in to add items to wishlist');
    return;
  }

  try {
    const wishlistRef = db.collection('wishlists').doc(user.uid);
    await wishlistRef.set({
      products: firebase.firestore.FieldValue.arrayUnion(productId),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    alert('Product added to wishlist!');
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    alert('Error adding to wishlist. Please try again.');
  }
}

// Add to cart function
async function addToCart(productId) {
  const user = auth.currentUser;
  if (!user) {
    alert('Please log in to add items to cart');
    return;
  }

  try {
    const productDoc = await db.collection('products').doc(productId).get();
    const product = productDoc.data();

    if (!product || product.status !== 'active') {
      alert('Product not available or no longer active.');
      return;
    }

    const cartRef = db.collection('carts').doc(user.uid);
    const cartDoc = await cartRef.get();

    let currentQuantity = 0;
    let cartItems = {};

    if (cartDoc.exists) {
      const cartData = cartDoc.data();
      if (cartData.items) {
        cartItems = { ...cartData.items }; // Copy existing items
        if (cartData.items[productId]) {
          currentQuantity = cartData.items[productId];
        }
      }
    }

    if (product.stock <= currentQuantity) {
      alert(`Only ${product.stock} of ${product.name} left in stock. You already have ${currentQuantity} in your cart.`);
      return;
    }

    // Increment quantity or add new item
    const newQuantity = currentQuantity + 1;
    cartItems[productId] = newQuantity;

    await cartRef.set({
      items: cartItems,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {
      merge: true
    });

    alert(`${product.name} added to cart! Quantity: ${newQuantity}`);
    updateCartTotal(); // Update the cart total badge

  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('Error adding to cart. Please try again.');
  }
}

// Function to update the cart total badge
async function updateCartTotal() {
  const user = auth.currentUser;
  const cartTotalElement = document.getElementById('cart__total');

  if (!cartTotalElement) {
    console.warn("Cart total element not found.");
    return;
  }

  if (!user) {
    cartTotalElement.textContent = '0';
    return;
  }

  try {
    const cartDoc = await db.collection('carts').doc(user.uid).get();
    let totalItems = 0;
    if (cartDoc.exists) {
      const cartData = cartDoc.data();
      if (cartData.items) {
        for (const productId in cartData.items) {
          totalItems += cartData.items[productId];
        }
      }
    }
    cartTotalElement.textContent = totalItems.toString();
  } catch (error) {
    console.error('Error updating cart total:', error);
    cartTotalElement.textContent = '0';
  }
}

// Call updateCartTotal when the page loads and on auth state change (from auth.js)
// This assumes 'auth' and 'db' are globally available from auth.js
// If not, ensure auth.js loads before products.js or pass them around
if (typeof auth !== 'undefined' && typeof db !== 'undefined') {
  auth.onAuthStateChanged(updateCartTotal);
}