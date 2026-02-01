document.addEventListener("DOMContentLoaded", () => {
    const incomeButtons = document.querySelectorAll(".income-options button");

    const takeHomeEl = document.getElementById("takeHome");
    const monthlyCostsEl = document.getElementById("monthlyCosts");
    const remainingEl = document.getElementById("remaining");

    const incomeData = {
        "15000-20000": { takeHome: 1350, costs: 1200 },
        "20000-25000": { takeHome: 1600, costs: 1350 },
        "25000-30000": { takeHome: 1950, costs: 1620 },
        "30000-40000": { takeHome: 2400, costs: 1850 },
        "40000-50000": { takeHome: 2850, costs: 2100 },
        "50000+": { takeHome: 3300, costs: 2350 }
    };

    incomeButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Remove active state
            incomeButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const key = button.dataset.income;
            const data = incomeData[key];

            if (!data) return;

            const remaining = data.takeHome - data.costs;

            takeHomeEl.textContent = `£${data.takeHome.toLocaleString()} / month`;
            monthlyCostsEl.textContent = `£${data.costs.toLocaleString()} / month`;
            remainingEl.textContent = `£${remaining.toLocaleString()} / month`;
        });
    });
});