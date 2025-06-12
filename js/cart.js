import { auth, db } from "./auth.js"; // Adjust path as needed based on your project structure

const cartTableBody = document.querySelector('.cart__table tbody');
const cartSubtotalElement = document.getElementById('cartSubtotal');
const cartOverallTotalElement = document.getElementById('cartOverallTotal');
const cartTaxAmountElement = document.getElementById('cartTaxAmount');

function renderCartItemRow(productId, product, quantity) {
    const itemSubtotal = product.price * quantity;
    return `
        <tr>
            <td>
                <div class="cart__thumbnail">
                    <img src="${product.imageUrl}" alt="${product.name}">
                </div>
            </td>
            <td>
                <a href="product-details.html?id=${productId}">${product.name}</a>
            </td>
            <td>₹${product.price.toFixed(2)}</td>
            <td>
                <div class="qty__box">
                    <div class="qty__btn update-quantity" data-product-id="${productId}" data-action="decrease">-</div>
                    <input type="text" value="${quantity}" class="qty__input" readonly>
                    <div class="qty__btn update-quantity" data-product-id="${productId}" data-action="increase">+</div>
                </div>
            </td>
            <td>₹<span class="item-subtotal">${itemSubtotal.toFixed(2)}</span></td>
            <td>
                <a href="#" class="remove-item" data-product-id="${productId}">
                    <svg>
                        <use xlink:href="./images/sprite.svg#icon-trash"></use>
                    </svg>
                </a>
            </td>
        </tr>
    `;
}

function updateCartTotalsDisplay(totalSubtotal) {
    if (cartSubtotalElement) cartSubtotalElement.textContent = `₹${totalSubtotal.toFixed(2)}`;
    const tax = totalSubtotal * 0.08;
    if (cartTaxAmountElement) cartTaxAmountElement.textContent = `₹${tax.toFixed(2)}`;
    const overallTotal = totalSubtotal + tax;
    if (cartOverallTotalElement) cartOverallTotalElement.textContent = `₹${overallTotal.toFixed(2)}`;
}

async function updateOverallCartTotals() {
    const user = auth.currentUser;
    if (!user) {
        updateCartTotalsDisplay(0);
        return;
    }

    try {
        const cartDoc = await db.collection('carts').doc(user.uid).get();
        if (!cartDoc.exists || !cartDoc.data().items || Object.keys(cartDoc.data().items).length === 0) {
            updateCartTotalsDisplay(0);
            return;
        }

        const cartItems = cartDoc.data().items;
        let totalSubtotal = 0;
        const productPromises = [];
        const productsMap = new Map();

        for (const productId in cartItems) {
            productPromises.push(
                db.collection('products').doc(productId).get().then(productDoc => {
                    if (productDoc.exists) {
                        productsMap.set(productId, productDoc.data());
                    }
                })
            );
        }
        await Promise.all(productPromises);

        for (const productId in cartItems) {
            const quantity = cartItems[productId];
            const product = productsMap.get(productId);
            if (product) {
                totalSubtotal += product.price * quantity;
            }
        }
        updateCartTotalsDisplay(totalSubtotal);

    } catch (error) {
        console.error('Error updating overall cart totals:', error);
        updateCartTotalsDisplay(0);
    }
}

async function loadCartItems() {
    const user = auth.currentUser;
    if (!user) {
        if (cartTableBody) cartTableBody.innerHTML = '<tr><td colspan="6">Please log in to view your cart.</td></tr>';
        updateCartTotalsDisplay(0);
        return;
    }

    if (!cartTableBody) {
        console.warn("Cart table body not found.");
        return;
    }

    cartTableBody.innerHTML = '<tr><td colspan="6">Loading cart...</td></tr>';

    try {
        const cartDoc = await db.collection('carts').doc(user.uid).get({ source: 'server' });
        if (!cartDoc.exists || !cartDoc.data().items || Object.keys(cartDoc.data().items).length === 0) {
            cartTableBody.innerHTML = '<tr><td colspan="6">Your cart is empty.</td></tr>';
            updateCartTotalsDisplay(0);
            return;
        }

        const cartItems = cartDoc.data().items;
        let cartHtml = '';
        const productPromises = [];
        const productsMap = new Map();

        for (const productId in cartItems) {
            productPromises.push(
                db.collection('products').doc(productId).get().then(productDoc => {
                    if (productDoc.exists) {
                        productsMap.set(productId, productDoc.data());
                    }
                })
            );
        }

        await Promise.all(productPromises);

        for (const productId in cartItems) {
            const quantity = cartItems[productId];
            const product = productsMap.get(productId);
            if (product) {
                cartHtml += renderCartItemRow(productId, product, quantity);
            }
        }

        cartTableBody.innerHTML = cartHtml;
        updateOverallCartTotals();

        document.querySelectorAll('.update-quantity').forEach(button => {
            button.addEventListener('click', updateQuantity);
        });
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', removeItemFromCart);
        });

    } catch (error) {
        console.error('Error loading cart items:', error);
        if (cartTableBody) cartTableBody.innerHTML = '<tr><td colspan="6">Error loading cart. Please try again.</td></tr>';
        updateCartTotalsDisplay(0);
    }
}

async function updateQuantity(event) {
    event.preventDefault();
    const productId = event.target.dataset.productId;
    const action = event.target.dataset.action;
    const user = auth.currentUser;

    if (!user || !productId) return;

    try {
        const cartRef = db.collection('carts').doc(user.uid);
        const cartDoc = await cartRef.get();
        if (!cartDoc.exists || !cartDoc.data().items || !cartDoc.data().items[productId]) return;

        const cartItems = { ...cartDoc.data().items };
        let currentQuantity = cartItems[productId];
        let newQuantity = currentQuantity;

        const productDoc = await db.collection('products').doc(productId).get();
        const product = productDoc.data();

        if (action === 'increase') {
            if (product && product.stock > currentQuantity) {
                newQuantity = currentQuantity + 1;
            } else {
                alert(`Cannot add more. Only ${product.stock} left in stock.`);
                return;
            }
        } else if (action === 'decrease') {
            if (currentQuantity > 1) {
                newQuantity = currentQuantity - 1;
            } else {
                removeItemFromCart(event, productId);
                return;
            }
        }

        if (newQuantity !== currentQuantity) {
            cartItems[productId] = newQuantity;
            await cartRef.set({ items: cartItems, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

            const row = event.target.closest('tr');
            const qtyInput = row.querySelector('.qty__input');
            const itemSubtotalElement = row.querySelector('.item-subtotal');

            if (qtyInput) qtyInput.value = newQuantity;
            if (itemSubtotalElement && product) itemSubtotalElement.textContent = (product.price * newQuantity).toFixed(2);
            updateOverallCartTotals();
        }

    } catch (error) {
        console.error('Error updating quantity:', error);
        alert('Error updating quantity. Please try again.');
    }
}

async function removeItemFromCart(event, productId) {
    event.preventDefault();
    const idToRemove = productId || event.target.closest('.remove-item').dataset.productId;
    const user = auth.currentUser;

    if (!user || !idToRemove) return;

    if (!confirm('Are you sure you want to remove this item from your cart?')) return;

    try {
        const cartRef = db.collection('carts').doc(user.uid);
        const cartDoc = await cartRef.get();
        if (!cartDoc.exists || !cartDoc.data().items || !cartDoc.data().items[idToRemove]) return;

        const cartItems = { ...cartDoc.data().items };
        delete cartItems[idToRemove];

        if (Object.keys(cartItems).length === 0) {
            await cartRef.update({
                items: firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await cartRef.update({
                [`items.${idToRemove}`]: firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        const rowToRemove = event.target.closest('tr');
        if (rowToRemove) rowToRemove.remove();

        updateOverallCartTotals();

    } catch (error) {
        console.error('Error removing item:', error);
        alert('Error removing item from cart. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', loadCartItems);

auth.onAuthStateChanged(() => {
    loadCartItems();
});
