# =====================================================
# ML PRICING — SMART VENDOR SYSTEM
# =====================================================
# FIX: Price floor is now freshness-aware.
# Spoiled/critical items can go below 0.75x base.
# The old flat 0.75 floor meant spoiled items were
# still priced at 75% of base — incorrect behaviour.
# =====================================================

import joblib
import pandas as pd


# =====================================================
# LOAD TRAINED PIPELINE
# =====================================================

pipeline = joblib.load("pricing_model.pkl")


# =====================================================
# FRESHNESS-AWARE PRICE FLOOR
# =====================================================

def _get_price_floor(base_price, freshness_pct):
    """
    Price floor scales down with freshness.
    Fresh item  (>80%)   -> floor at 75% of base (original)
    Aging       (40-80%) -> floor at 50% of base
    Near spoil  (20-40%) -> floor at 25% of base
    Spoiled     (<20%)   -> floor at 5%  of base
                           (near-zero, but non-negative for
                            any bulk/compost recovery value)
    """
    if freshness_pct > 80:
        return base_price * 0.75
    elif freshness_pct > 40:
        return base_price * 0.50
    elif freshness_pct > 20:
        return base_price * 0.25
    else:
        return base_price * 0.05   # spoiled -- near zero


# =====================================================
# PREDICT PRICE
# =====================================================

def predict_price(input_data):

    df         = pd.DataFrame([input_data])
    base_price = float(input_data["base_price"])
    freshness  = float(input_data.get("freshness", 100))

    # XGBoost prediction
    raw_price = float(pipeline.predict(df)[0])

    # Freshness-aware constraints
    min_price = _get_price_floor(base_price, freshness)
    max_price = base_price * 1.25

    final_price = max(min(raw_price, max_price), min_price)

    return round(final_price, 2)