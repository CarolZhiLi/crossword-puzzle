// Tooltip management for desktop sidebar buttons
export class TooltipHandler {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  setupTooltips() {
    // Only setup tooltips for desktop
    if (window.innerWidth < 1025) return;

    const tooltipWrappers = document.querySelectorAll(
      ".left-sidebar.desktop-only .tooltip-wrapper"
    );

    tooltipWrappers.forEach((wrapper) => {
      const img = wrapper.querySelector("img");
      if (!img) return;

      wrapper.addEventListener("mouseenter", (e) => {
        const rect = img.getBoundingClientRect();

        // Create tooltip element if it doesn't exist
        let tooltipEl = wrapper._tooltipEl;
        if (!tooltipEl) {
          tooltipEl = document.createElement("div");
          tooltipEl.className = "custom-tooltip";
          document.body.appendChild(tooltipEl);
          wrapper._tooltipEl = tooltipEl;
        }

        // Always update the text content in case it has changed
        tooltipEl.textContent = wrapper.getAttribute("data-tooltip");

        // Position tooltip to the right of the button
        const left = rect.right + 12;
        const top = rect.top + rect.height / 2;

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
        tooltipEl.style.transform = "translateY(-50%)";
        tooltipEl.style.opacity = "1";
        tooltipEl.style.visibility = "visible";

        // Create arrow
        let arrow = wrapper._arrow;
        if (!arrow) {
          arrow = document.createElement("div");
          arrow.className = "custom-tooltip-arrow";
          document.body.appendChild(arrow);
          wrapper._arrow = arrow;
        }

        arrow.style.left = `${rect.right + 6}px`;
        arrow.style.top = `${top}px`;
        arrow.style.transform = "translateY(-50%)";
        arrow.style.opacity = "1";
        arrow.style.visibility = "visible";
      });

      wrapper.addEventListener("mouseleave", () => {
        if (wrapper._tooltipEl) {
          wrapper._tooltipEl.style.opacity = "0";
          wrapper._tooltipEl.style.visibility = "hidden";
        }
        if (wrapper._arrow) {
          wrapper._arrow.style.opacity = "0";
          wrapper._arrow.style.visibility = "hidden";
        }
      });
    });
  }
}
