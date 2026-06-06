import { calculateBudget, formatCurrency, formatWan } from "./calculator.js?v=20260606d";

const form = document.querySelector("#calculator-form");
const recommendedRange = document.querySelector("#recommendedRange");
const rangeSubtitle = document.querySelector("#rangeSubtitle");
const loanAmount = document.querySelector("#loanAmount");
const downPayment = document.querySelector("#downPayment");
const cashNeedLow = document.querySelector("#cashNeedLow");
const cashNeedHigh = document.querySelector("#cashNeedHigh");
const mortgagePrincipal = document.querySelector("#mortgagePrincipal");
const mortgageInterest = document.querySelector("#mortgageInterest");
const mortgageTotalPayment = document.querySelector("#mortgageTotalPayment");
const mortgageMonthlyPayment = document.querySelector("#mortgageMonthlyPayment");
const mortgageMonthlyPaymentLabel = document.querySelector("#mortgageMonthlyPaymentLabel");
const mortgageSummary = document.querySelector("#mortgageSummary");
const mortgageChartCard = document.querySelector("#mortgageChartCard");
const mortgageChart = document.querySelector("#mortgageChart");
const breakdown = document.querySelector("#breakdown");
const notes = document.querySelector("#notes");
const helpModal = document.querySelector("#help-modal");
const helpBody = document.querySelector("#help-body");
const helpClose = document.querySelector("#help-close");
const loanModeFields = document.querySelectorAll("[data-mode-field]");
const deedTaxModeFields = document.querySelectorAll("[data-deed-tax-mode-field]");
const mortgageRepaymentInputs = document.querySelectorAll('input[name="mortgageRepaymentType"]');

function percent(value) {
  return value / 100;
}

function roundCurrency(value) {
  return Math.round(value);
}

function buildMortgageFallback(result) {
  const annualRatePercent = Number(result?.input?.mortgageAnnualRate) || 0;
  const years = Number(result?.input?.mortgageYears) || 0;
  const principal = Math.max(Number(result?.loanAmount) || 0, 0);
  const months = Math.max(Math.round(years * 12), 0);
  const repaymentType = result?.input?.mortgageRepaymentType === "equal-principal"
    ? "equal-principal"
    : "equal-payment";

  if (principal <= 0 || months <= 0) {
    return {
      principal: roundCurrency(principal),
      totalInterest: 0,
      totalPayment: roundCurrency(principal),
      monthlyPayment: 0,
      months,
      repaymentType,
      firstMonthlyPayment: 0,
      lastMonthlyPayment: 0,
      yearlyAverageMonthlyPayments: []
    };
  }

  const monthlyRate = percent(annualRatePercent) / 12;
  if (repaymentType === "equal-principal") {
    const monthlyPrincipal = principal / months;
    const firstMonthlyPayment = roundCurrency(monthlyPrincipal + principal * monthlyRate);
    const lastMonthlyPayment = roundCurrency(monthlyPrincipal + monthlyPrincipal * monthlyRate);
    const totalInterest = roundCurrency(monthlyRate === 0 ? 0 : principal * monthlyRate * (months + 1) / 2);

    return {
      principal: roundCurrency(principal),
      totalInterest,
      totalPayment: roundCurrency(principal + totalInterest),
      monthlyPayment: firstMonthlyPayment,
      months,
      repaymentType,
      firstMonthlyPayment,
      lastMonthlyPayment,
      yearlyAverageMonthlyPayments: buildEqualPrincipalYearlyAverages(principal, monthlyRate, months, monthlyPrincipal)
    };
  }

  const rawMonthlyPayment = monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const monthlyPayment = roundCurrency(rawMonthlyPayment);
  const totalPayment = roundCurrency(monthlyPayment * months);

  return {
    principal: roundCurrency(principal),
    totalInterest: roundCurrency(totalPayment - principal),
    totalPayment,
    monthlyPayment,
    months,
    repaymentType,
    firstMonthlyPayment: monthlyPayment,
    lastMonthlyPayment: monthlyPayment,
    yearlyAverageMonthlyPayments: []
  };
}

function buildEqualPrincipalYearlyAverages(principal, monthlyRate, months, monthlyPrincipal) {
  const yearlyAverages = [];

  for (let startMonth = 0; startMonth < months; startMonth += 12) {
    const endMonth = Math.min(startMonth + 12, months);
    let totalForYear = 0;

    for (let monthIndex = startMonth; monthIndex < endMonth; monthIndex += 1) {
      const remainingPrincipal = principal - (monthlyPrincipal * monthIndex);
      totalForYear += monthlyPrincipal + Math.max(remainingPrincipal, 0) * monthlyRate;
    }

    yearlyAverages.push({
      year: Math.floor(startMonth / 12) + 1,
      averageMonthlyPayment: roundCurrency(totalForYear / (endMonth - startMonth))
    });
  }

  return yearlyAverages;
}

function getChecklistBoxes(stage) {
  return [...stage.querySelectorAll('input[type="checkbox"]')];
}

function updateChecklistStageStatus(stage) {
  const boxes = getChecklistBoxes(stage);
  const checked = boxes.filter((box) => box.checked).length;
  const total = boxes.length;
  const status = stage.querySelector(".stage-status");
  const progress = stage.querySelector(".stage-progress");

  stage.classList.toggle("status-empty", checked === 0);
  stage.classList.toggle("status-partial", checked > 0 && checked < total);
  stage.classList.toggle("status-complete", total > 0 && checked === total);

  if (status) {
    if (total > 0 && checked === total) {
      status.textContent = "✓";
      status.title = "已完成";
      status.setAttribute("aria-label", "已完成");
    } else if (checked > 0) {
      status.textContent = "◐";
      status.title = "進行中";
      status.setAttribute("aria-label", "進行中");
    } else {
      status.textContent = "○";
      status.title = "未開始";
      status.setAttribute("aria-label", "未開始");
    }
  }

  if (progress) {
    progress.textContent = `${checked}/${total}`;
  }
}

function initChecklistStages() {
  document.querySelectorAll(".checklist-stage").forEach((stage) => {
    updateChecklistStageStatus(stage);
    stage.addEventListener("change", () => updateChecklistStageStatus(stage));
  });
}


const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll(".tab-panel");

function switchTab(targetId) {
  tabButtons.forEach((button) => {
    const active = button.dataset.tabTarget === targetId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
});


const helpContent = {
  price: "房屋成交總價。這是整個試算的基礎，頭期款與多數比例型費用都會跟著它一起變動；契稅若有填房屋評定現值，會優先用那個金額。",
  loanInputMode: "你可以二選一：若還在抓銀行大概能貸幾成，就用『貸款成數』；若已經知道大概會核多少金額，就直接切到『貸款金額』。",
  loanRatio: "銀行願意貸給你的比例。像 80% 代表總價 1500 萬時，預估可貸 1200 萬，剩下 300 萬就是基本頭期款。",
  loanAmountWan: "直接輸入你預計要貸的總金額。系統會自動換算成對應貸款成數，並據此估算頭期款與相關費用。",
  mortgageCalculator: "這段是銀行房貸試算區，會直接使用上方的貸款金額，再按你填的年利率、貸款年限與攤還方式，估算月還款、總利息與本息合計。",
  mortgageAnnualRate: "填銀行給你的房貸年利率，例如 2.35%。系統會依你選的本息平均攤還或本金平均攤還方式估算結果。",
  mortgageYears: "貸款期數，以年為單位。像 30 年就是 360 期；年限越長，通常月付越低，但總利息越高。",
  areaPing: "用來估算裝潢費的坪數。你可以填室內坪數，若你習慣抓權狀坪數也可以，但結果通常會偏高一些。",
  brokerFeeRate: "買方向房仲支付的服務費比例。常見上限約為成交總價 2%，這裡可依實際談到的條件自行調整。",
  deedTaxInputMode: "契稅請二選一：若你手上已有房屋稅單或地方稅務資料，建議直接輸入房屋評定現值；若還沒有，就先用總價比例快速估算。系統只會採用你目前選中的那一種方式。",
  houseAssessedValueWan: "建議直接填房屋評定現值，也就是房屋稅單上的課稅現值或地方稅務機關提供的標準價格。契稅會優先按這個金額乘稅率計算，最接近實務申報。",
  assessedValueRatio: "只有在你還不知道房屋評定現值時，才用成交總價的一個比例快速估算。這只是近似值，不是正式申報基礎。",
  renovationPerPing: "每坪裝潢抓一個低到高的區間，系統會估出裝潢總額範圍。若只想看純購屋現金需求，可取消納入裝潢。",
  scrivenerFee: "代書、設定、文件申辦等常見固定支出。不同地區與案件會有差異，這裡先用一筆固定值估算。",
  mortgageRegistrationRate: "房貸設定相關規費，通常會隨貸款金額增加。這裡用貸款額的百分比先粗估。",
  deedTaxRate: "契稅稅率會套用在房屋評定現值；若你沒填正式現值，才會套用在快速估算出的基礎上。一般買賣常見 6%，仍以實際申報條件為準。",
  stampTaxRate: "印花稅用成交總價的比例簡化估算。這是方便試算的近似值，真實金額仍以實際文件與申報方式為準。",
  bankFees: "銀行端常見的一次性費用，例如開辦費、鑑價費、徵信費等，可依你接觸到的銀行方案自行調整。",
  bufferRate: "額外預留的安全墊，用來吸收零星雜支、估價落差、搬家或臨時支出。這筆常常能救場，我不建議抓成 0。",
  includeBrokerFee: "勾選後，房仲費會算進總現金需求；取消後，你可以先只看純頭期與稅費壓力。",
  includeDeedTax: "勾選後，把契稅算進買房當下要準備的現金。",
  includeStampTax: "勾選後，把印花稅算進總現金需求。",
  includeScrivenerFee: "勾選後，把代書與設定相關固定費用一起納入。",
  includeMortgageRegistration: "勾選後，把貸款設定規費算進總現金需求。",
  includeBankFees: "勾選後，把銀行開辦、鑑價等一次性費用納入。",
  includeRenovation: "勾選後，會把裝潢區間一起算進建議自備款；若只看交屋前必要現金，可先取消。",
  includeBuffer: "勾選後，會保留一筆彈性預備金，讓預算不會剛好卡死。"
};

function currentLoanInputMode() {
  return form.querySelector('input[name="loanInputMode"]:checked')?.value || "ratio";
}

function currentDeedTaxInputMode() {
  return form.querySelector('input[name="deedTaxInputMode"]:checked')?.value || "estimated";
}

function currentMortgageRepaymentType() {
  return document.querySelector('input[name="mortgageRepaymentType"]:checked')?.value || "equal-payment";
}

function readForm() {
  const formData = new FormData(form);
  const checkbox = (name) => formData.get(name) === "on";

  return {
    priceWan: formData.get("price"),
    loanInputMode: currentLoanInputMode(),
    loanRatio: formData.get("loanRatio"),
    loanAmountWan: formData.get("loanAmountWan"),
    mortgageAnnualRate: formData.get("mortgageAnnualRate"),
    mortgageYears: formData.get("mortgageYears"),
    mortgageRepaymentType: currentMortgageRepaymentType(),
    deedTaxInputMode: currentDeedTaxInputMode(),
    areaPing: formData.get("areaPing"),
    brokerFeeRate: formData.get("brokerFeeRate"),
    houseAssessedValueWan: formData.get("houseAssessedValueWan"),
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

function syncLoanModeUI() {
  const mode = currentLoanInputMode();

  loanModeFields.forEach((field) => {
    const active = field.dataset.modeField === mode;
    field.classList.toggle("hidden-by-mode", !active);
    const input = field.querySelector("input");
    if (input) {
      input.disabled = !active;
    }
  });

  syncModeOptionCards("loanInputMode");
}

function syncDeedTaxModeUI() {
  const mode = currentDeedTaxInputMode();

  deedTaxModeFields.forEach((field) => {
    const active = field.dataset.deedTaxModeField === mode;
    field.classList.toggle("hidden-by-mode", !active);
    const input = field.querySelector("input");
    if (input) {
      input.disabled = !active;
    }
  });

  syncModeOptionCards("deedTaxInputMode");
}

function syncModeOptionCards(groupName) {
  document.querySelectorAll(`input[name="${groupName}"]`).forEach((input) => {
    input.closest(".mode-option")?.classList.toggle("active", input.checked);
  });
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
  const gridValues = [maxValue, roundCurrency((maxValue + minValue) / 2), minValue];
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
  syncLoanModeUI();
  syncDeedTaxModeUI();
  syncModeOptionCards("mortgageRepaymentType");
  const result = calculateBudget(readForm());
  const mortgage = result.mortgage || buildMortgageFallback(result);

  recommendedRange.textContent = `${formatWan(result.totalLow)} ~ ${formatWan(result.totalHigh)}`;
  rangeSubtitle.textContent = result.input.loanInputMode === "amount"
    ? `已用貸款金額 ${formatWan(result.loanAmount)} 反推頭期款，並包含目前勾選的費用。`
    : result.assessedValueSource === "direct"
      ? "包含頭期款與目前勾選的費用；契稅目前依房屋評定現值計算。"
      : result.assessedValueSource === "direct_missing"
        ? "包含頭期款與目前勾選的費用；你已選房屋評定現值模式，但尚未輸入金額。"
        : "包含頭期款與目前勾選的費用；契稅目前用總價比例快速估算。";
  loanAmount.textContent = formatCurrency(result.loanAmount);
  downPayment.textContent = formatCurrency(result.downPayment);
  cashNeedLow.textContent = formatCurrency(result.totalLow);
  cashNeedHigh.textContent = formatCurrency(result.totalHigh);
  mortgagePrincipal.textContent = formatCurrency(mortgage.principal);
  mortgageInterest.textContent = formatCurrency(mortgage.totalInterest);
  mortgageTotalPayment.textContent = formatCurrency(mortgage.totalPayment);
  mortgageMonthlyPayment.textContent = formatCurrency(mortgage.monthlyPayment);
  mortgageMonthlyPaymentLabel.textContent = mortgage.repaymentType === "equal-principal"
    ? "首月月還款"
    : "月還款";
  mortgageSummary.textContent = mortgage.months > 0
    ? mortgage.repaymentType === "equal-principal"
      ? `以 ${result.input.mortgageAnnualRate}% 年利率、${result.input.mortgageYears} 年本金平均攤還估算，共 ${mortgage.months} 期；首月約 ${formatCurrency(mortgage.firstMonthlyPayment)}，最後一期約 ${formatCurrency(mortgage.lastMonthlyPayment)}。`
      : `以 ${result.input.mortgageAnnualRate}% 年利率、${result.input.mortgageYears} 年本息平均攤還估算，共 ${mortgage.months} 期。`
    : "請先確認貸款年限大於 0，才會算出每月月還款。";
  renderMortgageChart(mortgage);

  breakdown.innerHTML = result.breakdown
    .map((item) => {
      const meta = [
        item.included ? "" : "（未納入）",
        item.detail || ""
      ].filter(Boolean);
      const value = item.low === item.high
        ? formatWan(item.low)
        : `${formatWan(item.low)} ~ ${formatWan(item.high)}`;

      return `
        <div class="breakdown-row">
          <div>
            <strong>${item.label}</strong>
            ${meta.map((text) => `<div class="sub">${text}</div>`).join("")}
          </div>
          <div class="breakdown-range">${value}</div>
        </div>
      `;
    })
    .join("");

  notes.innerHTML = result.notes.map((note) => `<li>${note}</li>`).join("");
}

function openHelp(key) {
  const content = helpContent[key];
  if (!content) {
    return;
  }

  helpBody.textContent = content;
  helpModal.classList.remove("hidden");
  helpModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeHelp() {
  helpModal.classList.add("hidden");
  helpModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

form.addEventListener("input", render);
form.addEventListener("change", render);
mortgageRepaymentInputs.forEach((input) => {
  input.addEventListener("change", render);
});
form.addEventListener("click", (event) => {
  const trigger = event.target.closest(".help-trigger");
  if (!trigger) {
    return;
  }

  event.preventDefault();
  openHelp(trigger.dataset.helpKey);
});

helpModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-help='true']")) {
    closeHelp();
  }
});

helpClose.addEventListener("click", closeHelp);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !helpModal.classList.contains("hidden")) {
    closeHelp();
  }
});

initChecklistStages();
render();
