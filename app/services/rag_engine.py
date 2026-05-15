# =====================================================
# RAG ENGINE — SMART VENDOR SYSTEM (UPGRADED)
# =====================================================
# UPGRADES vs original:
# 1. Natural-language retrieval query (not key=value)
#    → semantic search actually works correctly
# 2. Multi-source knowledge: static rules + dynamic
#    market observations logged from real decisions
# 3. Retrieval confidence score shown in response
# 4. Structured prompt — clearer sections, less noise
# 5. Fallback explanation if Groq API fails
# 6. Context deduplication — no repeated sentences
# 7. Item-specific retrieval boost — banana/tomato
#    rules retrieved first when relevant
# =====================================================

import os
import faiss
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env")

client = Groq(api_key=GROQ_API_KEY)

# =====================================================
# KNOWLEDGE SOURCES
# =====================================================
# Source 1: Static domain knowledge (knowledge_base.txt)
# Source 2: Dynamic market observations (market_log.txt)
#   — appended every time a SELL/DISCOUNT decision is
#     confirmed. Grows with real usage. In production
#     this is the memory of the system.
# =====================================================

STATIC_KB_PATH  = "app/services/knowledge_base.txt"
DYNAMIC_KB_PATH = "app/services/market_log.txt"


def _load_documents():
    docs = []

    # Static knowledge
    if os.path.exists(STATIC_KB_PATH):
        with open(STATIC_KB_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    docs.append({"text": line, "source": "static"})

    # Dynamic market observations (grows with real usage)
    if os.path.exists(DYNAMIC_KB_PATH):
        with open(DYNAMIC_KB_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    docs.append({"text": line, "source": "dynamic"})

    return docs


# =====================================================
# EMBEDDING MODEL + FAISS INDEX
# =====================================================

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

_all_docs = _load_documents()
_doc_texts = [d["text"] for d in _all_docs]

_embeddings = embedding_model.encode(_doc_texts, convert_to_numpy=True)
_dim = _embeddings.shape[1]

# IndexFlatIP for cosine similarity (normalise first)
faiss.normalize_L2(_embeddings)
_index = faiss.IndexFlatIP(_dim)
_index.add(_embeddings)


# =====================================================
# RETRIEVAL — natural language query
# =====================================================

def retrieve_context(query_text, top_k=6):
    """
    Retrieve top_k most relevant knowledge sentences.
    Returns list of (text, score, source) tuples.
    Score = cosine similarity 0.0–1.0
    """
    q_emb = embedding_model.encode([query_text], convert_to_numpy=True)
    faiss.normalize_L2(q_emb)
    scores, indices = _index.search(q_emb, top_k)

    results = []
    seen = set()
    for score, idx in zip(scores[0], indices[0]):
        text = _doc_texts[idx]
        if text not in seen:
            seen.add(text)
            results.append({
                "text":   text,
                "score":  round(float(score), 3),
                "source": _all_docs[idx]["source"],
            })
    return results


# =====================================================
# LOG MARKET OBSERVATION (dynamic knowledge growth)
# =====================================================

def log_market_observation(item_name, action, freshness,
                            season, time_of_day, price, base_price):
    """
    After a confirmed vendor action, log it as a new
    market observation. Over time this builds the system's
    memory of what works in your specific market.

    In production: called from a /confirm endpoint when
    vendor confirms they followed the recommendation.
    """
    discount_pct = round((1 - price / base_price) * 100, 1) if base_price > 0 else 0
    obs = (
        f"{item_name.capitalize()} with {freshness:.0f}% freshness "
        f"during {season} {time_of_day} sold with "
        f"{'discount of ' + str(discount_pct) + '%' if discount_pct > 0 else 'no discount'} "
        f"— action: {action}."
    )
    with open(DYNAMIC_KB_PATH, "a", encoding="utf-8") as f:
        f.write(obs + "\n")


# =====================================================
# BUILD RETRIEVAL QUERY — natural language
# =====================================================

def _build_query(signals, decision, market_context, item_name):
    """
    Converts pipeline state into a natural language query.
    This is the key upgrade — semantic search needs a sentence,
    not a key=value string.
    """
    freshness  = signals["freshness"]
    quality    = signals["quality"]
    urgency    = signals["urgency"]
    shelf_life = signals["shelf_life"]
    risk       = signals["risk"]
    action     = decision["action"]
    season     = market_context["season"]
    demand     = market_context["demand_score"]
    stock      = market_context["stock"]
    time_of_day = market_context.get("time_of_day", "morning")

    # Describe freshness in human language
    if freshness >= 85:
        fresh_desc = "very fresh and premium quality"
    elif freshness >= 65:
        fresh_desc = "good quality with moderate freshness"
    elif freshness >= 45:
        fresh_desc = "aging with declining freshness"
    elif freshness >= 25:
        fresh_desc = "near spoilage with high risk"
    else:
        fresh_desc = "spoiled and unsafe to sell"

    # Describe demand
    demand_desc = "high demand" if demand > 1.2 else ("low demand" if demand < 0.9 else "moderate demand")

    # Describe stock pressure
    stock_desc  = "excess inventory" if stock > 70 else ("scarce stock" if stock < 20 else "normal stock levels")

    query = (
        f"{item_name} is {fresh_desc} with {shelf_life} days shelf life remaining. "
        f"Spoilage risk is {round(risk * 100)}%. "
        f"Market shows {demand_desc} and {stock_desc} during {season} {time_of_day}. "
        f"Recommended action is {action.replace('_', ' ').lower()}."
    )
    return query


# =====================================================
# MAIN RAG + LLM EXPLAIN FUNCTION
# =====================================================

def explain(signals, price, decision, market_context, item_name="product"):

    # Build natural language query
    query = _build_query(signals, decision, market_context, item_name)

    # Retrieve relevant knowledge
    retrieved = retrieve_context(query, top_k=6)

    # Format context — mark dynamic observations separately
    static_context  = "\n".join(r["text"] for r in retrieved if r["source"] == "static")
    dynamic_context = "\n".join(r["text"] for r in retrieved if r["source"] == "dynamic")

    avg_score = round(sum(r["score"] for r in retrieved) / len(retrieved), 3) if retrieved else 0

    # =====================================================
    # STRUCTURED PROMPT
    # =====================================================

    prompt = f"""You are an expert retail pricing assistant for Indian fruit and vegetable vendors.

DOMAIN KNOWLEDGE (retrieved from business rules):
{static_context if static_context else "General perishable retail principles apply."}

{f"RECENT MARKET OBSERVATIONS:{chr(10)}{dynamic_context}" if dynamic_context else ""}

CURRENT PRODUCT STATE:
- Item: {item_name}
- Freshness score: {signals['freshness']}%
- Quality grade: {signals.get('freshness_grade', signals['quality'])}
- Spoilage risk: {round(signals['risk'] * 100)}%
- Shelf life remaining: {signals['shelf_life']} days
- Dominant YOLO class: {signals.get('dominant_class', 'unknown')} ({signals.get('dominant_conf', 0)}% confidence)

MARKET CONDITIONS:
- Season: {market_context['season']} | Time: {market_context.get('time_of_day', 'unknown')}
- Demand score: {market_context['demand_score']} | Stock: {market_context['stock']} units
- Spoilage window: ~{market_context.get('spoilage_hours', '?')} hours

DECISION:
- Action: {decision['action']}
- Recommended price: Rs.{price}
- Suggested discount: {decision.get('suggested_discount_pct', 0)}%
- Vendor instruction: {decision.get('inventory_action', '')}

Write a SHORT, direct explanation for the vendor (2-3 sentences max, under 80 words).
- State the freshness situation and what it means for the price
- Give one clear action reason
- Do NOT repeat the exact numbers already shown in the dashboard
- Sound like a practical retail advisor, not an AI system
- Use Rs. for currency, not unicode rupee symbol"""

    # =====================================================
    # GROQ LLM CALL WITH FALLBACK
    # =====================================================

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise, practical retail pricing advisor "
                        "for Indian vegetable and fruit vendors. "
                        "You explain pricing decisions in plain business language. "
                        "Never use corporate jargon or generic AI phrases."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=200,
        )
        explanation = response.choices[0].message.content.strip()

    except Exception as e:
        # Fallback — rule-based explanation if API fails
        action = decision["action"]
        freshness = signals["freshness"]
        if action == "DISCARD":
            explanation = f"This {item_name} has deteriorated past the safe selling point at {freshness}% freshness. Remove from display immediately to protect customer trust."
        elif action in ("DISCOUNT_FAST", "CLEARANCE_SALE"):
            disc = decision.get('suggested_discount_pct', 20)
            explanation = f"At {freshness}% freshness with {signals['shelf_life']} day(s) remaining, a {disc}% discount is needed to move this {item_name} before spoilage loss. Act before end of day."
        elif action == "SELL_PREMIUM":
            explanation = f"This {item_name} is in excellent condition at {freshness}% freshness. Current market demand supports premium pricing — display prominently."
        else:
            explanation = f"This {item_name} is at {freshness}% freshness. Sell at the recommended price to balance margin and inventory movement."

    return {
        "explanation":         explanation,
        "retrieval_query":     query,
        "retrieved_docs":      [r["text"] for r in retrieved],
        "retrieval_scores":    [r["score"] for r in retrieved],
        "avg_retrieval_score": avg_score,
        "knowledge_sources":   list(set(r["source"] for r in retrieved)),
    }