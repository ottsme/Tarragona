// --- Core Data and Initialization ---
let allPhrases = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeAllSections();
    collectAllPhrases();
    loadFavorites();
    initializeNavigation();
    initializeSearch();
});

// --- UI and View Management ---

// Initializes the "All" section by cloning all other sections into it
function initializeAllSections() {
    const allWrapper = document.querySelector('#all .all-content-wrapper');
    const sections = ['greetings', 'restaurants', 'museums', 'shopping', 'transport', 'group', 'accommodation', 'emergency'];
    
    sections.forEach(sectionId => {
        const originalSection = document.getElementById(sectionId);
        if (originalSection) {
            const clonedSection = originalSection.cloneNode(true);
            clonedSection.id = sectionId + '-all';
            clonedSection.classList.add('all-view-section');
            allWrapper.appendChild(clonedSection);
        }
    });
}

// Collects all phrase cards from the DOM and stores them in an array
function collectAllPhrases() {
    document.querySelectorAll('.phrase-card').forEach(card => {
        allPhrases.push({
            id: card.dataset.id,
            element: card,
            catalan: normalizeText(card.querySelector('.catalan-text').textContent),
            translation: normalizeText(card.querySelector('.translation-text').textContent),
        });
    });
}

// Handles navigation between different sections
function initializeNavigation() {
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            
            this.classList.add('active');
            
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            
            if (targetSection) {
                targetSection.classList.add('active');
            }

            if (sectionId === 'favorites') {
                renderFavorites();
            } else if (sectionId === 'all') {
                document.querySelectorAll('.phrase-card').forEach(card => card.style.display = 'flex');
            }
        });
    });
}

// --- Search Functionality ---

// Normalizes text for searching (removes accents, apostrophes, etc.)
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Handles search input and filters phrases
function initializeSearch() {
    const searchBox = document.getElementById('searchBox');
    searchBox.addEventListener('input', function() {
        const searchTerm = normalizeText(this.value);
        let hasResults = false;
        
        const activeNavButton = document.querySelector('.nav-button.active');
        if (searchTerm.length > 0) {
            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-section="all"]').classList.add('active');
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            document.getElementById('all').classList.add('active');
        } else if (activeNavButton.dataset.section === 'favorites') {
             // If search is cleared while on favorites, show favorites
            renderFavorites();
            return;
        }

        allPhrases.forEach(phrase => {
            const isMatch = searchTerm === '' || 
                           phrase.catalan.includes(searchTerm) || 
                           phrase.translation.includes(searchTerm);
            
            if (isMatch) {
                phrase.element.style.display = 'flex';
                hasResults = true;
            } else {
                phrase.element.style.display = 'none';
            }
        });
        
        let noResultsMsg = document.querySelector('.no-results-message');
        if (searchTerm.length > 0 && !hasResults) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results-message';
                noResultsMsg.style.cssText = 'text-align: center; padding: 20px; color: #666; font-style: italic;';
                noResultsMsg.textContent = 'No phrases found for your search.';
                document.getElementById('all').appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = 'block';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    });
}

// --- Favorites System ---

// Manages the list of favorite phrases in local storage
let favorites = new Set();
const favoritesKey = 'tarragonaFavorites';

function loadFavorites() {
    const storedFavorites = JSON.parse(localStorage.getItem(favoritesKey));
    if (storedFavorites) {
        favorites = new Set(storedFavorites);
    }
    
    // Initialize favorite buttons
    document.querySelectorAll('.phrase-card').forEach(card => {
        const cardId = card.dataset.id;
        const favoriteButton = card.querySelector('.favorite-button');
        
        // Update button text and class based on favorites
        if (favorites.has(cardId)) {
            favoriteButton.classList.add('favorited');
            favoriteButton.textContent = '⭐';
        } else {
            favoriteButton.textContent = '☆';
        }

        favoriteButton.addEventListener('click', toggleFavorite);
    });
}

function saveFavorites() {
    localStorage.setItem(favoritesKey, JSON.stringify(Array.from(favorites)));
}

function toggleFavorite(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const card = button.closest('.phrase-card');
    const cardId = card.dataset.id;
    
    if (favorites.has(cardId)) {
        favorites.delete(cardId);
        button.classList.remove('favorited');
        button.textContent = '☆'; // Change to empty star
    } else {
        favorites.add(cardId);
        button.classList.add('favorited');
        button.textContent = '⭐'; // Change to filled star
    }
    
    saveFavorites();
    
    // If we're on the favorites page, re-render to reflect the change
    if (document.getElementById('favorites').classList.contains('active')) {
        renderFavorites();
    }
}

function renderFavorites() {
    const favoritesGrid = document.getElementById('favorites-grid');
    favoritesGrid.innerHTML = ''; // Clear previous content
    
    const noFavoritesMsg = document.getElementById('no-favorites');
    if (favorites.size === 0) {
        noFavoritesMsg.classList.remove('hidden');
    } else {
        noFavoritesMsg.classList.add('hidden');
        
        allPhrases.forEach(phrase => {
            if (favorites.has(phrase.id)) {
                // Clone the card and remove its ID to avoid duplicates
                const clonedCard = phrase.element.cloneNode(true);
                clonedCard.removeAttribute('data-id');
                
                const favoriteButton = clonedCard.querySelector('.favorite-button');
                if (favoriteButton) {
                    favoriteButton.classList.add('favorited');
                    favoriteButton.textContent = '⭐'; // Ensure the icon is a filled star
                    // Re-add the event listener to the new button
                    favoriteButton.addEventListener('click', toggleFavorite);
                }

                favoritesGrid.appendChild(clonedCard);
            }
        });
    }
}

// --- Audio Functionality ---

// Speech synthesis function with character normalization
function speakCatalan(text) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const normalizedText = text
            .replace(/'/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        const utterance = new SpeechSynthesisUtterance(normalizedText);
        utterance.lang = 'ca-ES';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        speechSynthesis.speak(utterance);
    } else {
        alert('Speech synthesis not supported in this browser');
    }
}
