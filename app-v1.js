// Localized database of Kanto 151
let POKEMON = [];
async function loadKantoDex() {

    const response = await fetch("./data/kanto.json");
    POKEMON = await response.json();

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
    renderGrid();
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

    // Search
    if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        pokemonList = pokemonList.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.id.toString() === query
        );
    }

    // Type
    if (selectedType !== "all") {
        pokemonList = pokemonList.filter(p =>
            p.types.includes(selectedType)
        );
    }

    // Favorites
    if (viewFavoritesOnly) {
        pokemonList = pokemonList.filter(p =>
            favorites.includes(p.id)
        );
    }

    // Sort
    pokemonList.sort((a, b) => {
        switch (sortBy) {
            case "id-asc": return a.id - b.id;
            case "id-desc": return b.id - a.id;
            case "name-asc": return a.name.localeCompare(b.name);
            case "name-desc": return b.name.localeCompare(a.name);
            case "hp-desc": return b.hp - a.hp;
            case "speed-desc": return b.speed - a.speed;
            default: return 0;
        }
    });

    grid.innerHTML = "";

    if (!pokemonList.length) {

        grid.classList.add("hidden");
        emptyState.classList.remove("hidden");

        document.getElementById("empty-message").innerText =
            viewFavoritesOnly
                ? "You haven't added any Kanto Pokémon to your favorites shelf yet. Click the heart icon on any card!"
                : "We couldn't find any results matching your search queries. Try refining your filters!";

        return;
    }

    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    pokemonList.forEach(pokemon => {

        const card = document.createElement("div");

        card.className =
            "pokemon-card group bg-[#ffffff] border border-[#212127] hover:border-[#383842] rounded-xl overflow-hidden relative cursor-pointer flex flex-col justify-between h-[340px]";

        card.onclick = () => openModal(pokemon.id);

        card.innerHTML = renderPokemonCard(pokemon);

        grid.appendChild(card);

    });
}

function renderPokemonCard(pokemon) {

    const typeGlow = {
        grass: "#6CCF6B",
        fire: "#FF8A3D",
        water: "#5DA9FF",
        electric: "#FFD84D",
        bug: "#9CCB3C",
        poison: "#B96BEA",
        flying: "#9BB8FF",
        ground: "#CFA46C",
        rock: "#B8A46A",
        psychic: "#FF6FAE",
        ghost: "#7B6DFF",
        dragon: "#6B7CFF",
        ice: "#8EE9FF",
        fighting: "#D96A4A",
        steel: "#B8C4D6",
        fairy: "#FFB7E8",
        normal: "#BDBDBD"
    };

    const typeBackground = {
        grass: "linear-gradient(180deg,#1f3b2b 0%,#14241b 55%,#f4f4f4 100%)",
        fire: "linear-gradient(180deg,#4b2b17 0%,#2d1a10 55%,#f4f4f4 100%)",
        water: "linear-gradient(180deg,#1c3655 0%,#15253d 55%,#f4f4f4 100%)",
        electric: "linear-gradient(180deg,#5a4b13 0%,#342c10 55%,#f4f4f4 100%)",
        bug: "linear-gradient(180deg,#2b4320 0%,#1b2b15 55%,#f4f4f4 100%)",
        poison: "linear-gradient(180deg,#40204f 0%,#281732 55%,#f4f4f4 100%)",
        flying: "linear-gradient(180deg,#35445d 0%,#1d2533 55%,#f4f4f4 100%)",
        normal: "linear-gradient(180deg,#3d3d3d 0%,#252525 55%,#f4f4f4 100%)"
    };

    const bgGradient = typeBackground[pokemon.types[0]] || typeBackground.normal;

    const glowColor = typeGlow[pokemon.types[0]] || "#ffffff";

    const isFavorited = favorites.includes(pokemon.id);
    const currentGifUrl = getGifUrl(
        pokemon.id,
        gifStyle,
        isShiny,
        "front"
    );

    const fallbackUrl = getFallbackUrl(
        pokemon.id,
        "front"
    );

    const typeBadges = pokemon.types.map(t =>
        `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider uppercase bg-pokemon-${t}">${t}</span>`
    ).join("");

    const isPlaying = playingCryId === pokemon.id;

    const cryIconClass = isPlaying
        ? "fa-solid fa-volume-high text-green-400 animate-pulse"
        : "fa-solid fa-volume-low text-gray-400 hover:text-yellow-400";

    return `

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
        <div class="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            
            <!-- Background -->
            <div class="absolute inset-0" style="background:${bgGradient};"> </div>
            <!-- Lighting -->
            <div class="absolute w-[350px] h-[350px] rounded-full" style=" background:${glowColor}; filter:blur(0px); opacity:.12; "></div>

            <div class="absolute inset-0 opacity-60" 
                style=" background: radial-gradient(circle at center, rgba(255,255,255,0) 0%, rgba(255,255,255,.35) 35%, rgba(0,0,0,.02) 100%); ">
            </div>

            <h3 class="text-lg font-extrabold uppercase tracking-wide text-slate-400 absolute top-0"> ${pokemon.name} </h3>

            <div class="w-36 h-36 flex items-center justify-center relative mx-auto z-10">
                <!-- Poké Ball Watermark -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="opacity:.4;">
                    <div class="w-36 h-36 rounded-full border-[10px] border-black/2 relative">
                        <div class="absolute left-0 right-0 top-1/2 h-[10px] -translate-y-1/2 bg-black/5"></div>
                        <div class="absolute left-1/2 top-1/2 w-8 h-8 rounded-full border-[8px] border-black/2 bg-transparent -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                </div>

                <!-- Type Glow -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="pokemon-glow w-16 h-16 rounded-full" style=" background:${glowColor}; filter:blur(5px); opacity:1; "></div>
                </div>

                <!-- Pokémon -->
                <img 
                    src="${currentGifUrl}" 
                    alt="${pokemon.name}" 
                    class="pokemon-sprite max-h-70 max-w-full object-contain relative z-20"
                    loading="lazy"
                    onload="this.classList.add('loaded')"
                    onerror="this.onerror=null; this.src='${fallbackUrl}'; this.classList.add('loaded');"
                />
            </div>

            <!-- Info -->
            <div class="px-4 pt-3 pb-2 text-center absolute bottom-0 w-full z-10">
                <div class="flex justify-center gap-2 mt-2"> ${typeBadges} </div>
            </div>
        </div>

        

        <!-- Toolbar -->
        <div class="border-t border-[#2d2d37] bg-[#17171b] grid grid-cols-3">
            <button onclick="event.stopPropagation(); copyGifUrl(${pokemon.id}, '${pokemon.name}')" class="py-3 text-xs text-gray-400 hover:text-white transition">
                <i class="fa-solid fa-link mb-1 block"></i>
                Copy
            </button>

            <button onclick="event.stopPropagation(); playCry(${pokemon.id})" class="py-3 text-xs text-gray-400 hover:text-white transition">
                <i class="${cryIconClass} mb-1 block"></i>
                Cry
            </button>

            <button onclick="downloadGif(${pokemon.id}, '${pokemon.name}', 'front', event)" class="py-3 text-xs text-gray-400 hover:text-white transition"> 
                <i class="fa-solid fa-download mb-1 block"></i>
                Save
            </button>
        </div>
    `;
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
    };

    // Style Switches
    const modBtn = document.getElementById("style-modern");
    const retBtn = document.getElementById("style-retro");

    modBtn.onclick = function() {
        gifStyle = "modern";
        modBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 bg-pokeRed-600 text-white shadow";
        retBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 text-gray-400 hover:text-white";
        updateModalImages();
        renderGrid();
    };

    retBtn.onclick = function() {
        gifStyle = "retro";
        retBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 bg-pokeRed-600 text-white shadow";
        modBtn.className = "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 text-gray-400 hover:text-white";
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

        updateModalImages();
        renderGrid();
    };

    // Favorites shelf toggle
    document.getElementById("favorites-toggle").onclick = function() {
        viewFavoritesOnly = !viewFavoritesOnly;
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