const parsingRules = require('./xlsx-parsing-rules.json');
const loadSpreadPoolsData = require('./src/load-spread-pools-data');
const spreadPoolsCollection = require('./src/collections/spread-pools-collection');
const eleventyNavigationPlugin = require('@11ty/eleventy-navigation');
const classIfMatch = require('./src/filters/class-if-match');
const jsonFilters = require('./src/filters/json');
const playersCollection = require('./src/collections/players-collection');
const ordinalFilter = require('./src/filters/ordinal');
const playerFilters = require('./src/filters/player');
const htmlMinify = require('./src/transforms/html-minify');

module.exports = function(eleventyConfig) {
  // Production
  if (process.env.NODE_ENV === 'production') {
    eleventyConfig.addTransform("htmlmin", htmlMinify);
  }

  // Plugins
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Passthroughs
  eleventyConfig.addPassthroughCopy("content/**/*.css");
  eleventyConfig.addPassthroughCopy("content/CNAME");

  // Global data - there's got to be a better way
  eleventyConfig.addGlobalData("xlsxParsingRules", parsingRules);
  eleventyConfig.addGlobalData("spreadPoolData", loadSpreadPoolsData(eleventyConfig));

  // Filters
  eleventyConfig.addFilter("toJson", jsonFilters.toJson);
  eleventyConfig.addFilter("fromJson", jsonFilters.fromJson);
  eleventyConfig.addFilter("classIfMatch", classIfMatch);
  eleventyConfig.addFilter("threePoint", playerFilters.threePoint);
  eleventyConfig.addFilter("playerUrl", playerFilters.playerUrl);
  eleventyConfig.addFilter("weekUrl", playerFilters.weekUrl);
  eleventyConfig.addFilter("ordinal", ordinalFilter);

  // Collection
  eleventyConfig.addCollection("spread_pool", spreadPoolsCollection);
  eleventyConfig.addCollection("players", playersCollection);

  // Per-year collection derived from spread_pool
  eleventyConfig.addCollection("spread_years", function(collectionsApi) {
    // Reuse the spreadPoolsCollection logic to get normalized week entries
    const spread = spreadPoolsCollection(collectionsApi) || [];
    // Group weeks by year
    const byYear = {};
    spread.forEach((w) => {
      const y = w.year;
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(w);
    });

    // Build array of year objects with weeks sorted desc and latestWeek
    const years = Object.keys(byYear).map((y) => {
      const weeks = byYear[y].sort((a, b) => b.week - a.week);
      return { year: parseInt(y, 10), weeks, latestWeek: weeks[0] };
    });

    // Sort years descending
    years.sort((a, b) => b.year - a.year);
    return years;
  });

  return {
    passthroughFileCopy: true,
    dir: {
      input: "content",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
