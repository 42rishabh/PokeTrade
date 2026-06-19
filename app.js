// Localized database of Kanto 151
let POKEMON = [];

async function loadKantoDex() {

    const response = await fetch("./data/kanto.json");
    POKEMON = await response.json();

    updateHeaderAndStats();
    renderGrid();
}

const ALL_TYPES = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "steel", "fairy"];

// App State
let searchQuery = "";
let selectedType = "all";
let sortBy = "id-asc";
let gifStyle = "modern"; // "modern" (3D) or "retro" (2D Pixel)
let isShiny = false;
let favorites = [];
let viewFavoritesOnly = false;
let selectedPokemonId = null;
let playingCryId = null;
let currentAudio = null;

// Initialize state from LocalStorage
try {
    const saved = localStorage.getItem("fav_pokemon_gifs");
    if (saved) {
    favorites = JSON.parse(saved);
    }
} catch (e) {
    favorites = [];
}

// Helper: Formulate custom URL
function getGifUrl(id, style, shiny, direction = 'front') {
    const shinyPath = shiny ? 'shiny/' : '';
    const path = direction === 'back' ? 'back/' : '';
    if (style === 'retro') {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${path}${shinyPath}${id}.gif`;
    } else {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${path}${shinyPath}${id}.gif`;
    }
}

// Helper: Formulate fallback URL
function getFallbackUrl(id, direction = 'front') {
    if (direction === 'back') {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`;
    }
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// Dynamic UI Toast Trigger
function showToast(msg) {
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toast-text");
    toastText.innerText = msg;
    toast.classList.remove("hidden");
    toast.classList.add("animate-slideIn");
    setTimeout(() => {
    toast.classList.add("hidden");
    }, 3000);
}

// Global: Copy to clipboard safely
function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

// Play/Pause Pokemon Cry Sound
function playCry(id) {
    if (currentAudio) {
    currentAudio.pause();
    }
    playingCryId = id;
    updateCryIcons();

    try {
    currentAudio = new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`);
    currentAudio.volume = 0.45;
    currentAudio.play().catch(err => {
        console.log("Audio blocker fallback", err);
        showToast("Click again to play Pokémon cry!");
        resetCryState();
    });
    currentAudio.onended = () => {
        resetCryState();
    };
    } catch (e) {
    resetCryState();
    }
}

function resetCryState() {
    playingCryId = null;
    updateCryIcons();
}

function updateCryIcons() {
    // Update global grid elements playing states
    document.querySelectorAll("[data-cry-btn]").forEach(btn => {
    const pId = parseInt(btn.getAttribute("data-cry-btn"));
    const icon = btn.querySelector("i");
    if (pId === playingCryId) {
        icon.className = "fa-solid fa-volume-high text-green-400 animate-pulse";
    } else {
        icon.className = "fa-solid fa-volume-low text-gray-400 hover:text-yellow-400";
    }
    });

    // Update modal icon state if open
    const modalCryIcon = document.getElementById("modal-cry-icon");
    if (playingCryId && selectedPokemonId === playingCryId) {
    modalCryIcon.className = "fa-solid fa-spinner animate-spin text-green-400";
    } else {
    modalCryIcon.className = "fa-solid fa-volume-high";
    }
}

// Favorites Manager
function toggleFavorite(id, name, event) {
    if (event) event.stopPropagation();
    const idx = favorites.indexOf(id);
    if (idx > -1) {
    favorites.splice(idx, 1);
    showToast(`Removed ${name} from your Favorites Shelf!`);
    } else {
    favorites.push(id);
    showToast(`Added ${name} to your Favorites Shelf!`);
    }
    localStorage.setItem("fav_pokemon_gifs", JSON.stringify(favorites));
    
    // Sync Modal Heart if open
    updateModalFavButtonState();
    
    // Update stats and render grid
    updateHeaderAndStats();
    renderGrid();
}

// Update Headers, Badges, and Stats Counts
function updateHeaderAndStats() {
    const favBtn = document.getElementById("favorites-toggle");
    const favIcon = document.getElementById("favorites-icon");
    const favSpan = favBtn.querySelector("span");
    favSpan.innerText = `Favorites (${favorites.length})`;
    
    if (viewFavoritesOnly) {
    favBtn.className = "px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all duration-200 border bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-inner";
    favIcon.className = "fa-solid fa-heart text-rose-500 scale-110";
    } else {
    favBtn.className = "px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all duration-200 border bg-[#1f1f23] text-gray-300 border-[#2b2b35] hover:bg-[#2b2b35]";
    favIcon.className = "fa-regular fa-heart";
    }

    // Stats belt
    document.getElementById("stats-fav-count").innerText = `${favorites.length} / 151`;
    document.getElementById("stats-style-text").innerText = `${isShiny ? "Shiny " : ""}${gifStyle === 'modern' ? '3D Modern' : 'Retro Pixel'}`;

    // Backup Export button status
    const exportBtn = document.getElementById("export-favorites");
    exportBtn.disabled = favorites.length === 0;
}

// Direct GIF Saving Functionality
async function downloadGif(id, name, angle = 'front', event) {
    if (event) event.stopPropagation();
    const url = getGifUrl(id, gifStyle, isShiny, angle);
    showToast(`Downloading ${name}'s GIF...`);
    try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${name.toLowerCase()}_${angle}_${gifStyle}${isShiny ? "_shiny" : ""}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    showToast("Download started successfully!");
    } catch (err) {
    console.error(err);
    window.open(url, '_blank');
    showToast("Secure download blocked. Opened in new window instead!");
    }
}

// Filter, Sort, Search, and Render Grid
function renderGrid() {
    const grid = document.getElementById("pokemon-grid");
    const emptyState = document.getElementById("empty-state");
    
    let pokemonList = [...POKEMON];

    // Filter: Search Text
    if (searchQuery.trim() !== "") {
    const query = searchQuery.toLowerCase().trim();
    pokemonList = pokemonList.filter(p => 
        p.name.toLowerCase().includes(query) || p.id.toString() === query
    );
    }

    // Filter: Type
    if (selectedType !== "all") {
    pokemonList = pokemonList.filter(p => p.types.includes(selectedType));
    }

    // Filter: Favorites Only
    if (viewFavoritesOnly) {
    pokemonList = pokemonList.filter(p => favorites.includes(p.id));
    }

    // Sort
    pokemonList.sort((a, b) => {
    if (sortBy === "id-asc") return a.id - b.id;
    if (sortBy === "id-desc") return b.id - a.id;
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    if (sortBy === "hp-desc") return b.hp - a.hp;
    if (sortBy === "speed-desc") return b.speed - a.speed;
    return 0;
    });

    // Clear Grid
    grid.innerHTML = "";

    // Empty State View
    if (pokemonList.length === 0) {
    grid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    const emptyMsg = document.getElementById("empty-message");
    if (viewFavoritesOnly) {
        emptyMsg.innerText = "You haven't added any Kanto Pokémon to your favorites shelf yet. Click the heart icon on any card!";
    } else {
        emptyMsg.innerText = "We couldn't find any results matching your search queries. Try refining your filters!";
    }
    return;
    }

    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    // Generate Card Nodes
    pokemonList.forEach(pokemon => {
    const isFavorited = favorites.includes(pokemon.id);
    const currentGifUrl = getGifUrl(pokemon.id, gifStyle, isShiny, 'front');
    const fallbackUrl = getFallbackUrl(pokemon.id, 'front');

    // Create Badge markup
    const typeBadges = pokemon.types.map(t => 
        `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider uppercase bg-pokemon-${t}">${t}</span>`
    ).join("");

    const isPlaying = playingCryId === pokemon.id;
    const cryIconClass = isPlaying ? "fa-solid fa-volume-high text-green-400 animate-pulse" : "fa-solid fa-volume-low text-gray-400 hover:text-yellow-400";

    const card = document.createElement("div");
    card.className = "pokemon-card group bg-[#ffffff] border border-[#212127] hover:border-[#383842] rounded-xl overflow-hidden relative cursor-pointer flex flex-col justify-between h-72";
    card.onclick = () => openModal(pokemon.id);

    card.innerHTML = `
        <!-- Card Action Header -->
        <div class="flex justify-between items-center px-3 py-2 text-xs text-gray-400 z-10">
        <span class="font-mono text-pokeRed-500 font-bold">
            #${String(pokemon.id).padStart(3, '0')}
        </span>
        <div class="flex gap-2">
            <button 
            onclick="toggleFavorite(${pokemon.id}, '${pokemon.name}', event)"
            class="text-gray-400 hover:text-rose-500 transition-colors p-1"
            title="Add to Favorites"
            >
            <i class="${isFavorited ? 'fa-solid fa-heart text-rose-500' : 'fa-regular fa-heart'}"></i>
            </button>
            <button 
            data-cry-btn="${pokemon.id}"
            onclick="event.stopPropagation(); playCry(${pokemon.id})"
            class="transition-all p-1"
            title="Play Pokémon Cry"
            >
            <i class="${cryIconClass}"></i>
            </button>
        </div>
        </div>

        <!-- Main GIF Screen -->
        <div class="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div class="w-24 h-24 flex items-center justify-center relative">
            <div class="absolute inset-0 rounded-full blur-xl opacity-30 transition-colors group-hover:opacity-50 bg-pokemon-${pokemon.types[0]}"></div>
            <img 
            src="${currentGifUrl}" 
            alt="${pokemon.name}" 
            class="max-h-20 max-w-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-200"
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackUrl}';"
            />
        </div>
        </div>

        <!-- Description and Footer -->
        <div class="p-3 bg-[#1c1c1f]/80 border-t border-[#232329] relative z-10">
        <h3 class="text-sm font-bold text-white group-hover:text-pokeRed-400 transition-colors">
            ${pokemon.name}
        </h3>
        <div class="flex gap-1.5 mt-1.5 flex-wrap">
            ${typeBadges}
        </div>
        
        <div class="flex items-center justify-between border-t border-[#2d2d37] mt-3.5 pt-2 text-[11px] text-gray-400 font-medium">
            <button 
            id="copy-btn-${pokemon.id}"
            onclick="event.stopPropagation(); copyGifUrl(${pokemon.id}, '${pokemon.name}')"
            class="hover:text-white transition flex items-center gap-1"
            title="Copy Direct GIF Link"
            >
            <i class="fa-solid fa-link"></i>
            <span>Copy</span>
            </button>
            <button 
            onclick="downloadGif(${pokemon.id}, '${pokemon.name}', 'front', event)"
            class="hover:text-white transition flex items-center gap-1"
            title="Download Animated GIF"
            >
            <i class="fa-solid fa-download text-[10px]"></i>
            <span>Save GIF</span>
            </button>
        </div>
        </div>
    `;
    grid.appendChild(card);
    });
}

// Copy Tool
function copyGifUrl(id, name) {
    const url = getGifUrl(id, gifStyle, isShiny, 'front');
    copyToClipboard(url);
    showToast(`Copied ${name}'s GIF link to clipboard!`);
}

// Modal Manager
function openModal(id) {
    selectedPokemonId = id;
    const pokemon = POKEMON.find(p => p.id === id);
    if (!pokemon) return;

    // Type Badge styling and Strip color
    document.getElementById("modal-color-strip").className = `h-2 w-full bg-pokemon-${pokemon.types[0]}`;
    document.getElementById("modal-name").innerText = pokemon.name;
    document.getElementById("modal-id").innerText = `#${String(pokemon.id).padStart(3, '0')}`;
    
    const modalTypes = document.getElementById("modal-types");
    modalTypes.innerHTML = pokemon.types.map(t => 
    `<span class="text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase bg-pokemon-${t}">${t}</span>`
    ).join("");

    // Description & stats
    document.getElementById("modal-desc").innerText = `"${pokemon.desc}"`;
    document.getElementById("modal-height").innerText = `${(pokemon.height / 10).toFixed(1)} m`;
    document.getElementById("modal-weight").innerText = `${(pokemon.weight / 10).toFixed(1)} kg`;

    // Set GIF Views
    updateModalImages();

    // Setup audio cry button
    const cryBtn = document.getElementById("modal-cry-btn");
    cryBtn.onclick = () => playCry(pokemon.id);

    // Base Stats rendering
    const statsContainer = document.getElementById("modal-stats-container");
    const statSets = [
    { label: "HP", val: pokemon.hp, max: 255, color: "bg-red-500" },
    { label: "Attack", val: pokemon.atk, max: 190, color: "bg-orange-500" },
    { label: "Defense", val: pokemon.def, max: 230, color: "bg-yellow-500" },
    { label: "Sp. Atk", val: pokemon.spatk, max: 194, color: "bg-blue-400" },
    { label: "Sp. Def", val: pokemon.spdef, max: 230, color: "bg-green-500" },
    { label: "Speed", val: pokemon.speed, max: 180, color: "bg-pink-500" },
    ];

    statsContainer.innerHTML = statSets.map(st => `
    <div class="flex items-center text-xs">
        <span class="w-16 font-semibold text-gray-400">${st.label}</span>
        <span class="w-8 font-mono text-right text-white mr-3">${st.val}</span>
        <div class="flex-1 h-2 bg-[#121214] rounded-full overflow-hidden">
        <div class="h-full ${st.color}" style="width: ${Math.min(100, (st.val / st.max) * 100)}%"></div>
        </div>
    </div>
    `).join("");

    // Action binding
    updateModalFavButtonState();

    // Show Modal
    const modal = document.getElementById("pokemon-modal");
    modal.classList.remove("hidden");
    modal.onclick = closeModal;

    updateCryIcons();
}

function closeModal() {
    document.getElementById("pokemon-modal").classList.add("hidden");
    selectedPokemonId = null;
}

function updateModalImages() {
    if (!selectedPokemonId) return;
    const pokemon = POKEMON.find(p => p.id === selectedPokemonId);
    
    const frontImg = document.getElementById("modal-img-front");
    const backImg = document.getElementById("modal-img-back");

    const labelFront = document.getElementById("modal-label-front");
    const labelBack = document.getElementById("modal-label-back");

    labelFront.innerText = isShiny ? "✨ Front Shiny" : "Front Normal";
    labelBack.innerText = isShiny ? "✨ Back Shiny" : "Back Normal";

    frontImg.src = getGifUrl(pokemon.id, gifStyle, isShiny, 'front');
    frontImg.onerror = () => {
        frontImg.src = getFallbackUrl(pokemon.id, 'front');
    };

    backImg.src = getGifUrl(pokemon.id, gifStyle, isShiny, 'back');
    backImg.onerror = () => {
        backImg.src = getFallbackUrl(pokemon.id, 'back');
    };

    // Re-bind Action bar copying and download links
    document.getElementById("modal-copy-front").onclick = () => {
        copyToClipboard(getGifUrl(pokemon.id, gifStyle, isShiny, 'front'));
        showToast(`Copied ${pokemon.name}'s Front GIF link!`);
    };
    document.getElementById("modal-copy-back").onclick = () => {
        copyToClipboard(getGifUrl(pokemon.id, gifStyle, isShiny, 'back'));
        showToast(`Copied ${pokemon.name}'s Back GIF link!`);
    };
    document.getElementById("modal-download-front").onclick = (e) => {
        downloadGif(pokemon.id, pokemon.name, 'front', e);
    };
    document.getElementById("modal-download-back").onclick = (e) => {
        downloadGif(pokemon.id, pokemon.name, 'back', e);
    };
}

function updateModalFavButtonState() {
    if (!selectedPokemonId) return;
    const pokemon = POKEMON.find(p => p.id === selectedPokemonId);
    const isFav = favorites.includes(pokemon.id);
    const favBtn = document.getElementById("modal-fav-btn");

    favBtn.onclick = () => toggleFavorite(pokemon.id, pokemon.name);

    if (isFav) {
        favBtn.className = "flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20";
        favBtn.querySelector("i").className = "fa-solid fa-heart text-rose-500";
        favBtn.querySelector("span").innerText = "Remove Favorite";
    } else {
        favBtn.className = "flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 bg-[#212127] text-white hover:bg-[#2c2c35]";
        favBtn.querySelector("i").className = "fa-regular fa-heart";
        favBtn.querySelector("span").innerText = "Save to Favorites";
    }
}

// Initializer
window.onload = async function() {
    // Build search type selector
    const typeSelect = document.getElementById("type-select");
    ALL_TYPES.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.innerText = t;
        typeSelect.appendChild(opt);
    });

    // Bind Listeners
    document.getElementById("search-input").oninput = function(e) {
        searchQuery = e.target.value;
        const clearBtn = document.getElementById("clear-search");
        if (searchQuery.trim() !== "") {
            clearBtn.classList.remove("hidden");
        } else {
            clearBtn.classList.add("hidden");
        }
        renderGrid();
    };

    document.getElementById("clear-search").onclick = function() {
        document.getElementById("search-input").value = "";
        searchQuery = "";
        this.classList.add("hidden");
        renderGrid();
    };

    document.getElementById("type-select").onchange = function(e) {
        selectedType = e.target.value;
        renderGrid();
    };

    document.getElementById("sort-select").onchange = function(e) {
        sortBy = e.target.value;
        renderGrid();
    };

    document.getElementById("empty-reset").onclick = function() {
        document.getElementById("search-input").value = "";
        searchQuery = "";
        document.getElementById("clear-search").classList.add("hidden");
        selectedType = "all";
        document.getElementById("type-select").value = "all";
        viewFavoritesOnly = false;
        renderGrid();
        updateHeaderAndStats();
    };

    // Style Switches
    const modBtn = document.getElementById("style-modern");
    const retBtn = document.getElementById("style-retro");

    modBtn.onclick = function() {
        gifStyle = "modern";
        modBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 bg-pokeRed-600 text-white shadow";
        retBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 text-gray-400 hover:text-white";
        updateHeaderAndStats();
        updateModalImages();
        renderGrid();
    };

    retBtn.onclick = function() {
        gifStyle = "retro";
        retBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 bg-pokeRed-600 text-white shadow";
        modBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 text-gray-400 hover:text-white";
        updateHeaderAndStats();
        updateModalImages();
        renderGrid();
    };

    // Shiny Toggle Button
    const shinyToggle = document.getElementById("shiny-toggle");
    const icon = document.getElementById("shiny-icon");

    shinyToggle.onclick = function () {
        isShiny = !isShiny;

        if (isShiny) {
            icon.classList.remove("text-white", "hover:text-yellow-400");
            icon.classList.add("text-yellow-400", "hover:text-white");
            this.title = "Disable Shiny";
        } else {
            icon.classList.remove("text-yellow-400", "hover:text-white");
            icon.classList.add("text-white", "hover:text-yellow-400");
            this.title = "Enable Shiny";
        }

        updateHeaderAndStats();
        updateModalImages();
        renderGrid();
    };

    // Favorites shelf toggle
    document.getElementById("favorites-toggle").onclick = function() {
        viewFavoritesOnly = !viewFavoritesOnly;
        updateHeaderAndStats();
        renderGrid();
    };

    // Export tool
    document.getElementById("export-favorites").onclick = function() {
        if (favorites.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(favorites));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", "kanto_gif_favorites.json");
        dlAnchor.click();
        showToast("Favorites list exported as JSON!");
    };

    // Load Pokémon from JSON
    await loadKantoDex();
};