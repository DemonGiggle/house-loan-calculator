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
const helpModal = document.querySelector("#help-modal");
const helpBody = document.querySelector("#help-body");
const helpClose = document.querySelector("#help-close");
const loanModeFields = document.querySelectorAll("[data-mode-field]");

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
  price: "房屋成交總價。這是整個試算的基礎，頭期款、多數比例型費用都會跟著它一起變動。",
  loanInputMode: "你可以二選一：若還在抓銀行大概能貸幾成，就用『貸款成數』；若已經知道大概會核多少金額，就直接切到『貸款金額』。",
  loanRatio: "銀行願意貸給你的比例。像 80% 代表總價 1500 萬時，預估可貸 1200 萬，剩下 300 萬就是基本頭期款。",
  loanAmountWan: "直接輸入你預計要貸的總金額。系統會自動換算成對應貸款成數，並據此估算頭期款與相關費用。",
  areaPing: "用來估算裝潢費的坪數。你可以填室內坪數，若你習慣抓權狀坪數也可以，但結果通常會偏高一些。",
  brokerFeeRate: "買方向房仲支付的服務費比例。常見上限約為成交總價 2%，這裡可依實際談到的條件自行調整。",
  assessedValueRatio: "契稅通常不是直接用成交價課，而是用房屋評定現值或移轉現值估算。這裡先用總價的一個比例近似。",
  renovationPerPing: "每坪裝潢抓一個低到高的區間，系統會估出裝潢總額範圍。若只想看純購屋現金需求，可取消納入裝潢。",
  scrivenerFee: "代書、設定、文件申辦等常見固定支出。不同地區與案件會有差異，這裡先用一筆固定值估算。",
  mortgageRegistrationRate: "房貸設定相關規費，通常會隨貸款金額增加。這裡用貸款額的百分比先粗估。",
  deedTaxRate: "契稅稅率，會套用在前面的估值基礎上。常見自用住宅可能會遇到 6% 這類抓法，但實際仍以申報條件為準。",
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

function readForm() {
  const formData = new FormData(form);
  const checkbox = (name) => formData.get(name) === "on";

  return {
    priceWan: formData.get("price"),
    loanInputMode: currentLoanInputMode(),
    loanRatio: formData.get("loanRatio"),
    loanAmountWan: formData.get("loanAmountWan"),
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
}

function render() {
  syncLoanModeUI();
  const result = calculateBudget(readForm());

  recommendedRange.textContent = `${formatWan(result.totalLow)} ~ ${formatWan(result.totalHigh)}`;
  rangeSubtitle.textContent = result.input.loanInputMode === "amount"
    ? `已用貸款金額 ${formatWan(result.loanAmount)} 反推頭期款，並包含目前勾選的費用。`
    : `包含頭期款與目前勾選的稅費、房仲、裝潢與緩衝。`;
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
