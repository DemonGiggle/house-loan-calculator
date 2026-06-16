import { calculateBudget, formatCurrency, formatWan } from "./calculator.js?v=20260616a";
import { buildShareUrl, parseShareStateFromSearch } from "./url-state.js?v=20260616a";

const reportSummary = document.querySelector("#reportSummary");
const reportRecommendedRange = document.querySelector("#reportRecommendedRange");
const reportRangeSubtitle = document.querySelector("#reportRangeSubtitle");
const reportKeyStats = document.querySelector("#reportKeyStats");
const reportInputSummary = document.querySelector("#reportInputSummary");
const reportMortgageSummary = document.querySelector("#reportMortgageSummary");
const reportBreakdown = document.querySelector("#reportBreakdown");
const reportNotes = document.querySelector("#reportNotes");
const mortgageChartCard = document.querySelector("#mortgageChartCard");
const mortgageChart = document.querySelector("#mortgageChart");
const editReportButton = document.querySelector("#editReportButton");
const copyReportLinkButton = document.querySelector("#copyReportLinkButton");
const mortgageRepaymentInputs = document.querySelectorAll('input[name="mortgageRepaymentType"]');

const state = parseShareStateFromSearch(window.location.search);

function detailRow(label, value) {
  return `
    <div>
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `;
}

function syncRepaymentOptions() {
  mortgageRepaymentInputs.forEach((input) => {
    input.checked = input.value === state.mortgageRepaymentType;
    input.closest(".switch-option")?.classList.toggle("active", input.checked);
  });
}

function setClipboardButtonState(button, text) {
  const original = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = original;
  button.textContent = text;

  window.setTimeout(() => {
    button.textContent = button.dataset.originalLabel || original;
  }, 1600);
}

async function copyReportLink() {
  const url = new URL(buildShareUrl(state, "report"), window.location.href);
  try {
    await navigator.clipboard.writeText(url.href);
    setClipboardButtonState(copyReportLinkButton, "已複製");
  } catch {
    setClipboardButtonState(copyReportLinkButton, "複製失敗");
  }
}

function openEditor() {
  window.location.href = buildShareUrl(state, "edit");
}

function renderMortgageChart(mortgage) {
  const points = mortgage.yearlyAverageMonthlyPayments || [];
  const showChart = mortgage.repaymentType === "equal-principal" && points.length > 0;

  mortgageChartCard.classList.toggle("hidden-by-mode", !showChart);
  if (!showChart) {
    mortgageChart.innerHTML = "";
    return;
  }

  const width = 640;
  const height = 260;
  const padding = { top: 20, right: 24, bottom: 34, left: 56 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.averageMonthlyPayment);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = Math.max(maxValue - minValue, 1);
  const xStep = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const yFor = (value) => padding.top + ((maxValue - value) / valueRange) * innerHeight;
  const xFor = (index) => padding.left + xStep * index;
  const columnWidth = points.length > 1 ? Math.max(xStep, 18) : innerWidth;
  const polylinePoints = points.map((point, index) => `${xFor(index)},${yFor(point.averageMonthlyPayment)}`).join(" ");
  const gridValues = [maxValue, Math.round((maxValue + minValue) / 2), minValue];
  const defaultActiveIndex = 0;
  const activePoint = points[defaultActiveIndex];
  const activeX = xFor(defaultActiveIndex);
  const activeY = yFor(activePoint.averageMonthlyPayment);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const tooltipLayoutFor = (index) => {
    const point = points[index];
    const x = xFor(index);
    const y = yFor(point.averageMonthlyPayment);
    const tooltipWidth = 136;
    const tooltipHeight = 34;
    const rawX = x <= width / 2 ? x + 12 : x - tooltipWidth - 12;
    const rawY = y - tooltipHeight - 12;

    return {
      x,
      y,
      tooltipWidth,
      tooltipHeight,
      tooltipX: clamp(rawX, padding.left, width - padding.right - tooltipWidth),
      tooltipY: clamp(rawY, padding.top + 4, height - padding.bottom - tooltipHeight - 8)
    };
  };

  mortgageChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      ${gridValues.map((value) => `
        <line class="mortgage-chart-grid" x1="${padding.left}" y1="${yFor(value)}" x2="${width - padding.right}" y2="${yFor(value)}"></line>
        <text class="mortgage-chart-label" x="${padding.left - 10}" y="${yFor(value) + 4}" text-anchor="end">${formatWan(value)}</text>
      `).join("")}
      <line class="mortgage-chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
      <line class="mortgage-chart-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
      <polyline class="mortgage-chart-line" points="${polylinePoints}"></polyline>
      ${points.map((point, index) => `
        <rect
          class="mortgage-chart-hit-area${index === defaultActiveIndex ? " is-active" : ""}"
          x="${Math.max(padding.left, xFor(index) - (columnWidth / 2))}"
          y="${padding.top}"
          width="${index === 0 || index === points.length - 1 ? Math.max(columnWidth / 2, 18) : columnWidth}"
          height="${innerHeight}"
          rx="10"
          data-chart-point="${index}"
          tabindex="0"
          role="button"
          aria-label="第 ${point.year} 年，平均月還款 ${formatCurrency(point.averageMonthlyPayment)}"
        ></rect>
        <text class="mortgage-chart-label" x="${xFor(index)}" y="${height - padding.bottom + 18}" text-anchor="middle">${point.year}</text>
      `).join("")}
      <circle class="mortgage-chart-point" cx="${activeX}" cy="${activeY}" r="5.5"></circle>
      <circle id="mortgageChartActiveHalo" class="mortgage-chart-point-halo" cx="${activeX}" cy="${activeY}" r="11"></circle>
      <line id="mortgageChartFocusLine" class="mortgage-chart-focus-line" x1="${activeX}" y1="${activeY}" x2="${activeX}" y2="${height - padding.bottom}"></line>
      <text class="mortgage-chart-label" x="${width - 4}" y="${height - 6}" text-anchor="end">年</text>
      <text class="mortgage-chart-label" x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">當年平均月還款</text>
      <g id="mortgageChartTooltip">
        <rect id="mortgageChartTooltipBg" class="mortgage-chart-tooltip-bg" x="${tooltipLayoutFor(defaultActiveIndex).tooltipX}" y="${tooltipLayoutFor(defaultActiveIndex).tooltipY}" width="${tooltipLayoutFor(defaultActiveIndex).tooltipWidth}" height="${tooltipLayoutFor(defaultActiveIndex).tooltipHeight}" rx="12"></rect>
        <text id="mortgageChartTooltipText" class="mortgage-chart-value" x="${tooltipLayoutFor(defaultActiveIndex).tooltipX + 12}" y="${tooltipLayoutFor(defaultActiveIndex).tooltipY + 22}">${activePoint.year} 年：${formatCurrency(activePoint.averageMonthlyPayment)}</text>
      </g>
    </svg>
  `;

  const activePointDot = mortgageChart.querySelector(".mortgage-chart-point");
  const activePointHalo = mortgageChart.querySelector("#mortgageChartActiveHalo");
  const focusLine = mortgageChart.querySelector("#mortgageChartFocusLine");
  const tooltipBg = mortgageChart.querySelector("#mortgageChartTooltipBg");
  const tooltipText = mortgageChart.querySelector("#mortgageChartTooltipText");
  const hitAreas = mortgageChart.querySelectorAll("[data-chart-point]");

  const updateActivePoint = (index) => {
    const point = points[index];
    const { x, y, tooltipX, tooltipY } = tooltipLayoutFor(index);

    activePointDot?.setAttribute("cx", String(x));
    activePointDot?.setAttribute("cy", String(y));
    activePointHalo?.setAttribute("cx", String(x));
    activePointHalo?.setAttribute("cy", String(y));
    focusLine?.setAttribute("x1", String(x));
    focusLine?.setAttribute("x2", String(x));
    focusLine?.setAttribute("y1", String(y));
    tooltipBg?.setAttribute("x", String(tooltipX));
    tooltipBg?.setAttribute("y", String(tooltipY));
    tooltipText?.setAttribute("x", String(tooltipX + 10));
    tooltipText?.setAttribute("y", String(tooltipY + 18));
    if (tooltipText) {
      tooltipText.textContent = `${point.year} 年：${formatCurrency(point.averageMonthlyPayment)}`;
    }

    hitAreas.forEach((hitArea, hitIndex) => {
      hitArea.classList.toggle("is-active", hitIndex === index);
    });
  };

  hitAreas.forEach((hitArea, index) => {
    hitArea.addEventListener("click", () => updateActivePoint(index));
    hitArea.addEventListener("pointerenter", () => updateActivePoint(index));
    hitArea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        updateActivePoint(index);
      }
    });
  });
}

function render() {
  syncRepaymentOptions();
  const result = calculateBudget(state);
  const mortgage = result.mortgage;

  reportSummary.textContent = `房屋總價 ${result.input.priceWan} 萬、預估貸款 ${formatWan(result.loanAmount)}。這頁只保留閱讀最需要的結論，拿來和家人或房仲對焦很夠用。`;
  reportRecommendedRange.textContent = `${formatWan(result.totalLow)} ~ ${formatWan(result.totalHigh)}`;
  reportRangeSubtitle.textContent = result.input.loanInputMode === "amount"
    ? `目前是用貸款金額 ${formatWan(result.loanAmount)} 反推頭期款與現金需求。`
    : `目前是用貸款成數 ${result.input.loanRatio.toFixed(1)}% 估算。`;

  reportKeyStats.innerHTML = [
    detailRow("預估貸款金額", formatCurrency(result.loanAmount)),
    detailRow("基本頭期款", formatCurrency(result.downPayment)),
    detailRow("總現金需求（低）", formatCurrency(result.totalLow)),
    detailRow("總現金需求（高）", formatCurrency(result.totalHigh))
  ].join("");

  const inputSummaryRows = [
    detailRow("房屋總價", `${result.input.priceWan} 萬`),
    detailRow("貸款輸入方式", result.input.loanInputMode === "amount" ? "用貸款金額輸入" : "用貸款成數輸入"),
    detailRow("貸款成數", `${result.input.loanRatio.toFixed(1)}%`),
    detailRow("貸款金額", formatWan(result.loanAmount)),
    detailRow("契稅輸入方式", result.input.deedTaxInputMode === "direct" ? "直接輸入房屋評定現值" : "快速估算"),
    detailRow("坪數", `${result.input.areaPing} 坪`),
    detailRow("房仲費", `${result.input.brokerFeeRate}%`)
  ];

  if (result.input.deedTaxInputMode === "direct") {
    inputSummaryRows.push(detailRow("房屋評定現值", result.input.houseAssessedValueWan ? `${result.input.houseAssessedValueWan} 萬` : "未填"));
  } else {
    inputSummaryRows.push(detailRow("契稅估算比例", `${result.input.assessedValueRatio}%`));
  }

  reportInputSummary.innerHTML = inputSummaryRows.join("");

  reportMortgageSummary.innerHTML = [
    detailRow("攤還方式", mortgage.repaymentType === "equal-principal" ? "本金平均攤還" : "本息平均攤還"),
    detailRow("房貸年利率", `${result.input.mortgageAnnualRate}%`),
    detailRow("貸款年限", `${result.input.mortgageYears} 年`),
    detailRow(mortgage.repaymentType === "equal-principal" ? "首月月還款" : "月還款", formatCurrency(mortgage.monthlyPayment)),
    detailRow("總利息", formatCurrency(mortgage.totalInterest)),
    detailRow("本息合計", formatCurrency(mortgage.totalPayment))
  ].join("");

  reportBreakdown.innerHTML = result.breakdown.map((item) => {
    const value = item.low === item.high
      ? formatWan(item.low)
      : `${formatWan(item.low)} ~ ${formatWan(item.high)}`;

    return `
      <div class="breakdown-row${item.included ? "" : " is-muted"}">
        <div>
          <strong>${item.label}</strong>
          <div class="breakdown-meta">${item.included ? "已納入試算" : "未納入試算"}</div>
          ${item.detail ? `<div class="breakdown-meta">${item.detail}</div>` : ""}
        </div>
        <div class="breakdown-value">${value}</div>
      </div>
    `;
  }).join("");

  reportNotes.innerHTML = result.notes.map((note) => `<li>${note}</li>`).join("");
  renderMortgageChart(mortgage);
  window.history.replaceState({}, "", buildShareUrl(state, "report"));
}

mortgageRepaymentInputs.forEach((input) => {
  input.addEventListener("change", () => {
    state.mortgageRepaymentType = input.value;
    render();
  });
});

editReportButton.addEventListener("click", openEditor);
copyReportLinkButton.addEventListener("click", copyReportLink);

render();
