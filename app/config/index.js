const brand = process.env.APP_BRAND || "maxEstate";

console.log("CURRENT BRAND:", brand);

let selectedBrand;

switch (brand) {
  case "enviro":
    selectedBrand = require("./enviro").default;
    break;

  case "maxestate":
    selectedBrand = require("./maxEstate").default;
    break;

  case "isociety":
    selectedBrand = require("./isociety").default;
    break;

  case "jaypee":
  default:
    selectedBrand = require("./maxEstate").default;
}

export default selectedBrand;