// Dynamic color palette - can be extended indefinitely
const colorPalette = [
  "#ff5e62",
  "#ff9966",
  "#28a745",
  "#ffc107",
  "#17a2b8",
  "#6f42c1",
  "#e83e8c",
  "#20c997",
  "#fd7e14",
  "#6610f2",
  "#0dcaf0",
  "#6c757d",
  "#198754",
  "#0d6efd",
  "#6f42c1",
  "#d63384",
  "#ffc107",
  "#0dcaf0",
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#feca57",
  "#ff9ff3",
  "#54a0ff",
];

// Map to store category-color assignments
const categoryColorMap = new Map();

// Function to assign colors to categories dynamically
export function assignCategoryColors(categories) {
  const categoryArray = Array.from(categories).filter((cat) => cat !== "all");
  categoryArray.forEach((category, index) => {
    // Use modulo to cycle through colors if we have more categories than colors
    const colorIndex = index % colorPalette.length;
    categoryColorMap.set(category, colorPalette[colorIndex]);
  });
}

// Function to create dynamic CSS for category colors
export function createDynamicCategoryStyles() {
  const styleElement = document.createElement("style");
  let cssRules = "";

  categoryColorMap.forEach((color, category) => {
    cssRules += `
            .category-${category} {
                background-color: ${color};
            }
        `;
  });

  styleElement.textContent = cssRules;
  document.head.appendChild(styleElement);
}

// Function to get category CSS class
export function getCategoryClass(category) {
  return `category-${category}`;
}
