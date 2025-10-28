const parsingRules = require('./xlsx-parsing-rules.json');
const parseSpreadPoolFile = require('./src/parse-spread-pools-data');
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

  // Custom extentions
  eleventyConfig.addDataExtension("xlsx", {
    parser: parseSpreadPoolFile(eleventyConfig),
    read: false
  });

  // Collection
  eleventyConfig.addCollection("spread_pool", spreadPoolsCollection);
  eleventyConfig.addCollection("players", playersCollection);

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
