const parsingRules = require('./xlsx-parsing-rules.json');
const parseSpreadPoolFile = require('./src/parse-spread-pools-data');
const spreadPoolsCollection = require('./src/collections/spread-pools-collection');
const eleventyNavigationPlugin = require('@11ty/eleventy-navigation');
const classIfMatch = require('./src/filters/class-if-match');
const jsonFilters = require('./src/filters/json');

module.exports = function(eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Passthroughs
  eleventyConfig.addPassthroughCopy("content/**/*.css");

  // Global data - there's got to be a better way
  eleventyConfig.addGlobalData("xlsxParsingRules", parsingRules);

  // Filters
  eleventyConfig.addFilter("toJson", jsonFilters.toJson);
  eleventyConfig.addFilter("fromJson", jsonFilters.fromJson);
  eleventyConfig.addFilter("classIfMatch", classIfMatch);
  eleventyConfig.addFilter("threePoint", value => value ? '**' : '');

  // Custom extentions
  eleventyConfig.addDataExtension("xlsx", {
    parser: parseSpreadPoolFile(eleventyConfig),
    read: false
  });

  // Collection
  eleventyConfig.addCollection("spread_pool", spreadPoolsCollection);

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
