// Firebase configuration
// Replace these with your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyDs-kky9CEb835l2hml_OjcnRMyyP9AUnI",
    authDomain: "asep2-1b798.firebaseapp.com",
    projectId: "asep2-1b798",
    storageBucket: "asep2-1b798.firebasestorage.app",
    messagingSenderId: "893765003498",
    appId: "1:893765003498:web:7d7d63840848218f26cf93",
    measurementId: "G-SRV0DX0DV5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = firebase.firestore();

// DOM elements
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const signOutButton = document.getElementById('signOutButton');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const roleSelect = document.getElementById('signupRole');
const dashboardLink = document.getElementById('dashboardLink');

// New news elements
const addNewsButton = document.getElementById('addNewsButton');
const addNewsModal = document.getElementById('addNewsModal');
const addNewsForm = document.getElementById('addNewsForm');

// Modal handling
function openModal(modal) {
    if (modal) modal.style.display = 'block';
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

// Close buttons for modals
document.querySelectorAll('.close').forEach(button => {
    button.onclick = function() {
        closeModal(loginModal);
        closeModal(signupModal);
        closeModal(addNewsModal);
    }
});

// When clicking outside of a modal, close it
window.onclick = function(event) {
    if (event.target === loginModal || event.target === signupModal || event.target === addNewsModal) {
        closeModal(loginModal);
        closeModal(signupModal);
        closeModal(addNewsModal);
    }
}

// Show login modal
if (loginButton) {
    loginButton.onclick = function(e) {
        e.preventDefault();
        openModal(loginModal);
    }
}

// Show signup modal
if (signupButton) {
    signupButton.onclick = function(e) {
        e.preventDefault();
        openModal(signupModal);
    }
}

// Show add news modal
if (addNewsButton) {
    addNewsButton.onclick = function(e) {
        e.preventDefault();
        openModal(addNewsModal);
    }
}

// Email/Password Login
if (loginForm) {
    loginForm.onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                closeModal(loginModal);
                loginForm.reset();
            })
            .catch((error) => {
                alert(error.message);
            });
    }
}

// Email/Password Sign Up
if (signupForm) {
    signupForm.onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const role = roleSelect.value;

        if (!role) {
            alert('Please select a role (Buyer or Seller)');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                return db.collection('users').doc(userCredential.user.uid).set({
                    email: email,
                    role: role,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                closeModal(signupModal);
                signupForm.reset();
            })
            .catch((error) => {
                alert(error.message);
            });
    }
}

// Handle Add News Form Submission
if (addNewsForm) {
    addNewsForm.onsubmit = async function(e) {
        e.preventDefault();
        const title = document.getElementById('newsTitle').value;
        const content = document.getElementById('newsContent').value;
        const imageUrl = document.getElementById('newsImage').value;

        try {
            await db.collection('news').add({
                title: title,
                content: content,
                imageUrl: imageUrl,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('News article added successfully!');
            closeModal(addNewsModal);
            addNewsForm.reset();
            loadNewsArticles(); // Reload news after adding a new one
        } catch (error) {
            console.error('Error adding news article:', error);
            alert('Failed to add news article: ' + error.message);
        }
    };
}

// Google Sign In
async function signInWithGoogle(isSignup = false) {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        
        if (isSignup) {
            const signupRoleSelect = document.querySelector('#signupModal #signupRole');
            const role = signupRoleSelect ? signupRoleSelect.value : '';
            
            if (!role) {
                alert('Please select a role (Buyer or Seller)');
                await auth.signOut();
                return;
            }
            
            await db.collection('users').doc(result.user.uid).set({
                email: result.user.email,
                role: role,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            const userDoc = await db.collection('users').doc(result.user.uid).get();
            if (!userDoc.exists) {
                alert('Please sign up first to select your role');
                await auth.signOut();
                return;
            }
        }
        
        closeModal(loginModal);
        closeModal(signupModal);
    } catch (error) {
        alert(error.message);
    }
}

if (googleLoginBtn) googleLoginBtn.onclick = () => signInWithGoogle(false);
if (googleSignupBtn) googleSignupBtn.onclick = () => signInWithGoogle(true);

// Sign out handler
function handleSignOut() {
    auth.signOut().then(() => {
        window.location.href = '/index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

// Make handleSignOut available globally
window.handleSignOut = handleSignOut;

// Function to load news articles
async function loadNewsArticles() {
    const newsContainer = document.querySelector('#glide_5 .glide__slides');
    if (!newsContainer) return;

    // Clear existing news articles
    newsContainer.innerHTML = '';

    try {
        const snapshot = await db.collection('news').orderBy('timestamp', 'desc').get();
        snapshot.docs.forEach(doc => {
            const news = doc.data();
            const newsCard = `
                <li class="glide__slide">
                    <div class="new__card">
                        <div class="card__header">
                            <img src="${news.imageUrl || './images/default-news.jpg'}" alt="">
                        </div>
                        <div class="card__footer">
                            <h3>${news.title}</h3>
                            <p>${news.content}</p>
                            <br>
                            <br>
                            <a href="#"><button>Read More</button></a>
                        </div>
                    </div>
                </li>
            `;
            newsContainer.innerHTML += newsCard;
        });
        
        // Destroy and re-initialize Glide.js for the news slider after new content is loaded
        if (window.newsGlide) {
            window.newsGlide.destroy();
        }
        window.newsGlide = new Glide("#glide_5", {
            type: "carousel",
            startAt: 0,
            perView: 3,
            rewin: false,
            autoplay: 3000,
            animationDuration: 800,
            animationTimingFunc: "cubic-bezier(0.165, 0.840, 0.440, 1.000)",
            breakpoints: {
                998: {
                    perView: 2,
                },
                768: {
                    perView: 1,
                },
            },
        });
        window.newsGlide.mount();

    } catch (error) {
        console.error('Error loading news articles:', error);
    }
}

// Call loadNewsArticles when the page loads and after a new article is added
document.addEventListener('DOMContentLoaded', loadNewsArticles);

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Get user role from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            // Add logged-in class to body
            document.body.classList.add('logged-in');
            
            // Update UI elements
            const userProfilePic = document.getElementById('userProfilePic');
            const userName = document.getElementById('userName');
            const userRoleDisplay = document.querySelector('.user-role');
            
            // Update profile elements if they exist
            if (userProfilePic) {
                userProfilePic.src = user.photoURL || '/images/default-avatar.png';
                userProfilePic.alt = user.displayName || user.email;
            }
            
            if (userName) {
                userName.textContent = user.displayName || user.email;
            }
            
            if (userRoleDisplay && userData) {
                userRoleDisplay.textContent = userData.role || 'Role not set';
            }

            // Show and set dashboard link based on role
            if (dashboardLink) {
                if (userData?.role === 'buyer') {
                    dashboardLink.href = '/buyer-dashboard.html';
                    dashboardLink.style.display = 'block';
                } else if (userData?.role === 'seller') {
                    dashboardLink.href = '/seller-dashboard.html';
                    dashboardLink.style.display = 'block';
                } else {
                    dashboardLink.style.display = 'none';
                }
            }

            // Check if we should skip redirection
            const urlParams = new URLSearchParams(window.location.search);
            const noRedirect = urlParams.get('noRedirect') === 'true';

            // Handle redirects only if noRedirect is false
            if (!noRedirect) {
                const currentPath = window.location.pathname;
                if (currentPath === '/' || currentPath === '/index.html') {
                    if (userData?.role === 'buyer') {
                        window.location.href = '/buyer-dashboard.html';
                    } else if (userData?.role === 'seller') {
                        window.location.href = '/seller-dashboard.html';
                    }
                } else if (currentPath === '/buyer-dashboard.html' && userData?.role !== 'buyer') {
                    window.location.href = '/seller-dashboard.html';
                } else if (currentPath === '/seller-dashboard.html' && userData?.role !== 'seller') {
                    window.location.href = '/buyer-dashboard.html';
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            // Update UI to show error state
            const userName = document.getElementById('userName');
            const userRoleDisplay = document.querySelector('.user-role');
            if (userName) userName.textContent = 'Error loading user';
            if (userRoleDisplay) userRoleDisplay.textContent = 'Please refresh';
        }
    } else {
        // User is signed out
        document.body.classList.remove('logged-in');
        
        // Reset UI elements
        const userProfilePic = document.getElementById('userProfilePic');
        const userName = document.getElementById('userName');
        const userRoleDisplay = document.querySelector('.user-role');
        
        if (userProfilePic) {
            userProfilePic.src = '/images/default-avatar.png';
            userProfilePic.alt = 'Profile';
        }
        
        if (userName) {
            userName.textContent = 'Not logged in';
        }
        
        if (userRoleDisplay) {
            userRoleDisplay.textContent = 'Please log in';
        }

        // Hide dashboard link when signed out
        if (dashboardLink) {
            dashboardLink.style.display = 'none';
        }

        // Close any open modals
        closeModal(loginModal);
        closeModal(signupModal);
    }
}); 