export class RecipeCounter {
  static init() {
    this.element = document.getElementById("recipe-count");
  }

  static update(count) {
    if (typeof count === "number") {
      const recipeWord = count === 1 ? "recipe" : "recipes";
      this.element.textContent = `${count} ${recipeWord}`;
    } else {
      this.element.textContent = count;
    }
  }
}
