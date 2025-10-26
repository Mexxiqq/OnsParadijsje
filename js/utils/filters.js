import { recipesData } from "../app.js";
import { RecipeCard } from "../components/RecipeCard.js";

export function applyFilters(
  recipes = recipesData,
  selectedIngredients = [],
  currentCategory = "all"
) {
  let filteredRecipes = [...recipes.recipes];

  const getCategories = (r) => {
    if (Array.isArray(r.categories) && r.categories.length) {
      return r.categories.map((c) => String(c).toLowerCase());
    }
    if (r.category) return [String(r.category).toLowerCase()];
    return [];
  };

  // Apply category filter
  const active = String(currentCategory || 'all').toLowerCase();
  if (active !== "all") {
    filteredRecipes = filteredRecipes.filter((recipe) => {
      const cats = getCategories(recipe);
      return cats.includes(active);
    });
  }

  // Apply ingredient filter if any ingredients are selected
  if (selectedIngredients.length > 0) {
    // Calculate matching counts for each recipe
    const recipesWithMatches = filteredRecipes.map((recipe) => {
      // Get ingredient names (ignoring amounts) for this recipe
      const recipeIngredientNames = (recipe.ingredients || []).map((ingredient) =>
        (ingredient.name || '').toLowerCase()
      );

      // Count how many selected ingredients are in this recipe
      const matchingCount = selectedIngredients.filter((selectedIngredient) =>
        recipeIngredientNames.includes(selectedIngredient)
      ).length;

      return {
        ...recipe,
        matchingCount,
      };
    });

    // Filter out recipes with 0 matches
    filteredRecipes = recipesWithMatches.filter(
      (recipe) => recipe.matchingCount > 0
    );

    // Sort by number of matches (descending)
    filteredRecipes.sort((a, b) => b.matchingCount - a.matchingCount);
  }

  // Display the recipes directly (English-only UI)
  RecipeCard.display(filteredRecipes);
}
