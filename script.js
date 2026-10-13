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
const destinationToggle = document.getElementById("destinationToggle");
const destinationFlags = document.getElementById("destinationFlags");
const selectedCountry = document.getElementById("selectedCountry");
const exchangeRate = document.getElementById("exchangeRate");
const lastUpdated = document.getElementById("lastUpdated");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const retryButton = document.getElementById("retryButton");
const statusText = document.getElementById("statusText");
const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");

let quotes = {};
let activeRequestId = 0;
let selectedCurrency = "ARS";
let activeInput = selectedCurrency;

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

function getQuoteKey(currencyCode) {
  return `BRL${currencyCode}`;
}

function formatLocalAmount(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function parseLocalAmount(value) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function maskLocalAmount(input) {
  const digits = input.value.replace(/\D/g, "");
  input.value = digits ? formatLocalAmount(Number(digits) / 100) : "";
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
  selectedCountry.textContent = currencyConfig[selectedCurrency].country;
  const selectedFlag = [...flagButtons].find((button) => button.dataset.currency === selectedCurrency);
  document.getElementById("selectedCountryFlag").src = selectedFlag.querySelector("img").getAttribute("src");
  document.getElementById("localAmountFlag").src = selectedFlag.querySelector("img").getAttribute("src");
  flagButtons.forEach((button) => {
    const isActive = button.dataset.currency === selectedCurrency;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  targetAmountLabel.textContent = currencyConfig[selectedCurrency].currencyName;
  targetAmountInput.placeholder = `Ex.: ${selectedCurrency === "ARS" ? "25.000,00" : "200,00"}`;
}

function updateConversion() {
  const quote = quotes[getQuoteKey(selectedCurrency)];
  const sourceInput = activeInput === "BRL" ? amountInput : targetAmountInput;
  const sourceAmount = parseLocalAmount(sourceInput.value);

  if (!quote) {
    exchangeRate.textContent = "--";
    return;
  }

  const rate = Number(quote.bid);
  exchangeRate.textContent = `1 BRL = ${formatRate(rate, selectedCurrency)}`;
  const quoteDate = quote.create_date
    ? new Date(quote.create_date.replace(" ", "T"))
    : new Date(Number(quote.timestamp) * 1000);
  lastUpdated.textContent = formatTimestamp(quoteDate);

  if (!sourceInput.value || Number.isNaN(sourceAmount) || sourceAmount < 0) return;
  const amountInBrl = activeInput === "BRL" ? sourceAmount : sourceAmount / rate;
  const amountInTarget = activeInput === "BRL" ? sourceAmount * rate : sourceAmount;
  const updatedAt = quote.create_date
    ? new Date(quote.create_date.replace(" ", "T"))
    : new Date(Number(quote.timestamp) * 1000);

  if (activeInput === "BRL") {
    targetAmountInput.value = formatLocalAmount(amountInTarget);
  } else {
    amountInput.value = formatLocalAmount(amountInBrl);
  }

  exchangeRate.textContent = `1 BRL = ${formatRate(rate, selectedCurrency)}`;
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
  const label = theme === "dark" ? "Ativar modo claro" : "Ativar modo noturno";
  themeToggleIcon.textContent = theme === "dark" ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
  localStorage.setItem(themeStorageKey, theme);
}

function initializeTheme() {
  const storedTheme = localStorage.getItem(themeStorageKey);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initialTheme = storedTheme || (prefersLight ? "light" : "dark");

  applyTheme(initialTheme);
}

amountInput.addEventListener("input", () => {
  maskLocalAmount(amountInput);
  activeInput = "BRL";
  updateConversion();
});

let keypadInput = amountInput;

const swapCurrencies = document.getElementById("swapCurrencies");
const localCurrencyField = document.getElementById("localCurrencyField");
const brlCurrencyField = document.getElementById("brlCurrencyField");

swapCurrencies.addEventListener("click", () => {
  const form = swapCurrencies.parentElement;
  const localFirst = form.firstElementChild === localCurrencyField;
  const firstField = localFirst ? brlCurrencyField : localCurrencyField;
  const secondField = localFirst ? localCurrencyField : brlCurrencyField;

  form.insertBefore(firstField, form.firstElementChild);
  form.insertBefore(secondField, swapCurrencies);
  keypadInput = firstField.querySelector("input");
});

[amountInput, targetAmountInput].forEach((input) => {
  input.addEventListener("focus", () => {
    keypadInput = input;
  });
});

document.getElementById("numericKeypad").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;

  const key = button.dataset.key;
  let digits = keypadInput.value.replace(/\D/g, "");
  if (key === "clear") {
    amountInput.value = formatLocalAmount(0);
    targetAmountInput.value = formatLocalAmount(0);
    activeInput = keypadInput === amountInput ? "BRL" : selectedCurrency;
    updateConversion();
    return;
  } else if (key === "backspace") {
    digits = digits.slice(0, -1);
  } else {
    digits += key;
  }

  keypadInput.value = digits;
  keypadInput.dispatchEvent(new Event("input", { bubbles: true }));
});

targetAmountInput.addEventListener("input", () => {
  maskLocalAmount(targetAmountInput);
  activeInput = selectedCurrency;
  updateConversion();
});

function setDestinationsExpanded(expanded) {
  destinationToggle.setAttribute("aria-expanded", String(expanded));
  destinationFlags.hidden = !expanded;
}

destinationToggle.addEventListener("click", () => {
  setDestinationsExpanded(destinationFlags.hidden);
});

destinationFlags.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setDestinationsExpanded(false);
    destinationToggle.focus();
  }
});

flagButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (selectedCurrency !== button.dataset.currency) {
      amountInput.value = "";
      targetAmountInput.value = "";
    }
    selectedCurrency = button.dataset.currency;
    activeInput = selectedCurrency;
    syncFlagSelection();
    setDestinationsExpanded(false);
    destinationToggle.focus();
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
