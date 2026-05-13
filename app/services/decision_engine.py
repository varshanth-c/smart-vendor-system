def make_decision(signals, final_price, base_price):

    freshness = signals["freshness"]
    risk = signals["risk"]
    urgency = signals["urgency"]
    quality = signals["quality"]
    shelf_life = signals["shelf_life"]

    # =========================================
    # PRICE MOVEMENT
    # =========================================

    price_ratio = final_price / base_price

    # =========================================
    # CRITICAL CASE
    # =========================================

    if urgency == "discard" or risk > 0.85:

        return {
            "action": "DISCARD",
            "priority": "critical"
        }

    # =========================================
    # FAST CLEARANCE
    # =========================================

    if urgency == "clear_fast":

        return {
            "action": "CLEARANCE_SALE",
            "priority": "high"
        }

    # =========================================
    # PREMIUM SELL
    # =========================================

    if (
        quality == "premium"
        and price_ratio >= 1.05
        and shelf_life >= 3
    ):

        return {
            "action": "SELL_PREMIUM",
            "priority": "normal"
        }

    # =========================================
    # NORMAL SELL
    # =========================================

    if (
        quality == "standard"
        and risk < 0.4
    ):

        return {
            "action": "SELL_STANDARD",
            "priority": "normal"
        }

    # =========================================
    # DISCOUNT
    # =========================================

    if (
        quality == "aging"
        or shelf_life <= 2
    ):

        return {
            "action": "DISCOUNT_FAST",
            "priority": "medium"
        }

    # =========================================
    # FALLBACK
    # =========================================

    return {
        "action": "CLEARANCE",
        "priority": "high"
    }