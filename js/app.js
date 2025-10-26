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

// // Function to load recipes from JSON file
// async function loadRecipes() {
//   try {
//     console.log("Loading recipes from recipes.json...");
//     const response = await fetch("data/recipes.json");

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("Recipes loaded successfully:", data);
//     recipesData = data;
//     initializeApp();
//   } catch (error) {
//     console.error("Error loading recipes:", error);
//     RecipeCounter.update("Error loading recipes");
//     recipeContainer.innerHTML = `
//             <div class="no-recipes">
//                 <h3>Failed to load recipes</h3>
//                 <p>Please check if recipes.json file exists in the same directory</p>
//                 <p>Error: ${error.message}</p>
//             </div>
//         `;
//   }
// }

// Function to load recipes from JSON file
async function loadRecipes() {
  try {
    console.log("Loading recipes...");

    // Try different possible paths
    const possiblePaths = [
      "data/recipes.json",
      "./data/recipes.json",
      "../data/recipes.json",
      "recipes.json",
      "./recipes.json",
    ];

    let response;
    for (const path of possiblePaths) {
      try {
        response = await fetch(path);
        if (response.ok) break;
      } catch (e) {
        console.log(`Failed to load from ${path}, trying next...`);
      }
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP error! status: ${response?.status}`);
    }

    const data = await response.json();
    recipesData = data;
    initializeApp();
  } catch (error) {
    console.error("Error loading recipes:", error);
    RecipeCounter.update("Error loading recipes");
    recipeContainer.innerHTML = `
            <div class="no-recipes">
                <h3>Failed to load recipes</h3>
                <p>Please check if recipes.json file exists</p>
                <p>Error: ${error.message}</p>
            </div>
        `;
  }
}

// Function to extract all ingredient types and recipe categories
function extractCategoriesAndTypes() {
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

  // Static texts are defined in HTML; no language switcher needed
 
  // View toggle setup
  setupViewToggle();
 
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

// Export state for other modules
function applyStaticTexts() {
  // No-op: static English texts are defined in index.html
}


export {
  recipesData,
  currentCategory,
  selectedIngredients,
  ingredientTypes,
  recipeCategories,
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
