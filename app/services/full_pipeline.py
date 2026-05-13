from app.services.signal_engine import generate_signals
from app.services.pricing_engine import smart_price
from app.services.decision_engine import make_decision
from app.services.rag_engine import explain


def run_pipeline(pred_dict, base_price=100):

    signals = generate_signals(pred_dict)

    price = smart_price(base_price, signals)

    decision = make_decision(signals)

    result = explain(signals, price, decision)

    return {
        "signals": signals,
        "price": price,
        "decision": decision,
        "explanation": result["explanation"]
    }