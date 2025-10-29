const slugify = require("slugify");
const slugOpts = {
  replacement: "-",
  lower: true,
  strict: true,
  remove: /[*+~.()'"!:@]/g,
};

const playerUrl = (player) => `/players/${slugify(player.id, slugOpts)}`;
const weekUrl = (week) => `/${week.year}/week/${week.week}`;
const threePoint = (value) => (value ? "**" : "");
const slugifyOpts = (value) => slugify(value, slugOpts);

module.exports = {
  playerUrl,
  weekUrl,
  threePoint,
  slugify: slugifyOpts,
};
