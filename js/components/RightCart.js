export class RightCart {
  static init() {
    this.container = document.getElementById("cart-container");
    this.copyBtn = document.getElementById("copy-cart");
    this.cart = [];
    this.selectedIngredients = [];

    if (this.copyBtn) {
      this.copyBtn.addEventListener("click", () => this.copyToClipboard());
    }
    // Delegate remove clicks
    if (this.container) {
      this.container.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-from-cart-btn');
        if (btn) {
          const id = parseInt(btn.getAttribute('data-recipe-id'), 10);
          if (!Number.isNaN(id)) {
            document.dispatchEvent(new CustomEvent('remove-from-cart', { detail: { recipeId: id } }));
          }
        }
      });
    }
  }

  static setData(cart, selectedIngredients) {
    this.cart = cart || [];
    this.selectedIngredients = (selectedIngredients || []).map((s) => s.toLowerCase());
  }

  static render(cart, selectedIngredients) {
    this.setData(cart, selectedIngredients);
    if (!this.container) return;

    this.container.innerHTML = "";

    if (!this.cart.length) {
      const empty = document.createElement("div");
      empty.className = "cart-empty";
      empty.textContent = "Your shopping list is empty";
      this.container.appendChild(empty);
      return;
    }

    // Render newest added recipes at the top
    const items = this.cart.slice().reverse();
    items.forEach((item) => {
      const recipe = item.recipe || {};

      const header = document.createElement("div");
      header.className = "cart-item-header";
      header.innerHTML = `
        <span class="cart-item-title">${recipe.name || recipe.title || `Recipe ${recipe.id}`}</span>
        <button class="remove-from-cart-btn" data-recipe-id="${recipe.id}" aria-label="Remove from shopping list" title="Remove" aria-pressed="false" type="button">
          <svg class="icon-minus" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" shape-rendering="crispEdges" />
          </svg>
        </button>
      `;
      this.container.appendChild(header);

      const divider = document.createElement("hr");
      divider.className = "cart-divider";
      this.container.appendChild(divider);

      // Build filtered ingredients list
      const ul = document.createElement("ul");
      ul.className = "cart-ingredients";
      const filtered = (item.recipe.ingredients || []).filter((ing) => {
        const nm = (ing.name || "").toLowerCase();
        return nm && !this.selectedIngredients.includes(nm);
      });

      if (filtered.length === 0) {
        const li = document.createElement("li");
        li.className = "cart-all-set";
        li.textContent = "All set! You already have these ingredients";
        ul.appendChild(li);
      } else {
        filtered.forEach((ing) => {
          const li = document.createElement("li");
          const displayName = ing.name;
          li.innerHTML = `<span class="amt">${ing.amount || ""}</span> <span class="name">${displayName}</span>`;
          ul.appendChild(li);
        });
      }
      this.container.appendChild(ul);
    });
  }

  static copyToClipboard() {
    let text = "";
    this.cart.forEach((item, idx) => {
      const canon = item.recipe;
      text += `${canon.name || canon.title || `Recipe ${canon.id}`}` + "\n";
      const filtered = (canon.ingredients || []).filter((ing) => {
        const nm = (ing.name || "").toLowerCase();
        return nm && !this.selectedIngredients.includes(nm);
      });
      if (filtered.length === 0) {
        text += `(All set!)\n`;
      } else {
        filtered.forEach((ing) => {
          const amt = ing.amount ? `${ing.amount} ` : "";
          const disp = ing.name;
          text += `- ${amt}${disp}\n`;
        });
      }
      if (idx < this.cart.length - 1) text += "\n";
    });

    const doToast = (msg) => {
      let note = document.createElement("div");
      note.className = "toast";
      note.textContent = msg;
      document.body.appendChild(note);
      requestAnimationFrame(() => {
        note.classList.add("show");
      });
      setTimeout(() => {
        note.classList.remove("show");
        setTimeout(() => note.remove(), 300);
      }, 1800);
    };

    const write = async () => {
      try {
        await navigator.clipboard.writeText(text);
        doToast("Copied!");
      } catch (e) {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
          document.execCommand("copy");
          doToast("Copied!");
        } catch (err) {
          doToast("Copy failed");
        } finally {
          ta.remove();
        }
      }
    };
    write();
  }
}
