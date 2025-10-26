import { setCurrentCategory, recipesData, selectedIngredients } from "../app.js";
import { applyFilters } from "../utils/filters.js";

function titleCase(str) {
  try {
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  } catch (_) { return String(str); }
}

export class CategoryTabs {
  static init(recipeCategories, currentCategory) {
    this.recipeCategories = recipeCategories;
    this.currentCategory = currentCategory;
    this.container = document.getElementById("recipe-tabs");
    this.createTabs();
  }

  static createTabs() {
    if (!this.container) return;
    this.container.innerHTML = "";

    // Create "All" tab
    const allTab = document.createElement("div");
    allTab.className = `recipe-tab ${
      this.currentCategory === "all" ? "active" : ""
    }`;
    allTab.setAttribute("data-category", "all");
    allTab.textContent = "All";
    allTab.addEventListener("click", () => this.filterByCategory("all"));
    this.container.appendChild(allTab);

    // Create tabs for each recipe category
    Array.from(this.recipeCategories)
      .filter((cat) => cat !== "all")
      .sort()
      .forEach((category) => {
        const tab = document.createElement("div");
        tab.className = `recipe-tab ${
          this.currentCategory === category ? "active" : ""
        }`;
        tab.setAttribute("data-category", category);
        tab.textContent = titleCase(category);
        tab.addEventListener("click", () => this.filterByCategory(category));
        this.container.appendChild(tab);
      });
  }

  static filterByCategory(category) {
    this.currentCategory = category;
    setCurrentCategory(category);
    this.createTabs(); // Update active tab
    applyFilters(recipesData, selectedIngredients, category);
  }
}
