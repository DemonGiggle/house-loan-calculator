const percent = (value) => value / 100;

const roundCurrency = (value) => Math.round(value);

export function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(roundCurrency(value));
}

export function formatWan(value) {
  return `${new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: value >= 100000 ? 0 : 1
  }).format(value / 10000)} 萬`;
}

export function calculateBudget(rawInput) {
  const input = normalizeInput(rawInput);
  const price = input.priceWan * 10000;
  const loanAmount = resolveLoanAmount(input, price);
  const downPayment = Math.max(price - loanAmount, 0);
  const { assessedValue, assessedValueSource } = resolveAssessedValue(input, price);

  const renovationLow = input.areaPing * input.renovationLowPerPingWan * 10000;
  const renovationHigh = input.areaPing * input.renovationHighPerPingWan * 10000;

  const breakdown = [
    {
      key: "downPayment",
      label: "基本頭期款",
      low: downPayment,
      high: downPayment,
      included: true
    },
    {
      key: "brokerFee",
      label: "房仲服務費",
      low: price * percent(input.brokerFeeRate),
      high: price * percent(input.brokerFeeRate),
      included: input.includeBrokerFee
    },
    {
      key: "deedTax",
      label: "契稅",
      low: assessedValue * percent(input.deedTaxRate),
      high: assessedValue * percent(input.deedTaxRate),
      included: input.includeDeedTax,
      detail: assessedValueSource === "direct"
        ? `房屋評定現值 ${formatWan(assessedValue)} × ${input.deedTaxRate}%`
        : assessedValueSource === "direct_missing"
          ? "已選擇房屋評定現值模式，請先輸入金額"
          : `快速估算：總價 × ${input.assessedValueRatio}% = ${formatWan(assessedValue)}`
    },
    {
      key: "stampTax",
      label: "印花稅",
      low: price * percent(input.stampTaxRate),
      high: price * percent(input.stampTaxRate),
      included: input.includeStampTax
    },
    {
      key: "scrivenerFee",
      label: "代書 / 設定固定費",
      low: input.scrivenerFee,
      high: input.scrivenerFee,
      included: input.includeScrivenerFee
    },
    {
      key: "mortgageRegistration",
      label: "貸款設定規費",
      low: loanAmount * percent(input.mortgageRegistrationRate),
      high: loanAmount * percent(input.mortgageRegistrationRate),
      included: input.includeMortgageRegistration
    },
    {
      key: "bankFees",
      label: "銀行開辦 / 鑑價費",
      low: input.bankFees,
      high: input.bankFees,
      included: input.includeBankFees
    },
    {
      key: "renovation",
      label: "裝潢預估",
      low: renovationLow,
      high: renovationHigh,
      included: input.includeRenovation
    },
    {
      key: "buffer",
      label: "預留緩衝",
      low: price * percent(input.bufferRate),
      high: price * percent(input.bufferRate),
      included: input.includeBuffer
    }
  ];

  const includedItems = breakdown.filter((item) => item.included);
  const totalLow = includedItems.reduce((sum, item) => sum + item.low, 0);
  const totalHigh = includedItems.reduce((sum, item) => sum + item.high, 0);

  return {
    input,
    price,
    loanAmount,
    downPayment,
    assessedValue,
    assessedValueSource,
    breakdown,
    totalLow: roundCurrency(totalLow),
    totalHigh: roundCurrency(totalHigh),
    renovationLow: roundCurrency(renovationLow),
    renovationHigh: roundCurrency(renovationHigh),
    notes: [
      input.loanInputMode === "amount"
        ? `本試算用房屋總價 ${formatWan(price)} 與貸款金額 ${formatWan(loanAmount)} 估算，對應貸款成數約 ${input.loanRatio.toFixed(1)}%，基本頭期款為 ${formatWan(downPayment)}。`
        : `本試算用房屋總價 ${formatWan(price)} 與貸款成數 ${input.loanRatio}% 估算，基本頭期款為 ${formatWan(downPayment)}。`,
      assessedValueSource === "direct"
        ? `契稅已直接用房屋評定現值 ${formatWan(assessedValue)} 計算，再套用 ${input.deedTaxRate}% 稅率估算。`
        : assessedValueSource === "direct_missing"
          ? "你已切到房屋評定現值模式，但目前還沒輸入金額，所以契稅暫時顯示為 0。"
          : `你目前使用快速估算模式，因此契稅先以總價的 ${input.assessedValueRatio}% 推估為 ${formatWan(assessedValue)}，再套用 ${input.deedTaxRate}% 稅率估算。`,
      `裝潢費以 ${input.areaPing} 坪、每坪 ${input.renovationLowPerPingWan}~${input.renovationHighPerPingWan} 萬估算。`,
      "若你想專注看簽約前現金準備，可取消裝潢或緩衝項目。"
    ]
  };
}

export function normalizeInput(rawInput) {
  const priceWan = numberOrZero(rawInput.priceWan);
  const loanInputMode = rawInput.loanInputMode === "amount" ? "amount" : "ratio";
  const deedTaxInputMode = resolveDeedTaxInputMode(rawInput);
  const rawLoanAmountWan = numberOrZero(rawInput.loanAmountWan);
  const cappedLoanAmountWan = priceWan > 0 ? Math.min(rawLoanAmountWan, priceWan) : rawLoanAmountWan;
  const derivedLoanRatio = priceWan > 0 ? (cappedLoanAmountWan / priceWan) * 100 : 0;

  const normalized = {
    priceWan,
    loanInputMode,
    deedTaxInputMode,
    loanAmountWan: cappedLoanAmountWan,
    loanRatio: loanInputMode === "amount"
      ? clamp(derivedLoanRatio, 0, 100)
      : clamp(numberOrZero(rawInput.loanRatio), 0, 100),
    areaPing: numberOrZero(rawInput.areaPing),
    brokerFeeRate: numberOrZero(rawInput.brokerFeeRate),
    houseAssessedValueWan: numberOrZero(rawInput.houseAssessedValueWan),
    assessedValueRatio: clamp(numberOrZero(rawInput.assessedValueRatio), 0, 100),
    renovationLowPerPingWan: numberOrZero(rawInput.renovationLowPerPingWan),
    renovationHighPerPingWan: numberOrZero(rawInput.renovationHighPerPingWan),
    scrivenerFee: numberOrZero(rawInput.scrivenerFee),
    mortgageRegistrationRate: numberOrZero(rawInput.mortgageRegistrationRate),
    deedTaxRate: numberOrZero(rawInput.deedTaxRate),
    stampTaxRate: numberOrZero(rawInput.stampTaxRate),
    bankFees: numberOrZero(rawInput.bankFees),
    bufferRate: numberOrZero(rawInput.bufferRate),
    includeBrokerFee: Boolean(rawInput.includeBrokerFee),
    includeDeedTax: Boolean(rawInput.includeDeedTax),
    includeStampTax: Boolean(rawInput.includeStampTax),
    includeScrivenerFee: Boolean(rawInput.includeScrivenerFee),
    includeMortgageRegistration: Boolean(rawInput.includeMortgageRegistration),
    includeBankFees: Boolean(rawInput.includeBankFees),
    includeRenovation: Boolean(rawInput.includeRenovation),
    includeBuffer: Boolean(rawInput.includeBuffer)
  };

  if (normalized.renovationHighPerPingWan < normalized.renovationLowPerPingWan) {
    normalized.renovationHighPerPingWan = normalized.renovationLowPerPingWan;
  }

  return normalized;
}

function resolveLoanAmount(input, price) {
  if (input.loanInputMode === "amount") {
    return input.loanAmountWan * 10000;
  }

  return price * percent(input.loanRatio);
}

function resolveAssessedValue(input, price) {
  if (input.deedTaxInputMode === "direct") {
    if (input.houseAssessedValueWan > 0) {
      return {
        assessedValue: input.houseAssessedValueWan * 10000,
        assessedValueSource: "direct"
      };
    }

    return {
      assessedValue: 0,
      assessedValueSource: "direct_missing"
    };
  }

  return {
    assessedValue: price * percent(input.assessedValueRatio),
    assessedValueSource: "estimated"
  };
}

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function resolveDeedTaxInputMode(rawInput) {
  if (rawInput.deedTaxInputMode === "direct" || rawInput.deedTaxInputMode === "estimated") {
    return rawInput.deedTaxInputMode;
  }

  return numberOrZero(rawInput.houseAssessedValueWan) > 0 ? "direct" : "estimated";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
