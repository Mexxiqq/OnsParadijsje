import { setSelectedIngredients } from "../app.js";
import { applyFilters } from "../utils/filters.js";

export class IngredientFilter {
  static init(recipesData, ingredientTypes) {
    this.recipesData = recipesData;
    this.ingredientTypes = ingredientTypes;
    this.container = document.getElementById("ingredients-container");
    this.displayCheckboxes();
  }

  static displayCheckboxes() {
    // Group ingredients by type and name
    const ingredientsByType = {};

    this.recipesData.recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        const type = ingredient.type;
        const ingredientName = ingredient.name.toLowerCase();

        if (!ingredientsByType[type]) {
          ingredientsByType[type] = new Set();
        }
        if (ingredientName && ingredientName.length > 0) {
          ingredientsByType[type].add(ingredientName);
        }
      });
    });

    this.container.innerHTML = "";

    // Display ingredients grouped by type
    Array.from(this.ingredientTypes)
      .sort()
      .forEach((type) => {
        if (ingredientsByType[type] && ingredientsByType[type].size > 0) {
          const categoryDiv = document.createElement("div");
          categoryDiv.className = "ingredient-category";

          // Format type name for display
          const typeName = type.charAt(0).toUpperCase() + type.slice(1);

          categoryDiv.innerHTML = `
                        <div class="category-title">${typeName}</div>
                    `;

          // Sort and display ingredients
          Array.from(ingredientsByType[type])
            .sort()
            .forEach((ingredientName) => {
              const ingredientItem = document.createElement("div");
              ingredientItem.className = "ingredient-item";

              ingredientItem.innerHTML = `
                                <input type="checkbox" id="ing-${ingredientName.replace(
                                  /\s+/g,
                                  "-"
                                )}" value="${ingredientName}">
                                <label for="ing-${ingredientName.replace(
                                  /\s+/g,
                                  "-"
                                )}">${ingredientName}</label>
                            `;

              categoryDiv.appendChild(ingredientItem);
            });

          this.container.appendChild(categoryDiv);
        }
      });

    this.addEventListeners();
  }

  static addEventListeners() {
    const checkboxes = this.container.querySelectorAll(
      'input[type="checkbox"]'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", this.filterRecipes.bind(this));
    });
  }

  static filterRecipes() {
    const selectedIngredients = [];
    const checkboxes = this.container.querySelectorAll(
      'input[type="checkbox"]:checked'
    );

    checkboxes.forEach((checkbox) => {
      selectedIngredients.push(checkbox.value);
    });

    setSelectedIngredients(selectedIngredients);
    applyFilters(this.recipesData, selectedIngredients);
  }

  static deselectAll() {
    const checkboxes = this.container.querySelectorAll(
      'input[type="checkbox"]'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
  }
}
