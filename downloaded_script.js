let ingredients = [];
let recipes = [];

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadData() {
  try {
    const ingRes = await fetch('api.php?action=get_ingredients');
    ingredients = await ingRes.json();

    const recRes = await fetch('api.php?action=get_recipes');
    recipes = await recRes.json();

    // Fetch dynamic site content (About page, etc.)
    const siteRes = await fetch('api.php?action=get_site_content');
    const siteContent = await siteRes.json();
    
    // Merge dynamic content into translations
    if (siteContent && !siteContent.error) {
      if (siteContent.ar) {
        Object.assign(translations.ar, siteContent.ar);
      }
      if (siteContent.en) {
        Object.assign(translations.en, siteContent.en);
      }
      // Re-apply language to show new content
      applyLanguage(getCurrentLang());
      
      // Sync favorites if logged in
      await syncFavorites();
    }
  } catch (error) {
    console.error("Error loading data from API:", error);
  }
}

/* ============================================================
   LOCAL STORAGE HELPERS
   ============================================================ */
function getSelectedIngredients() {
  let selected = JSON.parse(localStorage.getItem("selectedIngredients")) || [];
  return selected;
}

function setSelectedIngredients(data) {
  localStorage.setItem("selectedIngredients", JSON.stringify(data));
}

function getFavorites() {
  let fav = JSON.parse(localStorage.getItem("favoriteRecipes")) || [];
  return fav;
}

function setFavorites(data) {
  localStorage.setItem("favoriteRecipes", JSON.stringify(data));
}

/* ============================================================
   RENDER: INGREDIENTS (Fridge page)
   ============================================================ */
function renderIngredients(query = "") {
  const grid = document.getElementById("ingredientGrid");
  const selectedBox = document.getElementById("selectedIngredients");
  if (!grid || !selectedBox) return;

  grid.innerHTML = ""; // Clear for search
  let selected = getSelectedIngredients();
  const lang = getCurrentLang();
  
  const filteredIngredients = ingredients.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  if (filteredIngredients.length === 0) {
     grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">${lang === 'ar' ? 'لم يتم العثور على مكونات.' : 'No ingredients found.'}</div>`;
  }

  function refreshSelected() {
    selectedBox.innerHTML = "";
    if (!selected.length) {
      selectedBox.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem; border: none; background: none;">
          <p style="font-size: 0.9rem;">${t['fridge.empty_sel']}</p>
        </div>
      `;
      return;
    }
    selected.forEach(id => {
      const ing = ingredients.find(item => item.id === id);
      if (!ing) return;
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `${ing.emoji} ${ing.name}`;
      selectedBox.appendChild(tag);
    });
  }

  filteredIngredients.forEach(item => {
    const div = document.createElement("div");
    div.className = "ingredient-item";
    if (selected.includes(item.id)) div.classList.add("active");

    div.innerHTML = `
      <div class="ingredient-emoji">${item.emoji}</div>
      <div class="ingredient-name">${item.name}</div>
    `;

    div.addEventListener("click", () => {
      if (selected.includes(item.id)) {
        selected = selected.filter(i => i !== item.id);
        div.classList.remove("active");
      } else {
        selected.push(item.id);
        div.classList.add("active");
      }
      setSelectedIngredients(selected);
      refreshSelected();
    });

    grid.appendChild(div);
  });

  refreshSelected();

  const findBtn = document.getElementById("findRecipesBtn");
  if (findBtn) {
    findBtn.addEventListener("click", () => {
      window.location.href = "recipes.html";
    });
  }

  const clearBtn = document.getElementById("clearIngredientsBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      setSelectedIngredients([]);
      // Instead of just reload, provide feedback and update UI
      showNotification(lang === 'ar' ? "تم مسح الاختيارات" : "Selections cleared", 'success');
      setTimeout(() => window.location.reload(), 500);
    });
  }
  init3DTilt();
}

/* ============================================================
   RENDER: RECIPES
   ============================================================ */
function renderRecipes(query = "") {
  const grid = document.getElementById("recipesGrid");
  const matchedBox = document.getElementById("matchedIngredientsBox");
  if (!grid) return;

  const lang = getCurrentLang();
  const selected = getSelectedIngredients();
  
  let filtered = recipes;

  if (query) {
    filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) || 
        r.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  const t = translations[lang];
  if (matchedBox) {
    if (selected.length) {
      const names = selected.map(id => ingredients.find(i => i.id === id)?.name).filter(Boolean);
      matchedBox.innerHTML = `${t['recipes.sel_ing']}: <strong>${names.join(" - ")}</strong>`;
    } else {
      matchedBox.innerHTML = t['recipes.no_sel'];
    }
  }

  let filtered = recipes;

  if (selected.length) {
    filtered = recipes
      .map(recipe => {
        const matchCount = recipe.ingredients.filter(i => selected.includes(i)).length;
        return { ...recipe, matchCount };
      })
      .filter(recipe => recipe.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">${t['recipes.no_match']}</div>`;
    return;
  }

  const favoriteIds = getFavorites();
  grid.innerHTML = filtered.map(recipe => {
    const isFav = favoriteIds.some(id => String(id) === String(recipe.id));
    return `
    <article class="premium-recipe-card" onclick="goToDetails('${recipe.id}')">
      <div class="prc-image-wrapper">
        <div class="prc-badge"><span class="prc-badge-dot"></span>${recipe.level}</div>
        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
        <div class="prc-overlay"></div>
        <button class="prc-fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${recipe.id}', this)" title="${isFav ? (getCurrentLang() === 'ar' ? 'محفوظة' : 'Saved') : (getCurrentLang() === 'ar' ? 'حفظ' : 'Save')}">
            <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" class="heart-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        </button>
      </div>
      <div class="prc-content">
        <h4 class="prc-title">${recipe.title}</h4>
        <p class="prc-desc">${recipe.description}</p>
        <div class="prc-meta">
          <div class="prc-meta-item"><span class="prc-icon">⏱️</span> ${recipe.time}</div>
          <div class="prc-meta-item"><span class="prc-icon">👥</span> ${recipe.serves}</div>
        </div>
        <div class="prc-actions">
          <button class="prc-btn prc-btn-outline" onclick="event.stopPropagation(); goToDetails('${recipe.id}')">
            ${t['recipes.btn.details']}
          </button>
          <button class="prc-btn prc-btn-primary" onclick="event.stopPropagation(); goToOrder('${recipe.id}')">
            <span class="prc-icon">🛒</span> ${t['recipes.btn.order']}
          </button>
        </div>
      </div>
    </article>
  `}).join("");
  init3DTilt();
}

function goToDetails(id) {
  window.location.href = `details.html?id=${id}`;
}

function goToOrder(id) {
  window.location.href = `order.html?id=${id}`;
}

/* ============================================================
   RENDER: RECIPE DETAILS
   ============================================================ */
function renderRecipeDetails() {
  const container = document.getElementById("recipeDetailContainer");
  if (!container) return;

  const lang = getCurrentLang();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const recipe = recipes.find(r => r.id === id);

  if (!recipe) {
    container.innerHTML = `<div class="empty-state">${lang === 'ar' ? 'الوصفة غير موجودة.' : 'Recipe not found.'}</div>`;
    return;
  }

  // Matching Logic
  const selectedIds = getSelectedIngredients();
  let matchCount = 0;

  const ingredientList = recipe.ingredients.map(ingId => {
    const item = ingredients.find(i => i.id === ingId);
    const hasIt = selectedIds.includes(ingId);
    if (hasIt) matchCount++;
    
    return {
      name: item ? `${item.emoji} ${item.name}` : ingId,
      status: hasIt ? 'available' : 'missing'
    };
  });

  const totalReq = recipe.ingredients.length;

  container.innerHTML = `
    <article class="recipe-detail-card">
      <div class="recipe-detail-hero">
        <div class="recipe-detail-image-wrap">
          <img src="${recipe.image}" alt="${recipe.title}">
          <div class="recipe-match-banner">
             <span class="match-score">${matchCount} / ${totalReq}</span>
             <span class="match-text">${translations[lang]['details.match_score']}</span>
          </div>
        </div>
        
        <div class="recipe-detail-content">
          <div class="recipe-title-header">
             <h2>${recipe.title}</h2>
             <button class="fav-icon-btn ${getFavorites().includes(recipe.id) ? 'active' : ''}" onclick="saveFavorite('${recipe.id}')">
               ${getFavorites().includes(recipe.id) ? '❤️' : '🤍'}
          </button>
        </div>
          
          <p class="recipe-desc">${recipe.description}</p>
        
        <div class="prc-detail-meta">
          <div class="prc-meta-item"><span class="prc-icon">🕒</span> ${recipe.time}</div>
          <div class="prc-meta-item"><span class="prc-icon">📊</span> ${recipe.level}</div>
          <div class="prc-meta-item"><span class="prc-icon">👥</span> ${recipe.serves}</div>
        </div>

        <div class="prc-detail-grid">
          <div class="prc-detail-section">
            <h4 class="prc-section-title"><span class="prc-badge-dot"></span> ${translations[lang]['details.ing_title']}</h4>
            <ul class="prc-ingredient-list">
              ${ingredientList.map(item => `
                  <li class="prc-ing-item ${item.status}">
                    <div class="prc-ing-info">
                      <span class="prc-status-icon">${item.status === 'available' ? '✅' : '❌'}</span>
                      <span class="prc-ing-name">${item.name}</span>
                    </div>
                    <div class="prc-ing-actions">
                      <span class="prc-status-label">${item.status === 'available' ? translations[lang]['details.have_it'] : translations[lang]['details.missing']}</span>
                      ${item.status === 'missing' ? `<button class="prc-btn prc-btn-outline" style="padding: 0.3rem 0.6rem; font-size:0.8rem;" onclick="addToShoppingList('${item.name}', '${recipe.id}')">➕</button>` : ''}
                    </div>
                  </li>
              `).join("")}
            </ul>
          </div>

          <div class="prc-detail-section">
            <h4 class="prc-section-title"><span class="prc-badge-dot"></span> ${lang === 'ar' ? 'خطوات التحضير' : 'Preparation Steps'}</h4>
            <div class="prc-steps-list">
              ${recipe.steps.map((step, index) => `
                <div class="prc-step-item">
                  <div class="prc-step-number">${index + 1}</div>
                  <div class="prc-step-text">${step}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="detail-footer-actions" style="display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; margin-top: 2rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 1.5rem;">
          <div style="display: flex; gap: 10px;">
            <button class="prc-btn prc-btn-outline" onclick="window.history.back()">
              ${translations[lang]['details.back']}
            </button>
            <button class="prc-btn prc-btn-primary" onclick="goToOrder('${recipe.id}')">
              <span class="prc-icon">🛒</span> ${translations[lang]['details.order_btn']}
            </button>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="prc-btn prc-btn-outline" onclick="shareRecipe('${recipe.title}')">
               <span class="prc-icon">🔗</span> ${translations[lang]['details.share']}
            </button>
            <button class="prc-btn prc-btn-outline" onclick="printRecipe()">
               <span class="prc-icon">🖨️</span> ${translations[lang]['details.print']}
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
  init3DTilt();
}

/* ============================================================
   RENDER: FAVORITES
   ============================================================ */

function showNotification(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '🔔');
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('active'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

async function toggleFavorite(recipeId, btnEl) {
  const lang = getCurrentLang();
  const t = translations[lang];
  const user = JSON.parse(localStorage.getItem('user'));
  let favorites = getFavorites();

  const isFavorited = favorites.some(id => String(id) === String(recipeId));

  // ✅ Instant visual feedback BEFORE waiting for API
  if (btnEl) {
    btnEl.classList.toggle('active');
    const span = btnEl.querySelector('span');
    if (span) {
      const nowFav = btnEl.classList.contains('active');
      span.textContent = nowFav
        ? (lang === 'ar' ? 'محفوظة ❤️' : 'Saved ❤️')
        : (lang === 'ar' ? 'حفظ' : 'Save');
    }
  }

  if (user) {
    try {
      const response = await fetch('api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, recipe_id: recipeId })
      });
      const result = await response.json();
      if (result.success) {
        if (result.status === 'added') {
          if (!favorites.some(id => String(id) === String(recipeId))) favorites.push(recipeId);
          showNotification(t['toast.fav_added'], 'success');
        } else {
          favorites = favorites.filter(id => String(id) !== String(recipeId));
          showNotification(t['toast.fav_removed'], 'success');
        }
      } else {
        // Revert visual if API failed
        if (btnEl) btnEl.classList.toggle('active');
        showNotification(result.error || t['toast.msg_fail'], 'error');
      }
    } catch (error) {
      // Revert visual if API failed
      if (btnEl) btnEl.classList.toggle('active');
      console.error("Favorite sync error:", error);
    }
  } else {
    if (!isFavorited) {
      favorites.push(recipeId);
      showNotification(t['toast.fav_local'], 'success');
    } else {
      favorites = favorites.filter(id => String(id) !== String(recipeId));
      showNotification(t['toast.fav_removed'], 'success');
    }
  }

  setFavorites(favorites);

  // Re-render grids
  const favGrid = document.getElementById("favoritesGrid");
  if (favGrid) renderFavorites();

  const featuredGrid = document.getElementById("featuredRecipesGrid");
  if (featuredGrid) renderFeaturedRecipes();
}

// Redirecting old calls
function saveFavorite(id) { toggleFavorite(id); }
function removeFavorite(id) { toggleFavorite(id); }

async function syncFavorites() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return;

  try {
    const res = await fetch(`api.php?action=get_user_favorites&user_id=${user.id}`);
    const dbFavs = await res.json();
    if (Array.isArray(dbFavs)) {
      setFavorites(dbFavs);
    }
  } catch (err) {
    console.error("Sync favorites error:", err);
  }
}

function renderFavorites(query = "") {
  const grid = document.getElementById("favoritesGrid");
  if (!grid) return;

  const lang = getCurrentLang();
  const favoriteIds = getFavorites();
  let favoriteRecipes = recipes.filter(recipe => favoriteIds.some(id => String(id) === String(recipe.id)));

  if (query) {
    favoriteRecipes = favoriteRecipes.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) || 
        r.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  if (!favoriteRecipes.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">💔</div>
        <p>${translations[lang]['favs.no_favs']}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = favoriteRecipes.map(recipe => {
    const isFav = true;
    return `
    <article class="premium-recipe-card" onclick="goToDetails('${recipe.id}')">
      <div class="prc-image-wrapper">
        <div class="prc-badge"><span class="prc-badge-dot"></span>${recipe.level}</div>
        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
        <div class="prc-overlay"></div>
        <button class="prc-fav-btn active" onclick="event.stopPropagation(); toggleFavorite('${recipe.id}', this)" title="${lang === 'ar' ? 'محفوظة' : 'Saved'}">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" class="heart-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        </button>
      </div>
      <div class="prc-content">
        <h4 class="prc-title">${recipe.title}</h4>
        <p class="prc-desc">${recipe.description}</p>
        <div class="prc-meta">
          <div class="prc-meta-item"><span class="prc-icon">⏱️</span> ${recipe.time}</div>
          <div class="prc-meta-item"><span class="prc-icon">👥</span> ${recipe.serves}</div>
        </div>
        <div class="prc-actions">
          <button class="prc-btn prc-btn-outline" onclick="event.stopPropagation(); goToDetails('${recipe.id}')">
            ${translations[lang]['recipes.btn.details']}
          </button>
          <button class="prc-btn prc-btn-primary" onclick="event.stopPropagation(); goToOrder('${recipe.id}')">
            <span class="prc-icon">🛒</span> ${translations[lang]['recipes.btn.order']}
          </button>
        </div>
      </div>
    </article>
  `}).join("");
  init3DTilt();
}

function renderFeaturedRecipes() {
  const grid = document.getElementById("featuredRecipesGrid");
  if (!grid) return;

  const lang = getCurrentLang();
  const favoriteIds = getFavorites();
  const favoriteRecipes = recipes.filter(recipe => favoriteIds.some(id => String(id) === String(recipe.id)));

  if (!favoriteRecipes.length) {
    grid.innerHTML = `
      <div class="empty-state-featured">
        <div class="icon-pulse">❤️</div>
        <p>${lang === 'ar' ? 'اختاري وصفاتك المفضلة لتظهر هنا باستمرار!' : 'Choose your favorite recipes to show here!'}</p>
        <a href="recipes.html" class="btn btn-primary featured-cta-btn">
          <span>${translations[lang]['nav.recipes']}</span>
          <i>🔍</i>
        </a>
      </div>
    `;
    return;
  }

  grid.innerHTML = favoriteRecipes.slice(0, 3).map(recipe => {
    const isFav = true;
    return `
    <article class="premium-recipe-card" onclick="goToDetails('${recipe.id}')">
      <div class="prc-image-wrapper">
        <div class="prc-badge"><span class="prc-badge-dot"></span>${recipe.level}</div>
        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
        <div class="prc-overlay"></div>
        <button class="prc-fav-btn active" onclick="event.stopPropagation(); toggleFavorite('${recipe.id}', this)" title="${lang === 'ar' ? 'محفوظة' : 'Saved'}">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" class="heart-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        </button>
      </div>
      <div class="prc-content">
        <h4 class="prc-title">${recipe.title}</h4>
        <p class="prc-desc">${recipe.description.substring(0, 60)}${recipe.description.length > 60 ? '...' : ''}</p>
        <div class="prc-meta">
          <div class="prc-meta-item"><span class="prc-icon">⏱️</span> ${recipe.time}</div>
          <div class="prc-meta-item"><span class="prc-icon">👥</span> ${recipe.serves}</div>
        </div>
        <div class="prc-actions">
          <button class="prc-btn prc-btn-outline" style="grid-column: span 2;" onclick="event.stopPropagation(); goToDetails('${recipe.id}')">
            ${translations[lang]['recipes.btn.details']}
          </button>
        </div>
      </div>
    </article>
  `}).join("");
  init3DTilt();
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
function initContactForm() {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const lang = getCurrentLang();
    
    const name = document.getElementById("contactName").value;
    const email = document.getElementById("contactEmail").value;
    const message = document.getElementById("contactMsg").value;

    try {
      const btn = form.querySelector('button[type="submit"]');
      setBtnLoading(btn, true);

      const response = await fetch('api.php?action=contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, message })
      });

      const result = await response.json();

      const t = translations[lang];
      if (result.success) {
        showNotification(t['toast.msg_sent'], 'success');
        form.reset();
      } else {
        showNotification(result.error || t['toast.msg_fail'], 'error');
      }
      setBtnLoading(btn, false);
    } catch (error) {
      console.error("Contact form error:", error);
      showNotification(lang === 'ar' ? "فشل الاتصال بالخادم." : "Connection error.", 'error');
      const btn = form.querySelector('button[type="submit"]');
      setBtnLoading(btn, false);
    }
  });
}

/* ============================================================
   AUTH FORMS (Login / Signup)
   ============================================================ */
function handleLogout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

/* ============================================================
   SESSION MANAGEMENT
   ============================================================ */
function checkSession() {
  const user = JSON.parse(localStorage.getItem("user"));
  const path = window.location.pathname;
  
  // Improved detection for auth pages
  const authFiles = ["index.html", "signup.html"];
  const isAuthPage = authFiles.some(file => path.endsWith(file)) || path.endsWith("/") || path.endsWith("humen");
  const isInternalPage = !isAuthPage && path.includes(".html");

  if (isInternalPage && !user) {
    window.location.href = "index.html";
  } else if (isAuthPage && user) {
    window.location.href = "home.html";
  }
}

function displayUserGreeting() {
  const user = JSON.parse(localStorage.getItem("user"));
  const nameEl = document.getElementById("userName");
  const avatarEl = document.getElementById("userAvatar");
  const profileEl = document.getElementById("userProfile");

  if (!user) {
    if (profileEl) profileEl.style.display = "none";
    return;
  }

  if (profileEl) {
    profileEl.style.display = "flex";
    profileEl.style.cursor = "pointer";
    profileEl.onclick = () => window.location.href = "profile.html";
  }

  if (nameEl) {
    const lang = getCurrentLang();
    const t = translations[lang];
    nameEl.textContent = t['profile.greeting'] + user.name;
  }
  if (avatarEl && user.name) {
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }
}

function initAuthForms() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const lang = getCurrentLang();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const btn = loginForm.querySelector('button[type="submit"]');
        setBtnLoading(btn, true);

        const response = await fetch('api.php?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (result.success) {
          localStorage.setItem("user", JSON.stringify(result.user));
          window.location.href = "home.html";
        } else {
          showNotification(result.error || (lang === 'ar' ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." : "Login failed."), 'error');
        }
        setBtnLoading(btn, false);
      } catch (error) {
        console.error("Login error:", error);
        showNotification(lang === 'ar' ? "فشل الاتصال بالخادم." : "Connection error.", 'error');
        const btn = loginForm.querySelector('button[type="submit"]');
        setBtnLoading(btn, false);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const lang = getCurrentLang();
      const fullName = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (password !== confirmPassword) {
        showNotification(lang === 'ar' ? "كلمات المرور غير متطابقة." : "Passwords do not match.", 'error');
        return;
      }

      try {
        const btn = signupForm.querySelector('button[type="submit"]');
        setBtnLoading(btn, true);

        const response = await fetch('api.php?action=signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email, password })
        });
        const result = await response.json();

        if (result.success) {
          showNotification(lang === 'ar' ? "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول." : "Account created successfully! You can now login.", 'success');
          setTimeout(() => { window.location.href = "index.html"; }, 1500);
        } else {
          showNotification(result.error || (lang === 'ar' ? "حدث خطأ أثناء التسجيل." : "Signup failed."), 'error');
        }
        setBtnLoading(btn, false);
      } catch (error) {
        console.error("Signup error:", error);
        showNotification(lang === 'ar' ? "فشل الاتصال بالخادم." : "Connection error.", 'error');
        const btn = signupForm.querySelector('button[type="submit"]');
        setBtnLoading(btn, false);
      }
    });
  }
}

/* ============================================================
   THEME TOGGLE
   ============================================================ */
function initThemeToggle() {
  const currentTheme = localStorage.getItem("theme") || "dark";
  if (currentTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  const toggleBtn = document.getElementById("themeToggle");
  if (!toggleBtn) return;

  toggleBtn.textContent = currentTheme === "light" ? "🌙" : "☀️";

  toggleBtn.addEventListener("click", () => {
    let theme = document.documentElement.getAttribute("data-theme");
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
      toggleBtn.textContent = "☀️";
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      toggleBtn.textContent = "🌙";
    }
  });
}

/* ============================================================
   LANGUAGE TOGGLE SYSTEM  (Arabic ↔ English)
   ============================================================ */
let translations = {
  ar: {
    "nav.home":          "الرئيسية",
    "nav.fridge":        "المطبخ الذكي",
    "nav.recipes":       "الوصفات",
    "nav.favorites":     "المفضلة",
    "nav.orders":        "الطلبات",
    "nav.about":         "عن المشروع",
    "nav.contact":       "تواصل معنا",
    "nav.login":         "دخول",
    "nav.logout":        "خروج",
    "nav.shopping_list": "قائمة التسوق",
    "nav.profile":       "حسابي",
    "lang.btn":          "EN",

    "index.subtitle":    "افتحي ثلاجتكِ... واتركي الباقي علينا",
    "index.eyebrow":     "من المكونات الموجودة عندك لوصفة حقيقية",
    "index.h2":          "اختاري المكونات<br>ودعي <span>BiteSight</span> يقترحلك ألذ وصفة",
    "index.desc":        "موقع ذكي وبسيط يساعدك تطلعي أكلة جميلة من الحاجات الموجودة عندك فعلاً. صور جذابة، خطوات سهلة، وتجربة مريحة جداً للعين.",
    "index.btn.start":   "ابدئي التجربة",
    "index.btn.browse":  "تصفحي الوصفات",
    "index.stat1.label": "وصفة متنوعة",
    "index.stat2.label": "مكون متاح",
    "index.stat3.val":   "سهل",
    "index.stat3.label": "خطوات مختصرة",
    "index.how.badge":   "كيف يعمل؟",
    "index.how.h3":      "3 خطوات بسيطة لوجبتك القادمة",
    "index.step1.h4":    "افتحي الثلاجة",
    "index.step1.p":     "اختاري المكونات الموجودة عندك من واجهة لطيفة وواضحة.",
    "index.step2.h4":    "احصلي على اقتراح",
    "index.step2.p":     "الموقع يرشح لكِ وصفات مناسبة للمكونات المتاحة.",
    "index.step3.h4":    "ابدئي الطبخ",
    "index.step3.p":     "شاهدي صورة الوصفة والخطوات بطريقة منظمة وسهلة.",
    "index.feat.badge":  "وصفات مميزة",
    "index.feat.h3":     "اختيارات جميلة وسريعة",
    "index.footer":      "أهلاً بكِ في موقعنا المتواضع للطبخ",

    "fridge.subtitle":   "حددي المكونات الموجودة عندك، والباقي علينا",
    "fridge.badge":      "المطبخ الذكي",
    "fridge.h3":         "اختاري المكونات المتوفرة لديكِ",
    "fridge.hint":       "اضغطي على أي مكون لإضافته، ثم اطلعي على الوصفات المطابقة.",
    "fridge.selected":   "المكونات المختارة",
    "fridge.btn.find":   "اقترح لي وصفات",
    "fridge.btn.clear":  "مسح الاختيارات",
    "fridge.empty_sel":  "لم يتم اختيار أي مكونات بعد.",

    "recipes.subtitle":  "اقتراحات بناءً على ذوقك ومكوناتك",
    "recipes.badge":     "اقتراحات الوصفات",
    "recipes.h3":        "وصفات تطابق المكونات المختارة",
    "recipes.sel_ing":   "المكونات المختارة",
    "recipes.no_sel":    "لا توجد مكونات مختارة. نعرض كل الوصفات المتاحة.",
    "recipes.no_match":  "لم نجد وصفات تطابق المكونات تماماً. جربي اختيار مكونات أخرى.",
    "recipes.btn.details": "التفاصيل",
    "recipes.btn.order":  "طلب الآن",
    "recipes.saved":     "محفوظة",
    "recipes.save":      "حفظ",

    "details.match_score": "المكونات المتوفرة",
    "details.ing_title":   "المكونات",
    "details.prep_title":  "خطوات التحضير",
    "details.have_it":     "متوفر",
    "details.missing":     "ناقص",
    "details.back":        "← العودة للوصفات",
    "details.order_btn":   "اطلبي هذه الوجبة",
    "details.share":       "مشاركة",
    "details.print":       "طباعة الوصفة",
    "details.add_shop":    "إضافة لقائمة التسوق",

    "favs.subtitle":     "احتفظي بوصفاتك المفضلة في مكان واحد",
    "favs.badge":        "وصفاتك المفضلة",
    "favs.h3":           "كل ما قمتِ بحفظه سيظهر هنا",
    "favs.no_favs":      "لا توجد وصفات محفوظة بعد. احفظي ما يعجبك وسيظهر هنا.",
    "favs.remove":       "حذف",

    "shop.subtitle":     "خدمة ذكية",
    "shop.h3":           "قائمة تسوقك",
    "shop.desc":         "هنا تجدين كل المكونات التي قمتِ بإضافتها لتكملي وصفاتك اللذيذة.",
    "shop.empty":        "قائمة التسوق فارغة",
    "shop.empty_desc":   "ابدئي بإضافة المكونات الناقصة من صفحة تفاصيل الوصفة.",
    "shop.browse":       "تصفح الوصفات",
    "shop.clear":        "مسح القائمة بالكامل",
    "shop.loading":      "جاري تحميل القائمة...",

    "orders.subtitle":   "تاريخ طلباتك",
    "orders.h3":         "طلباتي السابقة",
    "orders.no_orders":  "ليس لديكِ أي طلبات بعد",
    "orders.browse":     "تصفحي الوصفات وقومي بأول طلب لكِ",
    "orders.loading":    "جاري تحميل طلباتك...",
    "orders.delivery":   "مطلوب في",
    "orders.at_time":    "الساعة",
    "orders.order_id":   "رقم الطلب",
    "orders.order_date": "تاريخ الطلب",
    "orders.address":    "العنوان",
    "orders.map":        "عرض الموقع على الخريطة",
    "orders.pending":    "قيد الانتظار",
    "orders.confirmed":  "تم التأكيد",
    "orders.delivered":  "تم التوصيل",
    "orders.cancelled":  "ملغي",

    "about.subtitle":    "مشروع يجعل الطبخ أسهل وأجمل",
    "about.badge":       "عن BiteSight",
    "about.h3":          "فكرة بسيطة... لكنها مفيدة جداً",
    "about.p1":          "BiteSight هو موقع يساعد المستخدمين على اختيار المكونات المتوفرة لديهم ثم الحصول على اقتراحات لوصفات مع صور جميلة وخطوات واضحة.",
    "about.p2":          "ركزنا في التصميم على الألوان الدافئة، والراحة البصرية، وسهولة الاستخدام لتكون التجربة ممتعة حتى قبل البدء في الطبخ.",
    "about.p3":          "المشروع مناسب كمشروع تخرج، أو مشروع للواجهات الأمامية (Frontend)، أو كبداية لمنصة وصفات ذكية.",

    "contact.subtitle":  "نسعد بسماع رأيك وتواصلك معنا",
    "contact.badge":     "تواصل مباشر",
    "contact.h3":        "أرسلي لنا رسالتك",
    "contact.name":      "الاسم الكامل",
    "contact.email":     "البريد الإلكتروني",
    "contact.msg":       "رسالتك",
    "contact.send":      "إرسال",

    "login.subtitle":    "سجلي دخولك وعودي لوصفاتك المفضلة",
    "login.badge":       "تسجيل الدخول",
    "login.h3":          "أهلاً بكِ مجدداً",
    "login.email":       "البريد الإلكتروني",
    "login.password":    "كلمة المرور",
    "login.forgot":      "نسيتِ كلمة المرور؟",
    "login.btn":         "دخول",
    "login.noacc":       "ليس لديكِ حساب؟",
    "login.signup":      "اشتركي الآن",
    "login.or":          "أو تابعي باستخدام",

    "signup.subtitle":   "انضمي لعائلة BiteSight واستمتعي بالطبخ",
    "signup.badge":      "حساب جديد",
    "signup.h3":         "إنشاء حساب",
    "signup.name":       "الاسم الكامل",
    "signup.confirm":    "تأكيد كلمة المرور",
    "signup.btn":        "إنشاء الحساب",
    "signup.haveacc":    "لديكِ حساب بالفعل؟",
    "signup.login":      "سجلي دخولك",
    "signup.terms":      "أوافق على الشروط والأحكام",

    "forgot.subtitle":   "استعادة كلمة المرور",
    "forgot.h3":         "تحديث كلمة المرور",
    "forgot.btn":        "تحديث كلمة المرور",
    "forgot.remembered": "تذكرتِ كلمة المرور؟",

    "profile.badge":     "معلوماتك الشخصية",
    "profile.h3":        "مرحباً بكِ في حسابك الخاص",
    "profile.label.name": "الاسم الكامل",
    "profile.label.email": "البريد الإلكتروني",
    "profile.btn.logout": "خروج من الحساب",
    "profile.btn.save":   "حفظ التعديلات",
    "profile.label.old_pass": "كلمة المرور الحالية",
    "profile.label.new_pass": "كلمة المرور الجديدة",
    "profile.greeting":  "أهلاً بكِ، ",

    "footer.desc": "اكتشفي عالم الطبخ الذكي مع BiteSight. نساعدكِ على تحويل المكونات البسيطة إلى وجبات استثنائية بلمسة واحدة.",
    "footer.rights": "جميع الحقوق محفوظة &copy; 2026",
    "footer.explore": "استكشفي",
    "footer.important_links": "روابط هامة",
    "footer.direct_contact": "تواصل مباشر",
    "footer.contact_desc": "لديكِ استفسار؟ نحن هنا للمساعدة",

    "hero.chip1": "🥚 بيض",
    "hero.chip2": "🍅 طماطم",
    "hero.chip3": "🧀 جبنة",

    "placeholder.name": "الاسم الكامل",
    "placeholder.email": "example@mail.com",
    "placeholder.password": "••••••••",
    "placeholder.msg": "اكتبي رسالتك هنا...",

    "toast.fav_added": "تمت الإضافة للمفضلة ❤️",
    "toast.fav_removed": "تم الحذف من المفضلة",
    "toast.fav_local": "تم الحفظ في المفضلة (محلياً) ❤️",
    "toast.link_copied": "تم نسخ الرابط! يمكنك مشاركته الآن.",
    "toast.login_req": "يرجى تسجيل الدخول أولاً.",
    "toast.msg_sent": "تم إرسال رسالتك بنجاح ✅",
    "toast.msg_fail": "فشل إرسال الرسالة.",
  },

  en: {
    "nav.home":          "Home",
    "nav.fridge":        "Fridge",
    "nav.recipes":       "Recipes",
    "nav.favorites":     "Favorites",
    "nav.orders":        "Orders",
    "nav.about":         "About",
    "nav.contact":       "Contact",
    "nav.login":         "Login",
    "nav.logout":        "Logout",
    "nav.shopping_list": "Shopping",
    "nav.profile":       "Profile",
    "lang.btn":          "ع",

    "index.subtitle":    "Open your fridge... and leave the rest to us",
    "index.eyebrow":     "From what you have to a real recipe",
    "index.h2":          "Pick your ingredients<br>and let <span>BiteSight</span> suggest the tastiest recipe",
    "index.desc":        "A smart and simple website that helps you create a beautiful meal from what you actually have. Stunning photos, easy steps, and a very comfortable experience for your eyes.",
    "index.btn.start":   "Get Started",
    "index.btn.browse":  "Browse Recipes",
    "index.stat1.label": "Diverse Recipes",
    "index.stat2.label": "Available Ingredients",
    "index.stat3.val":   "Easy",
    "index.stat3.label": "Short Steps",
    "index.how.badge":   "How it works?",
    "index.how.h3":      "Just 3 steps to your perfect recipe",
    "index.step1.h4":    "Open the Fridge",
    "index.step1.p":     "Select available ingredients from a clean and intuitive interface.",
    "index.step2.h4":    "Get a Suggestion",
    "index.step2.p":     "The site recommends recipes that match your available ingredients.",
    "index.step3.h4":    "Start Cooking",
    "index.step3.p":     "View the recipe photo and steps in an organized, easy-to-follow way.",
    "index.feat.badge":  "Featured Recipes",
    "index.feat.h3":     "Beautiful and quick picks",
    "index.footer":      "Welcome to our humble food website",

    "fridge.subtitle":   "Pick what you have, and leave the rest to us",
    "fridge.badge":      "Smart Fridge",
    "fridge.h3":         "Select your available ingredients",
    "fridge.hint":       "Tap any ingredient to add it, then see the matching recipes.",
    "fridge.selected":   "Selected Ingredients",
    "fridge.btn.find":   "Suggest Recipes",
    "fridge.btn.clear":  "Clear Selection",
    "fridge.empty_sel":  "No ingredients selected yet.",

    "recipes.subtitle":  "Suggestions based on your taste and ingredients",
    "recipes.badge":     "Recipe Suggestions",
    "recipes.h3":        "Recipes matching your selected ingredients",
    "recipes.sel_ing":   "Selected ingredients",
    "recipes.no_sel":    "No ingredients selected. Showing all available recipes.",
    "recipes.no_match":  "No matching recipes found. Try different ingredients.",
    "recipes.btn.details": "Details",
    "recipes.btn.order":  "Order Now",
    "recipes.saved":     "Saved",
    "recipes.save":      "Save",

    "details.match_score": "Ingredients available",
    "details.ing_title":   "Ingredients",
    "details.prep_title":  "Preparation Steps",
    "details.have_it":     "Have it",
    "details.missing":     "Missing",
    "details.back":        "← Go Back",
    "details.order_btn":   "Order this Meal",
    "details.share":       "Share",
    "details.print":       "Print Recipe",
    "details.add_shop":    "Add to Shopping List",

    "favs.subtitle":     "Keep your favourite recipes in one place",
    "favs.badge":        "Your Favourites",
    "favs.h3":           "Everything you saved will appear here",
    "favs.no_favs":      "No saved recipes yet. Save your favorites and they will appear here.",
    "favs.remove":       "Remove",

    "shop.subtitle":     "Smart Service",
    "shop.h3":           "Your Shopping List",
    "shop.desc":         "Here you'll find all the ingredients you've added to complete your delicious recipes.",
    "shop.empty":        "Shopping list is empty",
    "shop.empty_desc":   "Start adding missing ingredients from the recipe details page.",
    "shop.browse":       "Browse Recipes",
    "shop.clear":        "Clear Entire List",
    "shop.loading":      "Loading list...",

    "orders.subtitle":   "Order History",
    "orders.h3":         "My Previous Orders",
    "orders.no_orders":  "You have no orders yet",
    "orders.browse":     "Browse recipes and place your first order",
    "orders.loading":    "Loading your orders...",
    "orders.delivery":   "Required at",
    "orders.at_time":    "at",
    "orders.order_id":   "Order ID",
    "orders.order_date": "Order Date",
    "orders.address":    "Address",
    "orders.map":        "View Location on Map",
    "orders.pending":    "Pending",
    "orders.confirmed":  "Confirmed",
    "orders.delivered":  "Delivered",
    "orders.cancelled":  "Cancelled",

    "about.subtitle":    "A project that makes cooking easier and more beautiful",
    "about.badge":       "About BiteSight",
    "about.h3":          "A simple idea... but incredibly useful",
    "about.p1":          "BiteSight is a website that helps users select the ingredients they have and then get recipe suggestions with beautiful photos and clear steps.",
    "about.p2":          "We focused our design on warm colors, visual comfort, and ease of use so that the experience is enjoyable even before cooking starts.",
    "about.p3":          "The project is suitable as a graduation project, a frontend project, or a starting point for a smart recipe platform.",

    "contact.subtitle":  "We're happy to hear from you",
    "contact.badge":     "Contact Us",
    "contact.h3":        "Send us your message",
    "contact.name":      "Name",
    "contact.email":     "Email Address",
    "contact.msg":       "Your message",
    "contact.send":      "Send",

    "login.subtitle":    "Log in and return to your favorite recipes",
    "login.badge":       "Login",
    "login.h3":          "Welcome Back",
    "login.email":       "Email Address",
    "login.password":    "Password",
    "login.forgot":      "Forgot Password?",
    "login.btn":         "Login",
    "login.noacc":       "Don't have an account?",
    "login.signup":      "Sign up now",
    "login.or":          "Or continue with",

    "signup.subtitle":   "Join the BiteSight community and enjoy cooking",
    "signup.badge":      "New Account",
    "signup.h3":         "Create Account",
    "signup.name":       "Full Name",
    "signup.confirm":    "Confirm Password",
    "signup.btn":        "Create Account",
    "signup.haveacc":    "Already have an account?",
    "signup.login":      "Log in",
    "signup.terms":      "I agree to the Terms & Conditions",

    "forgot.subtitle":   "Recover Password",
    "forgot.h3":         "Update Password",
    "forgot.btn":        "Update Password",
    "forgot.remembered": "Remembered your password?",

    "profile.badge":     "Personal Information",
    "profile.h3":        "Welcome to your private account",
    "profile.label.name": "Full Name",
    "profile.label.email": "Email Address",
    "profile.btn.logout": "Logout from Account",
    "profile.btn.save":   "Save Changes",
    "profile.label.old_pass": "Current Password",
    "profile.label.new_pass": "New Password",
    "profile.greeting":  "Hi, ",

    "footer.desc": "Discover the world of smart cooking with BiteSight. We help you transform simple ingredients into extraordinary meals with a single touch.",
    "footer.rights": "All rights reserved &copy; 2026",
    "footer.explore": "Explore",
    "footer.important_links": "Important Links",
    "footer.direct_contact": "Direct Contact",
    "footer.contact_desc": "Have a question? We are here to help",

    "hero.chip1": "🥚 Egg",
    "hero.chip2": "🍅 Tomato",
    "hero.chip3": "🧀 Cheese",

    "placeholder.name": "Full Name",
    "placeholder.email": "example@mail.com",
    "placeholder.password": "••••••••",
    "placeholder.msg": "Write your message here...",

    "toast.fav_added": "Added to favorites ❤️",
    "toast.fav_removed": "Removed from favorites",
    "toast.fav_local": "Saved to favorites (locally) ❤️",
    "toast.link_copied": "Link copied! You can now share it.",
    "toast.login_req": "Please login first.",
    "toast.msg_sent": "Your message was sent successfully ✅",
    "toast.msg_fail": "Failed to send message.",
  }
};


function getCurrentLang() {
  return localStorage.getItem("lang") || "ar";
}

function applyLanguage(lang) {
  const t = translations[lang];
  const html = document.documentElement;

  html.setAttribute("lang", lang);
  html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key] !== undefined) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.setAttribute("placeholder", t[key]);
      } else {
        el.innerHTML = t[key];
      }
    }
  });

  const btn = document.getElementById("langToggle");
  if (btn) {
    const label = btn.querySelector(".lang-label");
    if (label) label.textContent = t["lang.btn"];
  }

  localStorage.setItem("lang", lang);
}

function initLangToggle() {
  const btn = document.getElementById("langToggle");
  if (!btn) return;

  applyLanguage(getCurrentLang());

  btn.addEventListener("click", () => {
    const next = getCurrentLang() === "ar" ? "en" : "ar";
    applyLanguage(next);
    // Re-render dynamic JS content
    const ingredientGrid = document.getElementById("ingredientGrid");
    if (ingredientGrid) {
      ingredientGrid.innerHTML = "";
      renderIngredients();
    } else {
      renderRecipes();
      renderFavorites();
      renderRecipeDetails();
      renderProfile();
    }
  });
}

/* ============================================================
   RENDER: PROFILE
   ============================================================ */
async function renderProfile() {
  const container = document.querySelector(".profile-container");
  if (!container) return;

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.id) return;

  try {
    const response = await fetch(`api.php?action=get_user_profile&id=${user.id}`);
    const result = await response.json();

    if (result.success) {
      document.getElementById("profileName").textContent = result.user.full_name;
      const nameInput = document.getElementById("editFullName");
      const emailInput = document.getElementById("editEmail");
      
      if (nameInput) nameInput.value = result.user.full_name;
      if (emailInput) emailInput.value = result.user.email;
      
      document.getElementById("profileAvatar").textContent = result.user.full_name.charAt(0).toUpperCase();

      // Load Stats for Dashboard
      try {
        const statsRes = await fetch(`api.php?action=get_user_stats&user_id=${user.id}`);
        const stats = await statsRes.json();
        if (!stats.error) {
           document.getElementById("statFavCount").textContent = stats.favorites;
           document.getElementById("statShopCount").textContent = stats.shopping_list;
           document.getElementById("statPlanCount").textContent = stats.meal_plan;
        }
      } catch(e) {}

      // IMPORTANT: Explicitly clear password fields on load
      const oldPass = document.getElementById("oldPassword");
      const newPass = document.getElementById("newPassword");
      if (oldPass) oldPass.value = "";
      if (newPass) newPass.value = "";
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

async function saveProfileChanges() {
  const user = JSON.parse(localStorage.getItem("user"));
  const newName = document.getElementById("editFullName").value;
  const newEmail = document.getElementById("editEmail").value;

  if (!newName || !newEmail) {
    showNotification(getCurrentLang() === 'ar' ? "الاسم والبريد الإلكتروني مطلوبان." : "Name and Email are required.", 'error');
    return;
  }

  try {
    const response = await fetch('api.php?action=update_user_profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, full_name: newName, email: newEmail })
    });
    const result = await response.json();

    if (result.success) {
      // Update local storage
      user.name = newName;
      localStorage.setItem("user", JSON.stringify(user));
      
      showNotification(getCurrentLang() === 'ar' ? "تم تحديث الملف الشخصي بنجاح!" : "Profile updated successfully!", 'success');
      
      // Refresh UI
      displayUserGreeting();
      renderProfile();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error("Error saving profile:", error);
  }
}

async function savePasswordChanges() {
  const user = JSON.parse(localStorage.getItem("user"));
  const oldPass = document.getElementById("oldPassword").value;
  const newPass = document.getElementById("newPassword").value;

  if (!oldPass || !newPass) {
    showNotification(getCurrentLang() === 'ar' ? "يرجى ملء جميع حقول كلمة المرور." : "Please fill all password fields.", 'error');
    return;
  }

  try {
    const response = await fetch('api.php?action=change_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, old_password: oldPass, new_password: newPass })
    });
    const result = await response.json();

    if (result.success) {
      showNotification(getCurrentLang() === 'ar' ? "تم تحديث كلمة المرور بنجاح!" : "Password updated successfully!", 'success');
      document.getElementById("oldPassword").value = "";
      document.getElementById("newPassword").value = "";
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error("Error saving password:", error);
    showNotification(getCurrentLang() === 'ar' ? "فشل الاتصال بالخادم." : "Connection error.", 'error');
  }
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  checkSession();
  initThemeToggle();
  initLangToggle();
  displayUserGreeting();
  initAuthForms(); // Moved up to ensure it runs early
  initContactForm();
  
  await loadData();
  renderIngredients();
  renderRecipes();
  renderRecipeDetails();
  renderFavorites();
  renderFeaturedRecipes();
  renderProfile();

  // Search Listeners
  const ingSearch = document.getElementById("ingSearchInput");
  if (ingSearch) {
    ingSearch.addEventListener("input", (e) => renderIngredients(e.target.value));
  }

  const recipeSearch = document.getElementById("recipeSearchInput");
  if (recipeSearch) {
    recipeSearch.addEventListener("input", (e) => renderRecipes(e.target.value));
  }

  const favSearch = document.getElementById("favSearchInput");
  if (favSearch) {
    favSearch.addEventListener("input", (e) => renderFavorites(e.target.value));
  }

  // Header Scroll Effect
  const header = document.querySelector(".site-header");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
});

/* ============================================================
   PASSWORD TOGGLE
   ============================================================ */
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-off-icon">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    `;
  } else {
    input.type = "password";
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  }
}

async function addToShoppingList(ingredientName, recipeId) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    const t = translations[getCurrentLang()];
    showNotification(t['toast.login_req'], 'error');
    return;
  }

  try {
    const response = await fetch('api.php?action=add_to_shopping_list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        ingredient_name: ingredientName,
        recipe_id: recipeId
      })
    });
    const result = await response.json();
    if (result.success) {
      showNotification(getCurrentLang() === 'ar' ? `تمت إضافة ${ingredientName} للقائمة.` : `Added ${ingredientName} to list.`, 'success');
    } else {
      showNotification(result.error, 'error');
    }
  } catch (err) {
    showNotification(getCurrentLang() === 'ar' ? "فشل الاتصال بالخادم." : "Connection error.", 'error');
  }
}

/* ============================================================
   UX UTILITIES (Loading, Share, Print)
   ============================================================ */
function setBtnLoading(btn, isLoading) {
  if (!btn) return;
  if (isLoading) {
    btn.classList.add('btn-loading');
    btn.setAttribute('disabled', 'true');
  } else {
    btn.classList.remove('btn-loading');
    btn.removeAttribute('disabled');
  }
}

function printRecipe() {
  window.print();
}

function shareRecipe(title) {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({
      title: title || 'BiteSight Recipe',
      url: url
    }).catch(err => console.error(err));
  } else {
    navigator.clipboard.writeText(url).then(() => {
      const t = translations[getCurrentLang()];
      showNotification(t['toast.link_copied'], 'success');
    });
  }
}

/* ============================================================
   3D DISPLAY SYSTEM
   ============================================================ */
function init3DTilt() {
  const cards = document.querySelectorAll('.premium-recipe-card, .recipe-detail-card, .ingredient-item, .auth-card');

  cards.forEach(card => {
    if (card.dataset.tiltInit) return;
    card.dataset.tiltInit = "true";

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      card.style.transition = 'transform 0.1s ease-out';
      card.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      card.style.zIndex = '';
    });
  });
}
