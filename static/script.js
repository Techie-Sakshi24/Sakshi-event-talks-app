// Global App State
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdate = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const detailPane = document.getElementById('detail-pane');
const detailPlaceholder = document.getElementById('detail-placeholder');
const detailContent = document.getElementById('detail-content');
const refreshBtn = document.getElementById('refresh-btn');
const spinner = document.getElementById('spinner');
const connectionStatus = document.getElementById('connection-status');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const visibleCountEl = document.getElementById('visible-count');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statChanges = document.getElementById('stat-changes');
const statIssues = document.getElementById('stat-issues');

// Detail View elements
const detailBadge = document.getElementById('detail-badge');
const detailDate = document.getElementById('detail-date');
const detailTitle = document.getElementById('detail-title');
const detailDescription = document.getElementById('detail-description');
const tweetTextarea = document.getElementById('tweet-textarea');
const sendTweetBtn = document.getElementById('send-tweet-btn');
const charCountEl = document.getElementById('char-count');
const progressCircle = document.getElementById('progress-circle');

// Toast Elements
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchUpdates();
    setupEventListeners();
    setupProgressRing();
});

// Setup Circular Progress Ring for Character Counter
let ringCircumference = 0;
function setupProgressRing() {
    if (progressCircle) {
        const radius = progressCircle.r.baseVal.value;
        ringCircumference = radius * 2 * Math.PI;
        progressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
        progressCircle.style.strokeDashoffset = ringCircumference;
    }
}

// Fetch data from Flask API
async function fetchUpdates(forceRefresh = false) {
    setLoadingState(true);
    
    // Update header status badge
    connectionStatus.className = 'status-badge syncing';
    connectionStatus.querySelector('.status-text').textContent = 'Syncing...';
    
    try {
        const url = `/api/updates${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'partial_success') {
            allUpdates = data.updates;
            
            // Render dashboard
            updateStats(allUpdates);
            applyFiltersAndSearch();
            
            connectionStatus.className = 'status-badge live';
            connectionStatus.querySelector('.status-text').textContent = 'Live';
            
            if (forceRefresh) {
                showToast('Release notes synced successfully!');
            }
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast('Failed to sync release notes.', true);
        
        connectionStatus.className = 'status-badge';
        connectionStatus.querySelector('.status-text').textContent = 'Offline';
        
        if (allUpdates.length === 0) {
            renderEmptyState('Failed to fetch data. Please check your connection and click Refresh.');
        }
    } finally {
        setLoadingState(false);
    }
}

// Manage Loading UI state
function setLoadingState(isLoading) {
    if (isLoading) {
        spinner.classList.add('spinning');
        refreshBtn.disabled = true;
    } else {
        spinner.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Calculate and Update Statistics Cards
function updateStats(updates) {
    statTotal.textContent = updates.length;
    
    const features = updates.filter(u => u.type.toLowerCase() === 'feature').length;
    const changes = updates.filter(u => u.type.toLowerCase() === 'change').length;
    const issues = updates.filter(u => u.type.toLowerCase() === 'issue').length;
    
    statFeatures.textContent = features;
    statChanges.textContent = changes;
    statIssues.textContent = issues;
}

// Apply current Filters and Search Query
function applyFiltersAndSearch() {
    filteredUpdates = allUpdates.filter(update => {
        // Filter by Type
        const matchesFilter = currentFilter === 'all' || 
            update.type.toLowerCase() === currentFilter.toLowerCase();
            
        // Filter by Search text (checks title, type, and description text)
        const query = searchQuery.toLowerCase().strip ? searchQuery.toLowerCase().strip() : searchQuery.toLowerCase();
        const matchesSearch = !query || 
            update.date.toLowerCase().includes(query) ||
            update.type.toLowerCase().includes(query) ||
            update.description.toLowerCase().includes(query);
            
        return matchesFilter && matchesSearch;
    });
    
    renderFeedList();
}

// Render the Left Pane Feed list
function renderFeedList() {
    feedContainer.innerHTML = '';
    
    visibleCountEl.textContent = `Showing ${filteredUpdates.length} update${filteredUpdates.length === 1 ? '' : 's'}`;
    
    if (filteredUpdates.length === 0) {
        renderEmptyState('No updates match your criteria. Try adjusting your filters or search query.');
        return;
    }
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('div');
        const typeClass = update.type.toLowerCase();
        card.className = `feed-card type-${typeClass} animate-fade-in`;
        if (selectedUpdate && selectedUpdate.id === update.id) {
            card.classList.add('active');
        }
        
        // Extract title or first sentence of description
        const titleSnippet = getTitleSnippet(update);
        const descriptionExcerpt = getExcerpt(update.raw_text, 100);
        
        card.innerHTML = `
            <div class="card-top">
                <span class="type-badge ${typeClass}">${update.type}</span>
                <span class="card-date">${update.date}</span>
            </div>
            <h4 class="card-title">${titleSnippet}</h4>
            <p class="card-excerpt">${descriptionExcerpt}</p>
            <div class="card-footer">
                <button class="card-btn-icon tweet-icon-btn" title="Tweet this update">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Card Click Handler
        card.addEventListener('click', (e) => {
            // If user clicked the tweet button directly
            if (e.target.closest('.tweet-icon-btn')) {
                e.stopPropagation();
                selectUpdate(update.id);
                // Wait briefly for textarea to populate, then focus
                setTimeout(() => tweetTextarea.focus(), 100);
                return;
            }
            selectUpdate(update.id);
        });
        
        feedContainer.appendChild(card);
    });
}

// Generate a clean title for the update card
function getTitleSnippet(update) {
    // If the update has a strong tag or header or a link, let's make a readable title
    // Otherwise, we can extract the first 40-50 chars of the text
    const text = update.raw_text;
    if (!text) return `${update.type} Update`;
    
    // Find the first sentence
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 5 && firstSentence.length < 80) {
        return firstSentence.trim();
    }
    
    return text.substring(0, 60).trim() + (text.length > 60 ? '...' : '');
}

// Excerpt generator helper
function getExcerpt(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
}

// Show Empty State
function renderEmptyState(message) {
    feedContainer.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <p>${message}</p>
        </div>
    `;
}

// Select a specific Release Note and render detail view
function selectUpdate(id) {
    const update = allUpdates.find(u => u.id === id);
    if (!update) return;
    
    selectedUpdate = update;
    
    // Highlight active card in feed list
    document.querySelectorAll('.feed-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Find matching card and add active class
    const cards = feedContainer.children;
    for (let i = 0; i < cards.length; i++) {
        const currentId = filteredUpdates[i] ? filteredUpdates[i].id : null;
        if (currentId === id) {
            cards[i].classList.add('active');
            break;
        }
    }
    
    // Render details
    detailPlaceholder.style.display = 'none';
    detailContent.style.display = 'flex';
    
    const typeClass = update.type.toLowerCase();
    detailBadge.className = `type-badge ${typeClass}`;
    detailBadge.textContent = update.type;
    
    detailDate.textContent = update.date;
    detailTitle.textContent = getTitleSnippet(update);
    detailDescription.innerHTML = update.description;
    
    // Pre-populate Tweet Composer
    setupTweetComposer(update);
    
    // Scroll detail pane to top
    detailContent.scrollTop = 0;
}

// Pre-fill the Twitter/X composer with curated text
function setupTweetComposer(update) {
    const maxTweetTextLen = 220; // Allow buffer for tags and spacing
    let summary = update.raw_text;
    
    if (summary.length > maxTweetTextLen) {
        summary = summary.substring(0, maxTweetTextLen).trim() + '...';
    }
    
    const tweetText = `📢 BigQuery ${update.type} (${update.date}):\n"${summary}"\n\nRead more: ${update.link || 'https://cloud.google.com/bigquery/docs/release-notes'}\n#GCP #BigQuery`;
    
    tweetTextarea.value = tweetText;
    updateCharacterCount();
}

// Real-time character count and circular progress ring updater
function updateCharacterCount() {
    const text = tweetTextarea.value;
    const length = text.length;
    const limit = 280;
    const remaining = limit - length;
    
    charCountEl.textContent = remaining;
    
    // Update circle progress
    if (progressCircle && ringCircumference > 0) {
        const percentage = Math.min(length / limit, 1);
        const offset = ringCircumference - (percentage * ringCircumference);
        progressCircle.style.strokeDashoffset = offset;
        
        // Change color based on remaining characters
        if (remaining <= 0) {
            progressCircle.style.stroke = '#ef4444'; // Red
            charCountEl.style.color = '#ef4444';
        } else if (remaining <= 20) {
            progressCircle.style.stroke = '#f59e0b'; // Amber
            charCountEl.style.color = '#f59e0b';
        } else {
            progressCircle.style.stroke = '#1d9bf0'; // X Blue
            charCountEl.style.color = '#71767b';
        }
    }
    
    // Disable send button if empty or over limit
    sendTweetBtn.disabled = length === 0 || remaining < 0;
}

// Setup App-level Event Listeners
function setupEventListeners() {
    // Refresh Button Click
    refreshBtn.addEventListener('click', () => {
        fetchUpdates(true);
    });
    
    // Filter Badges Clicks
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-type');
            applyFiltersAndSearch();
        });
    });
    
    // Search input event
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        applyFiltersAndSearch();
    });
    
    // Clear search event
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
        searchInput.focus();
    });
    
    // Realtime tweet characters update
    tweetTextarea.addEventListener('input', updateCharacterCount);
    
    // Send Tweet Event (open web intent in new window)
    sendTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > 0 && text.length <= 280) {
            const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
            showToast('Opening X (Twitter) composer...');
        }
    });
}

// Display modern toast notifications
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    
    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}
