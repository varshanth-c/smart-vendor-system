import os
import faiss
import numpy as np

from dotenv import load_dotenv

from sentence_transformers import SentenceTransformer

from groq import Groq


# =====================================================
# LOAD ENV VARIABLES
# =====================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("❌ GROQ_API_KEY not found in .env")


# =====================================================
# GROQ CLIENT
# =====================================================

client = Groq(
    api_key=GROQ_API_KEY
)


# =====================================================
# LOAD KNOWLEDGE BASE
# =====================================================

KNOWLEDGE_PATH = "app/services/knowledge_base.txt"

with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:

    documents = [
        line.strip()
        for line in f.readlines()
        if line.strip()
    ]


# =====================================================
# EMBEDDING MODEL
# =====================================================

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


# =====================================================
# CREATE VECTOR DATABASE
# =====================================================

doc_embeddings = embedding_model.encode(
    documents,
    convert_to_numpy=True
)

dimension = doc_embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

index.add(doc_embeddings)


# =====================================================
# RETRIEVAL FUNCTION
# =====================================================

def retrieve_context(query, top_k=5):

    query_embedding = embedding_model.encode(
        [query],
        convert_to_numpy=True
    )

    distances, indices = index.search(
        query_embedding,
        top_k
    )

    retrieved_docs = [
        documents[i]
        for i in indices[0]
    ]

    return retrieved_docs


# =====================================================
# MAIN RAG + LLM EXPLANATION
# =====================================================

def explain(
    signals,
    price,
    decision,
    market_context
):

    # -------------------------------------------------
    # BUILD RETRIEVAL QUERY
    # -------------------------------------------------

    retrieval_query = f"""
    freshness={signals['freshness']}
    risk={signals['risk']}
    quality={signals['quality']}
    urgency={signals['urgency']}
    shelf_life={signals['shelf_life']}

    stock={market_context['stock']}
    demand={market_context['demand_score']}
    market_noise={market_context['market_noise']}
    season={market_context['season']}
    weekend={market_context['is_weekend']}

    action={decision['action']}
    """

    # -------------------------------------------------
    # RETRIEVE BUSINESS KNOWLEDGE
    # -------------------------------------------------

    retrieved_docs = retrieve_context(
        retrieval_query
    )

    retrieved_context = "\n".join(retrieved_docs)

    # -------------------------------------------------
    # BUILD PROMPT
    # -------------------------------------------------

    prompt = f"""
You are an AI-powered retail pricing and inventory assistant for fruit and vegetable vendors.

Your job is to explain the pricing decision professionally and realistically.

==================================================
BUSINESS KNOWLEDGE
==================================================

{retrieved_context}

==================================================
CURRENT PRODUCT ANALYSIS
==================================================

Freshness Score:
{signals['freshness']}

Spoilage Risk:
{signals['risk']}

Quality Category:
{signals['quality']}

Urgency Level:
{signals['urgency']}

Estimated Shelf Life:
{signals['shelf_life']} days

==================================================
MARKET CONDITIONS
==================================================

Current Demand Score:
{market_context['demand_score']}

Current Stock:
{market_context['stock']}

Market Volatility:
{market_context['market_noise']}

Season:
{market_context['season']}

Weekend:
{market_context['is_weekend']}

==================================================
SYSTEM DECISION
==================================================

Recommended Price:
₹{price}

Recommended Action:
{decision['action']}

Priority Level:
{decision['priority']}

TASK

Generate a short operational explanation for a fruit or vegetable vendor.

Your explanation must include:

1. Why the price was selected
2. What freshness and demand conditions affected pricing
3. One practical vendor action

Rules:
- Maximum 120 words
- Be direct and realistic
- Avoid generic AI phrases
- Avoid repeating numbers unnecessarily
- Focus on inventory movement and spoilage prevention
- Sound like a smart retail pricing assistant
- Give practical vendor guidance
-Do not describe freshness below 80 as low freshness unless spoilage risk is high.
Use wording that matches the freshness score realistically.
"""

    # -------------------------------------------------
    # GROQ LLM CALL
    # -------------------------------------------------

    response = client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        messages=[

            {
                "role": "system",
                "content": (
                    "You are an expert AI assistant "
                    "specialized in perishable retail pricing, "
                    "inventory optimization, and spoilage management."
                )
            },

            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.4,
        max_tokens=400
    )

    # -------------------------------------------------
    # RETURN FINAL RESPONSE
    # -------------------------------------------------

    final_response = response.choices[0].message.content

    return final_response