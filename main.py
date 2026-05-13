import os
import uuid

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

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
# APP
# =====================================================

app = FastAPI(
    title="Smart Vendor AI System"
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =====================================================
# TEMP IMAGE DIRECTORY
# =====================================================

UPLOAD_DIR = "temp_uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# =====================================================
# ROOT
# =====================================================

@app.get("/")

def root():

    return {
        "message": "Smart Vendor AI API Running"
    }


# =====================================================
# MAIN ANALYSIS ENDPOINT
# =====================================================

@app.post("/analyze")

async def analyze_product(

    item_name: str,

    base_price: float,

    file: UploadFile = File(...)
):

    # -------------------------------------------------
    # SAVE IMAGE
    # -------------------------------------------------

    file_extension = file.filename.split(".")[-1]

    unique_name = (
        f"{uuid.uuid4()}.{file_extension}"
    )

    image_path = os.path.join(
        UPLOAD_DIR,
        unique_name
    )

    with open(image_path, "wb") as f:

        content = await file.read()

        f.write(content)

    # -------------------------------------------------
    # YOLO PREDICTION
    # -------------------------------------------------

    pred = predict_freshness(
        image_path=image_path,
        item_name=item_name
    )

    # -------------------------------------------------
    # SIGNALS
    # -------------------------------------------------

    signals = generate_signals(pred)

    # -------------------------------------------------
    # MARKET CONTEXT
    # -------------------------------------------------

    context = generate_market_context(
        item_name=item_name,
        freshness=signals["freshness"]
    )

    # -------------------------------------------------
    # PRICE PREDICTION
    # -------------------------------------------------

    price = predict_price({

        "item_name": item_name,

        "base_price": base_price,

        "freshness": signals["freshness"],

        "days_old": 1,

        "stock": context["stock"],

        "demand_score": context["demand_score"],

        "market_noise": context["market_noise"],

        "time_of_day": context["time_of_day"],

        "season": context["season"],

        "is_weekend": context["is_weekend"]
    })

    # -------------------------------------------------
    # DECISION
    # -------------------------------------------------

    decision = make_decision(
        signals=signals,
        final_price=price,
        base_price=base_price
    )

    # -------------------------------------------------
    # RAG + LLM
    # -------------------------------------------------

    explanation = explain(
        signals=signals,
        price=price,
        decision=decision,
        market_context=context
    )

    # -------------------------------------------------
    # CLEANUP
    # -------------------------------------------------

    if os.path.exists(image_path):
        os.remove(image_path)

    # -------------------------------------------------
    # RESPONSE
    # -------------------------------------------------

    return {

        "yolo_prediction": pred,

        "signals": signals,

        "market_context": context,

        "recommended_price": price,

        "decision": decision,

        "explanation": explanation
    }