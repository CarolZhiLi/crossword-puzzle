// Video animation management
export class VideoHandler {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  ensureVideoVisible() {
    // Immediately ensure video is visible on page load - runs before anything else
    const container = document.getElementById("animationContainer");
    if (container) {
      // Force visibility immediately
      container.classList.remove("hidden");
      container.style.display = "flex";
      container.style.opacity = "1";
      container.style.visibility = "visible";
      console.log("Video container made visible on page load");
    }
  }

  setupAnimationVideo() {
    // Show video immediately on page load - it will be hidden when a game starts and grid is ready
    const video = document.getElementById("introAnimation");
    const container = document.getElementById("animationContainer");

    if (!video || !container) {
      console.warn("Animation video elements not found");
      return;
    }

    // Always show video on initial page load (before any game is started)
    // The video will be hidden when initializeGrid() creates a grid with solution data
    this.showAnimationVideo();
  }

  showAnimationVideo() {
    const video = document.getElementById("introAnimation");
    const container = document.getElementById("animationContainer");

    if (!video || !container) {
      console.warn("Animation video or container not found");
      return;
    }

    console.log("Showing animation video");
    // Ensure container is visible
    container.classList.remove("hidden");
    container.style.display = "flex";
    container.style.opacity = "1";
    container.style.visibility = "visible";

    // Try to play video (autoplay may be blocked)
    video.play().catch((error) => {
      console.log("Video autoplay was blocked:", error);
    });
  }

  hideAnimationVideo() {
    const video = document.getElementById("introAnimation");
    const container = document.getElementById("animationContainer");

    if (!video || !container) return;

    console.log("Hiding animation video");
    video.pause();
    container.classList.add("hidden");
  }
}

