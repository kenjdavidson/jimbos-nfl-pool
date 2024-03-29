const XLSX = require("xlsx");
const ESPN = require("./api/espn");
const { slugify } = require("./filters/player");

/**
 * Player expression matches two groups:
 * - the first group is everything up to the first bracket
 * - the second group is everything within the brackets
 */
const PLAYER_REG = /^\s*([^\(]+)(\([\d\.]+\)+)?\s*$/i;

/**
 * Game expression
 */
const GAMES_REG = /^([A-Z\. ]+)(-[\d\s\/]+)([A-Z\. ]+)$/i;

/**
 * Point expression is currently unused
 */
const POINTS_REG = /^([\d+])\s?pts.?$/i;

/**
 * Score expression
 */
const SCORE_REGEX = /^(\d+)\s*(1\/2)?$/i;

module.exports = function (eleventyConfig) {
  const logger = eleventyConfig.logger || console;
  const rules = eleventyConfig.globalData.xlsxParsingRules;

  return async (contents) => {
    const workbook = XLSX.readFile(contents);
    const worksheet = workbook.Sheets["Sheet1"];
    const title = contents.split("/").slice(-1)[0].replace(".xlsx", "");

    logger.info(`Processing XLSX data file ${title}`);
    const data = {
      type: "spread_pool",
      title,
      week: Number.parseInt(title.split(" ").splice(-1)[0]),
      games: games(worksheet, rules),
      standings: standings(worksheet, rules),
      playerPicks: playerPicks(worksheet, rules),
    };

    await processGameResults(data);
    processPlayerPicks(data);
    return data;
  };

  /**
   * Attempts to process game results, this happens only if there are no current results (we can assume that if the first
   * game has results, the whole file has results).  This will make a request to some api (espn by default) and apply
   * the currently available results to the game.  This is the worst performant function, it would be better if there
   * was consistency between the input and inbound (espn) data, but without controlling the project this is the
   * best I could do.
   *
   * @param {SpreadPoolData} data
   */
  async function processGameResults(data) {
    logger.info(`Processing game results for week ${data.week}`);

    const scoreboard = await ESPN.getScoreboard(data.week);
    const teamScores = scoreboard.events
      .map((event) => event.competitions[0])
      .filter((c) => c.status.type.completed)
      .flatMap((c) => c.competitors)
      .map((c) => ({
        team: c.team.abbreviation,
        score: Number.parseInt(c.score),
      }))
      .reduce((p, c) => ({ ...p, [c.team]: c.score }), {});

    logger.debug(`applying team scores`, teamScores);
    data.games.forEach((game) => applyTeamScore(teamScores, game));
  }

  function applyTeamScore(teamScores, game) {
    game.favoriteScore =
      teamScores[ESPN.ABBREVIATION_MAP[game.favoriteTeam][0]];
    game.underdogScore =
      teamScores[ESPN.ABBREVIATION_MAP[game.underdogTeam][0]];

    // TODO: clean this up with a class
    if (game.favoriteScore != undefined && !!game.underdogScore != undefined) {
      game.covered = game.underdogScore - game.favoriteScore < game.spread;
      game.winningTeam = game.covered ? game.favoriteTeam : game.underdogTeam;
      game.totalScore = game.favoriteScore + game.underdogScore;
      game.completed = true;
    }
  }

  /**
   * Go through player picks and mark wins/counts for any games that are provided.
   *
   * @param {SpreadPoolData} data
   */
  function processPlayerPicks(data) {
    data.playerPicks.forEach((playerPick, i) => {
      playerPick.points = 0;

      data.games.forEach((game, j) => {
        if (
          game.completed && data.playerPicks[i].picks[j].team === data.games[j].winningTeam
        ) {
          playerPick.picks[j].covered = true;
          playerPick.points += data.playerPicks[i].picks[j].threePoint ? 3 : 1;
        }
      });
    });
  }

  /**
   * Player picks are on the left side of the sheet.  There are generally two sections of picks
   * that span from the start column to the first blank.  May need to find a better way to manage
   * this, but for the time being it should be safe.
   *
   * @param {import("xlsx").Sheet} worksheet
   * @param {ParsingRules} rules
   * @return {PlayerPick[]}
   */
  function playerPicks(worksheet, rules) {
    let playerPicks = [];

    const startGamesCell = addressToXlsx(rules.games[0]);
    const startStandingsCell = addressToXlsx(rules.standings[0]);
    const maxGames = startStandingsCell.r - startGamesCell.r;

    rules.playerPicks.forEach((startRule) => {
      let startCell = addressToXlsx(startRule);
      let playerName;

      do {
        let cellKey = xlsxToKey(startCell);
        playerName = worksheet[cellKey];

        if (playerName) {
          playerPicks.push({
            id: slugify(playerName.v),
            name: playerName.v,
            ...extractPlayerPicks(worksheet, startCell, maxGames),
          });
        }

        startCell = { c: startCell.c + 1, r: startCell.r };
      } while (playerName !== undefined);
    });

    return playerPicks;
  }

  function extractPlayerPicks(worksheet, startCell, maxGames) {
    let cell = { c: startCell.c, r: startCell.r + 1 };
    let picks = [];
    let points = [];
    let undefinedCount = 0;
    let gamesCount = 0;
    while (undefinedCount < 2 && ++gamesCount < maxGames) {
      let pickCell = worksheet[xlsxToKey(cell)];
      if (pickCell === undefined) {
        undefinedCount++;
      } else if (pickCell.t == "n" || SCORE_REGEX.test(pickCell.v)) {
        let score = pickCell.t === "n" ? pickCell.v : convertScore(pickCell.v);
        points.push(score);
      } else {
        undefinedCount = 0;
        picks.push({
          team: pickCell.v.replace("**", ""),
          threePoint: pickCell.v.includes("**"),
        });
      }

      cell = { c: cell.c, r: ++cell.r };
    }

    return {
      tieBreak: points.splice(-1)[0],
      picks,
    };
  }

  /**
   * Games are located in the top right portion of the sheet, taikng up three columns:
   * - Favorite score
   * - Teams and spread
   * - Underdog score
   *
   * The winning team is calculated by comparing `underdog score - favorite score <= spread`.  Another
   * method to determine winner is whether the favorite/underdog score is <b> or <red>.
   *
   * @param {Sheet} worksheet
   * @param {ParsingRules} rules
   * @return {GameResult[]}
   */
  function games(worksheet, rules) {
    logger.debug(`Processing current week games/spread.`);

    let games = [];
    let cell = addressToXlsx(rules.games[0]);
    let maxCell = addressToXlsx(rules.standings[0]);
    let undefinedCount = 0;
    while (undefinedCount < 2 && cell.r < maxCell.r) {
      let gameCell = worksheet[xlsxToKey(cell)];

      if (gameCell === undefined) {
        undefinedCount++;
      } else if (GAMES_REG.test(gameCell.v)) {
        undefinedCount = 0;

        const favorite = worksheet[xlsxToKey({ c: cell.c - 1, r: cell.r })];
        const underdog = worksheet[xlsxToKey({ c: cell.c + 1, r: cell.r })];
        const parsedGame = gameCell.v.match(GAMES_REG);
        logger.debug(`Processing game [${parsedGame.toString()}]`);

        let game = {
          favoriteTeam: tu(parsedGame[1]),
          favoriteScore: favorite && Number.parseInt(favorite.v),
          underdogTeam: tu(parsedGame[3]),
          underdogScore: underdog && Number.parseInt(underdog.v),
          spread: convertScore(tu(parsedGame[2])),
        };

        // TODO: clean this up with a class
        if (
          game.favoriteScore != undefined &&
          !!game.underdogScore != undefined
        ) {
          game.covered = game.underdogScore - game.favoriteScore < game.spread;
          game.winningTeam = game.covered
            ? game.favoriteTeam
            : game.underdogTeam;
          game.totalScore = game.favoriteScore + game.underdogScore;
        }

        games.push(game);
      }

      cell = {
        c: cell.c,
        r: cell.r + 1,
      };
    }

    return games;
  }

  function convertScore(score) {
    return score && Number.parseFloat(score.replace(/\s?1\/2/g, ".5"));
  }

  /**
   * Standings are located in the lower right portion of the Sheet, taking up three columns:
   * - Position (ordinal w/ ties)
   * - Name (including number of wins)
   * - Points
   *
   * @param {Sheet} worksheet
   * @param {ParsingRules} rules
   * @returns {PlayerRank}
   */
  function standings(worksheet, rules) {
    logger.info(`Processing standings from worksheet`);

    let standings = [];
    let cell = addressToXlsx(rules.standings[0]);
    let player;
    while ((player = worksheet[xlsxToKey(cell)]) !== undefined) {      
      const position = worksheet[xlsxToKey({ c: cell.c - 1, r: cell.r })];
      const points = worksheet[xlsxToKey({ c: cell.c + 1, r: cell.r })];
      const parsedPlayer = player.v.match(PLAYER_REG);

      logger.info(`Processing player ${parsedPlayer.toString()}`);
      standings.push({
        id: slugify(parsedPlayer[1]),
        name: parsedPlayer[1],
        position: position.v,
        points: points.v,
        wins: Number.parseFloat(
          (parsedPlayer[2] && parsedPlayer[2].slice(1, -1)) || 0
        ),
      });

      cell = {
        c: cell.c,
        r: cell.r + 1,
      };
    }

    return standings;
  }
};

function tu(value) {
  return value.trim().toUpperCase();
}

/**
 * Converts a standard Excel address "A:1" to the XSLX { c: 0, r: 0 }.
 *
 * @param {address} cellString
 * @return {XlsxCell}
 */
function addressToXlsx(address) {
  const cell = address.split(":");
  return {
    c: cell[0].charCodeAt() - 65,
    r: Number(cell[1]) - 1,
  };
}

/**
 * Converts a standard address "A:1" to value "A1".
 *
 * @param {string} address
 * @returns {string}
 */
function addressToKey(address) {
  const cell = address.split(":");
  return `${cell[0]}${cell[1]}`;
}

/**
 * Converts XLSX `{ c: C, r: R }` to value "CR".
 *
 * @param {XlsxCell} xlsx
 * @returns {string}
 */
function xlsxToKey(xlsx) {
  return `${String.fromCharCode(65 + xlsx.c)}${xlsx.r + 1}`;
}
