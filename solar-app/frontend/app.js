// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
const fmtDec = (n, d = 1) =>
    n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

const C = {
    green: "#10b981",
    greenLight: "#34d399",
    blue: "#3b82f6",
    blueLight: "#93c5fd",
    dark: "#0f172a",
    gold: "#f59e0b",
    red: "#ef4444",
    gray: "#94a3b8",
    grayLight: "#e2e8f0",
};

let chartCashflow, chartEnergy, chartCompare, chartSavings;

// ── Init ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("participants");
    const sliderVal = document.getElementById("slider-val");

    slider.addEventListener("input", () => {
        sliderVal.textContent = slider.value;
        loadScenario(parseInt(slider.value));
    });

    loadScenario(24);
    loadComparison();
});

async function loadScenario(n) {
    const [scenarioRes, profilesRes] = await Promise.all([
        fetch(`/api/scenario?participants=${n}`),
        fetch(`/api/profiles?participants=${n}`),
    ]);
    const d = await scenarioRes.json();
    const profiles = await profilesRes.json();
    updateAll(d);
    updateProfiles(profiles);
}

async function loadComparison() {
    const res = await fetch("/api/compare");
    const data = await res.json();
    updateCompareChart(data);
}

// ── Update everything ───────────────────────────────────────
function updateAll(d) {
    // Community KPIs
    document.getElementById("comm-cost").textContent = fmt(d.community.cost_per_dwelling) + " \u20ac";
    document.getElementById("comm-savings").textContent = fmt(d.community.net_savings_y1) + " \u20ac";
    document.getElementById("comm-savings-sub").textContent =
        `bruto: ${fmt(d.community.savings_eur_y1)} \u20ac - mant: ${d.community.maintenance_per_dwelling} \u20ac`;
    document.getElementById("comm-pct").textContent = fmtDec(d.community.savings_pct) + "%";
    document.getElementById("comm-energy").textContent = fmt(d.community.autoconsumo_kwh);

    // Private KPIs
    document.getElementById("priv-cost").textContent = fmt(d.private.cost_per_participant) + " \u20ac";
    document.getElementById("priv-cost-sub").textContent =
        `entre ${d.num_participants} participantes`;
    document.getElementById("priv-savings").textContent = fmt(d.private.savings_eur_y1) + " \u20ac";
    document.getElementById("priv-pct").textContent = fmtDec(d.private.savings_pct) + "%";
    document.getElementById("priv-energy").textContent = fmt(d.private.autoconsumo_kwh);

    // IBI
    document.getElementById("ibi-no-priv").textContent =
        fmt(d.ibi.total_7y_no_private) + " \u20ac";
    document.getElementById("ibi-no-priv-detail").textContent =
        `Dejas de pagar ${fmt(d.ibi.bonification_annual_no_private)} \u20ac/a\u00f1o de IBI \u00d7 7 a\u00f1os` +
        (d.ibi.capped_no_private ? " (tope 60% del coste)" : "");
    document.getElementById("ibi-with-priv").textContent =
        fmt(d.ibi.total_7y_with_private) + " \u20ac";
    document.getElementById("ibi-with-priv-detail").textContent =
        `Dejas de pagar ${fmt(d.ibi.bonification_annual_with_private)} \u20ac/a\u00f1o de IBI \u00d7 7 a\u00f1os` +
        (d.ibi.capped_with_private ? " (tope 60% del coste)" : "");

    const diff = d.ibi.total_7y_with_private - d.ibi.total_7y_no_private;
    document.getElementById("ibi-explainer").innerHTML =
        `<strong>Participar en la privativa te permite dejar de pagar ${fmt(diff)} \u20ac m\u00e1s de IBI</strong> ` +
        `porque tu inversi\u00f3n es mayor (${fmt(d.total_cost_participant)} \u20ac vs ${fmt(d.total_cost_non_participant)} \u20ac) ` +
        `y el tope del 60% sube proporcionalmente.`;

    // IRPF
    document.getElementById("irpf-no-priv").textContent =
        fmt(d.irpf.deduction_no_private) + " \u20ac";
    document.getElementById("irpf-with-priv").textContent =
        fmt(d.irpf.deduction_with_private) + " \u20ac";

    // Totals
    document.getElementById("tot-cost-no").textContent = fmt(d.total_cost_non_participant) + " \u20ac";
    document.getElementById("tot-sav-no").textContent = "+" + fmt(d.total_savings_y1_non_participant) + " \u20ac";
    document.getElementById("tot-payback-no").textContent = fmtDec(d.payback_non_participant) + " a\u00f1os";
    document.getElementById("tot-cuota-no").textContent = fmtDec(d.financing.monthly_community_only, 2) + " \u20ac/mes";
    document.getElementById("tot-benef-no").textContent = "+" + fmt(d.net_benefit_25y_non_participant) + " \u20ac";

    document.getElementById("tot-cost-yes").textContent = fmt(d.total_cost_participant) + " \u20ac";
    document.getElementById("tot-sav-yes").textContent = "+" + fmt(d.total_savings_y1_participant) + " \u20ac";
    document.getElementById("tot-payback-yes").textContent = fmtDec(d.payback_participant) + " a\u00f1os";
    document.getElementById("tot-cuota-yes").textContent = fmtDec(d.financing.monthly_with_private, 2) + " \u20ac/mes";
    document.getElementById("tot-benef-yes").textContent = "+" + fmt(d.net_benefit_25y_participant) + " \u20ac";

    // Charts
    updateCashflowChart(d);
    updateEnergyChart(d);
    updateSavingsChart(d);
}

// ── Cashflow: participant vs non-participant ────────────────
function updateCashflowChart(d) {
    const ctx = document.getElementById("chart-cashflow");
    const labels = d.yearly_cashflow_participant.map((y) => y.year);

    if (chartCashflow) chartCashflow.destroy();
    chartCashflow = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Participante (comunitaria + privativa)",
                    data: d.yearly_cashflow_participant.map((y) => y.cumulative),
                    borderColor: C.green,
                    backgroundColor: C.green + "15",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    borderWidth: 3,
                },
                {
                    label: "No participante (solo comunitaria)",
                    data: d.yearly_cashflow_non_participant.map((y) => y.cumulative),
                    borderColor: C.blue,
                    backgroundColor: C.blue + "10",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    borderWidth: 3,
                    borderDash: [6, 4],
                },
            ],
        },
        options: {
            responsive: true,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { position: "bottom" },
                tooltip: {
                    callbacks: {
                        title: (items) => `A\u00f1o ${items[0].label}`,
                        label: (ctx) => `${ctx.dataset.label}: ${fmtDec(ctx.parsed.y, 0)} \u20ac`,
                    },
                },
            },
            scales: {
                y: {
                    ticks: { callback: (v) => fmt(v) + " \u20ac" },
                    grid: { color: C.grayLight },
                },
                x: {
                    title: { display: true, text: "A\u00f1o" },
                    ticks: {
                        callback: function (val, idx) {
                            const yr = idx + 1;
                            return yr % 3 === 0 || yr === 1 || yr === 25 ? yr : "";
                        },
                    },
                },
            },
        },
    });
}

// ── Energy Doughnut ─────────────────────────────────────────
function updateEnergyChart(d) {
    const ctx = document.getElementById("chart-energy");
    if (chartEnergy) chartEnergy.destroy();
    chartEnergy = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: [
                `Autoconsumo com\u00fan (${fmt(d.community.autoconsumo_kwh)} kWh)`,
                `Autoconsumo privado (${fmt(d.private.autoconsumo_kwh)} kWh)`,
                `Excedentes com\u00fan (${fmt(d.community.excedentes_kwh)} kWh)`,
                `Excedentes privado (${fmt(d.private.excedentes_kwh)} kWh)`,
            ],
            datasets: [
                {
                    data: [
                        d.community.autoconsumo_kwh,
                        d.private.autoconsumo_kwh * d.num_participants,
                        d.community.excedentes_kwh,
                        d.private.excedentes_kwh * d.num_participants,
                    ],
                    backgroundColor: [C.blue, C.green, C.blueLight, C.greenLight],
                    borderWidth: 2,
                    borderColor: "#fff",
                },
            ],
        },
        options: {
            responsive: true,
            cutout: "55%",
            plugins: {
                legend: { position: "bottom", labels: { font: { size: 11 }, padding: 14 } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return `${ctx.label}: ${pct}%`;
                        },
                    },
                },
            },
        },
    });
}

// ── Compare Bar Chart ───────────────────────────────────────
function updateCompareChart(data) {
    const ctx = document.getElementById("chart-compare");
    const keys = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));
    const labels = keys.map((k) => `${k} vec.`);

    if (chartCompare) chartCompare.destroy();
    chartCompare = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Parte comunitaria (\u20ac)",
                    data: keys.map((k) => data[k].total_cost_non_participant),
                    backgroundColor: C.blue + "80",
                    borderRadius: 4,
                    yAxisID: "y",
                },
                {
                    label: "Parte privativa (\u20ac)",
                    data: keys.map((k) => data[k].private.cost_per_participant),
                    backgroundColor: C.green + "80",
                    borderRadius: 4,
                    yAxisID: "y",
                },
                {
                    label: "Amortizaci\u00f3n (a\u00f1os)",
                    data: keys.map((k) => data[k].payback_participant),
                    type: "line",
                    borderColor: C.gold,
                    backgroundColor: C.gold,
                    pointRadius: 6,
                    borderWidth: 3,
                    yAxisID: "y1",
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    position: "left",
                    ticks: { callback: (v) => fmt(v) + " \u20ac" },
                    grid: { color: C.grayLight },
                },
                y1: {
                    position: "right",
                    min: 0,
                    max: 15,
                    ticks: { callback: (v) => v + " a\u00f1os" },
                    grid: { display: false },
                },
            },
        },
    });
}

// ── Household Profiles ──────────────────────────────────────
function updateProfiles(data) {
    const grid = document.getElementById("profiles-grid");
    grid.innerHTML = data.profiles
        .map((p) => `
            <div class="profile-card">
                <div class="profile-icon">${p.icon}</div>
                <div class="profile-name">${p.name}</div>
                <div class="profile-desc">${p.desc}</div>
                <div class="profile-bills">
                    <span class="bill-before">${fmt(p.monthly_bill_before)} \u20ac/mes</span>
                    <span class="bill-arrow">\u2192</span>
                    <span class="bill-after">${fmt(p.monthly_bill_after)} \u20ac/mes</span>
                </div>
                <div class="profile-saving">Ahorras ${fmt(p.savings_monthly)} \u20ac/mes (${fmt(p.pct_saved)}% de tu factura)</div>
                <div class="profile-detail">${fmt(p.solar_kwh_used)} kWh autoconsumidos + ${fmt(p.excedentes_kwh)} kWh excedentes (${fmt(p.excedentes_eur)} \u20ac compensados)</div>
            </div>
        `)
        .join("");
}

// ── Savings Stacked Bar (participant) ───────────────────────
function updateSavingsChart(d) {
    const ctx = document.getElementById("chart-savings");
    const years = d.yearly_cashflow_participant.slice(0, 10);
    const labels = years.map((y) => `A\u00f1o ${y.year}`);

    if (chartSavings) chartSavings.destroy();
    chartSavings = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Ahorro energ\u00eda",
                    data: years.map((y) => y.energy_saving),
                    backgroundColor: C.green,
                    borderRadius: 4,
                },
                {
                    label: "Bonificaci\u00f3n IBI",
                    data: years.map((y) => y.ibi_saving),
                    backgroundColor: C.gold,
                    borderRadius: 4,
                },
                {
                    label: "Mantenimiento",
                    data: years.map((y) => -y.maintenance),
                    backgroundColor: C.red + "80",
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    ticks: { callback: (v) => fmt(v) + " \u20ac" },
                    grid: { color: C.grayLight },
                },
            },
        },
    });
}
