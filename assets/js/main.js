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