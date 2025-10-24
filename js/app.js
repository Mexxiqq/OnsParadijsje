import { RecipeCard } from "./components/RecipeCard.js";
import { IngredientFilter } from "./components/IngredientFilter.js";
import { CategoryTabs } from "./components/CategoryTabs.js";
import { RecipeCounter } from "./components/RecipeCounter.js";
import {
  assignCategoryColors,
  createDynamicCategoryStyles,
} from "./utils/categoryColors.js";
import { applyFilters } from "./utils/filters.js";

// Global variable to store recipes data
let recipesData = {
  recipes: [],
};

// Global state
let currentCategory = "all";
let selectedIngredients = [];
let ingredientTypes = new Set();
let recipeCategories = new Set(["all"]);

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
    console.log("Loading recipes from recipes.json...");
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
    console.log("Recipes loaded successfully:", data);
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
  // Extract recipe categories
  recipesData.recipes.forEach((recipe) => {
    recipeCategories.add(recipe.category);
  });

  // Extract ingredient types
  recipesData.recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      ingredientTypes.add(ingredient.type);
    });
  });
}

// Function to deselect all ingredients
function deselectAllIngredients() {
  selectedIngredients = [];
  IngredientFilter.deselectAll();
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

  // Display all recipes initially
  applyFilters(recipesData, selectedIngredients, currentCategory);

  // Add event listener to deselect all button
  deselectAllBtn.addEventListener("click", deselectAllIngredients);

  console.log("Application initialized successfully");
}

// Export state for other modules
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

// Start the application by loading recipes
document.addEventListener("DOMContentLoaded", loadRecipes);
