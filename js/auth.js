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
const userContent = document.getElementById('userContent');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');

// Close buttons for modals
document.querySelectorAll('.close').forEach(button => {
  button.onclick = function() {
    loginModal.style.display = 'none';
    signupModal.style.display = 'none';
  }
});

// When clicking outside of a modal, close it
window.onclick = function(event) {
  if (event.target == loginModal || event.target == signupModal) {
    loginModal.style.display = 'none';
    signupModal.style.display = 'none';
  }
}

// Show login modal
loginButton.onclick = function(e) {
  e.preventDefault();
  loginModal.style.display = 'block';
}

// Show signup modal
signupButton.onclick = function(e) {
  e.preventDefault();
  signupModal.style.display = 'block';
}

// Email/Password Login
loginForm.onsubmit = function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      loginModal.style.display = 'none';
      loginForm.reset();
    })
    .catch((error) => {
      alert(error.message);
    });
}

// Email/Password Sign Up
signupForm.onsubmit = function(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('userRole').value;

  if (!role) {
    alert('Please select a role (Buyer or Seller)');
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Store user role in Firestore
      return db.collection('users').doc(userCredential.user.uid).set({
        email: email,
        role: role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      signupModal.style.display = 'none';
      signupForm.reset();
    })
    .catch((error) => {
      alert(error.message);
    });
}

// Google Sign In
async function signInWithGoogle(isSignup = false) {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    
    if (isSignup) {
      const role = document.getElementById('userRole').value;
      if (!role) {
        alert('Please select a role (Buyer or Seller)');
        // Sign out the user if they haven't selected a role
        await auth.signOut();
        return;
      }
      
      // Store user role in Firestore
      await db.collection('users').doc(result.user.uid).set({
        email: result.user.email,
        role: role,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Check if user exists in Firestore
      const userDoc = await db.collection('users').doc(result.user.uid).get();
      if (!userDoc.exists) {
        alert('Please sign up first to select your role');
        await auth.signOut();
        return;
      }
    }
    
    loginModal.style.display = 'none';
    signupModal.style.display = 'none';
  } catch (error) {
    alert(error.message);
  }
}

googleLoginBtn.onclick = () => signInWithGoogle(false);
googleSignupBtn.onclick = () => signInWithGoogle(true);

// Sign out
signOutButton.onclick = function(e) {
  e.preventDefault();
  auth.signOut();
}

// Auth state observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      // Get user role from Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      
      // Update UI
      const authButtons = document.getElementById('authButtons');
      if (authButtons) authButtons.style.display = 'none';
      signOutButton.style.display = 'block';
      
      userContent.innerHTML = `
        <div class="user-info">
          <img src="${user.photoURL || './images/default-avatar.png'}" alt="Profile" class="profile-pic">
          <div class="user-details">
            <span class="user-name">${user.displayName || user.email}</span>
            <span class="user-role">${userData?.role || 'Role not set'}</span>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    // User is signed out
    userContent.innerHTML = `
      <div id="authButtons" class="auth-buttons">
        <a href="#" id="loginButton">Login</a>
        <a href="#" id="signupButton">Sign Up</a>
      </div>
    `;
    signOutButton.style.display = 'none';
    
    // Reattach event listeners
    document.getElementById('loginButton').onclick = function(e) {
      e.preventDefault();
      loginModal.style.display = 'block';
    }
    document.getElementById('signupButton').onclick = function(e) {
      e.preventDefault();
      signupModal.style.display = 'block';
    }
  }
}); 