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
  const loanAmount = price * percent(input.loanRatio);
  const downPayment = Math.max(price - loanAmount, 0);
  const assessedValue = price * percent(input.assessedValueRatio);

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
      included: input.includeDeedTax
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
    breakdown,
    totalLow: roundCurrency(totalLow),
    totalHigh: roundCurrency(totalHigh),
    renovationLow: roundCurrency(renovationLow),
    renovationHigh: roundCurrency(renovationHigh),
    notes: [
      `本試算用房屋總價 ${formatWan(price)} 與貸款成數 ${input.loanRatio}% 估算，基本頭期款為 ${formatWan(downPayment)}。`,
      `契稅以總價的 ${input.assessedValueRatio}% 作為估值基礎，再套用 ${input.deedTaxRate}% 稅率估算。`,
      `裝潢費以 ${input.areaPing} 坪、每坪 ${input.renovationLowPerPingWan}~${input.renovationHighPerPingWan} 萬估算。`,
      "若你想專注看簽約前現金準備，可取消裝潢或緩衝項目。"
    ]
  };
}

export function normalizeInput(rawInput) {
  const normalized = {
    priceWan: numberOrZero(rawInput.priceWan),
    loanRatio: clamp(numberOrZero(rawInput.loanRatio), 0, 100),
    areaPing: numberOrZero(rawInput.areaPing),
    brokerFeeRate: numberOrZero(rawInput.brokerFeeRate),
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

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
