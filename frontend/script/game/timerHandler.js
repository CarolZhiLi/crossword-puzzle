// Timer management for game duration tracking
export class TimerHandler {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.startTime = Date.now();
    this.timerInterval = null;
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer() {
    this.startTime = Date.now();
    this.updateTimer();
  }

  updateTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Update desktop timer (in sidebar)
    const el = document.getElementById("timer");
    if (el) {
      el.textContent = timeString;
    }

    // Update mobile timer
    const mobileTimer = document.getElementById("mobileTimer");
    if (mobileTimer) {
      mobileTimer.textContent = timeString;
    }

    // Update tablet timer
    const tabletTimer = document.getElementById("tabletTimer");
    if (tabletTimer) {
      tabletTimer.textContent = timeString;
    }
  }
}

