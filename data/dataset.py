import csv
import random
from datetime import datetime, timedelta

# =========================================
# REALISTIC MARKET SIMULATION DATASET
# INDUSTRY-STYLE PRICING BEHAVIOR
# =========================================

ITEMS = [
    {
        "name": "banana",
        "base": 40,
        "decay": 0.12,
        "volatility": 0.18,
        "seasonality": "all",
        "peak_time": "morning",
        "weekend_boost": 1.12
    },
    {
        "name": "tomato",
        "base": 30,
        "decay": 0.18,
        "volatility": 0.25,
        "seasonality": "monsoon",
        "peak_time": "morning",
        "weekend_boost": 1.08
    },
    {
        "name": "onion",
        "base": 25,
        "decay": 0.04,
        "volatility": 0.12,
        "seasonality": "all",
        "peak_time": "evening",
        "weekend_boost": 1.04
    },
    {
        "name": "potato",
        "base": 20,
        "decay": 0.03,
        "volatility": 0.10,
        "seasonality": "all",
        "peak_time": "evening",
        "weekend_boost": 1.03
    },
    {
        "name": "carrot",
        "base": 35,
        "decay": 0.10,
        "volatility": 0.16,
        "seasonality": "winter",
        "peak_time": "morning",
        "weekend_boost": 1.10
    },
    {
        "name": "cabbage",
        "base": 28,
        "decay": 0.08,
        "volatility": 0.14,
        "seasonality": "winter",
        "peak_time": "morning",
        "weekend_boost": 1.06
    },
    {
        "name": "apple",
        "base": 120,
        "decay": 0.05,
        "volatility": 0.10,
        "seasonality": "all",
        "peak_time": "evening",
        "weekend_boost": 1.05
    },
    {
        "name": "mango",
        "base": 150,
        "decay": 0.15,
        "volatility": 0.30,
        "seasonality": "summer",
        "peak_time": "afternoon",
        "weekend_boost": 1.20
    }
]

SEASONS = ["summer", "monsoon", "winter"]
TIMES = ["morning", "afternoon", "evening"]


# =========================================
# GENERATOR
# =========================================

def generate_realistic_dataset(
    file_name="realistic_market.csv",
    rows=5000
):

    with open(file_name, "w", newline="", encoding="utf-8") as f:

        writer = csv.writer(f)

        writer.writerow([
            "item_name",
            "base_price",
            "freshness",
            "days_old",
            "stock",
            "demand_score",
            "market_noise",
            "time_of_day",
            "season",
            "is_weekend",
            "dynamic_price",
            "price_change",
            "scenario",
            "created_at"
        ])

        for _ in range(rows):

            item = random.choice(ITEMS)

            # =========================================
            # TIME
            # =========================================

            season = random.choice(SEASONS)
            time_of_day = random.choice(TIMES)
            is_weekend = random.choice([True, False])

            # =========================================
            # AGE + FRESHNESS
            # =========================================

            days_old = random.randint(0, 6)

            freshness = max(
                0,
                1 - (item["decay"] * days_old)
            )

            freshness_pct = round(freshness * 100, 2)

            # =========================================
            # INVENTORY
            # =========================================

            stock = random.randint(5, 120)

            # =========================================
            # DEMAND GENERATION (SMART)
            # =========================================

            base_demand = random.uniform(0.8, 1.2)

            # freshness influence
            base_demand *= (0.5 + freshness)

            # weekend influence
            if is_weekend:
                base_demand *= item["weekend_boost"]

            # peak-time influence
            if time_of_day == item["peak_time"]:
                base_demand *= 1.15

            # seasonal influence
            if item["seasonality"] == season:
                base_demand *= 1.25

            # low freshness reduces demand
            if freshness_pct < 40:
                base_demand *= 0.75

            demand_score = round(base_demand, 2)

            # =========================================
            # MARKET VOLATILITY
            # =========================================

            market_noise = random.uniform(
                1 - item["volatility"],
                1 + item["volatility"]
            )

            market_noise = round(market_noise, 2)

            # =========================================
            # CONTINUOUS FACTORS
            # =========================================

            freshness_factor = 0.5 + (freshness_pct / 100) * 0.7

            demand_factor = 0.7 + (demand_score * 0.3)

            # inventory pressure
            if stock < 20:
                stock_factor = 1.15
            elif stock > 80:
                stock_factor = 0.82
            else:
                stock_factor = 1.0

            # time effect
            if time_of_day == "morning":
                time_factor = 1.05
            elif time_of_day == "evening":
                time_factor = 1.08
            else:
                time_factor = 1.0

            # season factor
            if item["seasonality"] == season:
                season_factor = 1.18
            else:
                season_factor = 1.0

            # =========================================
            # FINAL RAW PRICE
            # =========================================

            raw_price = (
                item["base"]
                * freshness_factor
                * demand_factor
                * stock_factor
                * time_factor
                * season_factor
                * market_noise
            )

            # =========================================
            # REALISTIC BUSINESS CONSTRAINTS
            # =========================================

            min_price = item["base"] * 0.45
            max_price = item["base"] * 1.45

            dynamic_price = max(
                min(raw_price, max_price),
                min_price
            )

            dynamic_price = round(dynamic_price, 2)

            price_change = round(
                dynamic_price - item["base"],
                2
            )

            # =========================================
            # REALISTIC SCENARIOS
            # =========================================

            if freshness_pct < 35 and stock > 70:
                scenario = "waste_prevention_discount"

            elif demand_score > 1.6 and stock < 20:
                scenario = "scarcity_price_surge"

            elif is_weekend and time_of_day == "morning":
                scenario = "weekend_peak_demand"

            elif market_noise > 1.18:
                scenario = "temporary_market_spike"

            elif freshness_pct < 25:
                scenario = "clearance_low_freshness"

            else:
                scenario = "normal_market"

            # =========================================
            # TIMESTAMP
            # =========================================

            created_at = (
                datetime.utcnow()
                - timedelta(hours=random.randint(0, 96))
            ).isoformat()

            # =========================================
            # WRITE
            # =========================================

            writer.writerow([
                item["name"],
                item["base"],
                freshness_pct,
                days_old,
                stock,
                demand_score,
                market_noise,
                time_of_day,
                season,
                is_weekend,
                dynamic_price,
                price_change,
                scenario,
                created_at
            ])

    print("✅ realistic_market.csv generated")


# =========================================
# RUN
# =========================================

generate_realistic_dataset()