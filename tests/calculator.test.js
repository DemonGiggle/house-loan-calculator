import test from "node:test";
import assert from "node:assert/strict";

import { calculateBudget, normalizeInput } from "../site/calculator.js";

test("normalizeInput clamps loan ratio, keeps assessed value, and renovation range", () => {
  const input = normalizeInput({
    priceWan: "1500",
    loanRatio: "120",
    deedTaxInputMode: "direct",
    houseAssessedValueWan: "120",
    areaPing: "20",
    renovationLowPerPingWan: "8",
    renovationHighPerPingWan: "3",
    includeBrokerFee: true
  });

  assert.equal(input.loanRatio, 100);
  assert.equal(input.deedTaxInputMode, "direct");
  assert.equal(input.houseAssessedValueWan, 120);
  assert.equal(input.renovationLowPerPingWan, 8);
  assert.equal(input.renovationHighPerPingWan, 8);
  assert.equal(input.includeBrokerFee, true);
  assert.equal(input.includeBuffer, false);
});

test("normalizeInput derives loan ratio from loan amount mode", () => {
  const input = normalizeInput({
    priceWan: "1500",
    loanInputMode: "amount",
    loanAmountWan: "1200",
    mortgageAnnualRate: "2.35",
    mortgageYears: "30",
    mortgageRepaymentType: "equal-principal"
  });

  assert.equal(input.loanInputMode, "amount");
  assert.equal(input.loanAmountWan, 1200);
  assert.equal(input.loanRatio, 80);
  assert.equal(input.mortgageAnnualRate, 2.35);
  assert.equal(input.mortgageYears, 30);
  assert.equal(input.mortgageRepaymentType, "equal-principal");
});

test("calculateBudget uses direct assessed value when provided", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanInputMode: "ratio",
    deedTaxInputMode: "direct",
    loanRatio: 80,
    areaPing: 20,
    brokerFeeRate: 1,
    houseAssessedValueWan: 120,
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
  assert.equal(result.assessedValue, 1200000);
  assert.equal(result.assessedValueSource, "direct");
  assert.equal(result.totalLow, 2833600);
  assert.equal(result.totalHigh, 3233600);
  assert.match(result.notes[1], /房屋評定現值 120 萬/);
  assert.match(result.breakdown.find((item) => item.key === "deedTax").detail, /房屋評定現值 120 萬/);
});

test("calculateBudget falls back to estimated assessed value when direct value is missing", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanInputMode: "ratio",
    deedTaxInputMode: "estimated",
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

  assert.equal(result.assessedValue, 5000000);
  assert.equal(result.assessedValueSource, "estimated");
  assert.equal(result.totalLow, 3061600);
  assert.equal(result.totalHigh, 3461600);
  assert.match(result.notes[1], /總價的 50%/);
  assert.match(result.breakdown.find((item) => item.key === "deedTax").detail, /總價 × 50%/);
});

test("calculateBudget shows missing direct assessed value state", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanInputMode: "ratio",
    deedTaxInputMode: "direct",
    loanRatio: 80,
    areaPing: 20,
    brokerFeeRate: 1,
    houseAssessedValueWan: 0,
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
    includeDeedTax: true,
    includeStampTax: false,
    includeScrivenerFee: false,
    includeMortgageRegistration: false,
    includeBankFees: false,
    includeRenovation: false,
    includeBuffer: false
  });

  assert.equal(result.assessedValue, 0);
  assert.equal(result.assessedValueSource, "direct_missing");
  assert.equal(result.breakdown.find((item) => item.key === "deedTax").low, 0);
  assert.match(result.notes[1], /目前還沒輸入金額/);
});

test("calculateBudget supports loan amount mode", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanInputMode: "amount",
    loanAmountWan: 750,
    mortgageAnnualRate: 2.35,
    mortgageYears: 30,
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
  assert.equal(result.mortgage.months, 360);
  assert.equal(result.mortgage.principal, 7500000);
  assert.equal(result.mortgage.monthlyPayment, 29052);
  assert.equal(result.mortgage.totalInterest, 2958720);
  assert.equal(result.mortgage.totalPayment, 10458720);
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

test("calculateBudget supports zero-interest mortgage calculation", () => {
  const result = calculateBudget({
    priceWan: 600,
    loanRatio: 50,
    mortgageAnnualRate: 0,
    mortgageYears: 20,
    areaPing: 0,
    brokerFeeRate: 0,
    assessedValueRatio: 0,
    renovationLowPerPingWan: 0,
    renovationHighPerPingWan: 0,
    scrivenerFee: 0,
    mortgageRegistrationRate: 0,
    deedTaxRate: 0,
    stampTaxRate: 0,
    bankFees: 0,
    bufferRate: 0,
    includeBrokerFee: false,
    includeDeedTax: false,
    includeStampTax: false,
    includeScrivenerFee: false,
    includeMortgageRegistration: false,
    includeBankFees: false,
    includeRenovation: false,
    includeBuffer: false
  });

  assert.equal(result.mortgage.principal, 3000000);
  assert.equal(result.mortgage.monthlyPayment, 12500);
  assert.equal(result.mortgage.totalInterest, 0);
  assert.equal(result.mortgage.totalPayment, 3000000);
});

test("calculateBudget supports equal-principal mortgage calculation", () => {
  const result = calculateBudget({
    priceWan: 1000,
    loanRatio: 80,
    mortgageAnnualRate: 2.35,
    mortgageYears: 30,
    mortgageRepaymentType: "equal-principal",
    areaPing: 0,
    brokerFeeRate: 0,
    assessedValueRatio: 0,
    renovationLowPerPingWan: 0,
    renovationHighPerPingWan: 0,
    scrivenerFee: 0,
    mortgageRegistrationRate: 0,
    deedTaxRate: 0,
    stampTaxRate: 0,
    bankFees: 0,
    bufferRate: 0,
    includeBrokerFee: false,
    includeDeedTax: false,
    includeStampTax: false,
    includeScrivenerFee: false,
    includeMortgageRegistration: false,
    includeBankFees: false,
    includeRenovation: false,
    includeBuffer: false
  });

  assert.equal(result.mortgage.repaymentType, "equal-principal");
  assert.equal(result.mortgage.months, 360);
  assert.equal(result.mortgage.principal, 8000000);
  assert.equal(result.mortgage.monthlyPayment, 37889);
  assert.equal(result.mortgage.firstMonthlyPayment, 37889);
  assert.equal(result.mortgage.lastMonthlyPayment, 22266);
  assert.equal(result.mortgage.totalInterest, 2827833);
  assert.equal(result.mortgage.totalPayment, 10827833);
  assert.equal(result.mortgage.yearlyAverageMonthlyPayments.length, 30);
  assert.equal(result.mortgage.yearlyAverageMonthlyPayments[0].year, 1);
  assert.equal(result.mortgage.yearlyAverageMonthlyPayments[0].averageMonthlyPayment, 37650);
  assert.equal(result.mortgage.yearlyAverageMonthlyPayments.at(-1).year, 30);
  assert.equal(result.mortgage.yearlyAverageMonthlyPayments.at(-1).averageMonthlyPayment, 22505);
  assert.match(result.notes[3], /本金平均攤還/);
  assert.match(result.notes[3], /最後一期約 \$22,266/);
});
