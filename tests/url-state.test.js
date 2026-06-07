import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SHARE_STATE,
  buildShareQuery,
  buildShareUrl,
  parseShareStateFromSearch,
  parseViewFromSearch
} from "../site/url-state.js";

test("buildShareQuery includes report view and explicit boolean fields", () => {
  const query = buildShareQuery({
    ...DEFAULT_SHARE_STATE,
    priceWan: "1888",
    includeBrokerFee: false,
    includeRenovation: false
  }, "report");

  const params = new URLSearchParams(query);
  assert.equal(params.get("view"), "report");
  assert.equal(params.get("priceWan"), "1888");
  assert.equal(params.get("includeBrokerFee"), "0");
  assert.equal(params.get("includeRenovation"), "0");
});

test("buildShareUrl uses provided pathname and query", () => {
  const url = buildShareUrl(
    { ...DEFAULT_SHARE_STATE, mortgageYears: "40" },
    "edit",
    { pathname: "/site/index.html" }
  );

  assert.match(url, /^\/site\/index\.html\?/);
  assert.match(url, /mortgageYears=40/);
  assert.doesNotMatch(url, /view=report/);
});

test("buildShareUrl switches to report.html for report view", () => {
  const url = buildShareUrl(
    { ...DEFAULT_SHARE_STATE, mortgageRepaymentType: "equal-principal" },
    "report",
    { pathname: "/site/index.html" }
  );

  assert.match(url, /^\/site\/report\.html\?/);
  assert.match(url, /view=report/);
  assert.match(url, /mortgageRepaymentType=equal-principal/);
});

test("parseShareStateFromSearch restores booleans and valid enum values", () => {
  const state = parseShareStateFromSearch(
    "?loanInputMode=amount&mortgageRepaymentType=equal-principal&deedTaxInputMode=direct&includeBrokerFee=0&includeBuffer=true&priceWan=2000"
  );

  assert.equal(state.loanInputMode, "amount");
  assert.equal(state.mortgageRepaymentType, "equal-principal");
  assert.equal(state.deedTaxInputMode, "direct");
  assert.equal(state.includeBrokerFee, false);
  assert.equal(state.includeBuffer, true);
  assert.equal(state.priceWan, "2000");
});

test("parseShareStateFromSearch falls back for invalid enum values", () => {
  const state = parseShareStateFromSearch(
    "?loanInputMode=weird&mortgageRepaymentType=nope&deedTaxInputMode=other"
  );

  assert.equal(state.loanInputMode, DEFAULT_SHARE_STATE.loanInputMode);
  assert.equal(state.mortgageRepaymentType, DEFAULT_SHARE_STATE.mortgageRepaymentType);
  assert.equal(state.deedTaxInputMode, DEFAULT_SHARE_STATE.deedTaxInputMode);
});

test("parseViewFromSearch only enables report mode for explicit report view", () => {
  assert.equal(parseViewFromSearch("?view=report"), "report");
  assert.equal(parseViewFromSearch("?view=edit"), "edit");
  assert.equal(parseViewFromSearch("?priceWan=1000"), "edit");
});
