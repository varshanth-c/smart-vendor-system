# =====================================================
# SIGNAL ENGINE — SMART VENDOR SYSTEM
# =====================================================
# UPGRADES:
# 1. Fruit-agnostic — works with any YOLO class names
#    (no more hardcoded banana-specific class names)
# 2. Confidence threshold from FreshCheck notebook
# 3. Hourly time-decay price multiplier
# 4. Freshness score surfaced as percentage
# =====================================================

from datetime import datetime

# =====================================================
# CLASS NAME NORMALISATION
# Map any YOLO output to freshness categories
# =====================================================

# Any class name containing these keywords maps to category
FRESHNESS_KEYWORD_MAP = {
    "unripe":    ("pre_peak",  75,  0.05, 6),
    "green":     ("pre_peak",  70,  0.05, 7),
    "raw":       ("pre_peak",  70,  0.05, 7),

    "ripe":      ("peak",     100,  0.0,  4),
    "fresh":     ("peak",     100,  0.0,  4),
    "good":      ("peak",      95,  0.05, 4),

    "overripe":  ("post_peak", 45,  0.6,  1),
    "moderate":  ("post_peak", 60,  0.35, 2),
    "aging":     ("post_peak", 55,  0.4,  2),

    "spoiled":   ("spoiled",    5,  1.0,  0),
    "damaged":   ("spoiled",   15,  0.85, 0),
    "rotten":    ("spoiled",    5,  1.0,  0),
    "bad":       ("spoiled",    5,  1.0,  0),
}


def _normalise_class(class_name):
    """
    Map any YOLO class name to
    (category, freshness_weight, risk_weight, shelf_days).
    Falls back to 'standard' values if unknown.
    """
    name_lower = class_name.lower().strip()
    for keyword, values in FRESHNESS_KEYWORD_MAP.items():
        if keyword in name_lower:
            return values
    # Unknown class — treat as moderate
    return ("standard", 65, 0.2, 3)


# =====================================================
# HOURLY TIME DECAY
# =====================================================

def _time_decay_multiplier():
    """
    Returns a price multiplier that decays through the day.
    9 AM fresh scan → 1.00
    3 PM same item  → 0.94  (price should drop)
    8 PM same item  → 0.88  (needs to move urgently)
    This makes pricing a living number, not a snapshot.
    """
    hour = datetime.now().hour

    if hour < 9:
        return 1.02    # Early morning — premium fresh window
    elif hour < 12:
        return 1.00    # Peak morning
    elif hour < 15:
        return 0.97    # Afternoon — slight decay
    elif hour < 18:
        return 0.94    # Evening — discount zone
    else:
        return 0.88    # Night — clear out remaining stock


# =====================================================
# MAIN SIGNAL GENERATOR
# =====================================================

def generate_signals(pred_dict, confidence_threshold=0.65):
    """
    Accepts any YOLO output dict: {class_name: probability}
    Works for banana, tomato, or any future domain.

    confidence_threshold: if top-1 confidence < this AND
    top-2 is adjacent, mark as 'between stages'.
    """

    # =====================================================
    # SORT BY PROBABILITY
    # =====================================================

    sorted_preds = sorted(
        pred_dict.items(),
        key=lambda x: x[1],
        reverse=True
    )

    top1_name, top1_conf = sorted_preds[0]
    top2_name, top2_conf = sorted_preds[1] if len(sorted_preds) > 1 else ("", 0.0)

    # =====================================================
    # CONFIDENCE THRESHOLD — between-stage detection
    # (from FreshCheck notebook improvement)
    # =====================================================

    is_borderline  = False
    borderline_note = None

    if top1_conf < confidence_threshold and top2_conf > 0.15:
        cat1 = _normalise_class(top1_name)[0]
        cat2 = _normalise_class(top2_name)[0]

        stage_order = ["pre_peak", "peak", "post_peak", "spoiled"]
        if cat1 in stage_order and cat2 in stage_order:
            gap = abs(stage_order.index(cat1) - stage_order.index(cat2))
            if gap == 1:
                is_borderline = True
                borderline_note = (
                    f"Between {top1_name} and {top2_name} "
                    f"— confidence {round(top1_conf*100, 1)}%"
                )

    # =====================================================
    # COMPUTE WEIGHTED FRESHNESS + RISK
    # =====================================================

    freshness = 0.0
    risk      = 0.0
    shelf_life = 0.0

    for class_name, prob in pred_dict.items():
        _, fw, rw, sd = _normalise_class(class_name)
        freshness  += prob * fw
        risk       += prob * rw
        shelf_life += prob * sd

    freshness  = round(freshness, 2)
    risk       = round(min(risk, 1.0), 2)
    shelf_life = max(0, round(shelf_life))

    # =====================================================
    # FRESHNESS PERCENTAGE (0–100)
    # =====================================================

    freshness_pct = round(freshness, 1)

    # =====================================================
    # HOURLY DECAY — price should drop as day progresses
    # =====================================================

    time_decay = _time_decay_multiplier()

    # =====================================================
    # QUALITY CATEGORY
    # =====================================================

    if freshness_pct >= 90:
        quality = "premium"
    elif freshness_pct >= 65:
        quality = "standard"
    elif freshness_pct >= 40:
        quality = "aging"
    else:
        quality = "critical"

    # =====================================================
    # URGENCY
    # =====================================================

    # Account for top predicted class directly
    top1_cat = _normalise_class(top1_name)[0]

    if top1_cat == "spoiled" or risk > 0.85:
        urgency = "discard"
    elif risk > 0.6:
        urgency = "clear_fast"
    elif risk > 0.3 or shelf_life <= 1:
        urgency = "discount"
    else:
        urgency = "normal"

    # =====================================================
    # DOMINANT CLASS (fruit-agnostic top prediction)
    # =====================================================

    dominant_class = top1_name
    dominant_conf  = round(top1_conf * 100, 1)

    # =====================================================
    # OUTPUT
    # =====================================================

    return {
        "freshness":        freshness_pct,
        "risk":             risk,
        "quality":          quality,
        "shelf_life":       shelf_life,
        "urgency":          urgency,
        "time_decay":       time_decay,
        "dominant_class":   dominant_class,
        "dominant_conf":    dominant_conf,
        "is_borderline":    is_borderline,
        "borderline_note":  borderline_note,
    }