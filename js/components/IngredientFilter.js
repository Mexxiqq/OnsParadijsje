import { setSelectedIngredients, currentCategory, selectedIngredients as globalSelected } from "../app.js";
import { applyFilters } from "../utils/filters.js";

function titleCase(str) {
  try {
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  } catch (_) { return String(str); }
}

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
      (recipe.ingredients || []).forEach((ingredient) => {
        const type = ingredient.type;
        const ingredientName = (ingredient.name || '').toLowerCase();

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

          const typeName = titleCase(type);

          // Build accessible collapsible category
          const panelId = `panel-${type.replace(/\s+/g, '-')}`;
          categoryDiv.innerHTML = `
                        <button type="button" class="category-title category-toggle" id="label-${panelId}" aria-expanded="false" aria-controls="${panelId}">
                            ${typeName}
                        </button>
                        <div id="${panelId}" class="category-panel" role="region" aria-labelledby="label-${panelId}"></div>
                    `;

          const panelEl = categoryDiv.querySelector('.category-panel');

          // Sort and display ingredients
          Array.from(ingredientsByType[type])
            .sort()
            .forEach((ingredientName) => {
              const ingredientItem = document.createElement("div");
              ingredientItem.className = "ingredient-item";

              const safeId = `ing-${ingredientName.replace(/\s+/g, '-')}`;
              const labelText = ingredientName;
              ingredientItem.innerHTML = `
                                <input type="checkbox" id="${safeId}" value="${ingredientName}">
                                <label for="${safeId}">${labelText}</label>
                            `;

              panelEl.appendChild(ingredientItem);
            });

          // Toggle handler for collapse/expand with accordion behavior
          const toggleBtn = categoryDiv.querySelector('.category-toggle');
          const handleToggle = () => {
            const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
            const nextExpanded = !expanded;

            if (nextExpanded) {
              // Collapse all other categories
              const allCats = this.container.querySelectorAll('.ingredient-category');
              allCats.forEach((catEl) => {
                if (catEl !== categoryDiv) {
                  const btn = catEl.querySelector('.category-toggle');
                  const panel = catEl.querySelector('.category-panel');
                  if (btn && panel) {
                    btn.setAttribute('aria-expanded', 'false');
                    panel.hidden = true;
                    catEl.classList.add('collapsed');
                  }
                }
              });
            }

            // Toggle current
            toggleBtn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
            panelEl.hidden = !nextExpanded;
            if (nextExpanded) {
              categoryDiv.classList.remove('collapsed');
            } else {
              categoryDiv.classList.add('collapsed');
            }
          };

          if (toggleBtn) {
            toggleBtn.addEventListener('click', handleToggle);
            toggleBtn.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            });
          }

          // Default collapsed
          panelEl.hidden = true;
          categoryDiv.classList.add('collapsed');

          this.container.appendChild(categoryDiv);
        }
      });

    this.addEventListeners();
  }

  static restoreCheckedState() {
    try {
      const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
      const set = new Set((globalSelected || []).map((s) => String(s).toLowerCase()));
      checkboxes.forEach((cb) => {
        const val = (cb.value || '').toLowerCase();
        cb.checked = set.has(val);
      });
    } catch (_) {}
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
    // Notify app and right cart about ingredient selection changes
    document.dispatchEvent(
      new CustomEvent('selected-ingredients-changed', { detail: { selectedIngredients } })
    );
    applyFilters(this.recipesData, selectedIngredients, currentCategory);
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
