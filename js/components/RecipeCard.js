import { RecipeCounter } from "./RecipeCounter.js";

export class RecipeCard {
  static init(container, noRecipesMessage) {
    this.container = container;
    this.noRecipesMessage = noRecipesMessage;
  }

  static display(recipes) {
    this.container.innerHTML = "";

    if (recipes.length === 0) {
      this.noRecipesMessage.style.display = "block";
      RecipeCounter.update(0);
      return;
    }

    this.noRecipesMessage.style.display = "none";
    RecipeCounter.update(recipes.length);

    recipes.forEach((recipe) => {
      const recipeCard = this.createRecipeCard(recipe);
      this.container.appendChild(recipeCard);
    });
  }

  static createRecipeCard(recipe) {
    const recipeCard = document.createElement("div");
    recipeCard.className = "recipe-card";

    recipeCard.innerHTML = `
            <div class="recipe-category category-${recipe.category}">${
      recipe.category
    }</div>
            <div class="recipe-image" style="background-image: url('${
              recipe.image
            }')"></div>
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.name} ${
      recipe.matchingCount
        ? `<span class="matching-count">${recipe.matchingCount} matches</span>`
        : ""
    }</h3>
                <p>${recipe.description}</p>
                <div class="recipe-meta">
                    <span>Prep: ${recipe.prepTime}</span>
                    <span>Cook: ${recipe.cookTime}</span>
                    <span>Serves: ${recipe.servings}</span>
                </div>
                <div class="ingredients-list">
                    <h3>Ingredients</h3>
                    <ul>
                        ${recipe.ingredients
                          .map(
                            (ingredient) =>
                              `<li><strong>${ingredient.amount}</strong> ${ingredient.name}</li>`
                          )
                          .join("")}
                    </ul>
                </div>
                <div class="instructions-list">
                    <h3>Instructions</h3>
                    <ol>
                        ${recipe.instructions
                          .map((step) => `<li>${step}</li>`)
                          .join("")}
                    </ol>
                </div>
            </div>
        `;

    return recipeCard;
  }
}
