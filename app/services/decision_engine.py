# =====================================================
# DECISION ENGINE — SMART VENDOR SYSTEM
# =====================================================
# UPGRADES:
# 1. suggested_discount % — concrete number for vendor
# 2. inventory_action — specific sell/store/discard advice
# 3. waste_savings_estimate — ₹ saved vs letting it spoil
# 4. time_decay applied to price before decision
# 5. domain-agnostic — works for any item
# =====================================================

import json
import os
from datetime import datetime

# =====================================================
# DECISION LOG — for /report endpoint
# =====================================================

LOG_FILE = "decision_log.jsonl"


def _log_decision(item_name, decision, price, base_price, freshness):
    """Append decision to log file for waste savings report."""
    entry = {
        "timestamp":  datetime.now().isoformat(),
        "item_name":  item_name,
        "action":     decision["action"],
        "price":      price,
        "base_price": base_price,
        "freshness":  freshness,
        "discount_pct": decision.get("suggested_discount_pct", 0),
    }
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


# =====================================================
# MAIN DECISION FUNCTION
# =====================================================

def make_decision(signals, final_price, base_price, item_name="unknown"):

    freshness  = signals["freshness"]
    risk       = signals["risk"]
    urgency    = signals["urgency"]
    quality    = signals["quality"]
    shelf_life = signals["shelf_life"]
    time_decay = signals.get("time_decay", 1.0)

    # Apply time decay to effective price
    effective_price = round(final_price * time_decay, 2)

    # Price ratio vs base
    price_ratio = effective_price / base_price

    # Discount % — concrete number for the vendor
    discount_pct = round(max(0, (1 - price_ratio) * 100), 1)

    # =====================================================
    # CRITICAL — DISCARD
    # =====================================================

    if urgency == "discard" or risk > 0.85:

        decision = {
            "action":                 "DISCARD",
            "priority":               "critical",
            "suggested_discount_pct": 100,
            "effective_price":        0,
            "inventory_action":       "Remove from display immediately. Do not sell.",
            "time_decay_applied":     time_decay,
            "rationale":              "Spoilage risk too high for safe sale.",
        }
        _log_decision(item_name, decision, 0, base_price, freshness)
        return decision

    # =====================================================
    # FAST CLEARANCE
    # =====================================================

    if urgency == "clear_fast":

        decision = {
            "action":                 "CLEARANCE_SALE",
            "priority":               "high",
            "suggested_discount_pct": max(discount_pct, 30),
            "effective_price":        effective_price,
            "inventory_action":       (
                "Move to front-of-stall. Bundle with fresher items "
                "to increase perceived value. Clear before closing."
            ),
            "time_decay_applied":     time_decay,
            "rationale":              (
                f"High spoilage risk ({round(risk*100)}%) — "
                "immediate clearance prevents total loss."
            ),
        }
        _log_decision(item_name, decision, effective_price, base_price, freshness)
        return decision

    # =====================================================
    # PREMIUM SELL
    # =====================================================

    if quality == "premium" and price_ratio >= 1.02 and shelf_life >= 3:

        decision = {
            "action":                 "SELL_PREMIUM",
            "priority":               "normal",
            "suggested_discount_pct": 0,
            "effective_price":        effective_price,
            "inventory_action":       (
                "Display prominently. "
                "Label as 'Today's Fresh Batch' to justify premium."
            ),
            "time_decay_applied":     time_decay,
            "rationale":              (
                f"Freshness {freshness}% — premium grade, "
                "strong shelf life, market conditions support premium pricing."
            ),
        }
        _log_decision(item_name, decision, effective_price, base_price, freshness)
        return decision

    # =====================================================
    # DISCOUNT FAST
    # =====================================================

    if quality == "aging" or shelf_life <= 2:

        actual_discount = max(discount_pct, 15)
        discounted_price = round(base_price * (1 - actual_discount / 100), 2)

        decision = {
            "action":                 "DISCOUNT_FAST",
            "priority":               "medium",
            "suggested_discount_pct": actual_discount,
            "effective_price":        discounted_price,
            "inventory_action":       (
                f"Apply {actual_discount}% discount tag. "
                "Sell within today. Consider bulk-deal offer."
            ),
            "time_decay_applied":     time_decay,
            "rationale":              (
                f"Shelf life {shelf_life} day(s) — "
                "discount now prevents zero-value spoilage tomorrow."
            ),
        }
        _log_decision(item_name, decision, discounted_price, base_price, freshness)
        return decision

    # =====================================================
    # STANDARD SELL
    # =====================================================

    if quality == "standard" and risk < 0.4:

        decision = {
            "action":                 "SELL_STANDARD",
            "priority":               "normal",
            "suggested_discount_pct": max(0, discount_pct),
            "effective_price":        effective_price,
            "inventory_action":       "Sell at recommended price. No special action needed.",
            "time_decay_applied":     time_decay,
            "rationale":              (
                f"Freshness {freshness}% — standard quality, "
                "low risk, proceed at market price."
            ),
        }
        _log_decision(item_name, decision, effective_price, base_price, freshness)
        return decision

    # =====================================================
    # FALLBACK CLEARANCE
    # =====================================================

    decision = {
        "action":                 "CLEARANCE",
        "priority":               "high",
        "suggested_discount_pct": max(discount_pct, 20),
        "effective_price":        effective_price,
        "inventory_action":       (
            "Bundle or discount. Do not hold overnight."
        ),
        "time_decay_applied":     time_decay,
        "rationale":              "Mixed signals — clearance is safest action.",
    }
    _log_decision(item_name, decision, effective_price, base_price, freshness)
    return decision


# =====================================================
# WASTE SAVINGS REPORT
# Called by /report endpoint in main.py
# =====================================================

def generate_waste_report():
    """
    Read decision_log.jsonl and calculate:
    - Total decisions
    - Estimated ₹ saved vs letting stock spoil
    - Per-action breakdown
    - Waste prevention rate
    """
    if not os.path.exists(LOG_FILE):
        return {
            "message": "No decision history yet. Run /analyze first.",
            "total_decisions": 0,
        }

    entries = []
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    if not entries:
        return {"message": "Log file empty.", "total_decisions": 0}

    total_decisions  = len(entries)
    total_savings    = 0.0
    action_counts    = {}
    waste_prevented  = 0

    for e in entries:
        action     = e.get("action", "UNKNOWN")
        base_price = e.get("base_price", 0)
        price      = e.get("price", 0)
        freshness  = e.get("freshness", 100)

        action_counts[action] = action_counts.get(action, 0) + 1

        # Savings = what we sold for, vs what we'd have lost if it spoiled
        # If it would have been discarded (freshness < 35), any sale = savings
        if freshness < 35 and action != "DISCARD":
            total_savings += price   # recovered value
            waste_prevented += 1
        elif action in ("DISCOUNT_FAST", "CLEARANCE_SALE", "CLEARANCE"):
            # Partial savings — sold at discount vs total loss
            total_savings += (price - base_price * 0.3)
            waste_prevented += 1

    waste_prevention_rate = round(
        waste_prevented / total_decisions * 100, 1
    ) if total_decisions > 0 else 0

    return {
        "total_decisions":       total_decisions,
        "waste_prevented_count": waste_prevented,
        "waste_prevention_rate": f"{waste_prevention_rate}%",
        "estimated_inr_saved":   f"₹{round(max(0, total_savings), 2)}",
        "action_breakdown":      action_counts,
        "note": (
            "Savings estimated vs worst-case total loss. "
            "Actual savings depend on whether discounted items were sold."
        ),
    }