import random
from datetime import datetime

def generate_market_context(item_name, freshness):

    hour = datetime.now().hour

    # -----------------------
    # TIME OF DAY
    # -----------------------

    if 5 <= hour < 11:
        time_of_day = "morning"
    elif 11 <= hour < 17:
        time_of_day = "afternoon"
    else:
        time_of_day = "evening"

    # -----------------------
    # SEASON
    # -----------------------

    month = datetime.now().month

    if month in [3,4,5]:
        season = "summer"
    elif month in [6,7,8,9]:
        season = "monsoon"
    else:
        season = "winter"

    # -----------------------
    # WEEKEND
    # -----------------------

    is_weekend = datetime.now().weekday() >= 5

    # -----------------------
    # STOCK
    # -----------------------

    if freshness > 80:
        stock = random.randint(20, 60)
    else:
        stock = random.randint(40, 120)

    # -----------------------
    # DEMAND
    # -----------------------

    demand = random.uniform(0.8, 1.4)

    if is_weekend:
        demand *= 1.1

    if time_of_day == "morning":
        demand *= 1.1

    demand = round(demand, 2)

    # -----------------------
    # MARKET NOISE
    # -----------------------

    market_noise = round(
        random.uniform(0.9, 1.1),
        2
    )

    return {
        "stock": stock,
        "demand_score": demand,
        "market_noise": market_noise,
        "time_of_day": time_of_day,
        "season": season,
        "is_weekend": is_weekend
    }