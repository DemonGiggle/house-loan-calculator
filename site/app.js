import { calculateBudget, formatCurrency, formatWan } from "./calculator.js";

const form = document.querySelector("#calculator-form");
const recommendedRange = document.querySelector("#recommendedRange");
const rangeSubtitle = document.querySelector("#rangeSubtitle");
const loanAmount = document.querySelector("#loanAmount");
const downPayment = document.querySelector("#downPayment");
const cashNeedLow = document.querySelector("#cashNeedLow");
const cashNeedHigh = document.querySelector("#cashNeedHigh");
const breakdown = document.querySelector("#breakdown");
const notes = document.querySelector("#notes");

function readForm() {
  const formData = new FormData(form);
  const checkbox = (name) => formData.get(name) === "on";

  return {
    priceWan: formData.get("price"),
    loanRatio: formData.get("loanRatio"),
    areaPing: formData.get("areaPing"),
    brokerFeeRate: formData.get("brokerFeeRate"),
    assessedValueRatio: formData.get("assessedValueRatio"),
    renovationLowPerPingWan: formData.get("renovationLowPerPing"),
    renovationHighPerPingWan: formData.get("renovationHighPerPing"),
    scrivenerFee: formData.get("scrivenerFee"),
    mortgageRegistrationRate: formData.get("mortgageRegistrationRate"),
    deedTaxRate: formData.get("deedTaxRate"),
    stampTaxRate: formData.get("stampTaxRate"),
    bankFees: formData.get("bankFees"),
    bufferRate: formData.get("bufferRate"),
    includeBrokerFee: checkbox("includeBrokerFee"),
    includeDeedTax: checkbox("includeDeedTax"),
    includeStampTax: checkbox("includeStampTax"),
    includeScrivenerFee: checkbox("includeScrivenerFee"),
    includeMortgageRegistration: checkbox("includeMortgageRegistration"),
    includeBankFees: checkbox("includeBankFees"),
    includeRenovation: checkbox("includeRenovation"),
    includeBuffer: checkbox("includeBuffer")
  };
}

function render() {
  const result = calculateBudget(readForm());

  recommendedRange.textContent = `${formatWan(result.totalLow)} ~ ${formatWan(result.totalHigh)}`;
  rangeSubtitle.textContent = `包含頭期款與目前勾選的稅費、房仲、裝潢與緩衝。`;
  loanAmount.textContent = formatCurrency(result.loanAmount);
  downPayment.textContent = formatCurrency(result.downPayment);
  cashNeedLow.textContent = formatCurrency(result.totalLow);
  cashNeedHigh.textContent = formatCurrency(result.totalHigh);

  breakdown.innerHTML = result.breakdown
    .map((item) => {
      const status = item.included ? "" : "（未納入）";
      const value = item.low === item.high
        ? formatWan(item.low)
        : `${formatWan(item.low)} ~ ${formatWan(item.high)}`;

      return `
        <div class="breakdown-row">
          <div>
            <strong>${item.label}</strong>
            <div class="sub">${status}</div>
          </div>
          <div class="breakdown-range">${value}</div>
        </div>
      `;
    })
    .join("");

  notes.innerHTML = result.notes.map((note) => `<li>${note}</li>`).join("");
}

form.addEventListener("input", render);
render();
