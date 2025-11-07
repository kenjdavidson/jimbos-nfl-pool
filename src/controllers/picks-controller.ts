import { Controller } from "@hotwired/stimulus";
import {
  fetchESPNSpreads,
  processESPNSpreads,
  getWeekNumber,
  getMockGameData,
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
    const { games, weekNumber } = getMockGameData();

    this.currentWeek = weekNumber;
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
      const homeSpreadStr =
        homeSpread > 0 ? `+${homeSpread}` : String(homeSpread);
      const awaySpreadStr =
        awaySpread > 0 ? `+${awaySpread}` : String(awaySpread);

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
    card.className =
      "bg-gray-50 dark:bg-slate-700 rounded-lg shadow-md p-6 flex flex-col items-stretch content-start gap-4";
    card.dataset.gameId = gameId;

    // Game title
    const title = document.createElement("div");
    title.className =
      "text-lg font-bold text-gray-800 dark:text-gray-200 text-center";
    title.textContent = `${team1} @ ${team2}`;
    card.appendChild(title);

    // Buttons container - horizontal layout with spread in middle
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "flex items-stretch";

    // Team 1 button (away team)
    const team1Btn = document.createElement("button");
    team1Btn.className =
      "flex-1 px-4 py-6 bg-gray-300 dark:bg-gray-500 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-400 transition-colors font-medium text-center";
    team1Btn.dataset.action = "click->picks#selectTeam";
    team1Btn.dataset.gameId = gameId;
    team1Btn.dataset.team = team1;
    team1Btn.dataset.spread = team1Spread;
    team1Btn.textContent = team1;

    // Spread display in the middle
    const spreadDisplay = document.createElement("div");
    spreadDisplay.className =
      "self-center text-base font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-2";
    spreadDisplay.textContent = team1Spread;

    // Team 2 button (home team)
    const team2Btn = document.createElement("button");
    team2Btn.className =
      "flex-1 px-4 py-6 bg-gray-300 dark:bg-gray-500 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-400 transition-colors font-medium text-center";
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
    threePointContainer.className =
      "flex items-center justify-center gap-3 cursor-pointer pt-2";

    const threePointCheckbox = document.createElement("input");
    threePointCheckbox.type = "checkbox";
    threePointCheckbox.className =
      "w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-600 dark:border-gray-500 dark:focus:ring-blue-600 cursor-pointer";
    threePointCheckbox.dataset.action = "change->picks#toggleThreePoint";
    threePointCheckbox.dataset.gameId = gameId;

    const threePointLabel = document.createElement("span");
    threePointLabel.className =
      "text-base font-semibold text-gray-800 dark:text-gray-200";
    threePointLabel.textContent = "3 Point";

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

    // Remove selection from all team buttons in this game (restore secondary styling)
    const teamButtons = gameContainer.querySelectorAll("button[data-team]");
    teamButtons.forEach((btn) => {
      btn.classList.remove("bg-blue-600", "dark:bg-blue-700", "text-white");
      btn.classList.add(
        "bg-gray-300",
        "dark:bg-gray-500",
        "text-gray-900",
        "dark:text-gray-100"
      );
    });

    // Add primary button styling to clicked button
    button.classList.add("bg-blue-600", "dark:bg-blue-700", "text-white");
    button.classList.remove(
      "bg-gray-300",
      "dark:bg-gray-500",
      "text-gray-900",
      "dark:text-gray-100"
    );

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

    // If this game was already the 3-point game, uncheck it
    if (pick.isThreePoint) {
      pick.isThreePoint = false;
      checkbox.checked = false;
      this.updateOutput();
      return;
    }

    // Otherwise, uncheck all other 3-point games and make this one the 3-point game
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

    // Make this the 3-point game
    pick.isThreePoint = true;
    checkbox.checked = true;

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
