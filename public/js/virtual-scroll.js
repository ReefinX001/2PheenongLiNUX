/**
 * Virtual Scrolling Implementation
 * Renders only visible items to prevent lag with large lists
 */

class VirtualScroll {
  constructor(container, options = {}) {
    this.container = container;
    this.items = [];
    this.itemHeight = options.itemHeight || 100;
    this.buffer = options.buffer || 5;
    this.renderFn = options.renderItem || this.defaultRender;

    // Create structure
    this.viewport = null;
    this.content = null;
    this.visibleItems = new Map();

    this.init();
  }

  init() {
    // Create viewport wrapper
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-scroll-viewport';
    this.viewport.style.cssText = `
      height: 100%;
      overflow-y: auto;
      position: relative;
      will-change: scroll-position;
    `;

    // Create content container
    this.content = document.createElement('div');
    this.content.className = 'virtual-scroll-content';
    this.content.style.cssText = `
      position: relative;
      width: 100%;
    `;

    // Move existing content
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);

    // Setup scroll listener with RAF throttling
    let ticking = false;
    this.viewport.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  setItems(items) {
    this.items = items;
    this.totalHeight = items.length * this.itemHeight;
    this.content.style.height = `${this.totalHeight}px`;
    this.render();
  }

  handleScroll() {
    const scrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
    const endIndex = Math.min(
      this.items.length - 1,
      Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.buffer
    );

    this.renderRange(startIndex, endIndex);
  }

  renderRange(startIndex, endIndex) {
    // Remove items outside range
    for (const [index, element] of this.visibleItems) {
      if (index < startIndex || index > endIndex) {
        element.remove();
        this.visibleItems.delete(index);
      }
    }

    // Add new items in range
    for (let i = startIndex; i <= endIndex; i++) {
      if (!this.visibleItems.has(i)) {
        const item = this.items[i];
        if (item) {
          const element = this.renderFn(item, i);
          element.style.position = 'absolute';
          element.style.top = `${i * this.itemHeight}px`;
          element.style.left = '0';
          element.style.right = '0';
          element.style.height = `${this.itemHeight}px`;
          element.dataset.index = i;

          this.content.appendChild(element);
          this.visibleItems.set(i, element);
        }
      }
    }
  }

  render() {
    this.handleScroll();
  }

  defaultRender(item, index) {
    const div = document.createElement('div');
    div.className = 'virtual-item';
    div.textContent = `Item ${index}: ${JSON.stringify(item)}`;
    return div;
  }

  destroy() {
    this.visibleItems.clear();
    this.viewport.remove();
  }

  scrollToIndex(index) {
    const scrollTop = index * this.itemHeight;
    this.viewport.scrollTop = scrollTop;
  }

  refresh() {
    this.visibleItems.clear();
    this.content.innerHTML = '';
    this.render();
  }
}

// Auto-initialize for existing product grids
document.addEventListener('DOMContentLoaded', () => {
  // Find all product grids
  const grids = document.querySelectorAll('#imeiResultGrid, #level3Grid, .product-grid');

  grids.forEach(grid => {
    // Check if grid has many children
    if (grid.children.length > 20) {
      console.log(`🚀 Initializing virtual scroll for grid with ${grid.children.length} items`);

      // Convert existing items to data
      const items = Array.from(grid.children).map(child => ({
        html: child.outerHTML,
        data: child.dataset
      }));

      // Create virtual scroll
      const virtualScroll = new VirtualScroll(grid, {
        itemHeight: 250,
        buffer: 3,
        renderItem: (item) => {
          const div = document.createElement('div');
          div.innerHTML = item.html;
          return div.firstElementChild;
        }
      });

      // Set items
      virtualScroll.setItems(items);

      // Store reference
      grid.virtualScroll = virtualScroll;
    }
  });
});

// Export for global use
window.VirtualScroll = VirtualScroll;