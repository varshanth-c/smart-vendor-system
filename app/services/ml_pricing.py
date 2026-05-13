import joblib
import pandas as pd


# =========================================
# LOAD TRAINED PIPELINE
# =========================================

pipeline = joblib.load("pricing_model.pkl")


# =========================================
# PREDICT PRICE
# =========================================

def predict_price(input_data):

    # -------------------------------------
    # DATAFRAME
    # -------------------------------------

    df = pd.DataFrame([input_data])

    # -------------------------------------
    # BASE PRICE
    # -------------------------------------

    base_price = float(
        input_data["base_price"]
    )

    # -------------------------------------
    # MODEL PREDICTION
    # -------------------------------------

    raw_price = float(
        pipeline.predict(df)[0]
    )

    # -------------------------------------
    # BUSINESS CONSTRAINTS
    # -------------------------------------
    # Prevent unrealistic ML outputs

    min_price = base_price * 0.75
    max_price = base_price * 1.25

    final_price = max(
        min(raw_price, max_price),
        min_price
    )

    # -------------------------------------
    # ROUND
    # -------------------------------------

    final_price = round(final_price, 2)

    return final_price