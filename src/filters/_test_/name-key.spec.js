const namekey = require("../name-key");

describe("name filter", () => {
  test("should uppercase", () => {
    const input = "ken";
    const output = namekey(input);

    expect(output).toEqual("KEN");
  });

  test("it should trim spaces", () => {
    const input = " ken ";
    const output = namekey(input);

    expect(output).toEqual("KEN");
  });

  test("it should replace `- ` with `-`", () => {
    const input = "ken- davidson";
    const output = namekey(input);

    expect(output).toEqual("KEN-DAVIDSON");
  });

  test("it should replace non words, digits, ', '_', '-'' with '_'", () => {
    const input = "ken!#`davidson";
    const output = namekey(input);

    expect(output).toEqual("KEN__DAVIDSON");
  });
});
