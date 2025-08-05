// --- Core Data and Initialization ---
let allPhrases = [];
let speech;
const favoritesKey = 'tarragonaFavorites';
let favorites = new Set();

// IMMEDIATE TEST - This should show as soon as the script loads
alert('Script is loading!');

document.addEventListener('DOMContentLoaded', function() {
    // Another test to show DOM is ready
    alert('DOM Content Loaded!');
    
    // Add visible debug panel
    const debugPanel = document.createElement('div');
    debugPanel.style.cssText = 'position:fixed;bottom:10px;right:10px;background:yellow;border:2px solid red;padding:10px;z-index:99999;';
    debugPanel.innerHTML = 'DEBUG PANEL ACTIVE';
    document.body.appendChild(debugPanel);
    
    initializeAllSections();
    collectAllPhrases();
    loadFavorites();
    initializeNavigation();
    initializeButtons();
    initializeSearch();
    updateFavoritesUI();
    
    // Check for speech synthesis support
    if ('speechSynthesis' in window) {
        speech = window.speechSynthesis;
    }
});

function initializeButtons() {
    // Direct event listeners on buttons instead of delegation
    // Wait a bit for all cards to be created
    setTimeout(function() {
        document.querySelectorAll('.favorite-button').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Visual feedback
                this.style.background = 'red';
                
                const card = this.closest('.phrase-card');
                if (!card || !card.dataset.id) {
                    alert('No card or ID found!');
                    return;
                }
                
                const cardId = card.dataset.id;
                
                if (favorites.has(cardId)) {
                    favorites.delete(cardId);
                    this.textContent = '☆';
                    this.classList.remove('favorited');
                } else {
                    favorites.add(cardId);
                    this.textContent = '⭐';
                    this.classList.add('favorited');
                }
                
                saveFavorites();
                updateFavoritesUI();
                
                // Reset background after a moment
                setTimeout(() => {
                    this.style.background = '';
                }, 200);
            });
        });
        
        // Audio buttons
        document.querySelectorAll('.audio-button').forEach(button => {
            button.addEventListener('click', function() {
                const card = this.closest('.phrase-card');
                const catalanText = card.dataset.catalan;
                speakCatalan(catalanText);
            });
        });
    }, 500);
}

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
    // Only collect from original sections, not cloned ones
    const sections = ['greetings', 'restaurants', 'museums', 'shopping', 'transport', 'group', 'accommodation', 'emergency'];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.querySelectorAll('.phrase-card').forEach(card => {
                const literalText = card.querySelector('.literal-text');
                allPhrases.push({
                    id: card.dataset.id,
                    element: card,
                    catalan: normalizeText(card.querySelector('.catalan-text').textContent),
                    translation: normalizeText(card.querySelector('.translation-text').textContent),
                    literal: literalText ? normalizeText(literalText.textContent) : ''
                });
            });
        }
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
                document.querySelectorAll('.phrase-card').forEach(card => {
                    card.style.display = 'flex';
                });
            }
            
            // Re-initialize buttons after navigation
            initializeButtons();
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
        } else if (activeNavButton && activeNavButton.dataset.section === 'favorites') {
            renderFavorites();
            return;
        }

        // Search through all phrase cards in the DOM
        document.querySelectorAll('.phrase-card').forEach(card => {
            const catalanText = normalizeText(card.querySelector('.catalan-text').textContent);
            const translationText = normalizeText(card.querySelector('.translation-text').textContent);
            const literalElement = card.querySelector('.literal-text');
            const literalText = literalElement ? normalizeText(literalElement.textContent) : '';
            
            const isMatch = searchTerm === '' || 
                           catalanText.includes(searchTerm) || 
                           translationText.includes(searchTerm) ||
                           literalText.includes(searchTerm);
            
            if (isMatch) {
                card.style.display = 'flex';
                hasResults = true;
            } else {
                card.style.display = 'none';
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

function loadFavorites() {
    const storedFavorites = JSON.parse(localStorage.getItem(favoritesKey));
    if (storedFavorites) {
        favorites = new Set(storedFavorites);
    }
}

function saveFavorites() {
    localStorage.setItem(favoritesKey, JSON.stringify(Array.from(favorites)));
}

function updateFavoritesUI() {
    // Update all cards with matching data-id
    document.querySelectorAll('.phrase-card').forEach(card => {
        const cardId = card.dataset.id;
        if (!cardId) return;
        
        const favoriteButton = card.querySelector('.favorite-button');
        if (favoriteButton) {
            if (favorites.has(cardId)) {
                favoriteButton.classList.add('favorited');
                favoriteButton.textContent = '⭐';
            } else {
                favoriteButton.classList.remove('favorited');
                favoriteButton.textContent = '☆';
            }
        }
    });
}

function renderFavorites() {
    const favoritesGrid = document.getElementById('favorites-grid');
    favoritesGrid.innerHTML = '';
    
    const noFavoritesMsg = document.getElementById('no-favorites');
    if (favorites.size === 0) {
        noFavoritesMsg.classList.remove('hidden');
    } else {
        noFavoritesMsg.classList.add('hidden');
        
        // Look for original cards only
        favorites.forEach(favoriteId => {
            let originalCard = null;
            const sections = ['greetings', 'restaurants', 'museums', 'shopping', 'transport', 'group', 'accommodation', 'emergency'];
            
            for (let sectionId of sections) {
                const section = document.getElementById(sectionId);
                if (section) {
                    const card = section.querySelector(`.phrase-card[data-id="${favoriteId}"]`);
                    if (card) {
                        originalCard = card;
                        break;
                    }
                }
            }
            
            if (originalCard) {
                const clonedCard = originalCard.cloneNode(true);
                favoritesGrid.appendChild(clonedCard);
            }
        });
        
        // Re-initialize buttons for the favorites view
        setTimeout(initializeButtons, 100);
    }
}

// --- Audio Functionality ---

// Speech synthesis function with character normalization
function speakCatalan(text) {
    if (speech) {
        speech.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ca-ES';
        utterance.rate = 0.8;
        
        // This check ensures the voice is ready before speaking
        speech.onvoiceschanged = function() {
            speech.speak(utterance);
        };
        // If voices are already loaded, speak immediately
        if (speech.getVoices().length > 0) {
            speech.speak(utterance);
        }
    } else {
        alert('Speech synthesis not supported in this browser.');
    }
}
