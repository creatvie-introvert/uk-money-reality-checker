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

    const STORAGE_KEY = "selectedIncomeRange";

    const REGION_STORAGE_KEY = "selectedRegion";

    const REGION_MULTIPLIERS = {
        outside: 1,
        london: 1.25
    };

    let currentRegion = "outside";

    const lifestyleMapping = (remaining) => {
        if (remaining < 200) return ["tight"];
        if (remaining < 400) return ["tight", "cautious"];
        if (remaining < 700) return ["cautious", "flexible"];
        return ["flexible", "comfortable"];
    };

    // -----------------------------
    // DOM references
    // -----------------------------
    const incomeButtons = document.querySelectorAll(".income-options button");
    const takeHomeEl = document.getElementById("takeHome");
    const monthlyCostsEl = document.getElementById("monthlyCosts");
    const remainingEl = document.getElementById("remaining");
    const snapshotSection = document.querySelector(".monthly-snapshot");
    const regionButtons = document.querySelectorAll(".region-options button");
    const householdButtons = document.querySelectorAll(".household-options button");
    
    let previousValues = {
        takeHome: null,
        costs: null,
        remaining: null
    };

    // -----------------------------
    // Helpers
    // -----------------------------
    const formatCurrency = value =>
        `£${value.toLocaleString()} / month`;

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const animateNumber = (element, from, to) => {
        if (prefersReducedMotion || from === to) {
            element.textContent = formatCurrency(to);
            return;
        }

        const duration = 300;
        const start = performance.now();

        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const value = Math.round(from + (to - from) * progress);

            element.textContent = formatCurrency(value);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    };

    const updateLifestyleContext = (remaining) => {
        const cards = document.querySelectorAll(".lifestyle-cards article");
        const relevantLevels = lifestyleMapping(remaining);

        cards.forEach(card => {
            const level = card.dataset.level;
            const isRelevant = relevantLevels.includes(level);

            card.classList.toggle("highlighted", isRelevant);
            card.classList.toggle("deemphasised", !isRelevant);
        });
    };

    const updateSnapshot = (rangeKey) => {
        const range = incomeRanges[rangeKey];
        if (!range) return;

        const regionMultiplier = REGION_MULTIPLIERS[currentRegion] || 1;
        const adjustedCosts = Math.round(range.costs * regionMultiplier);

        const newValues = {
            takeHome: range.takeHome,
            costs: adjustedCosts,
            remaining: range.takeHome - adjustedCosts,
        };

        animateNumber(
            takeHomeEl,
            previousValues.takeHome ?? newValues.takeHome,
            newValues.takeHome
        );

        animateNumber(
            monthlyCostsEl,
            previousValues.costs ?? newValues.costs,
            newValues.costs
        );

        animateNumber(
            remainingEl,
            previousValues.remaining ?? newValues.remaining,
            newValues.remaining
        );

        previousValues = newValues;

        updateLifestyleContext(newValues.remaining);

        snapshotSection.classList.add("updated");

        setTimeout(() => {
            snapshotSection.classList.remove("updated");
        }, 200);
    };

    const setActiveButton = (activeButton) => {
        incomeButtons.forEach(button => {
            const isActive = button === activeButton;

            button.classList.toggle("active", isActive);
            button.setAttribute("aria-checked", isActive);
            button.setAttribute("tabindex", isActive ? "0" : "-1");
        });
    };

    // -----------------------------
    // Event binding
    // -----------------------------
    incomeButtons.forEach((button, index) => {
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.setAttribute("tabindex", index === 0 ? "0" : "-1");

        const activateButton = () => {
            const rangeKey = button.dataset.income;

            setActiveButton(button);
            updateSnapshot(rangeKey);

            try {
                localStorage.setItem(STORAGE_KEY, rangeKey);
            } catch (e) {
                // Fail silently if storage is unavailable
            }
        };

        button.addEventListener("click", activateButton);

        button.addEventListener("keydown", (event) => {
            let newIndex = null;

            switch (event.key) {
                case "ArrowRight":
                case "ArrowDown":
                    newIndex = (index + 1) % incomeButtons.length;
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    newIndex = (index - 1 + incomeButtons.length) % incomeButtons.length;
                    break;
                case "Enter":
                case " ":
                    event.preventDefault();
                    activateButton();
                    return;
                default:
                    return;
            }

            event.preventDefault();
            incomeButtons[newIndex].focus();
        });
    });

    regionButtons.forEach((button, index) => {
        button.setAttribute("tabindex", index === 0 ? "0" : "-1");

        const activateRegion = () => {
            regionButtons.forEach(btn => {
                const isActive = btn === button;
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-checked", isActive);
                btn.setAttribute("tabindex", isActive ? "0" : "-1");
            });

            currentRegion = button.dataset.region;

            try {
                localStorage.setItem(REGION_STORAGE_KEY, currentRegion);
            } catch {}

            const activeIncome =
                document.querySelector(".income-options button.active")?.dataset.income;

            if (activeIncome) {
                updateSnapshot(activeIncome);
            }
        };

        button.addEventListener("click", activateRegion);

        button.addEventListener("keydown", (event) => {
            let newIndex = null;

            switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                newIndex = (index + 1) % regionButtons.length;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                newIndex = (index - 1 + regionButtons.length) % regionButtons.length;
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                activateRegion();
                return;
            default:
                return;
            }

            event.preventDefault();
            regionButtons[newIndex].focus();
        });
    });

    householdButtons.forEach((button, index) => {
        button.setAttribute("tabindex", index === 0 ? "0" : "-1");

        const activateHousehold = () => {
            householdButtons.forEach(btn => {
            const isActive = btn === button;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-checked", isActive);
            btn.setAttribute("tabindex", isActive ? "0" : "-1");
            });

            // UI only for now (no calculations yet)
        };

        button.addEventListener("click", activateHousehold);

        button.addEventListener("keydown", (event) => {
            let newIndex = null;

            switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                newIndex = (index + 1) % householdButtons.length;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                newIndex = (index - 1 + householdButtons.length) % householdButtons.length;
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                activateHousehold();
                return;
            default:
                return;
            }

            event.preventDefault();
            householdButtons[newIndex].focus();
        });
    });

    // -----------------------------
    // Initialise default state
    // -----------------------------
    // Restore region selection (default: outside)
    try {
        const savedRegion = localStorage.getItem(REGION_STORAGE_KEY);
        const defaultRegionBtn =
            document.querySelector(`.region-options button[data-region="${savedRegion}"]`) ||
            document.querySelector('.region-options button.active') ||
            regionButtons[0];

        if (defaultRegionBtn) {
            defaultRegionBtn.click();
        }
    } catch {}
    let savedRange = null;

    try {
        savedRange = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        savedRange = null;
    }

    const defaultButton =
        document.querySelector(`.income-options button[data-income="${savedRange}"]`) ||
        document.querySelector(".income-options button.active") ||
        incomeButtons[0];

    if (defaultButton) {
        const defaultKey = defaultButton.dataset.income;
        setActiveButton(defaultButton);
        updateSnapshot(defaultKey);
    }
});