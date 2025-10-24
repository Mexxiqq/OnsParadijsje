import { setCurrentCategory } from "../app.js";
import { applyFilters } from "../utils/filters.js";

export class CategoryTabs {
  static init(recipeCategories, currentCategory) {
    this.recipeCategories = recipeCategories;
    this.currentCategory = currentCategory;
    this.container = document.getElementById("recipe-tabs");
    this.createTabs();
  }

  static createTabs() {
    this.container.innerHTML = "";

    // Create "All" tab
    const allTab = document.createElement("div");
    allTab.className = `recipe-tab ${
      this.currentCategory === "all" ? "active" : ""
    }`;
    allTab.setAttribute("data-category", "all");
    allTab.textContent = "All Recipes";
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
        tab.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        tab.addEventListener("click", () => this.filterByCategory(category));
        this.container.appendChild(tab);
      });
  }

  static filterByCategory(category) {
    this.currentCategory = category;
    setCurrentCategory(category);
    this.createTabs(); // Update active tab
    applyFilters(null, null, category);
  }
}
