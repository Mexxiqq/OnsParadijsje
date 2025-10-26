export class RecipeCounter {
  static init() {
    this.element = document.getElementById("recipe-count");
  }

  static update(count) {
    if (!this.element) return;
    if (typeof count === "number") {
      const word = count === 1 ? 'recipe' : 'recipes';
      this.element.textContent = `${count} ${word}`;
    } else {
      this.element.textContent = String(count);
    }
  }
}
