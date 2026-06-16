export const DEFAULT_SHARE_STATE = {
  priceWan: "1500",
  loanInputMode: "ratio",
  loanRatio: "80",
  loanAmountWan: "1200",
  mortgageAnnualRate: "2.35",
  mortgageYears: "30",
  mortgageRepaymentType: "equal-payment",
  deedTaxInputMode: "estimated",
  areaPing: "25",
  brokerFeeRate: "2",
  houseAssessedValueWan: "",
  assessedValueRatio: "35",
  renovationLowPerPingWan: "3",
  renovationHighPerPingWan: "8",
  contractFee: "1000",
  transferScrivenerFee: "14000",
  realPriceRegistrationFee: "2000",
  mortgageScrivenerFee: "5000",
  performanceBondRate: "0.03",
  mortgageRegistrationRate: "0.12",
  deedTaxRate: "6",
  stampTaxAmount: "0",
  bankFees: "12000",
  fireInsuranceFees: "2000",
  bufferRate: "2",
  includeBrokerFee: true,
  includeDeedTax: true,
  includeStampTax: true,
  includeScrivenerFee: true,
  includePerformanceBond: true,
  includeMortgageRegistration: true,
  includeBankFees: true,
  includeFireInsurance: true,
  includeRenovation: true,
  includeBuffer: true
};

const BOOLEAN_KEYS = new Set([
  "includeBrokerFee",
  "includeDeedTax",
  "includeStampTax",
  "includeScrivenerFee",
  "includePerformanceBond",
  "includeMortgageRegistration",
  "includeBankFees",
  "includeFireInsurance",
  "includeRenovation",
  "includeBuffer"
]);

const ENUM_OPTIONS = {
  loanInputMode: new Set(["ratio", "amount"]),
  mortgageRepaymentType: new Set(["equal-payment", "equal-principal"]),
  deedTaxInputMode: new Set(["estimated", "direct"])
};

const VIEW_PATHS = {
  edit: "index.html",
  report: "report.html"
};

const SHARE_STATE_TO_FORM_FIELD = {
  priceWan: "price",
  renovationLowPerPingWan: "renovationLowPerPing",
  renovationHighPerPingWan: "renovationHighPerPing"
};

export function buildShareQuery(state, view = "edit") {
  const params = new URLSearchParams();

  if (view === "report") {
    params.set("view", "report");
  }

  for (const [key, defaultValue] of Object.entries(DEFAULT_SHARE_STATE)) {
    const value = state?.[key];
    if (BOOLEAN_KEYS.has(key)) {
      params.set(key, value ? "1" : "0");
      continue;
    }

    params.set(key, value == null ? String(defaultValue) : String(value));
  }

  return params.toString();
}

export function buildShareUrl(state, view = "edit", locationLike = window.location) {
  const query = buildShareQuery(state, view);
  const pathname = resolvePathnameForView(locationLike.pathname, view);
  return `${pathname}?${query}`;
}

export function parseShareStateFromSearch(search) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const state = { ...DEFAULT_SHARE_STATE };

  for (const [key, defaultValue] of Object.entries(DEFAULT_SHARE_STATE)) {
    if (!params.has(key)) {
      continue;
    }

    const rawValue = params.get(key);
    if (BOOLEAN_KEYS.has(key)) {
      state[key] = rawValue === "1" || rawValue === "true";
      continue;
    }

    if (key in ENUM_OPTIONS) {
      state[key] = ENUM_OPTIONS[key].has(rawValue) ? rawValue : defaultValue;
      continue;
    }

    state[key] = rawValue ?? defaultValue;
  }

  return state;
}

export function parseViewFromSearch(search) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("view") === "report" ? "report" : "edit";
}

export function mapShareStateKeyToFormField(key) {
  return SHARE_STATE_TO_FORM_FIELD[key] || key;
}

function resolvePathnameForView(pathname = "", view = "edit") {
  const filename = VIEW_PATHS[view] || VIEW_PATHS.edit;

  if (!pathname) {
    return `/${filename}`;
  }

  if (pathname.endsWith("/")) {
    return `${pathname}${filename}`;
  }

  return pathname.replace(/[^/]*$/, filename);
}
