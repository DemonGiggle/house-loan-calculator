import test from "node:test";
import assert from "node:assert/strict";

import { calculateBudget, normalizeInput } from "../site/calculator.js";

test("normalizeInput clamps loan ratio and renovation range", () => {
  const input = normalizeInput({
    priceWan: "1500",
    loanRatio: "120",
    areaPing: "20",
    renovationLowPerPingWan: "8",
    renovationHighPerPingWan: "3",
    includeBrokerFee: true
  });

  assert.equal(input.loanRatio, 100);
  assert.equal(input.renovationLowPerPingWan, 8);
  assert.equal(input.renovationHighPerPingWan, 8);
  assert.equal(input.includeBrokerFee, true);
  assert.equal(input.includeBuffer, false);
});

test("normalizeInput derives loan ratio from loan amount mode", () => {
  const input = normalizeInput({
    priceWan: "1500",
    loanInputMode: "amount",
    loanAmountWan: "1200"
  });

  assert.equal(input.loanInputMode, "amount");
  assert.equal(input.loanAmountWan, 1200);
  assert.equal(input.loanRatio, 80);
});

test("calculateBudget includes selected cost items in range", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanInputMode: "ratio",
    loanRatio: 80,
    areaPing: 20,
    brokerFeeRate: 1,
    assessedValueRatio: 50,
    renovationLowPerPingWan: 2,
    renovationHighPerPingWan: 4,
    scrivenerFee: 30000,
    mortgageRegistrationRate: 0.12,
    deedTaxRate: 6,
    stampTaxRate: 0.1,
    bankFees: 12000,
    bufferRate: 2,
    includeBrokerFee: true,
    includeDeedTax: true,
    includeStampTax: true,
    includeScrivenerFee: true,
    includeMortgageRegistration: true,
    includeBankFees: true,
    includeRenovation: true,
    includeBuffer: true
  });

  assert.equal(result.loanAmount, 8000000);
  assert.equal(result.downPayment, 2000000);
  assert.equal(result.totalLow, 3061600);
  assert.equal(result.totalHigh, 3461600);
});

test("calculateBudget supports loan amount mode", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanInputMode: "amount",
    loanAmountWan: 750,
    areaPing: 20,
    brokerFeeRate: 1,
    assessedValueRatio: 50,
    renovationLowPerPingWan: 2,
    renovationHighPerPingWan: 4,
    scrivenerFee: 30000,
    mortgageRegistrationRate: 0.12,
    deedTaxRate: 6,
    stampTaxRate: 0.1,
    bankFees: 12000,
    bufferRate: 2,
    includeBrokerFee: false,
    includeDeedTax: false,
    includeStampTax: false,
    includeScrivenerFee: false,
    includeMortgageRegistration: false,
    includeBankFees: false,
    includeRenovation: false,
    includeBuffer: false
  });

  assert.equal(result.loanAmount, 7500000);
  assert.equal(result.downPayment, 2500000);
  assert.equal(result.input.loanRatio, 75);
  assert.equal(result.totalLow, 2500000);
  assert.equal(result.totalHigh, 2500000);
});

test("calculateBudget can exclude optional fees", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanRatio: 80,
    areaPing: 20,
    brokerFeeRate: 1,
    assessedValueRatio: 50,
    renovationLowPerPingWan: 2,
    renovationHighPerPingWan: 4,
    scrivenerFee: 30000,
    mortgageRegistrationRate: 0.12,
    deedTaxRate: 6,
    stampTaxRate: 0.1,
    bankFees: 12000,
    bufferRate: 2,
    includeBrokerFee: false,
    includeDeedTax: false,
    includeStampTax: false,
    includeScrivenerFee: false,
    includeMortgageRegistration: false,
    includeBankFees: false,
    includeRenovation: false,
    includeBuffer: false
  });

  assert.equal(result.totalLow, 2000000);
  assert.equal(result.totalHigh, 2000000);
});
