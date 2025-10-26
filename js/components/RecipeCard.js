import { RecipeCounter } from "./RecipeCounter.js";

export class RecipeCard {
  static init(container, noRecipesMessage) {
    this.container = container;
    this.noRecipesMessage = noRecipesMessage;
    this.cards = [];
    this.leftCol = null;
    this.rightCol = null;
    // observers and scheduling
    this._observers = [];
    this._rafScheduled = false;
    // remember last column placement to keep expanded card fixed
    this._lastPlacement = new Map();
    this.scheduleRelayout = () => {
      if (this._rafScheduled) return;
      this._rafScheduled = true;
      requestAnimationFrame(() => {
        this._rafScheduled = false;
        this.layoutCards();
      });
    };
    // expose relayout method to card toggles (back-compat)
    this._relayout = () => this.scheduleRelayout();

    // Listen for cart updates to sync add buttons
    if (!this._cartListenerBound) {
      document.addEventListener('cart-updated', (e) => {
        const ids = (e.detail && e.detail.ids) || [];
        this.syncAddButtons(new Set(ids));
      });
      this._cartListenerBound = true;
    }
  }

  static display(recipes) {
    // Cleanup previous observers
    if (this._observers && this._observers.length) {
      this._observers.forEach((o) => o.disconnect());
      this._observers = [];
    }

    this.container.innerHTML = "";
    this.cards = [];
    this.leftCol = null;
    this.rightCol = null;

    if (recipes.length === 0) {
      this.noRecipesMessage.style.display = "block";
      RecipeCounter.update(0);
      // announce render complete
      document.dispatchEvent(new CustomEvent('recipes-rendered'));
      return;
    }

    this.noRecipesMessage.style.display = "none";
    RecipeCounter.update(recipes.length);

    const isList = this.container.classList.contains('list-view');

    // Create observer (only needed for grid relayout)
    const ro = new ResizeObserver(() => this.scheduleRelayout());

    if (isList) {
      // Simple single-column list
      const listWrap = document.createElement('div');
      listWrap.className = 'recipe-list';
      this.container.appendChild(listWrap);

      recipes.forEach((recipe) => {
        const card = this.createRecipeCard(recipe, this.scheduleRelayout);
        card.classList.add('list-item');
        this.cards.push(card);
        listWrap.appendChild(card);
        // No need to observe for relayout in list mode
      });
    } else {
      // Two columns for balanced layout
      this.leftCol = document.createElement("div");
      this.leftCol.className = "recipe-column left";
      this.rightCol = document.createElement("div");
      this.rightCol.className = "recipe-column right";
      this.container.appendChild(this.leftCol);
      this.container.appendChild(this.rightCol);

      recipes.forEach((recipe) => {
        const recipeCard = this.createRecipeCard(recipe, this.scheduleRelayout);
        this.cards.push(recipeCard);
        // Observe size changes of each card (e.g., expand/collapse)
        ro.observe(recipeCard);
      });
      this._observers.push(ro);

      // Initial layout
      this.layoutCards();

      // Re-layout on window resize to adapt to width changes
      if (!this._resizeHandler) {
        this._resizeHandler = () => {
          this.scheduleRelayout();
        };
        window.addEventListener("resize", this._resizeHandler);
      }
    }

    // announce render complete so other components can sync UI (e.g., Add buttons)
    document.dispatchEvent(new CustomEvent('recipes-rendered'));
  }

  static syncAddButtons(cartIdSet) {
    try {
      const scope = this.container || document;
      const buttons = scope.querySelectorAll('.add-to-cart-btn');
      buttons.forEach((btn) => {
        const id = parseInt(btn.getAttribute('data-recipe-id') || btn.closest('.recipe-card')?.dataset.recipeId || '', 10);
        if (!Number.isNaN(id)) {
          const inCart = cartIdSet.has(id);
          btn.disabled = inCart;
          btn.textContent = inCart ? 'Added' : 'Add to cart';
          // Keep aria-label simple
          btn.setAttribute('aria-label', inCart ? 'Added' : 'Add to cart');
        }
      });
    } catch (_) {}
  }

  static layoutCards() {
    if (!this.leftCol || !this.rightCol) return;

    // If we are in a stacked layout (mobile), just append to left column
    const isStacked = getComputedStyle(this.container).flexDirection === "column";

    // Determine the first expanded card and its last known column placement
    let expandedIndex = -1;
    let expandedCol = null; // 'left' | 'right'
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      if (c.classList.contains("expanded")) {
        expandedIndex = i;
        const last = this._lastPlacement.get(c);
        if (last === "left" || last === "right") expandedCol = last;
        break; // only the first expanded matters
      }
    }

    // Prepare desired order for each column without clearing DOM to avoid scroll jumps
    const desiredLeft = [];
    const desiredRight = [];

    // We'll compute from scratch using measured heights and configured gap
    const colStyle = getComputedStyle(this.leftCol);
    const gapStr = colStyle.getPropertyValue("row-gap") || colStyle.getPropertyValue("gap") || "0";
    const GAP = parseFloat(gapStr) || 0;

    let leftHeightAcc = 0;
    let rightHeightAcc = 0;
    let leftCount = 0;
    let rightCount = 0;

    const enqueue = (el, col, cardHeightForAcc) => {
      if (col === "left") {
        desiredLeft.push(el);
        // account for gap except before the first item
        leftHeightAcc += (leftCount > 0 ? GAP : 0) + (cardHeightForAcc || 0);
        leftCount++;
        this._lastPlacement.set(el, "left");
      } else {
        desiredRight.push(el);
        rightHeightAcc += (rightCount > 0 ? GAP : 0) + (cardHeightForAcc || 0);
        rightCount++;
        this._lastPlacement.set(el, "right");
      }
    };

    // Layout loop (compute desired placement first)
    this.cards.forEach((card, index) => {
      if (isStacked) {
        const h = this._measureCardHeight(card);
        enqueue(card, "left", h);
        return;
      }

      // Measure the candidate card height at the column width
      const cardHeight = this._measureCardHeight(card);

      // If there is no expanded card, use the small-gap bias balancing (based on accumulated heights)
      if (expandedIndex === -1) {
        const delta = leftHeightAcc - rightHeightAcc; // >0 means left taller
        if (delta > 0 && delta <= cardHeight * 0.5) {
          enqueue(card, "left", cardHeight);
        } else if (leftHeightAcc <= rightHeightAcc) {
          enqueue(card, "left", cardHeight);
        } else {
          enqueue(card, "right", cardHeight);
        }
        return;
      }

      // There is an expanded card
      if (index < expandedIndex) {
        // Before the expanded card: normal small-gap bias balancing
        const delta = leftHeightAcc - rightHeightAcc; // >0 means left taller
        if (delta > 0 && delta <= cardHeight * 0.5) {
          enqueue(card, "left", cardHeight);
        } else if (leftHeightAcc <= rightHeightAcc) {
          enqueue(card, "left", cardHeight);
        } else {
          enqueue(card, "right", cardHeight);
        }
        return;
      }

      if (index === expandedIndex) {
        // Expanded card itself: keep fixed where it was if known, else choose by current balance
        if (!expandedCol) {
          const delta = leftHeightAcc - rightHeightAcc;
          if (delta > 0 && delta <= cardHeight * 0.5) {
            expandedCol = "left";
          } else if (leftHeightAcc <= rightHeightAcc) {
            expandedCol = "left";
          } else {
            expandedCol = "right";
          }
        }
        enqueue(card, expandedCol, cardHeight);
        return;
      }

      // After the expanded card: enforce left-biased rule per spec, using small (collapsed) height
      const smallHeight = this._measureSmallCardHeight(card);
      const EPS = 1; // px tolerance to avoid jitter near threshold
      if (leftHeightAcc <= rightHeightAcc + smallHeight * 0.5 + EPS) {
        enqueue(card, "left", cardHeight);
      } else {
        enqueue(card, "right", cardHeight);
      }
    });

    // Reconcile DOM by appending in desired order (appending moves nodes without destroying them)
    const applyOrder = (colEl, desired) => {
      // Append all desired cards; appendChild moves nodes to the end preserving focus and avoiding rebuild
      desired.forEach((el) => {
        if (el.parentElement !== colEl || el !== colEl.lastElementChild) {
          colEl.appendChild(el);
        }
      });
    };

    applyOrder(this.leftCol, desiredLeft);
    applyOrder(this.rightCol, desiredRight);
  }

  static _measureCardHeight(cardEl) {
    // Create a hidden measurement clone to avoid affecting flow
    const clone = cardEl.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.width = this.leftCol.clientWidth + "px";
    // Ensure expanded state is reflected as in the original element
    if (cardEl.classList.contains("expanded")) {
      clone.classList.add("expanded");
      const details = clone.querySelector(".recipe-details");
      if (details) details.hidden = false;
    }
    this.container.appendChild(clone);
    const h = clone.offsetHeight;
    this.container.removeChild(clone);
    return h || 0;
  }

  static _measureSmallCardHeight(cardEl) {
    const clone = cardEl.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.width = this.leftCol.clientWidth + "px";
    // Force collapsed (small) state regardless of current expansion
    clone.classList.remove("expanded");
    const details = clone.querySelector(".recipe-details");
    if (details) details.hidden = true;
    this.container.appendChild(clone);
    const h = clone.offsetHeight;
    this.container.removeChild(clone);
    return h || 0;
  }

  static createRecipeCard(recipe, onToggle) {
    const recipeCard = document.createElement("div");
    recipeCard.className = "recipe-card";
    // mark with recipe id for syncing add button state
    recipeCard.dataset.recipeId = String(recipe.id);

    // Build category badges (support multiple categories)
    const categories = (Array.isArray(recipe.categories) && recipe.categories.length)
      ? recipe.categories.map((c) => String(c).toLowerCase())
      : (recipe.category ? [String(recipe.category).toLowerCase()] : []);
    const categoriesHtml = categories.map((cat) => `
            <span class="recipe-category category-${cat}">${cat}</span>
        `).join("");

    recipeCard.innerHTML = `
            <div class="recipe-categories">${categoriesHtml}</div>
            <div class="recipe-image" style="background-image: url('${
              recipe.image
            }')"></div>
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.name} ${
      recipe.matchingCount
        ? `<span class="matching-count">${recipe.matchingCount} matches</span>`
        : ""
    }</h3>
                <p class="recipe-description">${recipe.description}</p>

                <div class="recipe-details" hidden>
                    <div class="recipe-meta-row">
                        <button type="button" class="add-to-cart-btn" data-recipe-id="${recipe.id}" aria-label="Add to cart - ${recipe.name}">Add to cart</button>
                        <div class="recipe-meta">
                            <span>Prep: ${recipe.prepTime}</span>
                            <span>Cook: ${recipe.cookTime}</span>
                            <span>Serves: ${recipe.servings}</span>
                        </div>
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
                    <div class="recipe-actions">
                        <button type="button" class="add-to-cart-btn" data-recipe-id="${recipe.id}" aria-label="Add to cart - ${recipe.name}">Add to cart</button>
                    </div>
                </div>
            </div>
        `;

    // Make only the image clickable/focusable for toggling
    const imageEl = recipeCard.querySelector('.recipe-image');
    if (imageEl) {
      imageEl.setAttribute('tabindex', '0');
      imageEl.setAttribute('role', 'button');
      imageEl.setAttribute('aria-label', `Toggle full recipe for ${recipe.name}`);
      imageEl.setAttribute('aria-expanded', 'false');
    }

    // Toggle expand/collapse anchored to the image to preserve viewport position
    const toggle = () => {
      const anchor = imageEl || recipeCard;

      // Prevent hover animations and transitions from affecting measurements
      const rootEl = document.documentElement;
      rootEl.classList.add('scroll-anchoring');

      // Temporarily disable transitions on the card and image
      const prevCardTransition = recipeCard.style.transition;
      const prevImgTransition = imageEl ? imageEl.style.transition : '';
      recipeCard.style.transition = 'none';
      if (imageEl) imageEl.style.transition = 'none';

      const startTop = anchor.getBoundingClientRect().top;

      const expanded = recipeCard.classList.toggle("expanded");
      const details = recipeCard.querySelector(".recipe-details");
      const isListMode = this.container && this.container.classList.contains('list-view');
      if (details) {
        if (isListMode) {
          // In list mode we keep the element in flow for smooth rollout animation
          details.hidden = false;
        } else {
          details.hidden = !expanded;
        }
      }
      // Sync ARIA state on the interactive element
      if (imageEl) {
        imageEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }

      if (typeof onToggle === "function") {
        onToggle();
      }

      // After relayout completes, adjust scroll to keep the image fixed in viewport
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const endTop = anchor.getBoundingClientRect().top;
          const delta = endTop - startTop;
          if (Math.abs(delta) > 0) {
            window.scrollBy(0, delta);
          }
          // Restore transitions and hover behavior
          recipeCard.style.transition = prevCardTransition || '';
          if (imageEl) imageEl.style.transition = prevImgTransition || '';
          rootEl.classList.remove('scroll-anchoring');
        });
      });
    };

    // Attach handlers only to the image
    if (imageEl) {
      imageEl.addEventListener("click", () => toggle());
      imageEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    }

    // Add to cart handlers (support multiple buttons per card and keep them in sync via cart-updated)
    const addBtns = recipeCard.querySelectorAll('.add-to-cart-btn');
    if (addBtns && addBtns.length) {
      addBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          document.dispatchEvent(new CustomEvent('add-to-cart', { detail: { recipe } }));
          // Optimistic UI: disable the clicked button; the global cart-updated event will sync all buttons shortly
          btn.textContent = 'Added';
          btn.disabled = true;
          const title = btn.getAttribute('aria-label') || '';
          const newLabel = title.replace(/^(Add|Added)\b.*/i, 'Added to shopping list');
          btn.setAttribute('aria-label', newLabel);
        });
      });
    }

    return recipeCard;
  }
}
