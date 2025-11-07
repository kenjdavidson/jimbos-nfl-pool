// Minimal types for ESPN NFL spreads webapp

export interface Team {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
}

export interface Competitor {
  homeAway: "home" | "away";
  team: Team;
}

export interface SpreadOdds {
  line: string;
  odds: string;
}

export interface PointSpread {
  home: { close: SpreadOdds };
  away: { close: SpreadOdds };
}

export interface GameOdds {
  pointSpread: PointSpread;
}

export interface Competition {
  id: string;
  date: string;
  competitors: [Competitor, Competitor]; // Always 2 teams
  odds: GameOdds[];
}

export interface Game {
  name: string;
  shortName: string;
  competitions: Competition[];
}

export interface WeekData {
  displayValue: string;
  events: Game[];
}

export interface ESPNSpreadsData {
  lines: WeekData[];
}

// Utility type for webapp display
export interface GameDisplay {
  id: string;
  date: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    spread: string;
    odds: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    spread: string;
    odds: string;
  };
}

// Processing function to transform JSON data
export function processESPNSpreads(data: ESPNSpreadsData): GameDisplay[] {
  const games: GameDisplay[] = [];

  data.lines.forEach((week) => {
    week.events.forEach((event) => {
      event.competitions.forEach((competition) => {
        // Find home and away teams
        const homeCompetitor = competition.competitors.find(
          (c) => c.homeAway === "home"
        );
        const awayCompetitor = competition.competitors.find(
          (c) => c.homeAway === "away"
        );

        if (
          !homeCompetitor ||
          !awayCompetitor ||
          !competition.odds[0]?.pointSpread
        ) {
          return; // Skip if missing data
        }

        const spread = competition.odds[0].pointSpread;

        games.push({
          id: competition.id,
          date: competition.date,
          homeTeam: {
            name: homeCompetitor.team.shortDisplayName,
            abbreviation: homeCompetitor.team.abbreviation,
            spread: spread.home.close.line,
            odds: spread.home.close.odds,
          },
          awayTeam: {
            name: awayCompetitor.team.shortDisplayName,
            abbreviation: awayCompetitor.team.abbreviation,
            spread: spread.away.close.line,
            odds: spread.away.close.odds,
          },
        });
      });
    });
  });

  return games;
}

// Fetch ESPN spreads data
export async function fetchESPNSpreads(): Promise<ESPNSpreadsData> {
  const response = await fetch(
    "https://site.web.api.espn.com/apis/v3/sports/football/nfl/odds"
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch odds data: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as ESPNSpreadsData;
}

// Get week number from ESPN data
export function getWeekNumber(data: ESPNSpreadsData): number {
  if (data.lines && data.lines.length > 0) {
    const weekDisplay = data.lines[0].displayValue;
    const match = weekDisplay.match(/Week (\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 1;
}

// Mock data for development/testing
export function getMockGameData(): {
  games: GameDisplay[];
  weekNumber: number;
} {
  const mockGames: GameDisplay[] = [
    {
      id: "1",
      date: "2025-01-01",
      awayTeam: {
        name: "Chiefs",
        abbreviation: "KC",
        spread: "-3.5",
        odds: "-110",
      },
      homeTeam: {
        name: "Ravens",
        abbreviation: "BAL",
        spread: "+3.5",
        odds: "-110",
      },
    },
    {
      id: "2",
      date: "2025-01-01",
      awayTeam: {
        name: "Eagles",
        abbreviation: "PHI",
        spread: "-2.5",
        odds: "-110",
      },
      homeTeam: {
        name: "Packers",
        abbreviation: "GB",
        spread: "+2.5",
        odds: "-110",
      },
    },
    {
      id: "3",
      date: "2025-01-01",
      awayTeam: {
        name: "Vikings",
        abbreviation: "MIN",
        spread: "-1.5",
        odds: "-110",
      },
      homeTeam: {
        name: "Giants",
        abbreviation: "NYG",
        spread: "+1.5",
        odds: "-110",
      },
    },
    {
      id: "4",
      date: "2025-01-01",
      awayTeam: {
        name: "Saints",
        abbreviation: "NO",
        spread: "-4.5",
        odds: "-110",
      },
      homeTeam: {
        name: "Panthers",
        abbreviation: "CAR",
        spread: "+4.5",
        odds: "-110",
      },
    },
    {
      id: "5",
      date: "2025-01-01",
      awayTeam: {
        name: "Dolphins",
        abbreviation: "MIA",
        spread: "-3.5",
        odds: "-110",
      },
      homeTeam: {
        name: "Jaguars",
        abbreviation: "JAX",
        spread: "+3.5",
        odds: "-110",
      },
    },
    {
      id: "6",
      date: "2025-01-01",
      awayTeam: {
        name: "Texans",
        abbreviation: "HOU",
        spread: "-2.5",
        odds: "-110",
      },
      homeTeam: {
        name: "Colts",
        abbreviation: "IND",
        spread: "+2.5",
        odds: "-110",
      },
    },
  ];

  return {
    games: mockGames,
    weekNumber: 10,
  };
}
