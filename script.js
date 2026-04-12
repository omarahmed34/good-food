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
  if (selected.some(s => isNaN(Number(s)))) {
    selected = [];
    localStorage.setItem("selectedIngredients", "[]");
  }
  return selected;
}

function setSelectedIngredients(data) {
  localStorage.setItem("selectedIngredients", JSON.stringify(data));
}

function getFavorites() {
  let fav = JSON.parse(localStorage.getItem("favoriteRecipes")) || [];
  if (fav.some(s => isNaN(Number(s)))) {
    fav = [];
    localStorage.setItem("favoriteRecipes", "[]");
  }
  return fav;
}

function setFavorites(data) {
  localStorage.setItem("favoriteRecipes", JSON.stringify(data));
}

/* ============================================================
   RENDER: INGREDIENTS (Fridge page)
   ============================================================ */
function renderIngredients() {
  const grid = document.getElementById("ingredientGrid");
  const selectedBox = document.getElementById("selectedIngredients");
  if (!grid || !selectedBox) return;

  let selected = getSelectedIngredients();
  const lang = getCurrentLang();

  function refreshSelected() {
    selectedBox.innerHTML = "";
    if (!selected.length) {
      selectedBox.innerHTML = `<p class="subtle">${lang === 'ar' ? 'لسه ما اختارتيش مكونات.' : 'No ingredients selected yet.'}</p>`;
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

  ingredients.forEach(item => {
    const div = document.createElement("div");
    div.className = "ingredient-item";
    if (selected.includes(item.id)) div.classList.add("active");

    div.innerHTML = `
      <div class="ingredient-emoji">${item.emoji}</div>
      <div>${item.name}</div>
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
      window.location.reload();
    });
  }
}

/* ============================================================
   RENDER: RECIPES
   ============================================================ */
function renderRecipes() {
  const grid = document.getElementById("recipesGrid");
  const matchedBox = document.getElementById("matchedIngredientsBox");
  if (!grid) return;

  const lang = getCurrentLang();
  const selected = getSelectedIngredients();

  if (matchedBox) {
    if (selected.length) {
      const names = selected.map(id => ingredients.find(i => i.id === id)?.name).filter(Boolean);
      matchedBox.innerHTML = lang === 'ar'
        ? `المكونات المختارة: <strong>${names.join(" - ")}</strong>`
        : `Selected ingredients: <strong>${names.join(" - ")}</strong>`;
    } else {
      matchedBox.innerHTML = lang === 'ar'
        ? `لم يتم اختيار مكونات، لذلك ستظهر كل الوصفات المتاحة.`
        : `No ingredients selected. Showing all available recipes.`;
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
    grid.innerHTML = `<div class="empty-state">${lang === 'ar' ? 'لا توجد وصفات مطابقة حاليًا. جربي مكونات أخرى.' : 'No matching recipes found. Try different ingredients.'}</div>`;
    return;
  }

  const favoriteIds = getFavorites();
  grid.innerHTML = filtered.map(recipe => {
    const isFav = favoriteIds.includes(recipe.id);
    return `
    <article class="recipe-card">
      <img src="${recipe.image}" alt="${recipe.title}">
      <div class="recipe-card-content">
        <h4>${recipe.title}</h4>
        <p>${recipe.description}</p>
        <div class="meta">
          <span><i>⏱</i> ${recipe.time}</span>
          <span><i>👩‍🍳</i> ${recipe.level}</span>
          <span><i>🍽</i> ${recipe.serves}</span>
        </div>
        <div class="card-actions">
          <button class="small-btn save-btn ${isFav ? 'active' : ''}" 
                  onclick="saveFavorite('${recipe.id}')" 
                  ${isFav ? 'disabled' : ''}>
            ${isFav ? (lang === 'ar' ? 'تم الحفظ 💛' : 'Saved 💛') : (lang === 'ar' ? 'حفظ للمفضلة' : 'Save to Favorites')}
          </button>
          <button class="small-btn view-btn" onclick="goToDetails('${recipe.id}')">${lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}</button>
        </div>
      </div>
    </article>
  `}).join("");
}

function goToDetails(id) {
  window.location.href = `details.html?id=${id}`;
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
             <span class="match-text">${lang === 'ar' ? 'مكوّنات متوفرة' : 'Ingredients available'}</span>
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
          
          <div class="meta-row">
            <span class="meta-item"><i>⏱</i> ${recipe.time}</span>
            <span class="meta-item"><i>👩‍🍳</i> ${recipe.level}</span>
            <span class="meta-item"><i>🍽</i> ${recipe.serves}</span>
          </div>

          <div class="detail-sections-grid">
            <div class="detail-section">
              <h4 class="section-title">
                <span class="dot"></span>
                ${lang === 'ar' ? 'المكونات' : 'Ingredients'}
              </h4>
              <ul class="ingredient-status-list">
                ${ingredientList.map(item => `
                  <li class="status-item ${item.status}">
                    <span class="status-indicator">${item.status === 'available' ? '✅' : '🔴'}</span>
                    <span class="item-name">${item.name}</span>
                    <span class="status-label">${item.status === 'available' ? (lang === 'ar' ? 'متوفر' : 'Have it') : (lang === 'ar' ? 'ناقص' : 'Missing')}</span>
                  </li>
                `).join("")}
              </ul>
            </div>

            <div class="detail-section">
              <h4 class="section-title">
                <span class="dot"></span>
                ${lang === 'ar' ? 'خطوات التحضير' : 'Preparation Steps'}
              </h4>
              <ol class="prep-steps-list">
                ${recipe.steps.map(step => `<li>${step}</li>`).join("")}
              </ol>
            </div>
          </div>

          <div class="detail-footer-actions">
            <button class="btn btn-secondary" onclick="window.history.back()">
              ${lang === 'ar' ? '← العودة للخلف' : '← Go Back'}
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/* ============================================================
   RENDER: FAVORITES
   ============================================================ */
function setFavorites(data) {
  localStorage.setItem("favorites", JSON.stringify(data));
}

function showNotification(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✅' : '🗑️';
  
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

/* ============================================================
   RENDER: FAVORITES
   ============================================================ */
function saveFavorite(id) {
  const lang = getCurrentLang();
  const favorites = getFavorites();
  if (!favorites.includes(id)) {
    favorites.push(id);
    setFavorites(favorites);
    
    showNotification(
        lang === 'ar' ? "تم حفظ الوصفة في المفضلة ✅" : "Recipe saved to favorites ✅",
        'success'
    );
    
    renderRecipes();
  }
}

function renderFavorites() {
  const grid = document.getElementById("favoritesGrid");
  if (!grid) return;

  const lang = getCurrentLang();
  const favoriteIds = getFavorites();
  const favoriteRecipes = recipes.filter(recipe => favoriteIds.includes(recipe.id));

  if (!favoriteRecipes.length) {
    grid.innerHTML = `<div class="empty-state">${lang === 'ar' ? 'لا توجد وصفات محفوظة بعد. احفظي وصفاتك المفضلة وستظهر هنا.' : 'No saved recipes yet. Save your favorites and they will appear here.'}</div>`;
    return;
  }

  grid.innerHTML = favoriteRecipes.map(recipe => `
    <article class="recipe-card">
      <img src="${recipe.image}" alt="${recipe.title}">
      <div class="recipe-card-content">
        <h4>${recipe.title}</h4>
        <p>${recipe.description}</p>
        <div class="meta">
          <span><i>⏱</i> ${recipe.time}</span>
          <span><i>👩‍🍳</i> ${recipe.level}</span>
          <span><i>🍽</i> ${recipe.serves}</span>
        </div>
        <div class="card-actions">
          <button class="small-btn view-btn" onclick="goToDetails('${recipe.id}')">${lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}</button>
          <button class="small-btn save-btn" onclick="removeFavorite('${recipe.id}')">${lang === 'ar' ? 'إزالة' : 'Remove'}</button>
        </div>
      </div>
    </article>
  `).join("");
}

function removeFavorite(id) {
  const lang = getCurrentLang();
  const favorites = getFavorites().filter(item => item !== id);
  setFavorites(favorites);
  
  showNotification(
    lang === 'ar' ? "تمت إزالة الوصفة من المفضلة 🗑️" : "Recipe removed from favorites 🗑️",
    'remove'
  );

  setTimeout(() => window.location.reload(), 1000);
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
      const response = await fetch('api.php?action=contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, message })
      });

      const result = await response.json();

      if (result.success) {
        alert(lang === 'ar' ? "تم إرسال رسالتك بنجاح ✉️" : "Your message was sent successfully ✉️");
        form.reset();
      } else {
        alert(result.error || (lang === 'ar' ? "فشل إرسال الرسالة." : "Failed to send message."));
      }
    } catch (error) {
      console.error("Contact form error:", error);
      alert(lang === 'ar' ? "حدث خطأ في الاتصال." : "Connection error.");
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
    nameEl.textContent = (lang === 'ar' ? `أهلاً، ${user.name}` : `Hi, ${user.name}`);
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
          alert(result.error || (lang === 'ar' ? "فشل تسجيل الدخول." : "Login failed."));
        }
      } catch (error) {
        console.error("Login error:", error);
        alert(lang === 'ar' ? "حدث خطأ في الاتصال." : "Connection error.");
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

      try {
        const response = await fetch('api.php?action=signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email, password })
        });
        const result = await response.json();

        if (result.success) {
          alert(lang === 'ar' ? "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول." : "Account created successfully! You can now login.");
          window.location.href = "index.html";
        } else {
          alert(result.error || (lang === 'ar' ? "فشل إنشاء الحساب." : "Signup failed."));
        }
      } catch (error) {
        console.error("Signup error:", error);
        alert(lang === 'ar' ? "حدث خطأ في الاتصال." : "Connection error.");
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
    "nav.fridge":        "التلاجة",
    "nav.recipes":       "الوصفات",
    "nav.favorites":     "المفضلة",
    "nav.about":         "عنّا",
    "nav.contact":       "تواصل",
    "nav.login":         "دخول",
    "nav.logout":        "خروج",
    "lang.btn":          "EN",

    "index.subtitle":    "افتحي التلاجة... وسيبي الباقي علينا",
    "index.eyebrow":     "من المكونات الموجودة عندك لوصفة حقيقية",
    "index.h2":          "اختاري مكوناتك<br>وخلي <span>BiteSight</span> يقترحلك ألذ وصفة",
    "index.desc":        "موقع ذكي وبسيط يساعدك تطلعي أكلة جميلة من الحاجات الموجودة عندك فعلًا. صور جذابة، خطوات سهلة، وتجربة مريحة جدًا للعين.",
    "index.btn.start":   "ابدئي الآن",
    "index.btn.browse":  "تصفحي الوصفات",
    "index.stat1.label": "وصفة متنوعة",
    "index.stat2.label": "مكون متاح",
    "index.stat3.val":   "سهل",
    "index.stat3.label": "خطوات مختصرة",
    "index.how.badge":   "كيف يعمل؟",
    "index.how.h3":      "3 خطوات فقط وتوصلي لوصفتك",
    "index.step1.h4":    "افتحي التلاجة",
    "index.step1.p":     "اختاري المكونات الموجودة عندك من واجهة لطيفة وواضحة.",
    "index.step2.h4":    "احصلي على اقتراح",
    "index.step2.p":     "الموقع يرشح لك وصفات مناسبة للمكونات المتاحة.",
    "index.step3.h4":    "ابدئي الطبخ",
    "index.step3.p":     "شاهدي صورة الوصفة والخطوات بطريقة منظمة وسهلة.",
    "index.feat.badge":  "وصفات مميزة",
    "index.feat.h3":     "اختيارات جميلة وسريعة",
    "index.recipe1.h4":  "عجة الجبنة والطماطم",
    "index.recipe1.p":   "وجبة سريعة، مشبعة، ومثالية للفطار أو العشاء.",
    "index.recipe2.h4":  "مكرونة بالخضار",
    "index.recipe2.p":   "ألوان مبهجة وطعم خفيف وسهل التحضير جدًا.",
    "index.recipe3.h4":  "سلطة منعشة",
    "index.recipe3.p":   "خيار مثالي لو عايزة حاجة سريعة وفريش.",
    "index.footer":      "اهلا بك في موقعنا المتواضع للطعام",

    "fridge.subtitle":   "اختاري اللي عندك وسيبي الباقي علينا",
    "fridge.badge":      "الثلاجة الذكية",
    "fridge.h3":         "اختاري المكونات المتاحة عندك",
    "fridge.hint":       "اضغطي على أي مكون لإضافته، وبعدها شاهدي الوصفات المناسبة.",
    "fridge.selected":   "المكونات المختارة",
    "fridge.btn.find":   "اقترحيلي وصفات",
    "fridge.btn.clear":  "مسح الاختيار",
    "fridge.footer":     "اخطار طعامك من عندنا نحن نقدم احسن انواع الطعام",

    "recipes.subtitle":  "اقتراحات على حسب ذوقك ومكوناتك",
    "recipes.badge":     "اقتراحات الوصفات",
    "recipes.h3":        "الوصفات المناسبة للمكونات المختارة",
    "recipes.footer":    "الاطعمه المفضله عند العميل",

    "favs.subtitle":     "احتفظي بوصفاتك المحبوبة في مكان واحد",
    "favs.badge":        "وصفاتك المفضلة",
    "favs.h3":           "كل ما حفظتيه هيظهر هنا",
    "favs.footer":       "مصفات الاكل عندنا من افضل الاطعمه",

    "about.subtitle":    "مشروع يخلّي الطبخ أسهل وأجمل",
    "about.badge":       "عن BiteSight",
    "about.h3":          "فكرة بسيطة... لكن مفيدة جدًا",
    "about.p1":          "BiteSight هو موقع يساعد المستخدم يختار المكونات الموجودة عنده، وبعدها يحصل على اقتراحات وصفات مناسبة مع صور جميلة وخطوات واضحة.",
    "about.p2":          "ركزنا في التصميم على الألوان الدافئة، الراحة البصرية، وسهولة الاستخدام، عشان التجربة تكون ممتعة حتى قبل ما يبدأ الطبخ.",
    "about.p3":          "المشروع مناسب كفكرة تخرج، مشروع Frontend، أو بداية لمنصة وصفات ذكية.",
    "about.footer":      "نحن هنا نقم افضل اطعمه في موقعنا",

    "contact.subtitle":  "يسعدنا تواصلك واقتراحاتك",
    "contact.badge":     "تواصل معنا",
    "contact.h3":        "ابعتيلنا رسالتك",
    "contact.name":      "الاسم",
    "contact.email":     "البريد الإلكتروني",
    "contact.msg":       "رسالتك",
    "contact.send":      "إرسال",
    "contact.footer":    "تواصل معنا في الاطعمه",

    "login.subtitle":    "سجلي دخولك وارجعي لوصفاتك المفضلة",
    "login.badge":       "تسجيل الدخول",
    "login.h3":          "أهلاً بكِ مرة أخرى",
    "login.email":       "البريد الإلكتروني",
    "login.password":    "كلمة المرور",
    "login.forgot":      "نسيتي كلمة المرور؟",
    "login.btn":         "دخول",
    "login.noacc":       "ماعندكيش حساب؟",
    "login.signup":      "اشتركي الآن",
    "login.or":          "أو تابعي باستخدام",

    "signup.subtitle":   "انضمي لمجتمع BiteSight واكتشفي متعة الطبخ",
    "signup.badge":      "حساب جديد",
    "signup.h3":         "إنشاء حساب",
    "signup.name":       "الاسم الكامل",
    "signup.confirm":    "تأكيد كلمة المرور",
    "signup.btn":        "إنشاء الحساب",
    "signup.haveacc":    "عندك حساب بالفعل؟",
    "signup.login":      "سجلي دخولك",
    "signup.terms":      "أوافق على الشروط والأحكام",

    "profile.badge":     "المعلومات الشخصية",
    "profile.h3":        "أهلاً بك في حسابك الخاص",
    "profile.label.name": "الاسم الكامل",
    "profile.label.email": "البريد الإلكتروني",
    "profile.btn.logout": "تسجيل الخروج",
    "profile.btn.save":   "حفظ التغييرات",
    "footer.desc": "اكتشفي عالم الطبخ الذكي مع BiteSight. نساعدكِ على تحويل المكونات البسيطة إلى وجبات استثنائية بلمسة واحدة.",
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
  },

  en: {
    "nav.home":          "Home",
    "nav.fridge":        "Fridge",
    "nav.recipes":       "Recipes",
    "nav.favorites":     "Favorites",
    "nav.about":         "About",
    "nav.contact":       "Contact",
    "nav.login":         "Login",
    "nav.logout":        "Logout",
    "lang.btn":          "ع",

    "index.subtitle":    "Open your fridge… and leave the rest to us",
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
    "index.recipe1.h4":  "Cheese & Tomato Omelette",
    "index.recipe1.p":   "A quick, filling meal — perfect for breakfast or dinner.",
    "index.recipe2.h4":  "Pasta with Vegetables",
    "index.recipe2.p":   "Vibrant colors, light taste, and very easy to prepare.",
    "index.recipe3.h4":  "Refreshing Salad",
    "index.recipe3.p":   "A perfect choice if you want something quick and fresh.",
    "index.footer":      "Welcome to our humble food website",

    "fridge.subtitle":   "Pick what you have, and leave the rest to us",
    "fridge.badge":      "Smart Fridge",
    "fridge.h3":         "Select your available ingredients",
    "fridge.hint":       "Tap any ingredient to add it, then see the matching recipes.",
    "fridge.selected":   "Selected Ingredients",
    "fridge.btn.find":   "Suggest Recipes",
    "fridge.btn.clear":  "Clear Selection",
    "fridge.footer":     "We offer the best food options for you",

    "recipes.subtitle":  "Suggestions based on your taste and ingredients",
    "recipes.badge":     "Recipe Suggestions",
    "recipes.h3":        "Recipes matching your selected ingredients",
    "recipes.footer":    "Your favourite recipes, all in one place",

    "favs.subtitle":     "Keep your favourite recipes in one place",
    "favs.badge":        "Your Favourites",
    "favs.h3":           "Everything you saved will appear here",
    "favs.footer":       "Our food recipes are among the best",

    "about.subtitle":    "A project that makes cooking easier and more beautiful",
    "about.badge":       "About BiteSight",
    "about.h3":          "A simple idea… but incredibly useful",
    "about.p1":          "BiteSight is a website that helps users select the ingredients they have and then get recipe suggestions with beautiful photos and clear steps.",
    "about.p2":          "We focused our design on warm colors, visual comfort, and ease of use so that the experience is enjoyable even before cooking starts.",
    "about.p3":          "The project is suitable as a graduation project, a frontend project, or a starting point for a smart recipe platform.",
    "about.footer":      "We serve the best food on our platform",

    "contact.subtitle":  "We're happy to hear from you",
    "contact.badge":     "Contact Us",
    "contact.h3":        "Send us your message",
    "contact.name":      "Name",
    "contact.email":     "Email Address",
    "contact.msg":       "Your message",
    "contact.send":      "Send",
    "contact.footer":    "Contact us about food",

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

    "profile.badge":     "Personal Information",
    "profile.h3":        "Welcome to your private account",
    "profile.label.name": "Full Name",
    "profile.label.email": "Email Address",
    "profile.btn.logout": "Logout from Account",
    "profile.btn.save":   "Save Changes",
    "footer.desc": "Discover the world of smart cooking with BiteSight. We help you transform simple ingredients into extraordinary meals with a single touch.",
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
    alert(getCurrentLang() === 'ar' ? "الاسم والبريد الإلكتروني مطلوبان." : "Name and Email are required.");
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
      
      alert(getCurrentLang() === 'ar' ? "تم تحديث البيانات بنجاح!" : "Profile updated successfully!");
      
      // Refresh UI
      displayUserGreeting();
      renderProfile();
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error("Error saving profile:", error);
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
  await loadData();
  renderIngredients();
  renderRecipes();
  renderRecipeDetails();
  renderFavorites();
  renderProfile();
  initContactForm();
  initAuthForms();
});
