def generate_signals(pred_dict):

    # =========================================
    # EXTRACT
    # =========================================

    unripe = pred_dict.get("unripe", 0)
    ripe = pred_dict.get("ripe", 0)
    overripe = pred_dict.get("overripe", 0)
    spoiled = pred_dict.get("spoiled", 0)

    # =========================================
    # FRESHNESS SCORE
    # =========================================
    # ripe is most sellable
    # unripe is fresh but not peak-ready
    # spoiled heavily penalized

    freshness = (
        unripe * 75 +
        ripe * 100 +
        overripe * 45 +
        spoiled * 5
    )

    freshness = round(freshness, 2)

    # =========================================
    # SPOILAGE RISK
    # =========================================

    risk = (
        overripe * 0.6 +
        spoiled * 1.0
    )

    risk = min(risk, 1.0)

    # =========================================
    # SELL QUALITY
    # =========================================

    if freshness >= 85:
        quality = "premium"

    elif freshness >= 65:
        quality = "standard"

    elif freshness >= 40:
        quality = "aging"

    else:
        quality = "critical"

    # =========================================
    # ESTIMATED SHELF LIFE
    # =========================================

    shelf_life = (
        unripe * 6 +
        ripe * 4 +
        overripe * 1
    )

    shelf_life = max(0, round(shelf_life))

    # =========================================
    # SELL URGENCY
    # =========================================

    if spoiled > 0.4:
        urgency = "discard"

    elif risk > 0.6:
        urgency = "clear_fast"

    elif risk > 0.3:
        urgency = "discount"

    else:
        urgency = "normal"

    # =========================================
    # OUTPUT
    # =========================================

    return {

        "freshness": freshness,

        "risk": round(risk, 2),

        "quality": quality,

        "shelf_life": shelf_life,

        "urgency": urgency
    }