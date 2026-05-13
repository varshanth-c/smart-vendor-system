def smart_price(base_price, signals, demand_level="medium"):

    freshness = signals["freshness"]
    risk = signals["risk"]

    # -------- Base multiplier --------
    if freshness > 80:
        freshness_mult = 1.1
    elif freshness > 60:
        freshness_mult = 1.0
    elif freshness > 40:
        freshness_mult = 0.85
    else:
        freshness_mult = 0.7

    # -------- Risk penalty --------
    risk_penalty = 1 - risk

    # -------- Demand --------
    if demand_level == "high":
        demand_mult = 1.1
    elif demand_level == "low":
        demand_mult = 0.9
    else:
        demand_mult = 1.0

    price = base_price * freshness_mult * risk_penalty * demand_mult

    # Clamp
    min_price = base_price * 0.75
    max_price = base_price * 1.25

    price = max(min(price, max_price), min_price)

    return round(price, 2)