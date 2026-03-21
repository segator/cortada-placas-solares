from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from solar_calc import ScenarioInput, calculate_scenario, TOTAL_PRODUCTION_Y1_KWH, PRIVATE_ENERGY_RATIO

app = FastAPI(title="Solar Benet Cortada")

# Household profiles for the "types of home" section
PROFILES = [
    {
        "id": "low",
        "name": "Poco consumo",
        "desc": "Casi no est\u00e1 en casa, viaja mucho o es una persona sola",
        "icon": "\u2708\ufe0f",
        "annual_kwh": 2000,
        "monthly_bill": 33,
        "autoconsumo_rate_24": 0.40,
        "autoconsumo_rate_few": 0.50,
    },
    {
        "id": "wfh",
        "name": "Familia / mucho AC",
        "desc": "Familia numerosa o AC a tope en verano. Siempre hay alguien en casa",
        "icon": "\U0001f3e0",
        "annual_kwh": 4000,
        "monthly_bill": 67,
        "autoconsumo_rate_24": 0.65,
        "autoconsumo_rate_few": 0.60,
    },
    {
        "id": "ev",
        "name": "Coche el\u00e9ctrico",
        "desc": "Carga el coche en casa, consumo alto",
        "icon": "\U0001f697",
        "annual_kwh": 7000,
        "monthly_bill": 117,
        "autoconsumo_rate_24": 0.75,
        "autoconsumo_rate_few": 0.70,
    },
]

BLENDED_PRICE = 0.20  # realistic blended EUR/kWh
EXCEDENTES_PRICE = 0.05  # compensation for surplus energy fed back to grid


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
    n = max(1, min(participants, 24))
    solar_pp = TOTAL_PRODUCTION_Y1_KWH * PRIVATE_ENERGY_RATIO / n

    results = []
    for p in PROFILES:
        ac_rate = p["autoconsumo_rate_24"] if n >= 20 else p["autoconsumo_rate_few"]
        self_consumed = min(solar_pp * ac_rate, p["annual_kwh"])
        excedentes_kwh = solar_pp - self_consumed
        savings_autoconsumo = self_consumed * BLENDED_PRICE
        savings_excedentes = excedentes_kwh * EXCEDENTES_PRICE
        savings_annual = savings_autoconsumo + savings_excedentes
        savings_monthly = savings_annual / 12
        annual_bill = p["annual_kwh"] * BLENDED_PRICE
        new_monthly = max((annual_bill - savings_annual) / 12, 0)
        pct_saved = (savings_annual / annual_bill) * 100 if annual_bill > 0 else 0

        results.append({
            "id": p["id"],
            "name": p["name"],
            "desc": p["desc"],
            "icon": p["icon"],
            "annual_kwh": p["annual_kwh"],
            "monthly_bill_before": round(annual_bill / 12, 0),
            "monthly_bill_after": round(new_monthly, 0),
            "savings_monthly": round(savings_monthly, 0),
            "savings_annual": round(savings_annual, 0),
            "pct_saved": round(pct_saved, 0),
            "solar_kwh_used": round(self_consumed, 0),
            "excedentes_kwh": round(excedentes_kwh, 0),
            "excedentes_eur": round(savings_excedentes, 0),
        })

    return {"participants": n, "solar_kwh_per_participant": round(solar_pp, 0), "profiles": results}


app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")
