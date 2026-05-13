from app.services.yolo_service import (
    predict_freshness
)

from app.services.signal_engine import (
    generate_signals
)

from app.services.market_context import (
    generate_market_context
)

from app.services.ml_pricing import (
    predict_price
)

from app.services.decision_engine import (
    make_decision
)

from app.services.rag_engine import (
    explain
)


# =====================================================
# IMAGE INPUT
# =====================================================

IMAGE_PATH = "10b.jpg"

ITEM_NAME = "banana"

BASE_PRICE = 40


# =====================================================
# YOLO PREDICTION
# =====================================================

pred = predict_freshness(
    image_path=IMAGE_PATH,
    item_name=ITEM_NAME
)


# =====================================================
# SIGNAL ENGINE
# =====================================================

signals = generate_signals(pred)


# =====================================================
# MARKET CONTEXT
# =====================================================

context = generate_market_context(
    item_name=ITEM_NAME,
    freshness=signals["freshness"]
)


# =====================================================
# ML PRICING
# =====================================================

price = predict_price({

    "item_name": ITEM_NAME,

    "base_price": BASE_PRICE,

    "freshness": signals["freshness"],

    "days_old": 1,

    "stock": context["stock"],

    "demand_score": context["demand_score"],

    "market_noise": context["market_noise"],

    "time_of_day": context["time_of_day"],

    "season": context["season"],

    "is_weekend": context["is_weekend"]
})


# =====================================================
# DECISION ENGINE
# =====================================================

decision = make_decision(
    signals=signals,
    final_price=price,
    base_price=BASE_PRICE
)


# =====================================================
# RAG + LLM EXPLANATION
# =====================================================

explanation = explain(
    signals=signals,
    price=price,
    decision=decision,
    market_context=context
)


# =====================================================
# FINAL OUTPUT
# =====================================================

result = {

    "yolo_prediction": pred,

    "signals": signals,

    "market_context": context,

    "price": price,

    "decision": decision,

    "explanation": explanation
}

print(result)