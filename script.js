const currencyConfig = {
  ARS: { country: "Argentina", currencyName: "Peso argentino" },
  USD: { country: "Estados Unidos", currencyName: "Dólar americano" },
  CAD: { country: "Canadá", currencyName: "Dólar canadense" },
  GBP: { country: "Reino Unido", currencyName: "Libra esterlina" },
  EUR: { country: "Espanha", currencyName: "Euro" }
};

const apiUrl = "https://economia.awesomeapi.com.br/json/last/BRL-ARS,BRL-USD,BRL-CAD,BRL-GBP,BRL-EUR";
const refreshIntervalMs = 60_000;
const themeStorageKey = "travel-currency-theme";

const amountInput = document.getElementById("amount");
const targetAmountInput = document.getElementById("targetAmount");
const targetAmountLabel = document.getElementById("targetAmountLabel");
const flagButtons = document.querySelectorAll(".flag-card");
const convertedValue = document.getElementById("convertedValue");
const convertedHint = document.getElementById("convertedHint");
const exchangeRate = document.getElementById("exchangeRate");
const lastUpdated = document.getElementById("lastUpdated");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const retryButton = document.getElementById("retryButton");
const statusText = document.getElementById("statusText");
const themeToggle = document.getElementById("themeToggle");
const themeToggleText = document.getElementById("themeToggleText");

let quotes = {};
let activeRequestId = 0;
let selectedCurrency = "ARS";
let activeInput = "BRL";

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function formatRate(value, currency) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(value)} ${currency}`;
}

function formatTimestamp(dateValue) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(dateValue);
}

function formatInputValue(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

function getQuoteKey(currencyCode) {
  return `BRL${currencyCode}`;
}

function setLoadingState(isLoading) {
  loadingMessage.hidden = !isLoading;
  statusText.textContent = isLoading ? "Atualizando cotação..." : "Cotação disponível";
  retryButton.disabled = isLoading;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  statusText.textContent = "Falha ao buscar cotação";
}

function hideError() {
  errorMessage.hidden = true;
}

function syncFlagSelection() {
  flagButtons.forEach((button) => {
    const isActive = button.dataset.currency === selectedCurrency;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  targetAmountLabel.textContent = `Valor em ${selectedCurrency}`;
  targetAmountInput.placeholder = `Ex.: ${selectedCurrency === "ARS" ? "25000,00" : "200,00"}`;
}

function updateConversionLegacy() {
  const amount = Number(amountInput.value);
  const targetInfo = currencyConfig[selectedCurrency];
  const quote = quotes[getQuoteKey(selectedCurrency)];

  if (!amountInput.value || Number.isNaN(amount) || amount < 0) {
    convertedValue.textContent = "--";
    convertedHint.textContent = "Informe um valor válido em BRL para ver a conversão.";
    exchangeRate.textContent = "--";
    return;
  }

  if (!quote) {
    convertedValue.textContent = "--";
    convertedHint.textContent = "Aguardando cotação para calcular a conversão.";
    exchangeRate.textContent = "--";
    return;
  }

  const rate = Number(quote.bid);
  const convertedAmount = amount * rate;
  const updatedAt = quote.create_date
    ? new Date(quote.create_date.replace(" ", "T"))
    : new Date(Number(quote.timestamp) * 1000);

  convertedValue.textContent = formatCurrency(convertedAmount, selectedCurrency);
  convertedHint.textContent =
    `${formatCurrency(amount, "BRL")} equivalem a ${targetInfo.currencyName.toLowerCase()} para sua viagem a ${targetInfo.country}.`;
  exchangeRate.textContent = `1 BRL = ${formatRate(rate, selectedCurrency)}`;
  lastUpdated.textContent = formatTimestamp(updatedAt);
}

function updateConversion() {
  const targetInfo = currencyConfig[selectedCurrency];
  const quote = quotes[getQuoteKey(selectedCurrency)];
  const sourceInput = activeInput === "BRL" ? amountInput : targetAmountInput;
  const sourceCurrency = activeInput === "BRL" ? "BRL" : selectedCurrency;
  const sourceAmount = Number(sourceInput.value);

  if (!sourceInput.value || Number.isNaN(sourceAmount) || sourceAmount < 0) {
    convertedValue.textContent = "--";
    convertedHint.textContent = `Informe um valor valido em ${sourceCurrency} para ver a conversao.`;
    exchangeRate.textContent = "--";
    return;
  }

  if (!quote) {
    convertedValue.textContent = "--";
    convertedHint.textContent = "Aguardando cotacao para calcular a conversao.";
    exchangeRate.textContent = "--";
    return;
  }

  const rate = Number(quote.bid);
  const amountInBrl = activeInput === "BRL" ? sourceAmount : sourceAmount / rate;
  const amountInTarget = activeInput === "BRL" ? sourceAmount * rate : sourceAmount;
  const convertedAmount = activeInput === "BRL" ? amountInTarget : amountInBrl;
  const convertedCurrency = activeInput === "BRL" ? selectedCurrency : "BRL";
  const originCurrency = activeInput === "BRL" ? "BRL" : selectedCurrency;
  const updatedAt = quote.create_date
    ? new Date(quote.create_date.replace(" ", "T"))
    : new Date(Number(quote.timestamp) * 1000);

  if (activeInput === "BRL") {
    targetAmountInput.value = formatInputValue(amountInTarget);
  } else {
    amountInput.value = formatInputValue(amountInBrl);
  }

  convertedValue.textContent = formatCurrency(convertedAmount, convertedCurrency);
  convertedHint.textContent =
    `${formatCurrency(sourceAmount, originCurrency)} equivalem a ${formatCurrency(convertedAmount, convertedCurrency)} para sua viagem a ${targetInfo.country}.`;
  exchangeRate.textContent = `1 BRL = ${formatRate(rate, selectedCurrency)} | 1 ${selectedCurrency} = ${formatCurrency(1 / rate, "BRL")}`;
  lastUpdated.textContent = formatTimestamp(updatedAt);
}

async function fetchQuotes() {
  const requestId = ++activeRequestId;

  setLoadingState(true);
  hideError();

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (requestId !== activeRequestId) {
      return;
    }

    quotes = data;
    setLoadingState(false);
    updateConversion();
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    setLoadingState(false);
    showError("Não foi possível obter a cotação em tempo real. Verifique sua conexão ou tente novamente.");
    updateConversion();
    console.error("Erro ao buscar cotações:", error);
  }
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleText.textContent = theme === "dark" ? "Modo claro" : "Modo escuro";
  localStorage.setItem(themeStorageKey, theme);
}

function initializeTheme() {
  const storedTheme = localStorage.getItem(themeStorageKey);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initialTheme = storedTheme || (prefersLight ? "light" : "dark");

  applyTheme(initialTheme);
}

amountInput.addEventListener("input", () => {
  activeInput = "BRL";
  updateConversion();
});

targetAmountInput.addEventListener("input", () => {
  activeInput = selectedCurrency;
  updateConversion();
});

flagButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCurrency = button.dataset.currency;
    activeInput = "BRL";
    syncFlagSelection();
    updateConversion();
    fetchQuotes();
  });
});

retryButton.addEventListener("click", fetchQuotes);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

initializeTheme();
syncFlagSelection();
fetchQuotes();

// Mantém as cotações atualizadas durante o uso no celular.
setInterval(fetchQuotes, refreshIntervalMs);
