import { recipesData } from "../app.js";
import { RecipeCard } from "../components/RecipeCard.js";

export function applyFilters(
  recipes = recipesData,
  selectedIngredients = [],
  currentCategory = "all"
) {
  let filteredRecipes = [...recipes.recipes];

  // Apply category filter
  if (currentCategory !== "all") {
    filteredRecipes = filteredRecipes.filter(
      (recipe) => recipe.category === currentCategory
    );
  }

  // Apply ingredient filter if any ingredients are selected
  if (selectedIngredients.length > 0) {
    // Calculate matching counts for each recipe
    const recipesWithMatches = filteredRecipes.map((recipe) => {
      // Get ingredient names (ignoring amounts) for this recipe
      const recipeIngredientNames = recipe.ingredients.map((ingredient) =>
        ingredient.name.toLowerCase()
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

  // Display the recipes
  RecipeCard.display(filteredRecipes);
}
