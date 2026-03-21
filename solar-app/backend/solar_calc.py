"""
Solar calculator — Benet Cortada.

Separates community (comunitaria) and private (privativa) parts clearly.

Community part:
  - Paid by ALL 24 dwellings (it's a community expense).
  - Powers common areas: elevators, lighting, pumps.
  - Savings reduce the community electricity bill for everyone.

Private part:
  - Paid only by participating neighbors.
  - Powers individual dwellings.
  - Savings reduce each participant's personal electricity bill.

IBI bonification:
  - Sant Cugat: 50% of IBI for 7 years.
  - Capped at 60% of YOUR total installation cost.
  - A neighbor who only pays the community part has a lower cap.
  - A neighbor who also pays the private part has a higher cap → more IBI back.

Vendor reference (24 participants, ~3% coefficient):
  Total cost: 41,439 EUR | Per owner: 1,231 EUR
  Energy savings Y1 (net of maint): 109 EUR | IBI Y1: 64 EUR
  Community net savings Y1: 3,003 EUR | Maintenance: 560 EUR/year
"""

from pydantic import BaseModel

# ── Project constants ────────────────────────────────────────

TOTAL_PANELS = 59
TOTAL_KWP = 26.47
TOTAL_PRODUCTION_Y1_KWH = 30_996
TOTAL_COST_IVA = 41_439
TOTAL_DWELLINGS = 24

COMMON_ENERGY_RATIO = 0.41
PRIVATE_ENERGY_RATIO = 0.59
AUTOCONSUMO_COMMON = 0.65
AUTOCONSUMO_PRIVATE = 0.54

COMMON_CONSUMPTION_KWH = 15_146
PRIVATE_CONSUMPTION_KWH = 25_486  # all 24 dwellings combined

ELECTRICITY_PRICE_INCREASE = 0.02
PANEL_DEGRADATION = 0.004

# IBI Sant Cugat
IBI_BONIFICATION_RATE = 0.50  # 50% of your IBI bill
IBI_BONIFICATION_YEARS = 7
IBI_CAP_RATIO = 0.60  # max 60% of installation cost
AVG_ANNUAL_IBI = 900  # estimated average IBI bill in Sant Cugat

# Maintenance
MAINTENANCE_COMMUNITY_ANNUAL = 560  # total community
MAINTENANCE_PER_OWNER = 17  # vendor stated

# Financing
FINANCING_MONTHS = 36
FINANCING_TAE = 0.048

# IRPF deduction (Spain, obras hasta 31/12/2025)
# 20% if reduces heating/cooling demand by 7%
# 40% if reduces non-renewable consumption by 30% or reaches class A/B
# 60% for building-wide energy rehabilitation
# Max deductible base: 5,000 EUR/year (individual), 7,500 for 60%
IRPF_DEDUCTION_PCT = 0.20  # conservative: 20%
IRPF_MAX_BASE = 5_000  # max deductible base per year

PROJECT_LIFETIME_YEARS = 25

# ── Vendor-calibrated baseline (24 participants) ─────────────
# Dwelling share of total = 1,231 * 24 = 29,544 EUR
# Common cost = 41% of dwelling share, Private = 59%
VENDOR_PER_OWNER_24 = 1_231
DWELLING_SHARE = VENDOR_PER_OWNER_24 * TOTAL_DWELLINGS

COMMON_COST_TOTAL = DWELLING_SHARE * COMMON_ENERGY_RATIO   # ~12,113
PRIVATE_COST_TOTAL = DWELLING_SHARE * PRIVATE_ENERGY_RATIO  # ~17,431

# Vendor: per-owner gross energy savings at 24 = 109 + 17 = 126 EUR
# Split: common share (fixed) + private share (scales with participants)
VENDOR_GROSS_SAVINGS_PP_24 = 126.0
COMMON_SAVINGS_PP = VENDOR_GROSS_SAVINGS_PP_24 * COMMON_ENERGY_RATIO   # ~51.66
PRIVATE_SAVINGS_PP_24 = VENDOR_GROSS_SAVINGS_PP_24 * PRIVATE_ENERGY_RATIO  # ~74.34
PRIVATE_SAVINGS_POOL = PRIVATE_SAVINGS_PP_24 * TOTAL_DWELLINGS  # total private savings

# Energy figures
AC_COMMON_KWH = TOTAL_PRODUCTION_Y1_KWH * COMMON_ENERGY_RATIO * AUTOCONSUMO_COMMON
AC_PRIVATE_KWH = TOTAL_PRODUCTION_Y1_KWH * PRIVATE_ENERGY_RATIO * AUTOCONSUMO_PRIVATE


class ScenarioInput(BaseModel):
    num_private_participants: int
    avg_annual_ibi: float = AVG_ANNUAL_IBI


class CommunityDetail(BaseModel):
    """What every neighbor pays/gets from the community part."""
    cost_per_dwelling: float
    energy_produced_kwh: float
    autoconsumo_kwh: float
    excedentes_kwh: float
    savings_pct: float  # % of common bill covered
    savings_eur_y1: float  # gross energy savings
    maintenance_per_dwelling: float
    net_savings_y1: float  # after maintenance


class PrivateDetail(BaseModel):
    """What each PARTICIPANT pays/gets from the private part."""
    cost_per_participant: float
    energy_produced_kwh: float
    autoconsumo_kwh: float
    excedentes_kwh: float
    savings_pct: float  # % of personal bill covered
    savings_eur_y1: float  # gross energy savings


class IBIDetail(BaseModel):
    """IBI bonification depends on total investment."""
    annual_ibi_bill: float
    bonification_rate: float
    bonification_annual_no_private: float  # only community investment
    bonification_annual_with_private: float  # community + private investment
    total_7y_no_private: float
    total_7y_with_private: float
    cap_no_private: float
    cap_with_private: float
    capped_no_private: bool
    capped_with_private: bool


class IRPFDetail(BaseModel):
    """IRPF deduction for solar installation (20-60% of cost)."""
    deduction_pct: float  # applied percentage
    deduction_no_private: float  # amount if only community
    deduction_with_private: float  # amount if community + private
    max_base: float  # max deductible base (5,000 EUR/year)


class FinancingDetail(BaseModel):
    monthly_community_only: float
    monthly_with_private: float
    total_cost_community_only: float
    total_cost_with_private: float


class MaintenanceDetail(BaseModel):
    community_annual: float  # total community maintenance
    per_dwelling_annual: float  # per dwelling share


class ScenarioResult(BaseModel):
    num_participants: int
    total_dwellings: int
    total_project_cost: float

    community: CommunityDetail
    private: PrivateDetail
    ibi: IBIDetail
    irpf: IRPFDetail
    financing: FinancingDetail
    maintenance: MaintenanceDetail

    # Combined per-participant totals
    total_cost_participant: float  # community + private
    total_cost_non_participant: float  # community only
    total_savings_y1_participant: float
    total_savings_y1_non_participant: float

    payback_participant: float
    payback_non_participant: float
    net_benefit_25y_participant: float
    net_benefit_25y_non_participant: float
    roi_25y_participant: float
    roi_25y_non_participant: float

    yearly_cashflow_participant: list[dict]
    yearly_cashflow_non_participant: list[dict]


def _calc_financing(amount: float) -> float:
    mr = FINANCING_TAE / 12
    if mr > 0 and amount > 0:
        return amount * (mr * (1 + mr) ** FINANCING_MONTHS) / ((1 + mr) ** FINANCING_MONTHS - 1)
    return amount / FINANCING_MONTHS if amount > 0 else 0


def _calc_cashflow(investment: float, gross_energy_y1: float, ibi_annual: float, maint: float):
    yearly = []
    cum = -investment
    payback_yr = None

    for yr in range(1, PROJECT_LIFETIME_YEARS + 1):
        deg = (1 - PANEL_DEGRADATION) ** (yr - 1)
        px = (1 + ELECTRICITY_PRICE_INCREASE) ** (yr - 1)

        e_sav = gross_energy_y1 * deg * px
        ibi_sav = ibi_annual if yr <= IBI_BONIFICATION_YEARS else 0
        net = e_sav + ibi_sav - maint
        cum += net

        mp = _calc_financing(investment)
        fin = mp * 12 if yr <= 3 else 0

        yearly.append({
            "year": yr,
            "energy_saving": round(e_sav, 2),
            "ibi_saving": round(ibi_sav, 2),
            "maintenance": round(maint, 2),
            "financing_payment": round(fin, 2),
            "net_cashflow": round(net, 2),
            "cumulative": round(cum, 2),
        })

        if payback_yr is None and cum >= 0:
            payback_yr = yr

    if payback_yr is None:
        payback_yr = PROJECT_LIFETIME_YEARS + 1

    if payback_yr > 1 and payback_yr <= PROJECT_LIFETIME_YEARS:
        prev = yearly[payback_yr - 2]["cumulative"]
        cur_net = yearly[payback_yr - 1]["net_cashflow"]
        payback = (payback_yr - 1) + (-prev / cur_net) if cur_net > 0 else float(payback_yr)
    elif payback_yr == 1:
        payback = 1.0
    else:
        payback = float(PROJECT_LIFETIME_YEARS + 1)

    net_25y = yearly[-1]["cumulative"]
    return yearly, round(payback, 1), round(net_25y, 2)


def calculate_scenario(inp: ScenarioInput) -> ScenarioResult:
    n = max(1, min(inp.num_private_participants, TOTAL_DWELLINGS))
    avg_ibi = inp.avg_annual_ibi

    # ══════════════════════════════════════════════════════════
    # COMMUNITY PART (paid by all 24)
    # ══════════════════════════════════════════════════════════
    comm_cost_pp = COMMON_COST_TOTAL / TOTAL_DWELLINGS
    comm_energy = TOTAL_PRODUCTION_Y1_KWH * COMMON_ENERGY_RATIO
    comm_ac = AC_COMMON_KWH
    comm_exc = comm_energy - comm_ac
    comm_sav_pct = (comm_ac / COMMON_CONSUMPTION_KWH * 100) if COMMON_CONSUMPTION_KWH else 0
    comm_sav_eur = COMMON_SAVINGS_PP  # per dwelling
    comm_net_y1 = comm_sav_eur - MAINTENANCE_PER_OWNER

    # ══════════════════════════════════════════════════════════
    # PRIVATE PART (paid by n participants)
    # ══════════════════════════════════════════════════════════
    priv_cost_pp = PRIVATE_COST_TOTAL / n
    priv_energy = TOTAL_PRODUCTION_Y1_KWH * PRIVATE_ENERGY_RATIO
    priv_energy_pp = priv_energy / n
    priv_ac_pp = AC_PRIVATE_KWH / n
    priv_exc = priv_energy - AC_PRIVATE_KWH
    priv_cons_pp = PRIVATE_CONSUMPTION_KWH / TOTAL_DWELLINGS
    priv_sav_pct = min((priv_ac_pp / priv_cons_pp * 100) if priv_cons_pp else 0, 100)
    priv_sav_eur = PRIVATE_SAVINGS_POOL / n  # scales with fewer participants

    # ══════════════════════════════════════════════════════════
    # IBI — depends on total investment
    # ══════════════════════════════════════════════════════════
    ibi_raw_annual = avg_ibi * IBI_BONIFICATION_RATE

    # Non-participant: only community cost
    cap_no_priv = comm_cost_pp * IBI_CAP_RATIO
    ibi_7y_no_priv_raw = ibi_raw_annual * IBI_BONIFICATION_YEARS
    capped_no_priv = ibi_7y_no_priv_raw > cap_no_priv
    ibi_7y_no_priv = min(ibi_7y_no_priv_raw, cap_no_priv)
    ibi_annual_no_priv = ibi_7y_no_priv / IBI_BONIFICATION_YEARS

    # Participant: community + private cost
    total_pp = comm_cost_pp + priv_cost_pp
    cap_with_priv = total_pp * IBI_CAP_RATIO
    ibi_7y_with_priv_raw = ibi_raw_annual * IBI_BONIFICATION_YEARS
    capped_with_priv = ibi_7y_with_priv_raw > cap_with_priv
    ibi_7y_with_priv = min(ibi_7y_with_priv_raw, cap_with_priv)
    ibi_annual_with_priv = ibi_7y_with_priv / IBI_BONIFICATION_YEARS

    # ══════════════════════════════════════════════════════════
    # IRPF — deduction on income tax
    # ══════════════════════════════════════════════════════════
    irpf_base_no_priv = min(comm_cost_pp, IRPF_MAX_BASE)
    irpf_base_with_priv = min(total_pp, IRPF_MAX_BASE)
    irpf_no_priv = irpf_base_no_priv * IRPF_DEDUCTION_PCT
    irpf_with_priv = irpf_base_with_priv * IRPF_DEDUCTION_PCT

    # ══════════════════════════════════════════════════════════
    # FINANCING
    # ══════════════════════════════════════════════════════════
    mp_comm = _calc_financing(comm_cost_pp)
    mp_total = _calc_financing(total_pp)

    # ══════════════════════════════════════════════════════════
    # CASHFLOWS
    # ══════════════════════════════════════════════════════════

    # Participant: community savings + private savings + IBI (with private)
    gross_participant = comm_sav_eur + priv_sav_eur
    cf_part, payback_part, net25_part = _calc_cashflow(
        total_pp, gross_participant, ibi_annual_with_priv, MAINTENANCE_PER_OWNER
    )

    # Non-participant: community savings only + IBI (community only)
    cf_nopart, payback_nopart, net25_nopart = _calc_cashflow(
        comm_cost_pp, comm_sav_eur, ibi_annual_no_priv, MAINTENANCE_PER_OWNER
    )

    # Totals Y1
    total_y1_part = (gross_participant - MAINTENANCE_PER_OWNER) + ibi_annual_with_priv
    total_y1_nopart = comm_net_y1 + ibi_annual_no_priv

    roi_part = (net25_part / total_pp * 100) if total_pp > 0 else 0
    roi_nopart = (net25_nopart / comm_cost_pp * 100) if comm_cost_pp > 0 else 0

    return ScenarioResult(
        num_participants=n,
        total_dwellings=TOTAL_DWELLINGS,
        total_project_cost=TOTAL_COST_IVA,
        community=CommunityDetail(
            cost_per_dwelling=round(comm_cost_pp, 2),
            energy_produced_kwh=round(comm_energy, 0),
            autoconsumo_kwh=round(comm_ac, 0),
            excedentes_kwh=round(comm_exc, 0),
            savings_pct=round(comm_sav_pct, 1),
            savings_eur_y1=round(comm_sav_eur, 2),
            maintenance_per_dwelling=MAINTENANCE_PER_OWNER,
            net_savings_y1=round(comm_net_y1, 2),
        ),
        private=PrivateDetail(
            cost_per_participant=round(priv_cost_pp, 2),
            energy_produced_kwh=round(priv_energy_pp, 0),
            autoconsumo_kwh=round(priv_ac_pp, 0),
            excedentes_kwh=round(priv_exc / n, 0),
            savings_pct=round(priv_sav_pct, 1),
            savings_eur_y1=round(priv_sav_eur, 2),
        ),
        ibi=IBIDetail(
            annual_ibi_bill=avg_ibi,
            bonification_rate=IBI_BONIFICATION_RATE,
            bonification_annual_no_private=round(ibi_annual_no_priv, 2),
            bonification_annual_with_private=round(ibi_annual_with_priv, 2),
            total_7y_no_private=round(ibi_7y_no_priv, 2),
            total_7y_with_private=round(ibi_7y_with_priv, 2),
            cap_no_private=round(cap_no_priv, 2),
            cap_with_private=round(cap_with_priv, 2),
            capped_no_private=capped_no_priv,
            capped_with_private=capped_with_priv,
        ),
        irpf=IRPFDetail(
            deduction_pct=IRPF_DEDUCTION_PCT,
            deduction_no_private=round(irpf_no_priv, 2),
            deduction_with_private=round(irpf_with_priv, 2),
            max_base=IRPF_MAX_BASE,
        ),
        financing=FinancingDetail(
            monthly_community_only=round(mp_comm, 2),
            monthly_with_private=round(mp_total, 2),
            total_cost_community_only=round(mp_comm * FINANCING_MONTHS, 2),
            total_cost_with_private=round(mp_total * FINANCING_MONTHS, 2),
        ),
        maintenance=MaintenanceDetail(
            community_annual=MAINTENANCE_COMMUNITY_ANNUAL,
            per_dwelling_annual=MAINTENANCE_PER_OWNER,
        ),
        total_cost_participant=round(total_pp, 2),
        total_cost_non_participant=round(comm_cost_pp, 2),
        total_savings_y1_participant=round(total_y1_part, 2),
        total_savings_y1_non_participant=round(total_y1_nopart, 2),
        payback_participant=payback_part,
        payback_non_participant=payback_nopart,
        net_benefit_25y_participant=net25_part,
        net_benefit_25y_non_participant=net25_nopart,
        roi_25y_participant=round(roi_part, 1),
        roi_25y_non_participant=round(roi_nopart, 1),
        yearly_cashflow_participant=cf_part,
        yearly_cashflow_non_participant=cf_nopart,
    )
