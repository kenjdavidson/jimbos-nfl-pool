interface ParsingRules {
    games: string[];
    standings: string[];
    playerPicks: string[];
}

interface SpreadPoolData {
    type: string;
    title: string;
    week: Number;
    games: GameResult[];
    standings: PlayerRank[];
    playerPicks: PlayerPick[];
}

interface GameResult {
    favoriteTeam: string;
    favoriteScore: Number;
    underdogTeam: string;
    underdogScore: Number;
    spread: Number;
    covered: boolean;
    winningTeam: string;
    completed: boolean;
}

interface PlayerRank {
    player: string;
    points: Number;
    position: Number;
    wins: Number;
}

interface PlayerPick {
    player: string;
    team: string;
    threePoint: boolean;
    covered?: boolean;
    points?: Number;
}

interface XlsxCell {
    c: Number;
    r: Number;
}
