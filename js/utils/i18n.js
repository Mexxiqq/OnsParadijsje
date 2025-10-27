// Enhanced i18n utility with recipe loading
class I18n {
  constructor() {
    this.locale = 'en';
    this.translations = {};
    this.recipes = { recipes: [] };
  }

  async loadLocale(locale = 'en') {
    try {
      console.log(`Loading locale: ${locale}...`);
      
      // Load UI strings
      const uiPath = `data/locales/${locale}.json`;
      console.log(`Fetching UI strings from: ${uiPath}`);
      const uiResponse = await fetch(uiPath);
      if (!uiResponse.ok) {
        throw new Error(`UI locale ${locale} not found (${uiResponse.status})`);
      }
      this.translations = await uiResponse.json();
      console.log(`✓ UI strings loaded for ${locale}`);

      // Load recipes for this language
      const recipesPath = `data/recipes/recipes-${locale}.json`;
      console.log(`Fetching recipes from: ${recipesPath}`);
      const recipesResponse = await fetch(recipesPath);
      if (!recipesResponse.ok) {
        throw new Error(`Recipes ${locale} not found (${recipesResponse.status}) at ${recipesPath}`);
      }
      this.recipes = await recipesResponse.json();

      this.locale = locale;

      // Update document language
      document.documentElement.lang = locale;

      console.log(`✓ Loaded ${locale}: ${this.recipes.recipes.length} recipes`);
      return true;
    } catch (error) {
      console.error('Failed to load locale:', error);
      console.error('Error details:', {
        locale,
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  // Get translation by key path (e.g., "header.title")
  t(keyPath, fallback = '') {
    const keys = keyPath.split('.');
    let value = this.translations;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return fallback || keyPath;
      }
    }
    
    return typeof value === 'string' ? value : fallback || keyPath;
  }

  // Get recipes data
  getRecipes() {
    return this.recipes;
  }

  // Update DOM elements with data-i18n attribute
  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      
      // Handle different element types
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else if (el.tagName === 'TITLE') {
        el.textContent = text;
      } else {
        // For most elements, just set textContent
        el.textContent = text;
      }
      
      // Handle aria-label separately if data-i18n-aria attribute exists
      const ariaKey = el.getAttribute('data-i18n-aria');
      if (ariaKey) {
        el.setAttribute('aria-label', this.t(ariaKey));
      }
    });
  }

  // Get current locale
  getCurrentLocale() {
    return this.locale;
  }

  // Get available locales
  getAvailableLocales() {
    return ['en', 'fr', 'nl'];
  }
  
  // Get locale display names
  getLocaleDisplayName(locale) {
    const names = {
      'en': 'English',
      'fr': 'Français',
      'nl': 'Nederlands'
    };
    return names[locale] || locale;
  }
}

// Export singleton instance
export const i18n = new I18n();