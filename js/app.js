import { RecipeCard } from "./components/RecipeCard.js";
import { IngredientFilter } from "./components/IngredientFilter.js";
import { CategoryTabs } from "./components/CategoryTabs.js";
import { RecipeCounter } from "./components/RecipeCounter.js";
import {
  assignCategoryColors,
  createDynamicCategoryStyles,
} from "./utils/categoryColors.js";
import { applyFilters } from "./utils/filters.js";
import { RightCart } from "./components/RightCart.js";
import { i18n } from "./utils/i18n.js";

// Global variable to store recipes data
let recipesData = {
  recipes: [],
};

// Global state
let currentCategory = "all";
let selectedIngredients = [];
let ingredientTypes = new Set();
let recipeCategories = new Set(["all"]);
let cart = []; // shopping cart with recipe objects
let viewMode = 'grid'; // 'grid' | 'list'

// DOM elements
const recipeContainer = document.getElementById("recipe-container");
const noRecipesMessage = document.getElementById("no-recipes-message");
const deselectAllBtn = document.getElementById("deselect-all");

// Function to load recipes and translations
async function loadRecipes() {
  try {
    console.log("Loading recipes and translations...");

    // Detect language from browser or localStorage or use default
    let locale = 'en';

    // Try to get saved preference first
    try {
      const saved = localStorage.getItem('preferredLanguage');
      if (saved && i18n.getAvailableLocales().includes(saved)) {
        locale = saved;
      }
    } catch (_) {}

    // If no saved preference, try browser language
    if (locale === 'en') {
      const browserLang = navigator.language.split('-')[0];
      const availableLocales = i18n.getAvailableLocales();
      if (availableLocales.includes(browserLang)) {
        locale = browserLang;
      }
    }

    // Load both UI strings and recipes
    const success = await i18n.loadLocale(locale);

    if (!success) {
      throw new Error('Failed to load locale data');
    }

    // Apply UI translations
    i18n.applyTranslations();

    // Get recipes from i18n
    recipesData = i18n.getRecipes();

    // Update flag button states
    updateFlagStates(locale);

    initializeApp();
  } catch (error) {
    console.error("Error loading recipes:", error);
    RecipeCounter.update(i18n.t('errors.error', 'Error loading recipes'));
    recipeContainer.innerHTML = `
            <div class="no-recipes">
                <h3>${i18n.t('errors.loadFailed', 'Failed to load recipes')}</h3>
                <p>${i18n.t('errors.checkFile', 'Please check if the recipes file exists')}</p>
                <p>${i18n.t('errors.error', 'Error')}: ${error.message}</p>
            </div>
        `;
  }
}

// Function to extract all ingredient types and recipe categories
function extractCategoriesAndTypes() {
  // Clear previous data
  recipeCategories = new Set(["all"]);
  ingredientTypes.clear();

  // Extract recipe categories (support multiple categories per recipe)
  recipesData.recipes.forEach((recipe) => {
    const cats = Array.isArray(recipe.categories) && recipe.categories.length
      ? recipe.categories
      : (recipe.category ? [recipe.category] : []);
    cats.forEach((c) => {
      if (c) recipeCategories.add(String(c).toLowerCase());
    });
  });

  // Extract ingredient types
  recipesData.recipes.forEach((recipe) => {
    (recipe.ingredients || []).forEach((ingredient) => {
      if (ingredient && ingredient.type) ingredientTypes.add(ingredient.type);
    });
  });
}

// Function to deselect all ingredients
function deselectAllIngredients() {
  selectedIngredients = [];
  IngredientFilter.deselectAll();
  // notify others
  document.dispatchEvent(new CustomEvent('selected-ingredients-changed', { detail: { selectedIngredients } }));
  applyFilters(recipesData, selectedIngredients, currentCategory);
}

// Initialize the application after loading recipes
function initializeApp() {
  // Extract categories and types from recipes
  extractCategoriesAndTypes();

  // Assign colors to categories dynamically
  assignCategoryColors(recipeCategories);

  // Create dynamic CSS styles for categories
  createDynamicCategoryStyles();

  // Initialize components
  CategoryTabs.init(recipeCategories, currentCategory);
  RecipeCard.init(recipeContainer, noRecipesMessage);
  IngredientFilter.init(recipesData, ingredientTypes);
  RecipeCounter.init();
  RightCart.init();

  // View toggle setup
  setupViewToggle();

  // Language flag buttons setup
  setupLanguageSelector();

  // Helper to broadcast cart state to other components (e.g., to sync Add buttons)
  const dispatchCartUpdated = () => {
    const ids = cart.map((it) => it.recipe && it.recipe.id).filter((id) => typeof id === 'number');
    document.dispatchEvent(new CustomEvent('cart-updated', { detail: { ids } }));
  };

  // Display all recipes initially
  applyFilters(recipesData, selectedIngredients, currentCategory);
  // Initial render of cart
  RightCart.render(cart, selectedIngredients);
  // Broadcast initial cart state for buttons sync
  dispatchCartUpdated();

  // Add event listener to deselect all button
  deselectAllBtn.addEventListener("click", deselectAllIngredients);

  // Listen to ingredient selection changes and update cart view
  document.addEventListener('selected-ingredients-changed', (e) => {
    selectedIngredients = e.detail.selectedIngredients || [];
    RightCart.render(cart, selectedIngredients);
  });

  // Listen for add-to-cart events from recipe cards
  document.addEventListener('add-to-cart', (e) => {
    const r = e.detail && e.detail.recipe;
    if (!r) return;
    // Always use canonical recipe from recipesData so ingredient names remain canonical for filtering
    const canonical = (recipesData.recipes || []).find((x) => x.id === r.id) || r;
    // Prevent duplicates by id
    const exists = cart.some((item) => (item.recipe && item.recipe.id) === canonical.id);
    if (!exists) {
      cart.push({ recipe: canonical });
      RightCart.render(cart, selectedIngredients);
    }
    dispatchCartUpdated();
  });

  // Listen for remove-from-cart events (from right sidebar)
  document.addEventListener('remove-from-cart', (e) => {
    const recipeId = e.detail && e.detail.recipeId;
    if (typeof recipeId !== 'number') return;
    const before = cart.length;
    cart = cart.filter((item) => (item.recipe && item.recipe.id) !== recipeId);
    if (cart.length !== before) {
      RightCart.render(cart, selectedIngredients);
      // Notify buttons to update state
      dispatchCartUpdated();
      // Optional specific event
      document.dispatchEvent(new CustomEvent('cart-removed', { detail: { recipeId } }));
    }
  });

  // When recipes are re-rendered (e.g., after filters/view changes), re-broadcast cart state so buttons sync
  document.addEventListener('recipes-rendered', () => dispatchCartUpdated());

  console.log("Application initialized successfully");
}

// Function to switch languages dynamically
async function switchLanguage(locale) {
  try {
    console.log(`Switching to language: ${locale}...`);
    
    // Save scroll position relative to bottom before switching
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const distanceFromBottom = scrollHeight - scrollTop - viewportHeight;
    
    // Load new locale (UI strings + recipes)
    const success = await i18n.loadLocale(locale);
    
    if (!success) {
      throw new Error(`Failed to load locale: ${locale}`);
    }

    // Save preference
    try {
      localStorage.setItem('preferredLanguage', locale);
    } catch (_) {}

    // Apply UI translations
    i18n.applyTranslations();

    // Update flag button states
    updateFlagStates(locale);

    // Get new recipes data
    recipesData = i18n.getRecipes();

    // Clear previous state
    selectedIngredients = [];
    currentCategory = 'all';

    // Re-extract categories and types from new recipes
    extractCategoriesAndTypes();

    // Re-assign colors to new categories
    assignCategoryColors(recipeCategories);
    createDynamicCategoryStyles();

    // Re-initialize all components with new data
    CategoryTabs.init(recipeCategories, currentCategory);
    IngredientFilter.init(recipesData, ingredientTypes);
    
    // Re-display recipes
    applyFilters(recipesData, selectedIngredients, currentCategory);
    
    // Update cart display (ingredient names may have changed)
    RightCart.render(cart, selectedIngredients);
    
    // Restore scroll position relative to bottom after content changes
    requestAnimationFrame(() => {
      const newScrollHeight = document.documentElement.scrollHeight;
      const newScrollTop = newScrollHeight - distanceFromBottom - viewportHeight;
      window.scrollTo({
        top: Math.max(0, newScrollTop),
        behavior: 'instant'
      });
    });
    
    console.log(`✓ Language switched to: ${locale}`);
  } catch (error) {
    console.error('Error switching language:', error);
    alert(`Failed to switch to ${locale}: ${error.message}`);
  }
}

// Setup language flag buttons
function setupLanguageSelector() {
  const flagButtons = document.querySelectorAll('.flag-btn');

  if (!flagButtons || flagButtons.length === 0) {
    console.warn('Language flag buttons not found in DOM');
    return;
  }

  // Set initial active state based on current locale
  const currentLocale = i18n.getCurrentLocale();
  updateFlagStates(currentLocale);

  // Add click handlers to each flag button
  flagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const newLocale = btn.getAttribute('data-lang');
      if (newLocale && newLocale !== i18n.getCurrentLocale()) {
        console.log('Flag clicked, switching to:', newLocale);
        switchLanguage(newLocale);
      }
    });
  });

  console.log('Language flag buttons initialized');
}

// Helper function to update flag button states
function updateFlagStates(activeLocale) {
  const flagButtons = document.querySelectorAll('.flag-btn');
  flagButtons.forEach(btn => {
    const lang = btn.getAttribute('data-lang');
    if (lang === activeLocale) {
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('active');
    } else {
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('active');
    }
  });
}

// Export state for other modules
export {
  recipesData,
  currentCategory,
  selectedIngredients,
  ingredientTypes,
  recipeCategories,
  i18n,
  switchLanguage
};
export const setCurrentCategory = (category) => {
  currentCategory = category;
};
export const setSelectedIngredients = (ingredients) => {
  selectedIngredients = ingredients;
};

function setupViewToggle() {
  const toggle = document.getElementById('view-toggle');
  const container = document.getElementById('recipe-container');
  if (!toggle || !container) return;

  // Restore last view from session, default to grid
  try {
    const saved = sessionStorage.getItem('viewMode');
    if (saved === 'list' || saved === 'grid') {
      viewMode = saved;
    }
  } catch (_) {}

  const gridBtn = toggle.querySelector('[data-view="grid"]');
  const listBtn = toggle.querySelector('[data-view="list"]');

  const applyView = () => {
    if (viewMode === 'list') {
      container.classList.add('list-view');
      container.classList.remove('grid-view');
      gridBtn && gridBtn.classList.remove('active');
      listBtn && listBtn.classList.add('active');
      gridBtn && gridBtn.setAttribute('aria-pressed', 'false');
      listBtn && listBtn.setAttribute('aria-pressed', 'true');
    } else {
      container.classList.add('grid-view');
      container.classList.remove('list-view');
      listBtn && listBtn.classList.remove('active');
      gridBtn && gridBtn.classList.add('active');
      listBtn && listBtn.setAttribute('aria-pressed', 'false');
      gridBtn && gridBtn.setAttribute('aria-pressed', 'true');
    }
    // Re-render to switch layout
    applyFilters(recipesData, selectedIngredients, currentCategory);
  };

  gridBtn && gridBtn.addEventListener('click', () => {
    if (viewMode === 'grid') return;
    viewMode = 'grid';
    try { sessionStorage.setItem('viewMode', 'grid'); } catch (_) {}
    applyView();
  });
  listBtn && listBtn.addEventListener('click', () => {
    if (viewMode === 'list') return;
    viewMode = 'list';
    try { sessionStorage.setItem('viewMode', 'list'); } catch (_) {}
    applyView();
  });

  // Initialize on first load
  applyView();
}

// Start the application by loading recipes
document.addEventListener("DOMContentLoaded", loadRecipes);

// Expose switchLanguage globally for testing in console
window.switchLanguage = switchLanguage;