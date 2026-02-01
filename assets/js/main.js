document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // Data model (single source of truth)
  // -----------------------------
  const incomeRanges = {
    "15000-20000": {
      takeHome: 1350,
      costs: 1200
    },
    "20000-25000": {
      takeHome: 1600,
      costs: 1350
    },
    "25000-30000": {
      takeHome: 1950,
      costs: 1620
    },
    "30000-40000": {
      takeHome: 2400,
      costs: 1850
    },
    "40000-50000": {
      takeHome: 2850,
      costs: 2100
    },
    "50000+": {
      takeHome: 3300,
      costs: 2350
    }
  };

  // -----------------------------
  // DOM references
  // -----------------------------
  const incomeButtons = document.querySelectorAll(".income-options button");
  const takeHomeEl = document.getElementById("takeHome");
  const monthlyCostsEl = document.getElementById("monthlyCosts");
  const remainingEl = document.getElementById("remaining");

  // -----------------------------
  // Helpers
  // -----------------------------
  const formatCurrency = value =>
    `£${value.toLocaleString()} / month`;

  const updateSnapshot = (rangeKey) => {
    const range = incomeRanges[rangeKey];
    if (!range) return;

    const remaining = range.takeHome - range.costs;

    takeHomeEl.textContent = formatCurrency(range.takeHome);
    monthlyCostsEl.textContent = formatCurrency(range.costs);
    remainingEl.textContent = formatCurrency(remaining);
  };

  const setActiveButton = (activeButton) => {
    incomeButtons.forEach(button => {
      const isActive = button === activeButton;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive);
    });
  };

  // -----------------------------
  // Event binding
  // -----------------------------
  incomeButtons.forEach(button => {
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      const rangeKey = button.dataset.income;
      setActiveButton(button);
      updateSnapshot(rangeKey);
    });
  });

  // -----------------------------
  // Initialise default state
  // -----------------------------
  const defaultButton =
    document.querySelector(".income-options button.active") ||
    incomeButtons[0];

  if (defaultButton) {
    const defaultKey = defaultButton.dataset.income;
    setActiveButton(defaultButton);
    updateSnapshot(defaultKey);
  }
});