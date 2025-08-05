// --- Core Data and Initialization ---
let allPhrases = [];
let speech;
const favoritesKey = 'tarragonaFavorites';
let favorites = new Set();
let debugLog = [];  // Store debug messages

// IMMEDIATE TEST - This should show as soon as the script loads
// alert('Script is loading!');  // Commented out now that we know it works

document.addEventListener('DOMContentLoaded', function() {
    // Add visible debug panel with ID for easier access
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = 'position:fixed;bottom:10px;right:10px;background:yellow;border:2px solid red;padding:10px;z-index:99999;max-height:300px;overflow-y:auto;font-size:11px;width:300px;font-family:monospace;';
    debugPanel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <b>DEBUG LOG</b>
            <button id="copy-debug" style="padding:2px 8px;background:#4CAF50;color:white;border:none;border-radius:3px;cursor:pointer;">Copy Log</button>
        </div>
        <div id="debug-content" style="white-space:pre-wrap;word-break:break-all;"></div>
    `;
    document.body.appendChild(debugPanel);
    
    // Add copy functionality
    document.getElementById('copy-debug').addEventListener('click', function() {
        const logText = debugLog.join('\n');
        navigator.clipboard.writeText(logText).then(function() {
            addDebug('Log copied to clipboard!');
        }).catch(function() {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = logText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            addDebug('Log copied (fallback method)');
        });
    });
    
    addDebug('=== PAGE LOADED ===');
    addDebug('Time: ' + new Date().toLocaleTimeString());
    
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
    
    addDebug('Init complete. Favorites loaded: ' + favorites.size);
});

function addDebug(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLog.push(logEntry);
    
    // Keep only last 100 entries
    if (debugLog.length > 100) {
        debugLog.shift();
    }
    
    const debugContent = document.getElementById('debug-content');
    if (debugContent) {
        debugContent.textContent = debugLog.join('\n');
        debugContent.scrollTop = debugContent.scrollHeight;
    }
}

function initializeButtons() {
    addDebug('initializeButtons() called');
    
    // Remove ALL existing event listeners first by cloning and replacing buttons
    document.querySelectorAll('.favorite-button').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    document.querySelectorAll('.audio-button').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Now add fresh event listeners
    setTimeout(function() {
        const favButtons = document.querySelectorAll('.favorite-button');
        addDebug('Adding listeners to ' + favButtons.length + ' favorite buttons');
        
        favButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Visual feedback
                this.style.background = 'red';
                
                const card = this.closest('.phrase-card');
                if (!card || !card.dataset.id) {
                    addDebug('ERROR: No card/ID for favorite button');
                    return;
                }
                
                const cardId = card.dataset.id;
                
                if (favorites.has(cardId)) {
                    favorites.delete(cardId);
                    this.textContent = '☆';
                    this.classList.remove('favorited');
                    addDebug('Removed favorite: ' + cardId);
                } else {
                    favorites.add(cardId);
                    this.textContent = '⭐';
                    this.classList.add('favorited');
                    addDebug('Added favorite: ' + cardId);
                }
                
                addDebug('Total favorites now: ' + favorites.size);
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
    }, 100);
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
            const sectionId = this.getAttribute('data-section');
            addDebug('Navigation clicked: ' + sectionId);
            
            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            
            this.classList.add('active');
            
            const targetSection = document.getElementById(sectionId);
            
            if (targetSection) {
                targetSection.classList.add('active');
            } else {
                addDebug('ERROR: Section not found: ' + sectionId);
            }

            if (sectionId === 'favorites') {
                addDebug('Switching to favorites view...');
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
    addDebug('=== renderFavorites() START ===');
    addDebug('Favorites to render: ' + Array.from(favorites).join(', '));
    
    const favoritesGrid = document.getElementById('favorites-grid');
    if (!favoritesGrid) {
        addDebug('ERROR: favorites-grid element not found!');
        return;
    }
    
    // Clear the grid
    favoritesGrid.innerHTML = '';
    addDebug('Cleared favorites grid');
    
    const noFavoritesMsg = document.getElementById('no-favorites');
    
    if (favorites.size === 0) {
        addDebug('No favorites to display');
        if (noFavoritesMsg) {
            noFavoritesMsg.textContent = 'You have no saved favorites yet.';
            noFavoritesMsg.style.display = 'block';
            noFavoritesMsg.classList.remove('hidden');
        }
        return;
    }
    
    // Hide the no favorites message
    if (noFavoritesMsg) {
        noFavoritesMsg.style.display = 'none';
        noFavoritesMsg.classList.add('hidden');
    }
    
    // Get ALL phrase cards
    const allCards = document.querySelectorAll('.phrase-card');
    addDebug('Total phrase cards in DOM: ' + allCards.length);
    
    // Log first few card IDs for debugging
    const sampleIds = [];
    for (let i = 0; i < Math.min(5, allCards.length); i++) {
        if (allCards[i].dataset.id) {
            sampleIds.push(allCards[i].dataset.id);
        }
    }
    addDebug('Sample card IDs found: ' + sampleIds.join(', '));
    
    // Build a map of cards by ID
    const cardMap = new Map();
    allCards.forEach(card => {
        if (card.dataset.id) {
            if (!cardMap.has(card.dataset.id)) {
                cardMap.set(card.dataset.id, card);
            }
        }
    });
    addDebug('Unique card IDs in map: ' + cardMap.size);
    
    // Try to add each favorite
    let foundCount = 0;
    let notFoundList = [];
    
    favorites.forEach(favoriteId => {
        const cardToClone = cardMap.get(favoriteId);
        
        if (cardToClone) {
            foundCount++;
            const clonedCard = cardToClone.cloneNode(true);
            favoritesGrid.appendChild(clonedCard);
            addDebug('✓ Added: ' + favoriteId);
        } else {
            notFoundList.push(favoriteId);
            addDebug('✗ Not found: ' + favoriteId);
        }
    });
    
    addDebug('RESULT: Added ' + foundCount + ' of ' + favorites.size + ' favorites');
    addDebug('Grid now has ' + favoritesGrid.children.length + ' children');
    
    if (notFoundList.length > 0) {
        addDebug('Missing IDs: ' + notFoundList.join(', '));
    }
    
    addDebug('=== renderFavorites() END ===');
    
    // Re-initialize buttons for the cloned cards
    setTimeout(initializeButtons, 200);
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
