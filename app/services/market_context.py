# =====================================================
# MARKET CONTEXT — SMART VENDOR SYSTEM
# =====================================================
# UPGRADE: Replaced random.uniform/randint with
# deterministic time-aware logic matching dataset.py
# rules. Now demand is reproducible and defensible.
# =====================================================

from datetime import datetime

# =====================================================
# ITEM PROFILES — same as dataset.py
# =====================================================

ITEM_PROFILES = {
    "banana": {
        "base": 40,
        "decay": 0.12,
        "volatility": 0.18,
        "seasonality": "all",
        "peak_time": "morning",
        "weekend_boost": 1.12,
        "base_stock_fresh": 35,
        "base_stock_aging": 80,
    },
    "tomato": {
        "base": 30,
        "decay": 0.18,
        "volatility": 0.25,
        "seasonality": "monsoon",
        "peak_time": "morning",
        "weekend_boost": 1.08,
        "base_stock_fresh": 40,
        "base_stock_aging": 90,
    },
    "onion": {
        "base": 25,
        "decay": 0.04,
        "volatility": 0.12,
        "seasonality": "all",
        "peak_time": "evening",
        "weekend_boost": 1.04,
        "base_stock_fresh": 60,
        "base_stock_aging": 70,
    },
    "potato": {
        "base": 20,
        "decay": 0.03,
        "volatility": 0.10,
        "seasonality": "all",
        "peak_time": "evening",
        "weekend_boost": 1.03,
        "base_stock_fresh": 70,
        "base_stock_aging": 75,
    },
    "mango": {
        "base": 150,
        "decay": 0.15,
        "volatility": 0.30,
        "seasonality": "summer",
        "peak_time": "afternoon",
        "weekend_boost": 1.20,
        "base_stock_fresh": 30,
        "base_stock_aging": 60,
    },
}

# Default profile for unknown items
DEFAULT_PROFILE = {
    "base": 50,
    "decay": 0.10,
    "volatility": 0.15,
    "seasonality": "all",
    "peak_time": "morning",
    "weekend_boost": 1.05,
    "base_stock_fresh": 45,
    "base_stock_aging": 75,
}


def generate_market_context(item_name, freshness):

    now        = datetime.now()
    hour       = now.hour
    month      = now.month
    weekday    = now.weekday()
    minute     = now.minute

    profile = ITEM_PROFILES.get(item_name.lower(), DEFAULT_PROFILE)

    # =====================================================
    # TIME OF DAY
    # =====================================================

    if 5 <= hour < 11:
        time_of_day = "morning"
    elif 11 <= hour < 17:
        time_of_day = "afternoon"
    else:
        time_of_day = "evening"

    # =====================================================
    # SEASON
    # =====================================================

    if month in [3, 4, 5]:
        season = "summer"
    elif month in [6, 7, 8, 9]:
        season = "monsoon"
    else:
        season = "winter"

    # =====================================================
    # WEEKEND
    # =====================================================

    is_weekend = weekday >= 5

    # =====================================================
    # STOCK — deterministic from freshness + time-of-day
    # Fresh produce in the morning = lower stock (sold fast)
    # Aging produce later = higher remaining stock
    # =====================================================

    freshness_pct = freshness  # already 0–100

    if freshness_pct > 80:
        base_stock = profile["base_stock_fresh"]
    else:
        base_stock = profile["base_stock_aging"]

    # Morning = stock depletes faster
    if time_of_day == "morning":
        stock_modifier = -8
    elif time_of_day == "evening":
        stock_modifier = +12
    else:
        stock_modifier = +4

    # Use minute as a stable micro-variation (not truly random)
    micro_var = (minute % 10) - 5   # range: -5 to +4

    stock = max(5, min(120, base_stock + stock_modifier + micro_var))

    # =====================================================
    # DEMAND — deterministic, mirrors dataset.py logic
    # =====================================================

    # Base demand from freshness
    freshness_norm = freshness_pct / 100.0
    base_demand = 0.8 + (freshness_norm * 0.4)   # 0.80 – 1.20

    # Weekend boost
    if is_weekend:
        base_demand *= profile["weekend_boost"]

    # Peak-time boost
    if time_of_day == profile["peak_time"]:
        base_demand *= 1.15

    # In-season boost
    if profile["seasonality"] == season or profile["seasonality"] == "all":
        base_demand *= 1.25

    # Low-freshness demand penalty
    if freshness_pct < 40:
        base_demand *= 0.75

    demand = round(base_demand, 2)

    # =====================================================
    # MARKET NOISE — deterministic from time signals
    # (no more random.uniform — same hour → same noise)
    # =====================================================

    vol = profile["volatility"]

    # Use hour + weekday as a stable deterministic hash
    noise_seed = ((hour * 7 + weekday * 13 + month * 3) % 20) / 100.0
    market_noise = round(1.0 - vol + (noise_seed * vol * 2), 2)
    market_noise = max(round(1.0 - vol, 2), min(round(1.0 + vol, 2), market_noise))

    # =====================================================
    # SPOILAGE HOURS — surface shelf_life in hours
    # =====================================================

    # freshness → approximate hours remaining
    if freshness_pct >= 85:
        spoilage_hours = 72
    elif freshness_pct >= 65:
        spoilage_hours = 48
    elif freshness_pct >= 45:
        spoilage_hours = 24
    elif freshness_pct >= 25:
        spoilage_hours = 12
    else:
        spoilage_hours = 4

    # =====================================================
    # MULTI-LEVEL FRESHNESS GRADE
    # =====================================================

    if freshness_pct >= 90:
        freshness_grade = "Premium Fresh"
    elif freshness_pct >= 75:
        freshness_grade = "Fresh"
    elif freshness_pct >= 55:
        freshness_grade = "Moderate"
    elif freshness_pct >= 35:
        freshness_grade = "Near Spoilage"
    else:
        freshness_grade = "Spoiled"

    # =====================================================
    # SMART RISK ALERTS
    # =====================================================

    alerts = []

    if spoilage_hours <= 12:
        alerts.append("⚠️ Spoilage warning — sell or discard within 12 hours")

    if season == "monsoon" and item_name.lower() == "tomato":
        alerts.append("⚠️ Monsoon season — tomato prices highly volatile")

    if stock > 80 and freshness_pct < 50:
        alerts.append("⚠️ High inventory with low freshness — discount urgently")

    if demand > 1.8 and stock < 20:
        alerts.append("ℹ️ Scarcity condition — consider surge pricing")

    # =====================================================
    # RETURN
    # =====================================================

    return {
        "stock":           stock,
        "demand_score":    demand,
        "market_noise":    market_noise,
        "time_of_day":     time_of_day,
        "season":          season,
        "is_weekend":      is_weekend,
        "spoilage_hours":  spoilage_hours,
        "freshness_grade": freshness_grade,
        "alerts":          alerts,
    }