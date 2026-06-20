let currentDayCount = 1;

let initialCapital = 5000;
let liveBalance = 5000;

let targetPopupShown = false;
let csvDownloaded = false;

const STORAGE_KEY = "capital_manager_ledger_v1";
const RESET_PIN = "2004";

function $(id) { return document.getElementById(id); }

function readNumber(id, fallback = 0) {
  const el = $(id);
  if (!el) return fallback;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : fallback;
}

function getSelectedRatioValue() {
  const el = $("ratioInput");
  const ratio = el ? parseFloat(el.value) : 1;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function getPipValue() {
  const asset = $("assetInput") ? $("assetInput").value : "XAUUSD";
  if (asset === "XAUUSD") return 10;
  if (asset === "GER30") return 1;
  if (asset === "US100") return 1;
  return 1;
}

function getTargetBalance() {
  const totalTargetProfit = readNumber("totalTargetInput", 0);
  return Number(initialCapital) + totalTargetProfit;
}

function updateUI() {
  const startingText = $("startingBalanceText");
  if (startingText) startingText.innerText = `$${Number(initialCapital).toFixed(2)}`;

  const liveTop = $("liveTopBalanceText");
  if (liveTop) liveTop.innerText = `$${Number(liveBalance).toFixed(2)}`;

  const live = $("liveBalanceText");
  if (live) live.innerText = `$${Number(liveBalance).toFixed(2)}`;

  const remaining = getTargetBalance() - Number(liveBalance);
  const remainingEl = $("remainingTotalTargetText");
  if (remainingEl) remainingEl.innerText = `$${Math.max(0, remaining).toFixed(2)}`;

  const totalProfitText = $("totalProfitText");
  if (totalProfitText) totalProfitText.innerText = `$${Number(initialCapital).toFixed(2)}`;
}

function ensurePopup() {
  if ($("vipOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "vipOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.55)";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "99999";

  overlay.innerHTML = `
    <div style="
      width:min(520px, 92vw);
      background: rgba(8,18,33,0.95);
      border: 1px solid rgba(0,212,255,0.35);
      box-shadow: 0 20px 70px rgba(0,0,0,0.6);
      border-radius: 18px;
      padding: 18px 16px;
      color: #f4fbff;
      text-align: center;
    ">
      <div style="font-size: 22px; font-weight: 900; color:#00d4ff; margin-bottom: 8px;">🎉 Congratulations</div>
      <div id="vipMsg" style="font-size: 14px; font-weight: 800; line-height:1.4; margin-bottom: 14px;">Target reached</div>
      <button id="vipOkBtn" style="
        background: linear-gradient(135deg, #2f7dff, #00d4ff);
        color:#fff;
        border:none;
        font-weight:900;
        border-radius: 12px;
        padding: 10px 16px;
        cursor:pointer;
        width: 130px;
      ">OK</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const okBtn = $("vipOkBtn");
  if (okBtn) okBtn.addEventListener("click", () => {
    overlay.style.display = "none";
  });
}

window.closeVipPopup = function closeVipPopup() {
  const overlay = $("vipOverlay");
  if (overlay) overlay.style.display = "none";
};

function showPopup(message) {
  ensurePopup();
  const overlay = $("vipOverlay");
  const msg = $("vipMsg");
  if (!overlay || !msg) return;
  msg.textContent = message;
  overlay.style.display = "flex";
}

function checkTargetPopup() {
  const targetBalance = getTargetBalance();
  const current = Number(liveBalance);

  const reached = Number.isFinite(targetBalance) && current >= targetBalance;

  if (reached && !targetPopupShown) {
    targetPopupShown = true;
    showPopup("🏆🎉Target Completed!");
  }

  if (!reached) targetPopupShown = false;
}

window.downloadCSV = function downloadCSV() {
  const header = ["Date", "Starting Balance", "Target $", "Lot Size", "Actual P/L", "Ending Balance", "Status"];
  const rows = [header];

  document.querySelectorAll("#ledgerTable tbody tr").forEach((tr) => {
    const tds = [...tr.querySelectorAll("td")].map((td) => td.innerText);
    if (tds.length) rows.push(tds);
  });

  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "capital_manager_data.csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
  csvDownloaded = true;
};

window.recalculateOptimizer = function recalculateOptimizer() {
  const dailyTargetPct = readNumber("dailyTargetInput", 0);
  const totalTargetProfit = readNumber("totalTargetInput", 0);
  const targetPips = readNumber("pipsInput", 20);
  const pipValue = getPipValue();
  const ratioValue = getSelectedRatioValue();

  const capital = Number(initialCapital) || 0;
  const dailyTargetProfit = capital * (dailyTargetPct / 100);

  let rawLot = 0;
  if (capital > 0 && targetPips > 0 && pipValue > 0) {
    rawLot = dailyTargetProfit / (targetPips * pipValue);
  }
  if (rawLot < 0.01) rawLot = 0.01;
  if (rawLot > 0.10) rawLot = 0.10;

  const dailyProfitText = $("dailyProfitText");
  if (dailyProfitText) dailyProfitText.innerText = `$${dailyTargetProfit.toFixed(2)}`;

  const totalProfitText2 = $("totalProfitText2");
  if (totalProfitText2) totalProfitText2.innerText = `$${totalTargetProfit.toFixed(2)}`;

  const estimatedProfitText = $("estimatedProfitText");
  if (estimatedProfitText) estimatedProfitText.innerText = `$${(dailyTargetProfit * ratioValue).toFixed(2)}`;

  const recommendedLot = $("recommendedLot");
  if (recommendedLot) recommendedLot.innerText = `${rawLot.toFixed(2)} Lots`;

  updateUI();
  checkTargetPopup();
  saveData();
};

function addRowToLedger({ dateTime, startingBalance, targetProfit, lotUsed, actualPL, endingBalance, status }) {
  const tbody = document.querySelector("#ledgerTable tbody");
  if (!tbody) return;

  const row = tbody.insertRow();
  row.innerHTML = `
    <td>${dateTime}</td>
    <td>$${startingBalance.toFixed(2)}</td>
    <td>$${targetProfit.toFixed(2)}</td>
    <td>${lotUsed}</td>
    <td style="color:${actualPL >= 0 ? "var(--neon)" : "var(--danger)"}">
      ${actualPL >= 0 ? "+" : ""}$${actualPL.toFixed(2)}
    </td>
    <td>$${endingBalance.toFixed(2)}</td>
    <td style="color:${status === "GREEN" ? "var(--neon2)" : "var(--danger)"}">${status}</td>
  `;
}

window.journalizeDay = function journalizeDay() {
  const closedPLInput = $("closedPLInput");
  if (!closedPLInput) {
    alert("closedPLInput missing.");
    return;
  }

  const actualPL = parseFloat(closedPLInput.value);
  if (!Number.isFinite(actualPL)) {
    alert("Please enter valid profit/loss.");
    return;
  }

  const startingBalance = Number(liveBalance);
  const dailyTargetPct = readNumber("dailyTargetInput", 0);
  const dailyTargetProfit = startingBalance * (dailyTargetPct / 100);

  const lotUsed = $("recommendedLot") ? $("recommendedLot").innerText.trim() : "0.00 Lots";
  const rewardRatio = getSelectedRatioValue();

  const endingBalance = startingBalance + actualPL;
  const status = actualPL >= dailyTargetProfit * rewardRatio ? "GREEN" : "RED";

  addRowToLedger({
    dateTime: new Date().toLocaleString(),
    startingBalance,
    targetProfit: dailyTargetProfit,
    lotUsed,
    actualPL,
    endingBalance,
    status
  });

  liveBalance = endingBalance;
  closedPLInput.value = "";

  updateUI();
  checkTargetPopup();
  recalculateOptimizer();
  saveData();
};

function saveData() {
  const rows = [];
  document.querySelectorAll("#ledgerTable tbody tr").forEach((tr) => {
    rows.push([...tr.querySelectorAll("td")].map((td) => td.innerText));
  });

  const payload = {
    currentDayCount,
    initialCapital,
    liveBalance,
    dailyTargetInput: $("dailyTargetInput")?.value,
    totalTargetInput: $("totalTargetInput")?.value,
    pipsInput: $("pipsInput")?.value,
    ratioInput: $("ratioInput")?.value,
    assetInput: $("assetInput")?.value,
    rows
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSavedData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const payload = JSON.parse(saved);

  currentDayCount = payload.currentDayCount || 1;
  initialCapital = Number(payload.initialCapital) || 5000;
  liveBalance = Number(payload.liveBalance) || initialCapital;

  if ($("dailyTargetInput") && payload.dailyTargetInput != null) $("dailyTargetInput").value = payload.dailyTargetInput;
  if ($("totalTargetInput") && payload.totalTargetInput != null) $("totalTargetInput").value = payload.totalTargetInput;
  if ($("pipsInput") && payload.pipsInput != null) $("pipsInput").value = payload.pipsInput;
  if ($("ratioInput") && payload.ratioInput != null) $("ratioInput").value = payload.ratioInput;
  if ($("assetInput") && payload.assetInput != null) $("assetInput").value = payload.assetInput;

  const tbody = document.querySelector("#ledgerTable tbody");
  if (tbody) tbody.innerHTML = "";

  (payload.rows || []).forEach((cols) => {
    if (!tbody) return;
    if (!cols || cols.length < 7) return;

    const [dateText, startBal, targetTxt, lotTxt, actualPLTxt, endBal, statusTxt] = cols;
    const isNeg = String(actualPLTxt).includes("-");

    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${dateText || ""}</td>
      <td>${startBal || ""}</td>
      <td>${targetTxt || ""}</td>
      <td>${lotTxt || ""}</td>
      <td style="color:${isNeg ? "var(--danger)" : "var(--neon)"}">${actualPLTxt || ""}</td>
      <td>${endBal || ""}</td>
      <td style="color:${statusTxt === "GREEN" ? "var(--neon2)" : "var(--danger)"}">${statusTxt || ""}</td>
    `;
  });
}

window.openInitialBalancePrompt = function openInitialBalancePrompt() {
  const pin = prompt("Enter password to edit Initial Balance:");
  if (pin !== RESET_PIN) { alert("Wrong password."); return; }

  const newValue = prompt("Enter Initial Balance amount:", String(initialCapital));
  const v = parseFloat(newValue);
  if (!Number.isFinite(v) || v <= 0) { alert("Enter valid amount."); return; }

  initialCapital = v;
  liveBalance = v;

  updateUI();
  recalculateOptimizer();
  saveData();
};

window.showResetPrompt = function showResetPrompt() {
  if (!csvDownloaded) {
    alert("CSV download pehle karo, phir Reset allow hoga.");
    return;
  }
  const pin = prompt("Enter reset PIN:");
  if (pin !== RESET_PIN) { alert("Wrong PIN."); return; }

  localStorage.removeItem(STORAGE_KEY);

  currentDayCount = 1;
  initialCapital = 5000;
  liveBalance = 5000;
  targetPopupShown = false;

  const tbody = document.querySelector("#ledgerTable tbody");
  if (tbody) tbody.innerHTML = "";

  updateUI();
  recalculateOptimizer();
  csvDownloaded = false;
};

window.toggleTheme = function toggleTheme() {
  document.body.classList.toggle("light");
};

document.addEventListener("DOMContentLoaded", () => {
  ensurePopup();
  loadSavedData();
  updateUI();
  checkTargetPopup();
  recalculateOptimizer();
});
