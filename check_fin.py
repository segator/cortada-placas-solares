import sys
sys.stdout.reconfigure(line_buffering=True)

from solar_calc import _calc_financing, TOTAL_COST_IVA, COMMON_ENERGY_RATIO, TOTAL_DWELLINGS, FINANCING_TIN

monthly_total = _calc_financing(TOTAL_COST_IVA)
monthly_comm_total = monthly_total * COMMON_ENERGY_RATIO
mp_comm = monthly_comm_total / TOTAL_DWELLINGS

print("TIN usado:              " + str(round(FINANCING_TIN*100, 2)) + "%")
print("Cuota TOTAL mensual:    " + str(round(monthly_total, 2)) + " EUR  (esperado 1.221,60)")
print("Cuota comunitaria 41%:  " + str(round(monthly_comm_total, 2)) + " EUR  (esperado ~500,86)")
print("Cuota/propietario (28): " + str(round(mp_comm, 2)) + " EUR  (esperado ~17,88)")
print("Intereses totales:      " + str(round(monthly_total*36 - TOTAL_COST_IVA, 2)) + " EUR  (esperado ~2.538)")

