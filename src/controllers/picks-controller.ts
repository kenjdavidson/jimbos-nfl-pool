import { Controller } from "@hotwired/stimulus";
import {
  fetchESPNSpreads,
  processESPNSpreads,
  getWeekNumber,
  type GameDisplay,
} from "../utils/espn-spreads";

interface PickSelection {
  team: string;
  spread: string;
  isThreePoint: boolean;
}

export default class extends Controller {
  static targets = [
    "loading",
    "error",
    "errorMessage",
    "content",
    "weekNumber",
    "games",
    "output",
    "tiebreak",
    "copyStatus",
  ];

  declare readonly loadingTarget: HTMLElement;
  declare readonly errorTarget: HTMLElement;
  declare readonly errorMessageTarget: HTMLElement;
  declare readonly contentTarget: HTMLElement;
  declare readonly weekNumberTarget: HTMLElement;
  declare readonly gamesTarget: HTMLElement;
  declare readonly outputTarget: HTMLElement;
  declare readonly tiebreakTarget: HTMLInputElement;
  declare readonly copyStatusTarget: HTMLElement;

  private picks: Map<string, PickSelection> = new Map();
  private currentWeek: number = 0;

  async connect() {
    try {
      await this.loadOdds();
    } catch (error) {
      this.showError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  async loadOdds() {
    const data = await fetchESPNSpreads();
    const games = processESPNSpreads(data);
    
    if (games.length === 0) {
      throw new Error("No games available for this week");
    }

    this.currentWeek = getWeekNumber(data);
    this.weekNumberTarget.textContent = String(this.currentWeek);
    
    this.renderGames(games);
    
    this.loadingTarget.classList.add("hidden");
    this.contentTarget.classList.remove("hidden");
  }

  private adjustSpread(spread: number): number {
    // Adjust whole number spreads by subtracting 0.5
    if (Number.isInteger(spread)) {
      return spread > 0 ? spread - 0.5 : spread + 0.5;
    }
    return spread;
  }

  renderGames(games: GameDisplay[]) {
    this.gamesTarget.innerHTML = "";
    
    games.forEach((game) => {
      // Parse and adjust spreads
      const homeSpread = this.adjustSpread(parseFloat(game.homeTeam.spread));
      const awaySpread = this.adjustSpread(parseFloat(game.awayTeam.spread));
      
      // Format spreads with proper signs
      const homeSpreadStr = homeSpread > 0 ? `+${homeSpread}` : String(homeSpread);
      const awaySpreadStr = awaySpread > 0 ? `+${awaySpread}` : String(awaySpread);
      
      const gameElement = this.createGameElement(
        game.id,
        game.awayTeam.abbreviation,
        awaySpreadStr,
        game.homeTeam.abbreviation,
        homeSpreadStr
      );
      
      this.gamesTarget.appendChild(gameElement);
    });
  }

  createGameElement(
    gameId: string,
    team1: string,
    team1Spread: string,
    team2: string,
    team2Spread: string
  ): HTMLElement {
    const container = document.createElement("div");
    container.className = "flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-md";
    container.dataset.gameId = gameId;

    // Team 1 button (away team)
    const team1Btn = document.createElement("button");
    team1Btn.className = "px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors";
    team1Btn.dataset.action = "click->picks#selectTeam";
    team1Btn.dataset.gameId = gameId;
    team1Btn.dataset.team = team1;
    team1Btn.dataset.spread = team1Spread;
    team1Btn.textContent = `${team1} ${team1Spread}`;

    // Team 2 button (home team)
    const team2Btn = document.createElement("button");
    team2Btn.className = "px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors";
    team2Btn.dataset.action = "click->picks#selectTeam";
    team2Btn.dataset.gameId = gameId;
    team2Btn.dataset.team = team2;
    team2Btn.dataset.spread = team2Spread;
    team2Btn.textContent = `${team2} ${team2Spread}`;

    // 3-point button
    const threePointBtn = document.createElement("button");
    threePointBtn.className = "px-3 py-2 border-2 border-orange-400 dark:border-orange-600 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors text-sm";
    threePointBtn.dataset.action = "click->picks#toggleThreePoint";
    threePointBtn.dataset.gameId = gameId;
    threePointBtn.textContent = "3 Point";

    container.appendChild(team1Btn);
    container.appendChild(team2Btn);
    container.appendChild(threePointBtn);

    return container;
  }

  selectTeam(event: MouseEvent) {
    const button = event.currentTarget as HTMLButtonElement;
    const gameId = button.dataset.gameId!;
    const team = button.dataset.team!;
    const spread = button.dataset.spread!;

    // Get the game container
    const gameContainer = this.gamesTarget.querySelector(
      `[data-game-id="${gameId}"]`
    ) as HTMLElement;
    
    if (!gameContainer) return;

    // Remove selection from all buttons in this game
    const allButtons = gameContainer.querySelectorAll("button");
    allButtons.forEach((btn) => {
      btn.classList.remove("bg-blue-500", "dark:bg-blue-600", "text-white");
      btn.classList.add("border-gray-300", "dark:border-gray-600");
    });

    // Add selection to clicked button
    button.classList.add("bg-blue-500", "dark:bg-blue-600", "text-white");
    button.classList.remove("border-gray-300", "dark:border-gray-600");

    // Store the pick
    const existingPick = this.picks.get(gameId);
    this.picks.set(gameId, {
      team,
      spread,
      isThreePoint: existingPick?.isThreePoint || false,
    });

    this.updateOutput();
  }

  toggleThreePoint(event: MouseEvent) {
    const button = event.currentTarget as HTMLButtonElement;
    const gameId = button.dataset.gameId!;

    const pick = this.picks.get(gameId);
    
    if (pick) {
      pick.isThreePoint = !pick.isThreePoint;
      
      // Toggle button appearance
      if (pick.isThreePoint) {
        button.classList.add("bg-orange-500", "dark:bg-orange-600", "text-white");
        button.classList.remove("border-orange-400", "dark:border-orange-600");
      } else {
        button.classList.remove("bg-orange-500", "dark:bg-orange-600", "text-white");
        button.classList.add("border-orange-400", "dark:border-orange-600");
      }
      
      this.updateOutput();
    }
  }

  updateOutput() {
    if (this.picks.size === 0) {
      this.outputTarget.textContent = "No picks selected yet";
      return;
    }

    const lines: string[] = [];
    
    this.picks.forEach((pick) => {
      const threePointSuffix = pick.isThreePoint ? "\t+3" : "";
      lines.push(`${pick.team}\t${pick.spread}${threePointSuffix}`);
    });

    // Add tiebreak if provided
    const tiebreak = this.tiebreakTarget.value.trim();
    if (tiebreak) {
      lines.push(`\nTiebreak: ${tiebreak}`);
    }

    this.outputTarget.textContent = lines.join("\n");
  }

  async copyToClipboard() {
    const text = this.outputTarget.textContent || "";
    
    try {
      await navigator.clipboard.writeText(text);
      this.copyStatusTarget.classList.remove("hidden");
      
      setTimeout(() => {
        this.copyStatusTarget.classList.add("hidden");
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy to clipboard");
    }
  }

  showError(message: string) {
    this.loadingTarget.classList.add("hidden");
    this.errorTarget.classList.remove("hidden");
    this.errorMessageTarget.textContent = message;
  }
}
