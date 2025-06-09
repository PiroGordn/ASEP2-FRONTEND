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
const auth = firebase.auth();
const db = firebase.firestore();

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
    }
});

// When clicking outside of a modal, close it
window.onclick = function(event) {
    if (event.target === loginModal || event.target === signupModal) {
        closeModal(loginModal);
        closeModal(signupModal);
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

        // Close any open modals
        closeModal(loginModal);
        closeModal(signupModal);
    }
}); 