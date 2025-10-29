const fs = require("fs");
const path = require("path");
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

/**
 * Loads all spread pool data from the data/{year}/ directory structure
 */
module.exports = function (eleventyConfig) {
  const logger = eleventyConfig.logger || console;
  const rules = eleventyConfig.globalData.xlsxParsingRules;

  return async () => {
    const dataDir = path.join(process.cwd(), "content", "_data");
    const allData = {};

    if (!fs.existsSync(dataDir)) {
      logger.warn(`Data directory ${dataDir} does not exist`);
      return allData;
    }

    // Read all year directories
    const years = fs.readdirSync(dataDir).filter((file) => {
      const yearPath = path.join(dataDir, file);
      return fs.statSync(yearPath).isDirectory() && /^\d{4}$/.test(file);
    });

    logger.info(`Found ${years.length} year(s): ${years.join(", ")}`);

    // Process each year
    for (const year of years) {
      const yearPath = path.join(dataDir, year);
      const xlsxFiles = fs
        .readdirSync(yearPath)
        .filter((file) => file.endsWith(".xlsx"));

      logger.info(`Processing ${xlsxFiles.length} files for year ${year}`);

      for (const file of xlsxFiles) {
        const filePath = path.join(yearPath, file);
        const title = file.replace(".xlsx", "");
        const week = Number.parseInt(title.split(" ").slice(-1)[0], 10);

        logger.info(`Processing file: ${file}`);

        try {
          const workbook = XLSX.readFile(filePath);
          const worksheet = workbook.Sheets["Sheet1"];

          const data = {
            type: "spread_pool",
            title,
            year: Number.parseInt(year, 10),
            week,
            games: games(worksheet, rules, logger),
            standings: standings(worksheet, rules, logger),
            playerPicks: playerPicks(worksheet, rules, logger),
          };

          await processGameResults(data, logger);
          processPlayerPicks(data, logger);

          // Store with a unique key
          const key = `${year}_week_${week}`;
          allData[key] = data;
        } catch (error) {
          logger.error(`Error processing file ${file}:`, error);
        }
      }
    }

    return allData;
  };

  /**
   * Attempts to process game results
   */
  async function processGameResults(data, logger) {
    logger.info(
      `Processing game results for week ${data.week}, year ${data.year}`
    );

    try {
      const scoreboard = await ESPN.getScoreboard(data.week);
      const teamScores = scoreboard.events
        .map((event) => event.competitions[0])
        .filter((c) => c.status.type.completed)
        .flatMap((c) => c.competitors)
        .map((c) => ({
          team: c.team.abbreviation,
          score: Number.parseInt(c.score, 10),
        }))
        .reduce((p, c) => ({ ...p, [c.team]: c.score }), {});

      logger.debug(`applying team scores`, teamScores);
      data.games.forEach((game) => applyTeamScore(teamScores, game));
    } catch (error) {
      logger.warn(
        `Could not fetch ESPN data for week ${data.week}: ${error.message}`
      );
    }
  }

  function applyTeamScore(teamScores, game) {
    game.favoriteScore =
      teamScores[ESPN.ABBREVIATION_MAP[game.favoriteTeam][0]];
    game.underdogScore =
      teamScores[ESPN.ABBREVIATION_MAP[game.underdogTeam][0]];

    if (game.favoriteScore != undefined && !!game.underdogScore != undefined) {
      game.covered = game.underdogScore - game.favoriteScore < game.spread;
      game.winningTeam = game.covered ? game.favoriteTeam : game.underdogTeam;
      game.totalScore = game.favoriteScore + game.underdogScore;
      game.completed = true;
    }
  }

  /**
   * Go through player picks and mark wins/counts for any games that are provided.
   */
  function processPlayerPicks(data, logger) {
    data.playerPicks.forEach((playerPick, i) => {
      playerPick.points = 0;

      data.games.forEach((game, j) => {
        if (
          game.completed &&
          data.playerPicks[i].picks[j].team === data.games[j].winningTeam
        ) {
          playerPick.picks[j].covered = true;
          playerPick.points += data.playerPicks[i].picks[j].threePoint ? 3 : 1;
        }
      });
    });
  }

  /**
   * Player picks are on the left side of the sheet.
   */
  function playerPicks(worksheet, rules, logger) {
    let playerPicks = [];

    const startGamesCell = addressToXlsx(rules.games[0]);
    const startStandingsCell = addressToXlsx(rules.standings[0]);
    const maxGames = startStandingsCell.r - startGamesCell.r;

    // Helper: if the configured start column is empty (some sheets move the second
    // block one column right), try to find the actual first non-empty column within
    // a small search window to the right.
    function findActualStartColumn(worksheet, startCell, maxOffset = 6) {
      for (let offset = 0; offset <= maxOffset; offset++) {
        const probe = { c: startCell.c + offset, r: startCell.r };
        const cell = worksheet[xlsxToKey(probe)];
        if (cell && cell.v !== undefined && String(cell.v).trim() !== "") {
          return probe;
        }
      }
      return startCell;
    }

    rules.playerPicks.forEach((startRule) => {
      let startCell = addressToXlsx(startRule);

      // If the configured start column is empty, try to locate the actual start
      startCell = findActualStartColumn(worksheet, startCell, 8);

      let playerName;

      // Iterate across columns starting at the discovered column until we hit an
      // empty header cell (undefined)
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
      } else {
        // Some spreadsheets encode the tiebreak/points as strings like "*10*".
        // Treat cells that are numeric or wrapped in single asterisks as numeric points,
        // not as team picks. Also accept numbers and fractional scores matched by SCORE_REGEX.
        const rawVal = pickCell.v;
        const rawStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
        const starNumberMatch = /^\*?\s*(\d+(?:\.\d+)?)(?:\s*\*)?$/.test(rawStr);
        const isNumericCell = pickCell.t === "n" || SCORE_REGEX.test(rawStr) || starNumberMatch;

        if (isNumericCell) {
          // Normalize numeric formats like "*10*" or "10 1/2" into a number
          let score;
          if (pickCell.t === "n") {
            score = pickCell.v;
          } else {
            // remove surrounding asterisks and whitespace, then convert fractions like 1/2
            const cleaned = rawStr.replace(/\*/g, "").trim();
            score = convertScore(cleaned);
          }
          points.push(score);
        } else {
          undefinedCount = 0;
          picks.push({
            team: rawStr.replace("**", ""),
            threePoint: rawStr.includes("**"),
          });
        }
      }

      cell = { c: cell.c, r: ++cell.r };
    }

    return {
      tieBreak: points.splice(-1)[0],
      picks,
    };
  }

  /**
   * Detect the start column for the games block by probing nearby columns for
   * a cell that matches GAMES_REG. Returns an object with startCell and
   * maxCell for consumers.
   */
  function detectGamesStartColumn(worksheet, rules, logger, maxOffset = 8, probeRows = 20) {
    const startCell = addressToXlsx(rules.games[0]);
    const maxCell = addressToXlsx(rules.standings[0]);

    for (let offset = 0; offset <= maxOffset; offset++) {
      const probeCol = startCell.c + offset;
      for (let r = startCell.r; r < startCell.r + probeRows && r < maxCell.r; r++) {
        const probeKey = xlsxToKey({ c: probeCol, r });
        const probeCell = worksheet[probeKey];
        if (probeCell && typeof probeCell.v === 'string' && GAMES_REG.test(probeCell.v)) {
          logger.debug(`Detected games column at ${String.fromCharCode(65 + probeCol)} (offset ${offset}) by matching GAMES_REG on row ${r + 1}`);
          return { startCell: { c: probeCol, r: startCell.r }, maxCell };
        }
      }
    }

    // Fallback to configured addresses
    return { startCell, maxCell };
  }

  /**
   * Games are located in the top right portion of the sheet.
   */
  function games(worksheet, rules, logger) {
    logger.debug(`Processing current week games/spread.`);
    let games = [];
    // detect the games start column (may shift between files/years)
    const detected = detectGamesStartColumn(worksheet, rules, logger);
    let cell = detected.startCell;
    let maxCell = detected.maxCell;
    let undefinedCount = 0;

    // Attempt to locate the true start column for games in case sheets shifted columns
    cell = cell || addressToXlsx(rules.games[0]);
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
   * Standings are located in the lower right portion of the Sheet.
   */
  function standings(worksheet, rules, logger) {
    logger.info(`Processing standings from worksheet`);

    let standings = [];
    // Use the same columns detected for games. If detection fails, fall back
    // to the configured standings address.
    const detected = detectGamesStartColumn(worksheet, rules, logger);
    // If detection found a start column, use that column; otherwise use the
    // configured standings cell column.
    const configuredStandings = addressToXlsx(rules.standings[0]);
    let cell = configuredStandings;
    if (detected && detected.startCell) {
      // We want to find the row that contains the "Standings" header and then
      // start parsing player rows below it. Search a small window starting at
      // the configured standings row downwards to locate the header.
      const searchStartRow = Math.max(configuredStandings.r - 2, 0);
      const searchEndRow = Math.min(configuredStandings.r + 40, detected.maxCell.r || configuredStandings.r + 40);
      let foundRow = null;
      for (let r = searchStartRow; r <= searchEndRow; r++) {
        const probeKey = xlsxToKey({ c: detected.startCell.c, r });
        const probeCell = worksheet[probeKey];
        if (probeCell && typeof probeCell.v === 'string' && /\bStandings\b/i.test(probeCell.v)) {
          logger.debug(`Found Standings header at ${probeKey} (row ${r + 1})`);
          foundRow = r;
          break;
        }
      }

      // If we found the header, start at the next row in the detected column.
      if (foundRow !== null) {
        cell = { c: detected.startCell.c, r: foundRow + 1 };
      } else {
        // Otherwise fall back to using the detected column at the configured row
        cell = { c: detected.startCell.c, r: configuredStandings.r };
      }

      // If the first row after the header is a summary line like "after week X",
      // skip it. This avoids adding the "after week X" row as a player.
      try {
        const firstKey = xlsxToKey(cell);
        const firstCell = worksheet[firstKey];
        if (firstCell && typeof firstCell.v === 'string' && /\bafter\s+week\b/i.test(firstCell.v)) {
          logger.debug(`Skipping summary row '${firstCell.v}' at ${firstKey}`);
          cell = { c: cell.c, r: cell.r + 1 };
        }
      } catch (e) {
        // if anything goes wrong probing the cell, continue parsing normally
        logger.debug(`Error while probing for summary row: ${e.message}`);
      }
    }
    let player;
    while ((player = worksheet[xlsxToKey(cell)]) !== undefined) {
      const position = worksheet[xlsxToKey({ c: cell.c - 1, r: cell.r })];
      const points = worksheet[xlsxToKey({ c: cell.c + 1, r: cell.r })];
      // Some cells may contain non-string values (numbers, dates, etc.). Coerce to string
      // before running the PLAYER_REG match to avoid TypeErrors like "player.v.match is not a function".
      let rawPlayer = player.v;
      if (rawPlayer === undefined || rawPlayer === null) {
        logger.warn(`Empty player cell at ${xlsxToKey(cell)}; stopping standings parse.`);
        break;
      }
      if (typeof rawPlayer !== "string") rawPlayer = String(rawPlayer);

      const parsedPlayer = rawPlayer.match(PLAYER_REG);
      if (!parsedPlayer) {
        logger.warn(`Unable to parse player name "${rawPlayer}" at ${xlsxToKey(cell)}; skipping.`);
        cell = { c: cell.c, r: cell.r + 1 };
        continue;
      }

      logger.info(`Processing player ${parsedPlayer.toString()}`);
      standings.push({
        id: slugify(parsedPlayer[1]),
        name: parsedPlayer[1],
        position: position && position.v,
        points: points && points.v,
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
 */
function addressToKey(address) {
  const cell = address.split(":");
  return `${cell[0]}${cell[1]}`;
}

/**
 * Converts XLSX `{ c: C, r: R }` to value "CR".
 */
function xlsxToKey(xlsx) {
  return `${String.fromCharCode(65 + xlsx.c)}${xlsx.r + 1}`;
}
