from main import get_scenario

r = get_scenario(24, 900)
print("=== 24 participantes ===")
print("  Coste comunitario/prop:", r.community.cost_per_dwelling, "EUR  (era 707 con 24 dwellings)")
print("  Cuota comunitaria/mes:", r.financing.monthly_community_only, "EUR/mes  (1 de 28)")
print("  Cuota privativa/mes:", r.financing.monthly_private_only, "EUR/mes  (1 de 24)")
print("  Total participante/mes:", round(r.financing.monthly_community_only + r.financing.monthly_private_only, 2), "EUR/mes")

r4 = get_scenario(4, 900)
print("=== 4 participantes ===")
print("  Cuota comunitaria/mes:", r4.financing.monthly_community_only, "EUR/mes  (misma, 28 propietarios)")
print("  Cuota privativa/mes:", r4.financing.monthly_private_only, "EUR/mes  (1 de 4)")
print("  Total participante/mes:", round(r4.financing.monthly_community_only + r4.financing.monthly_private_only, 2), "EUR/mes")

