import { Controller } from "@hotwired/stimulus";

interface Team {
  id: string;
  abbreviation: string;
  displayName: string;
}

interface Competitor {
  team: Team;
}

interface Odds {
  details?: string;
  overUnder?: number;
}

interface Competition {
  competitors: Competitor[];
  odds?: Odds[];
}

interface Event {
  id: string;
  name: string;
  competitions: Competition[];
}

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
    try {
      const response = await fetch(
        "https://site.web.api.espn.com/apis/v3/sports/football/nfl/odds"
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error("No odds data available");
      }

      this.currentWeek = data.week?.number || data.items[0]?.week || 1;
      this.weekNumberTarget.textContent = String(this.currentWeek);
      
      this.renderGames(data.items);
      
      this.loadingTarget.classList.add("hidden");
      this.contentTarget.classList.remove("hidden");
    } catch (error) {
      // If API fails, use sample data for demonstration
      console.warn("ESPN API failed, using sample data:", error);
      this.loadSampleData();
    }
  }

  loadSampleData() {
    // Sample data for demonstration when ESPN API is unavailable
    this.currentWeek = 10;
    this.weekNumberTarget.textContent = String(this.currentWeek);
    
    const sampleGames = [
      { id: "1", team1: "ATL", team2: "IND", spread: "-6" },
      { id: "2", team1: "NYG", team2: "CHI", spread: "-4" },
      { id: "3", team1: "BUF", team2: "MIA", spread: "-10" },
      { id: "4", team1: "KC", team2: "DEN", spread: "-7.5" },
      { id: "5", team1: "SF", team2: "SEA", spread: "-5.5" },
      { id: "6", team1: "DAL", team2: "PHI", spread: "-3" },
    ];
    
    this.gamesTarget.innerHTML = "";
    
    sampleGames.forEach((game) => {
      let spreadValue = parseFloat(game.spread);
      
      // Adjust whole number spreads by subtracting 0.5
      if (Number.isInteger(spreadValue)) {
        spreadValue = spreadValue > 0 ? spreadValue - 0.5 : spreadValue + 0.5;
      }
      
      const favoriteSpread = spreadValue > 0 ? String(spreadValue) : String(spreadValue);
      const underdogSpread = spreadValue > 0 ? String(-spreadValue) : `+${Math.abs(spreadValue)}`;
      
      const favoriteTeam = game.team2;
      const underdogTeam = game.team1;
      
      const gameElement = this.createGameElement(
        game.id,
        underdogTeam,
        favoriteTeam,
        favoriteSpread
      );
      
      this.gamesTarget.appendChild(gameElement);
    });
    
    this.loadingTarget.classList.add("hidden");
    this.contentTarget.classList.remove("hidden");
  }

  renderGames(events: Event[]) {
    this.gamesTarget.innerHTML = "";
    
    events.forEach((event) => {
      if (!event.competitions || event.competitions.length === 0) {
        return;
      }

      const competition = event.competitions[0];
      const competitors = competition.competitors;
      
      if (competitors.length < 2) {
        return;
      }

      const team1 = competitors[0].team;
      const team2 = competitors[1].team;
      
      // Get odds/spread information
      let spread = "EVEN";
      let favoriteTeam = team1.abbreviation;
      let underdogTeam = team2.abbreviation;
      
      if (competition.odds && competition.odds.length > 0) {
        const oddsDetails = competition.odds[0].details;
        if (oddsDetails) {
          // Parse odds like "ATL -6.5" or "IND +3"
          const spreadMatch = oddsDetails.match(/([-+]?\d+\.?\d*)/);
          if (spreadMatch) {
            let spreadValue = parseFloat(spreadMatch[1]);
            
            // Adjust whole number spreads by subtracting 0.5
            if (Number.isInteger(spreadValue)) {
              spreadValue = spreadValue > 0 ? spreadValue - 0.5 : spreadValue + 0.5;
            }
            
            spread = spreadValue > 0 ? `+${spreadValue}` : String(spreadValue);
            
            // Determine favorite and underdog
            if (oddsDetails.includes(team1.abbreviation)) {
              if (spreadValue < 0) {
                favoriteTeam = team1.abbreviation;
                underdogTeam = team2.abbreviation;
              } else {
                favoriteTeam = team2.abbreviation;
                underdogTeam = team1.abbreviation;
                spread = spreadValue > 0 ? String(-spreadValue) : `+${Math.abs(spreadValue)}`;
              }
            } else {
              if (spreadValue < 0) {
                favoriteTeam = team2.abbreviation;
                underdogTeam = team1.abbreviation;
              } else {
                favoriteTeam = team1.abbreviation;
                underdogTeam = team2.abbreviation;
                spread = spreadValue > 0 ? String(-spreadValue) : `+${Math.abs(spreadValue)}`;
              }
            }
          }
        }
      }

      const gameElement = this.createGameElement(
        event.id,
        favoriteTeam,
        underdogTeam,
        spread
      );
      
      this.gamesTarget.appendChild(gameElement);
    });
  }

  createGameElement(
    gameId: string,
    team1: string,
    team2: string,
    spread: string
  ): HTMLElement {
    const container = document.createElement("div");
    container.className = "flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-md";
    container.dataset.gameId = gameId;

    // Team 1 button (underdog with + spread)
    const team1Btn = document.createElement("button");
    team1Btn.className = "px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors";
    team1Btn.dataset.action = "click->picks#selectTeam";
    team1Btn.dataset.gameId = gameId;
    team1Btn.dataset.team = team1;
    
    // Calculate underdog spread (opposite of favorite)
    const underdogSpread = spread.startsWith("-") 
      ? `+${spread.substring(1)}` 
      : spread.startsWith("+") 
      ? `-${spread.substring(1)}`
      : spread === "EVEN"
      ? "EVEN"
      : `+${Math.abs(parseFloat(spread))}`;
    
    team1Btn.dataset.spread = underdogSpread;
    team1Btn.textContent = `${team1} ${underdogSpread}`;

    // Team 2 button (favorite with - spread)
    const team2Btn = document.createElement("button");
    team2Btn.className = "px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors";
    team2Btn.dataset.action = "click->picks#selectTeam";
    team2Btn.dataset.gameId = gameId;
    team2Btn.dataset.team = team2;
    team2Btn.dataset.spread = spread;
    team2Btn.textContent = `${team2} ${spread}`;

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
