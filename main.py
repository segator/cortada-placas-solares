import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from solar_calc import (
    ScenarioInput, calculate_scenario,
    TOTAL_PANELS, TOTAL_KWP, TOTAL_PRODUCTION_Y1_KWH, TOTAL_COST_IVA,
    TOTAL_DWELLINGS, COMMON_ENERGY_RATIO, PRIVATE_ENERGY_RATIO,
    COMMON_COST_TOTAL, PRIVATE_COST_TOTAL,
    AUTOCONSUMO_COMMON, AUTOCONSUMO_PRIVATE,
    ELECTRICITY_PRICE, EXCEDENTES_PRICE,
    ELECTRICITY_PRICE_INCREASE, PANEL_DEGRADATION, PROJECT_LIFETIME_YEARS,
    FINANCING_MONTHS, FINANCING_TIN, FINANCING_TAE, FINANCING_NOTARY,
    MAINTENANCE_ANNUAL, MAINTENANCE_PER_OWNER,
    IBI_BONIFICATION_RATE, IBI_BONIFICATION_YEARS, IBI_CAP_RATIO, AVG_ANNUAL_IBI,
    IRPF_DEDUCTION_PCT, IRPF_MAX_BASE,
    _calc_financing, _calc_cashflow,
)

app = FastAPI(title="Solar Benet Cortada")

# Resolve frontend directory relative to this file (works locally and on Railway)
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "static"

# Household profiles for the "types of home" section
PROFILES = [
    {
        "id": "low",
        "name": "Poco consumo",
        "desc": "Casi no est\u00e1 en casa, viaja mucho o es una persona sola",
        "icon": "\u2708\ufe0f",
        "annual_kwh": 2500,
        "monthly_bill": round(2500 * 0.20 / 12),
        "autoconsumo_rate_24": 0.40,   # con 28 participantes, le toca poca solar → usa el 40%
        "autoconsumo_rate_few": 0.20,  # con pocos participantes le toca MUCHA solar, pero no está en casa → solo usa el 20%
    },
    {
        "id": "wfh",
        "name": "Familia / mucho AC",
        "desc": "Familia numerosa o AC a tope en verano. Siempre hay alguien en casa",
        "icon": "\U0001f3e0",
        "annual_kwh": 6000,
        "monthly_bill": round(6000 * 0.20 / 12),
        "autoconsumo_rate_24": 0.65,
        "autoconsumo_rate_few": 0.60,
    },
    {
        "id": "ev",
        "name": "Coche el\u00e9ctrico",
        "desc": "Carga el coche en casa, consumo alto",
        "icon": "\U0001f697",
        "annual_kwh": 7000,
        "monthly_bill": round(7000 * 0.20 / 12),
        "autoconsumo_rate_24": 0.75,
        "autoconsumo_rate_few": 0.70,
    },
]

BLENDED_PRICE = 0.20  # realistic blended EUR/kWh
EXCEDENTES_PRICE = 0.05  # compensation for surplus energy fed back to grid


@app.get("/api/constants")
def get_constants():
    """Devuelve todas las constantes del proyecto para que el frontend no tenga valores hardcodeados."""
    monthly_total = _calc_financing(TOTAL_COST_IVA)
    total_paid = round(monthly_total * FINANCING_MONTHS, 2)
    total_interest = round(total_paid - TOTAL_COST_IVA, 2)
    total_with_financing = round(TOTAL_COST_IVA + total_interest + FINANCING_NOTARY, 0)
    return {
        # Instalación
        "total_panels": TOTAL_PANELS,
        "total_kwp": TOTAL_KWP,
        "total_production_kwh": TOTAL_PRODUCTION_Y1_KWH,
        "total_cost": TOTAL_COST_IVA,
        "total_dwellings": TOTAL_DWELLINGS,
        "common_ratio_pct": round(COMMON_ENERGY_RATIO * 100),
        "private_ratio_pct": round(PRIVATE_ENERGY_RATIO * 100),
        # Autoconsumo
        "autoconsumo_common_pct": round(AUTOCONSUMO_COMMON * 100),
        "autoconsumo_private_pct": round(AUTOCONSUMO_PRIVATE * 100),
        "electricity_price": ELECTRICITY_PRICE,
        "excedentes_price": EXCEDENTES_PRICE,
        # Proyecciones
        "electricity_price_increase_pct": round(ELECTRICITY_PRICE_INCREASE * 100, 1),
        "panel_degradation_pct": round(PANEL_DEGRADATION * 100, 1),
        "project_lifetime_years": PROJECT_LIFETIME_YEARS,
        # Financiación
        "financing_months": FINANCING_MONTHS,
        "financing_tin_pct": round(FINANCING_TIN * 100, 2),
        "financing_tae_pct": round(FINANCING_TAE * 100, 2),
        "financing_notary": FINANCING_NOTARY,
        "loan_monthly_total": round(monthly_total, 2),
        "loan_total_interest": total_interest,
        "loan_total_paid": total_paid,
        "loan_total_with_financing": total_with_financing,
        # Mantenimiento
        "maintenance_annual": MAINTENANCE_ANNUAL,
        "maintenance_per_owner": round(MAINTENANCE_ANNUAL / TOTAL_DWELLINGS, 0),
        # IBI
        "avg_annual_ibi": AVG_ANNUAL_IBI,
        "ibi_bonification_rate_pct": round(IBI_BONIFICATION_RATE * 100),
        "ibi_bonification_years": IBI_BONIFICATION_YEARS,
        "ibi_cap_pct": round(IBI_CAP_RATIO * 100),
        # IRPF
        "irpf_pct": round(IRPF_DEDUCTION_PCT * 100),
        "irpf_max_base": IRPF_MAX_BASE,
    }


@app.get("/api/scenario")
def get_scenario(participants: int = 24, avg_ibi: float = 900):
    return calculate_scenario(ScenarioInput(
        num_private_participants=participants,
        avg_annual_ibi=avg_ibi,
    ))


@app.get("/api/compare")
def compare_scenarios(avg_ibi: float = 900):
    counts = [2, 4, 8, 12, 16, 20, 24]
    return {
        str(n): calculate_scenario(ScenarioInput(
            num_private_participants=n,
            avg_annual_ibi=avg_ibi,
        ))
        for n in counts
    }


@app.get("/api/profiles")
def get_profiles(participants: int = 24):
    n = max(1, min(participants, TOTAL_DWELLINGS))
    solar_pp = TOTAL_PRODUCTION_Y1_KWH * PRIVATE_ENERGY_RATIO / n

    # Inversión y IBI para un participante con n personas (igual para todos los perfiles)
    comm_cost_pp = COMMON_COST_TOTAL / TOTAL_DWELLINGS
    priv_cost_pp = PRIVATE_COST_TOTAL / n
    total_investment = comm_cost_pp + priv_cost_pp

    ibi_raw = AVG_ANNUAL_IBI * IBI_BONIFICATION_RATE
    cap = total_investment * IBI_CAP_RATIO
    ibi_annual = min(ibi_raw * IBI_BONIFICATION_YEARS, cap) / IBI_BONIFICATION_YEARS

    results = []
    for p in PROFILES:
        ac_rate = p["autoconsumo_rate_24"] if n >= 20 else p["autoconsumo_rate_few"]
        self_consumed = min(solar_pp * ac_rate, p["annual_kwh"])
        excedentes_kwh = solar_pp - self_consumed
        annual_bill = p["annual_kwh"] * BLENDED_PRICE

        # Autoconsumo: evita comprar kWh a red (siempre ≤ factura porque self_consumed ≤ annual_kwh)
        savings_autoconsumo = self_consumed * BLENDED_PRICE
        # Excedentes: compensación por verter a red (ingreso adicional, mostrar por separado)
        savings_excedentes = excedentes_kwh * EXCEDENTES_PRICE

        # Para DISPLAY: solo la reducción de factura (nunca puede ser > factura)
        savings_monthly = savings_autoconsumo / 12
        new_monthly = max((annual_bill - savings_autoconsumo) / 12, 0)
        pct_saved = (savings_autoconsumo / annual_bill) * 100 if annual_bill > 0 else 0

        # Para PAYBACK: beneficio económico total (autoconsumo + excedentes = dinero real ganado)
        total_economic_benefit = savings_autoconsumo + savings_excedentes

        # Payback real: inversión total (com+priv) vs beneficio económico total + IBI - mantenimiento
        _, payback_yrs, net_25y = _calc_cashflow(
            total_investment, total_economic_benefit, ibi_annual, MAINTENANCE_PER_OWNER
        )

        results.append({
            "id": p["id"],
            "name": p["name"],
            "desc": p["desc"],
            "icon": p["icon"],
            "annual_kwh": p["annual_kwh"],
            "monthly_bill_before": round(annual_bill / 12, 0),
            "monthly_bill_after": round(new_monthly, 0),
            "savings_monthly": round(savings_monthly, 0),
            "savings_annual": round(savings_autoconsumo, 0),
            "pct_saved": round(pct_saved, 0),
            "solar_kwh_used": round(self_consumed, 0),
            "excedentes_kwh": round(excedentes_kwh, 0),
            "excedentes_eur": round(savings_excedentes, 0),
            "payback_years": payback_yrs,
            "net_benefit_25y": round(net_25y, 0),
            "total_investment": round(total_investment, 0),
        })

    return {"participants": n, "solar_kwh_per_participant": round(solar_pp, 0), "profiles": results}


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
