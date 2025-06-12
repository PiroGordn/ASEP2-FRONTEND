/*
=============
Navigation
=============
 */
const navOpen = document.querySelector(".nav__hamburger");
const navClose = document.querySelector(".close__toggle");
const menu = document.querySelector(".nav__menu");
const scrollLink = document.querySelectorAll(".scroll-link");
const navContainer = document.querySelector(".nav__menu");

navOpen.addEventListener("click", () => {
  menu.classList.add("open");
  document.body.classList.add("active");
  navContainer.style.left = "0";
  navContainer.style.width = "30rem";
});

navClose.addEventListener("click", () => {
  menu.classList.remove("open");
  document.body.classList.remove("active");
  navContainer.style.left = "-30rem";
  navContainer.style.width = "0";
});

/*
=============
Fixed Navigation
=============
 */

const navBar = document.querySelector(".navigation");
const gotoTop = document.querySelector(".goto-top");

// Smooth Scroll
Array.from(scrollLink).map(link => {
  link.addEventListener("click", e => {
    // Prevent Default
    e.preventDefault();

    const id = e.currentTarget.getAttribute("href").slice(1);
    const element = document.getElementById(id);
    const navHeight = navBar.getBoundingClientRect().height;
    const fixNav = navBar.classList.contains("fix__nav");
    let position = element.offsetTop - navHeight;

    if (!fixNav) {
      position = position - navHeight;
    }

    window.scrollTo({
      left: 0,
      top: position,
    });
    navContainer.style.left = "-30rem";
    document.body.classList.remove("active");
  });
});

// Fix NavBar

window.addEventListener("scroll", e => {
  const scrollHeight = window.pageYOffset;
  const navHeight = navBar.getBoundingClientRect().height;
  if (scrollHeight > navHeight) {
    navBar.classList.add("fix__nav");
  } else {
    navBar.classList.remove("fix__nav");
  }

  if (scrollHeight > 300) {
    gotoTop.classList.add("show-top");
  } else {
    gotoTop.classList.remove("show-top");
  }
});

/*
=============
Search Functionality
=============
 */

import { getProducts, displayProductItems } from "./products.js";

// Get search elements
const searchIcon = document.querySelector('.icon__search');
const searchOverlay = document.getElementById('searchOverlay');
const closeSearchButton = document.querySelector('.close-search');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

// Function to open search overlay
function openSearchOverlay() {
  searchOverlay.style.display = 'flex';
  document.body.classList.add('no-scroll'); // Optional: Prevent scrolling when overlay is open
  searchInput.focus();
}

// Function to close search overlay
function closeSearchOverlay() {
  searchOverlay.style.display = 'none';
  document.body.classList.remove('no-scroll');
  searchInput.value = ''; // Clear search input on close
}

// Event Listeners
searchIcon.addEventListener('click', (e) => {
  e.preventDefault(); // Prevent default anchor behavior
  openSearchOverlay();
});
closeSearchButton.addEventListener('click', closeSearchOverlay);

// Close overlay if clicked outside content
window.addEventListener('click', (event) => {
  if (event.target === searchOverlay) {
    closeSearchOverlay();
  }
});

// Handle search button click or Enter key press
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});

function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (query) {
    // console.log('Search query:', query);
    // alert(`Searching for: ${query}`); // For demonstration
    
    getProducts().then(products => {
      const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        (product.category && product.category.toLowerCase().includes(query))
      );
      displayProductItems(filteredProducts);
      closeSearchOverlay();

      // Scroll to the category section to show results
      const categorySection = document.getElementById('category');
      if (categorySection) {
        categorySection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  } else {
    alert('Please enter a search term.');
  }
}
