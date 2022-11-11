const Fetch11ty = require('@11ty/eleventy-fetch');

// https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams
// TODO: make this dynamic if possible, but Jimbo's naming is custom
const ABBREVIATION_MAP = {
    "ARZ": ["ARI", "ARIZONA"],
    "ATL": ["ATL", "ATLANTA"],
    "BALT": ["BAL", "BALTIMORE"],
    "BUFF": ["BUF", "BUFFALO"],
    "CAR": ["CAR", "CAROLINA"],   
    "CHI": ["CHI", "CHICAGO"],
    "CIN": ["CIN", "CINCINNATI"],
    "CLEV": ["CLE", "CLEV", "CLEVELAND"],  
    "BOYS": ["DAL", "BOYS", "DALLAS"], 
    "DEN": ["DEN", "DENVER"],
    "DET": ["DET", "DETROIT"],
    "G.B.": ["GB", "GREEN BAY"],
    "HOU": ["HOU", "HOUSTON"],
    "INDY": ["IND", "INDIANAPOLIS"],
    "JAX": ["JAX", "JACKSONVILLE"],
    "K.C.": ["KC", "KANSAS CITY"],    
    "LVR": ["LV"],    
    "LAC": ["LAC", "LOS ANGELES", "CHARGERS"],     
    "RAMS": ["LAR", "LOS ANGELES", "RAMS"],
    "MIA": ["MIA", "MIAMI"],
    "MIN": ["MIN", "MINNESOTA"],
    "N.E.": ["NE", "NEW ENGLAND"],
    "N.O.": ["NO", "NEW ORLEANS"],        
    "NYG": ["NYG", "NEW YORK"],
    "NYJ": ["NYJ", "NEW YORK"],
    "PHIL": ["PHI", "PHILADELPHIA"],    
    "PITT": ["PIT", "PITTSBURGH"],    
    "S.F.": ["SF", "SAN FRANSISCO"],    
    "SEA": ["SEA", "SEATTLE"],
    "T.B.": ["TB", "TAMPA BAY"],
    "TEN": ["TEN", "TENNESSEE"],
    "WASH": ["WSH", "WASHINGTON"],                
};

const getAbbreviations = (game) => {
    return (ABBREVIATION_MAP[game.team1] && ABBREVIATION_MAP[game.team2])
        ? [...ABBREVIATION_MAP[game.team1], ...ABBREVIATION_MAP[game.team2]]
        : [];
};

const isMatch = (game, lookups) => {
    const abbrs = getAbbreviations(game);    
    return lookups.filter(f => abbrs.includes(f)).length > 0;
}; 

const SCOREBOARD_URI = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;

const getScoreboard = async (week, fetchOptions) => await Fetch11ty(
    `${SCOREBOARD_URI}${week && `?week=${week}`}`,
    {
        duration: '4h',
        type: 'json',
        ...fetchOptions
    }
);

module.exports= {
    ABBREVIATION_MAP,
    getAbbreviations,
    isMatch,
    getScoreboard,
} 