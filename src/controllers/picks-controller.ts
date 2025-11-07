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
      // If ESPN API fails, use mock data for development
      console.warn("ESPN API failed, using mock data:", error);
      this.loadMockData();
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

  loadMockData() {
    // Mock data for development/testing
    const mockGames: GameDisplay[] = [
      {
        id: "1",
        date: "2025-01-01",
        awayTeam: { name: "Chiefs", abbreviation: "KC", spread: "-3.5", odds: "-110" },
        homeTeam: { name: "Ravens", abbreviation: "BAL", spread: "+3.5", odds: "-110" }
      },
      {
        id: "2",
        date: "2025-01-01",
        awayTeam: { name: "Eagles", abbreviation: "PHI", spread: "-2.5", odds: "-110" },
        homeTeam: { name: "Packers", abbreviation: "GB", spread: "+2.5", odds: "-110" }
      },
      {
        id: "3",
        date: "2025-01-01",
        awayTeam: { name: "Vikings", abbreviation: "MIN", spread: "-1.5", odds: "-110" },
        homeTeam: { name: "Giants", abbreviation: "NYG", spread: "+1.5", odds: "-110" }
      },
      {
        id: "4",
        date: "2025-01-01",
        awayTeam: { name: "Saints", abbreviation: "NO", spread: "-4.5", odds: "-110" },
        homeTeam: { name: "Panthers", abbreviation: "CAR", spread: "+4.5", odds: "-110" }
      },
      {
        id: "5",
        date: "2025-01-01",
        awayTeam: { name: "Dolphins", abbreviation: "MIA", spread: "-3.5", odds: "-110" },
        homeTeam: { name: "Jaguars", abbreviation: "JAX", spread: "+3.5", odds: "-110" }
      },
      {
        id: "6",
        date: "2025-01-01",
        awayTeam: { name: "Texans", abbreviation: "HOU", spread: "-2.5", odds: "-110" },
        homeTeam: { name: "Colts", abbreviation: "IND", spread: "+2.5", odds: "-110" }
      }
    ];

    this.currentWeek = 10;
    this.weekNumberTarget.textContent = String(this.currentWeek);
    this.renderGames(mockGames);
    
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
    const card = document.createElement("div");
    card.className = "bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700";
    card.dataset.gameId = gameId;

    // Game title
    const title = document.createElement("div");
    title.className = "text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 text-center";
    title.textContent = `${team1} vs ${team2}`;
    card.appendChild(title);

    // Buttons container - horizontal layout with spread in middle
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "flex items-center gap-2";

    // Team 1 button (away team)
    const team1Btn = document.createElement("button");
    team1Btn.className = "flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors font-medium text-center";
    team1Btn.dataset.action = "click->picks#selectTeam";
    team1Btn.dataset.gameId = gameId;
    team1Btn.dataset.team = team1;
    team1Btn.dataset.spread = team1Spread;
    team1Btn.textContent = team1;

    // Spread display in the middle
    const spreadDisplay = document.createElement("div");
    spreadDisplay.className = "text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap";
    spreadDisplay.textContent = team1Spread;

    // Team 2 button (home team)
    const team2Btn = document.createElement("button");
    team2Btn.className = "flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors font-medium text-center";
    team2Btn.dataset.action = "click->picks#selectTeam";
    team2Btn.dataset.gameId = gameId;
    team2Btn.dataset.team = team2;
    team2Btn.dataset.spread = team2Spread;
    team2Btn.textContent = team2;

    buttonsContainer.appendChild(team1Btn);
    buttonsContainer.appendChild(spreadDisplay);
    buttonsContainer.appendChild(team2Btn);
    card.appendChild(buttonsContainer);

    // 3-point checkbox (separate from team buttons)
    const threePointContainer = document.createElement("label");
    threePointContainer.className = "flex items-center justify-center gap-2 mt-3 cursor-pointer";
    
    const threePointCheckbox = document.createElement("input");
    threePointCheckbox.type = "checkbox";
    threePointCheckbox.className = "w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 dark:border-gray-600 dark:focus:ring-orange-600 cursor-pointer";
    threePointCheckbox.dataset.action = "change->picks#toggleThreePoint";
    threePointCheckbox.dataset.gameId = gameId;
    
    const threePointLabel = document.createElement("span");
    threePointLabel.className = "text-sm font-medium text-gray-700 dark:text-gray-300";
    threePointLabel.textContent = "3 pt";
    
    threePointContainer.appendChild(threePointCheckbox);
    threePointContainer.appendChild(threePointLabel);
    card.appendChild(threePointContainer);

    return card;
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

    // Remove selection from all team buttons in this game (not 3-point button)
    const teamButtons = gameContainer.querySelectorAll("button[data-team]");
    teamButtons.forEach((btn) => {
      btn.classList.remove("bg-blue-600", "dark:bg-blue-700", "text-white", "border-blue-600", "dark:border-blue-700");
      btn.classList.add("border-gray-300", "dark:border-gray-600");
    });

    // Add strong selection styling to clicked button
    button.classList.add("bg-blue-600", "dark:bg-blue-700", "text-white", "border-blue-600", "dark:border-blue-700");
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

  toggleThreePoint(event: Event) {
    const checkbox = event.currentTarget as HTMLInputElement;
    const gameId = checkbox.dataset.gameId!;

    const pick = this.picks.get(gameId);
    
    if (!pick) {
      // Can only mark a game as 3-point if a team has been selected
      checkbox.checked = false;
      return;
    }

    const wasThreePoint = pick.isThreePoint;
    
    // First, uncheck and remove 3-point status from all games
    this.picks.forEach((p, id) => {
      if (p.isThreePoint) {
        p.isThreePoint = false;
        // Uncheck the old 3-point checkbox
        const oldCheckbox = this.gamesTarget.querySelector(
          `[data-game-id="${id}"] input[type="checkbox"]`
        ) as HTMLInputElement;
        if (oldCheckbox) {
          oldCheckbox.checked = false;
        }
      }
    });
    
    // If this wasn't already the 3-point game, make it the 3-point game
    if (!wasThreePoint) {
      pick.isThreePoint = true;
      checkbox.checked = true;
    } else {
      // If clicking the same checkbox, just uncheck it
      checkbox.checked = false;
    }
    
    this.updateOutput();
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
