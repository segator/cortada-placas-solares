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
let _constants = null;

// ── Init ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    const slider = document.getElementById("participants");
    const sliderVal = document.getElementById("slider-val");

    slider.addEventListener("input", () => {
        sliderVal.textContent = slider.value;
        loadScenario(parseInt(slider.value));
    });

    await loadConstants();   // primero: necesario para que _constants esté listo
    loadScenario(28);
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

async function loadConstants() {
    const res = await fetch("/api/constants");
    _constants = await res.json();
    updateConstants(_constants);
}

function updateConstants(c) {
    const set = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    // ── Hero ───────────────────────────────────────────────
    set("hero-panels",      c.total_panels);
    set("hero-kwp",         fmtDec(c.total_kwp, 2));
    set("hero-kwh",         fmt(c.total_production_kwh));
    set("hero-cost",        fmt(c.total_cost) + " \u20ac");
    set("hero-cost-fin",    fmt(c.loan_total_with_financing) + " \u20ac");

    // ── Info cards ─────────────────────────────────────────
    set("info-prod",        `<strong>Producci\u00f3n:</strong> ${fmt(c.total_production_kwh)} kWh/a\u00f1o`);
    set("info-split",       `<strong>Reparto:</strong> ${c.common_ratio_pct}% com\u00fan \u00b7 ${c.private_ratio_pct}% privado`);
    set("info-ac-common",   `<strong>Autoconsumo com\u00fan:</strong> ${c.autoconsumo_common_pct}%`);
    set("info-ac-private",  `<strong>Autoconsumo privado:</strong> ${c.autoconsumo_private_pct}%`);
    set("info-price-light", `<strong>Subida luz estimada:</strong> +${c.electricity_price_increase_pct}% anual`);
    set("info-degradation", `<strong>Degradaci\u00f3n paneles:</strong> ${c.panel_degradation_pct}% anual`);
    set("info-fin-months",  `<strong>Plazo:</strong> ${c.financing_months} meses`);
    set("info-fin-tin",     `<strong>TIN:</strong> ${fmtDec(c.financing_tin_pct, 2)}%`);
    set("info-fin-tae",     `<strong>TAE:</strong> ${fmtDec(c.financing_tae_pct, 2)}%`);
    set("info-maint-total", `<strong>Coste anual comunidad:</strong> ${fmt(c.maintenance_annual)} \u20ac/a\u00f1o`);
    set("info-maint-pp",    `<strong>Por vecino:</strong> ~${fmt(c.maintenance_per_owner)} \u20ac/a\u00f1o`);
    set("info-ibi-rate",    `<strong>IBI:</strong> ${c.ibi_bonification_rate_pct}% durante ${c.ibi_bonification_years} a\u00f1os (Sant Cugat)`);
    set("info-ibi-cap",     `<strong>L\u00edmite IBI:</strong> ${c.ibi_cap_pct}% del coste instalaci\u00f3n`);
    set("info-irpf-rate",   `<strong>IRPF:</strong> ${c.irpf_pct}-60% del coste (renta)`);

    // ── KPI subs ───────────────────────────────────────────
    set("comm-monthly-sub", `estimada a ${c.financing_months} meses, 0 \u20ac entrada`);
    set("priv-monthly-sub", `parte extra privativa \u00b7 ${c.financing_months} meses`);
    // ── Loan box ───────────────────────────────────────────
    set("loan-monthly",  fmtDec(c.loan_monthly_total, 2) + " \u20ac");
    set("loan-tin",      fmtDec(c.financing_tin_pct, 2) + "%");
    set("loan-tae",      fmtDec(c.financing_tae_pct, 2) + "%");
    set("loan-interest", fmtDec(c.loan_total_interest, 2) + " \u20ac");
    set("loan-notary",   `Notar\u00eda: ${fmtDec(c.financing_notary, 2)} \u20ac`);

    // ── Nota de supuestos ──────────────────────────────────
    set("assumptions-note",
        `* Los c\u00e1lculos asumen una <strong>subida del precio de la electricidad del ${c.electricity_price_increase_pct}% anual</strong> ` +
        `y una degradaci\u00f3n de los paneles del ${c.panel_degradation_pct}% anual. ` +
        `Cuanto m\u00e1s suba la luz, m\u00e1s ahorras con las placas.`);

    // ── Footer ─────────────────────────────────────────────
    set("foot-panels",      `${c.total_panels} paneles LONGi 450W = ${fmtDec(c.total_kwp, 2)} kWp`);
    set("foot-prod",        `Producci\u00f3n a\u00f1o 1: ${fmt(c.total_production_kwh)} kWh`);
    set("foot-cost",        `Coste total (IVA incl.): ${fmt(c.total_cost)} \u20ac`);
    set("foot-split",       `Reparto: ${c.common_ratio_pct}% com\u00fan / ${c.private_ratio_pct}% privado`);
    set("foot-ac-common",   `Autoconsumo zonas comunes: ${c.autoconsumo_common_pct}%`);
    set("foot-ac-private",  `Autoconsumo viviendas: ${c.autoconsumo_private_pct}%`);
    set("foot-price-kwh",   `Precio medio electricidad: ${c.electricity_price.toFixed(2)} \u20ac/kWh`);
    set("foot-exc-kwh",     `Compensaci\u00f3n excedentes: ${c.excedentes_price.toFixed(2)} \u20ac/kWh`);
    set("foot-price-inc",   `Subida precio luz: +${c.electricity_price_increase_pct}% anual`);
    set("foot-degradation", `Degradaci\u00f3n paneles: -${c.panel_degradation_pct}% anual`);
    set("foot-lifetime",    `Vida \u00fatil: ${c.project_lifetime_years} a\u00f1os`);
    set("foot-fin-months",  `Financiaci\u00f3n: ${c.financing_months} meses, 0 \u20ac entrada`);
    set("foot-fin-rates",   `TIN: ${fmtDec(c.financing_tin_pct, 2)}% \u00b7 TAE: ${fmtDec(c.financing_tae_pct, 2)}%`);
    set("foot-maint",       `Mantenimiento: ${fmt(c.maintenance_annual)} \u20ac/a\u00f1o (~${fmt(c.maintenance_per_owner)} \u20ac/vecino)`);
    set("foot-ibi-avg",     `IBI estimado medio: ${fmt(c.avg_annual_ibi)} \u20ac/a\u00f1o`);
    set("foot-ibi-ded",     `IBI Sant Cugat: ${c.ibi_bonification_rate_pct}% \u00d7 ${c.ibi_bonification_years} a\u00f1os`);
    set("foot-ibi-cap",     `Tope IBI: ${c.ibi_cap_pct}% del coste instalaci\u00f3n`);
    set("foot-irpf",        `IRPF: ${c.irpf_pct}% (puede ser 40-60%)`);
    set("foot-irpf-max",    `Tope base IRPF: ${fmt(c.irpf_max_base)} \u20ac/a\u00f1o`);
}

async function loadComparison() {    const res = await fetch("/api/compare");
    const data = await res.json();
    updateCompareChart(data);
}

// ── Update everything ───────────────────────────────────────
function updateAll(d) {
    // Community KPIs
    document.getElementById("comm-cost").textContent = fmt(d.community.cost_per_dwelling) + " \u20ac";
    document.getElementById("comm-monthly").textContent = fmtDec(d.financing.monthly_community_only, 2) + " \u20ac/mes";
    document.getElementById("comm-savings").textContent = fmt(d.community.net_savings_y1) + " \u20ac";
    document.getElementById("comm-savings-sub").textContent =
        `bruto: ${fmt(d.community.savings_eur_y1)} \u20ac - mant: ${d.community.maitenance_community_annual} \u20ac`;
    document.getElementById("comm-pct").textContent = fmtDec(d.community.savings_pct) + "%";
    document.getElementById("comm-energy").textContent = fmt(d.community.energy_produced_kwh);
    document.getElementById("comm-payback").textContent = fmtDec(d.payback_non_participant, 1) + " años";

    // Private KPIs
    document.getElementById("priv-cost").textContent = fmt(d.private.cost_per_participant) + " \u20ac";
    document.getElementById("priv-cost-sub").textContent =
        `entre ${d.num_participants} participantes`;
    document.getElementById("priv-monthly").textContent = fmtDec(d.financing.monthly_private_only, 2) + " \u20ac/mes";
    document.getElementById("priv-savings").textContent = fmt(d.private.savings_eur_y1) + " \u20ac";
    document.getElementById("priv-energy").textContent = fmt(d.private.energy_produced_kwh);

    const total = d.total_production_kwh;
    document.getElementById("comm-energy-pct").textContent =
        fmtDec(d.community.energy_produced_kwh / total * 100, 1) + "% de la instalaci\u00f3n";
    document.getElementById("priv-energy-pct").textContent =
        fmtDec(d.private.energy_produced_kwh / total * 100, 1) + "% por propietario";

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

    // Totals — Solo comunitaria
    document.getElementById("tot-cost-no").textContent     = fmt(d.total_cost_non_participant) + " \u20ac";
    const netNo = d.total_cost_non_participant - d.ibi.total_7y_no_private - d.irpf.deduction_no_private;
    document.getElementById("tot-net-no").textContent      = fmt(Math.max(0, netNo)) + " \u20ac";
    document.getElementById("tot-net-no-detail").textContent =
        `-${fmt(d.ibi.total_7y_no_private)} \u20ac IBI \u00b7 -${fmt(d.irpf.deduction_no_private)} \u20ac IRPF`;
    document.getElementById("tot-energy-no").textContent   = "+" + fmt(d.energy_savings_y1_non_participant) + " \u20ac/a\u00f1o";
    document.getElementById("tot-ibi-no").textContent      = "+" + fmt(d.ibi_savings_y1_non_participant) + " \u20ac/a\u00f1o";
    document.getElementById("tot-payback-no").textContent  = fmtDec(d.payback_non_participant) + " a\u00f1os";
    document.getElementById("tot-cuota-no").textContent    = fmtDec(d.financing.monthly_community_only, 2) + " \u20ac/mes";
    document.getElementById("tot-benef-no").textContent    = "+" + fmt(d.net_benefit_25y_non_participant) + " \u20ac";

    // Totals — Comunitaria + Privativa
    document.getElementById("tot-cost-yes").textContent    = fmt(d.total_cost_participant) + " \u20ac";
    const netYes = d.total_cost_participant - d.ibi.total_7y_with_private - d.irpf.deduction_with_private;
    document.getElementById("tot-net-yes").textContent     = fmt(Math.max(0, netYes)) + " \u20ac";
    document.getElementById("tot-net-yes-detail").textContent =
        `-${fmt(d.ibi.total_7y_with_private)} \u20ac IBI \u00b7 -${fmt(d.irpf.deduction_with_private)} \u20ac IRPF`;
    document.getElementById("tot-energy-yes").textContent  = "+" + fmt(d.energy_savings_y1_participant) + " \u20ac/a\u00f1o";
    document.getElementById("tot-ibi-yes").textContent     = "+" + fmt(d.ibi_savings_y1_participant) + " \u20ac/a\u00f1o";
    document.getElementById("tot-payback-yes").innerHTML =
        `<a href="#perfiles" style="color:#10b981;font-weight:600;text-decoration:none;">Ver según tu perfil ↓</a>`;
    document.getElementById("tot-cuota-yes").textContent   = fmtDec(d.financing.monthly_community_only + d.financing.monthly_private_only, 2) + " \u20ac/mes";
    document.getElementById("tot-benef-yes").textContent   = "+" + fmt(d.net_benefit_25y_participant) + " \u20ac";

    // Charts - COMENTADO POR SIMPLICIDAD
    // updateCashflowChart(d);
    // updateEnergyChart(d);
    // updateSavingsChart(d);
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
                <div class="profile-payback">
                    <span class="payback-label">Recuperas la inversión</span>
                    <span class="payback-years">${fmtDec(p.payback_years, 1)} años</span>
                </div>
                <div class="profile-net25">Beneficio neto a 25 años: <strong>+${fmt(p.net_benefit_25y)} \u20ac</strong></div>
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
