# Smart Vendor AI System — Complete Project Documentation

---

## 1. Problem Statement

Indian vegetable and fruit vendors lose an estimated **30–40% of potential revenue** every year due to two problems they have no tools to solve:

**Problem 1 — Mispricing perishable inventory.** A banana scanned at 9 AM gets a price tag. That same banana at 6 PM is significantly closer to spoilage but the price hasn't changed. Vendors either sell too cheaply (losing margin) or hold too long (losing the product entirely). There is no system that adjusts price dynamically as freshness degrades throughout the day.

**Problem 2 — No decision intelligence at the point of sale.** A vendor looking at overripe tomatoes has to decide: discount? discard? bundle? They make this call purely from experience and instinct. There is no AI that reads the product's actual condition, checks market demand, and tells them exactly what to do and by how much to discount.

**What we built:** A complete AI pipeline that takes a single phone-camera photo of a fruit, analyses its freshness using a fine-tuned computer vision model, factors in real-time market conditions, runs an XGBoost pricing model trained on 5,000 realistic scenarios, and delivers a specific, explainable vendor instruction — in under 3 seconds.

---

## 2. Features

### Core Features
| Feature | What it does |
|---|---|
| Fruit freshness classification | YOLOv8s model classifies ripeness stage from a photo |
| Freshness score (0–100%) | Weighted probability score, not just a label |
| Multi-level grading | Premium Fresh / Fresh / Moderate / Near Spoilage / Spoiled |
| Dynamic ML pricing | XGBoost model trained on 5,000 rows predicts optimal price |
| Freshness-aware price floor | Spoiled items get near-zero price, not 75% floor |
| Specific discount % | "Apply 18% discount" — a number, not just an action |
| Vendor instruction text | "Move to front-of-stall. Bundle with fresher items. Clear before closing." |
| Hourly time-decay | Price decays throughout the day as freshness drops |
| Between-stage detection | Confidence threshold detects borderline ripeness |
| Spoilage hours estimate | "Spoils in ~12 hours" |

### Intelligence Features
| Feature | What it does |
|---|---|
| Deterministic market context | Demand = f(time, season, weekend) — no random numbers |
| Smart risk alerts | High inventory + low freshness → urgent discount trigger |
| RAG + LLM explanation | FAISS vector store + Groq LLaMA 3.3 70B generates vendor explanation |
| Waste savings report | `/report` endpoint tracks ₹ saved vs spoilage loss |
| 7-day price trend | `/price-trend/{item}` shows historical pricing from training data |
| Batch scan | `/analyze-batch` scans multiple images (whole crate) |
| IoT simulation layer | Temperature, humidity, CO₂ — shows hardware integration point |

### Architectural Features
| Feature | What it does |
|---|---|
| Domain-agnostic pipeline | Swap YOLO model + knowledge base → works for new industry |
| `/health` endpoint | Shows loaded models, pricing model, decision log status |
| `/models` endpoint | Lists available models and their accuracy |
| Decision logging | Every analysis logged to `decision_log.jsonl` |

---

## 3. Technologies Used

### Machine Learning & Computer Vision
| Technology | Purpose |
|---|---|
| YOLOv8s (Ultralytics) | Fruit ripeness classification — fine-tuned from ImageNet |
| XGBoost | Trained pricing model — predicts optimal price from 10 features |
| scikit-learn | Preprocessing pipeline wrapped around XGBoost |
| SentenceTransformers (all-MiniLM-L6-v2) | Embeds knowledge base documents for RAG retrieval |
| FAISS (Facebook AI) | Vector similarity search — retrieves relevant business knowledge |

### Backend & API
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework — all endpoints |
| Uvicorn | ASGI server to run FastAPI |
| Python-dotenv | Environment variable management (.env file) |
| Joblib | Saves and loads trained XGBoost pipeline (.pkl) |
| Pandas | Feature engineering before model inference |

### LLM & Generation
| Technology | Purpose |
|---|---|
| Groq API | LLM inference — LLaMA 3.3 70B |
| LLaMA 3.3 70B | Generates vendor explanation from RAG context |

### Frontend
| Technology | Purpose |
|---|---|
| React (Vite) | Frontend framework |
| Axios | HTTP requests to FastAPI backend |
| Tailwind CSS | Styling |
| IBM Plex Sans/Mono | Typography — industrial dashboard aesthetic |

### Data & Training
| Technology | Purpose |
|---|---|
| NumPy | Numerical operations |
| Matplotlib / Seaborn | Training plots, confusion matrices |
| Google Colab (T4 GPU) | YOLOv8s training environment |
| Kaggle API | FreshCheck dataset download |

---

## 4. Database Used

This project does **not use a traditional relational database**. The choice is deliberate and justifiable:

| Storage | What is stored | Why this choice |
|---|---|---|
| `realistic_market.csv` | 5,000 training rows (XGBoost training data) | Tabular data for ML — CSV is the correct format |
| `pricing_model.pkl` | Trained XGBoost pipeline | Binary serialisation — standard ML model storage |
| `knowledge_base.txt` | 65 domain knowledge sentences | Plain text, read into FAISS at startup |
| FAISS in-memory index | Sentence embeddings for RAG retrieval | In-memory vector store — no persistence needed |
| `decision_log.jsonl` | Every analysis decision logged | Append-only log — JSONL is the correct format |

**Why no SQL database?**
- All reads are inference-time (not transactional)
- No multi-user concurrent writes
- FAISS provides faster vector search than any SQL extension
- JSONL decision log can be queried with pandas when needed

**For production:** PostgreSQL + pgvector would replace FAISS. `decision_log.jsonl` would become a decisions table. This is documented in future improvements.

---

## 5. Your Role (Use for viva/interview)

*Adjust this to what you actually did:*

**My role:** Full-stack ML Engineer on a 2-person team.

**What I built:**
- Designed and implemented the 6-layer pipeline architecture from scratch
- Built and trained the XGBoost pricing model (data generation, feature engineering, training, evaluation)
- Integrated YOLO freshness detection into the FastAPI backend
- Built the RAG engine (FAISS index, SentenceTransformer embeddings, Groq prompt engineering)
- Upgraded `market_context.py` from random number generation to deterministic time-aware demand logic
- Fixed the pricing floor bug (spoiled items now correctly priced near zero)
- Built the React frontend with IoT simulation layer
- Trained the improved YOLOv8s model on Google Colab (banana: ~99.3% accuracy, tomato: ~98.6%)
- Wrote the waste savings report endpoint and decision logging system

---

## 6. Architecture

*(See architecture diagram — generated separately)*

### Pipeline Flow (text description)

```
USER UPLOADS IMAGE
        ↓
[Layer 1] YOLO SERVICE
  - YOLOv8s model (fine-tuned from ImageNet)
  - Input: 320×320px image
  - Output: {class_name: probability} dict
  - Example: {ripe: 0.89, overripe: 0.09, unripe: 0.02}
        ↓
[Layer 2] SIGNAL ENGINE
  - Converts YOLO probs to freshness score (0–100)
  - Computes: freshness, risk, shelf_life, quality, urgency
  - Confidence threshold: if top-1 < 65% → borderline detected
  - Time decay: price multiplier drops from 1.02 (morning) to 0.88 (night)
  - Output: signals dict
        ↓
[Layer 3] MARKET CONTEXT ENGINE
  - Deterministic demand = f(freshness, time_of_day, season, weekend)
  - IoT layer: temperature, humidity, CO₂ (simulated / real hardware)
  - Generates: stock estimate, demand_score, market_noise, alerts
  - Output: context dict
        ↓
[Layer 4] ML PRICING (XGBoost)
  - 10 input features: item, base_price, freshness, days_old,
    stock, demand, noise, time_of_day, season, is_weekend
  - Freshness-aware floor: spoiled = 5% of base, fresh = 75%
  - Output: recommended_price (float)
        ↓
[Layer 5] DECISION ENGINE
  - Rule-based action: SELL_PREMIUM / SELL_STANDARD /
    DISCOUNT_FAST / CLEARANCE_SALE / DISCARD
  - Outputs: action, suggested_discount_pct, inventory_action, rationale
  - Logs every decision to decision_log.jsonl
        ↓
[Layer 6] RAG + LLM ENGINE
  - Query = freshness + quality + action combined
  - FAISS retrieves top-5 relevant sentences from knowledge_base.txt
  - Groq (LLaMA 3.3 70B) generates vendor explanation <120 words
  - Output: plain-English recommendation
        ↓
API RESPONSE → REACT FRONTEND
```

---

## 7. Challenges Faced

### Challenge 1 — Random market data invalidating the ML model
**Problem:** `market_context.py` was generating `random.uniform(0.8, 1.4)` for demand every time. The XGBoost model was trained on deterministic, time-aware demand patterns (from `dataset.py`), but at inference time it was receiving random inputs. The model was making pricing decisions on data that bore no relationship to what it was trained on.

**Solution:** Rewrote `market_context.py` to use the exact same demand logic as `dataset.py` — time-of-day multipliers, season factors, weekend boosts, freshness-based stock estimation. Now training data and inference data follow the same rules.

---

### Challenge 2 — Spoiled items incorrectly priced at 75% of base price
**Problem:** `ml_pricing.py` had a flat `min_price = base_price * 0.75` clamp. A completely spoiled banana with base price ₹40 was being priced at minimum ₹30. This is commercially wrong and logically wrong.

**Solution:** Implemented a freshness-aware price floor:
- Freshness > 80% → floor at 75% (original, correct)
- Freshness 40–80% → floor at 50%
- Freshness 20–40% → floor at 25%
- Freshness < 20% (spoiled) → floor at 5%

---

### Challenge 3 — Signal engine hardcoded to banana class names
**Problem:** `signal_engine.py` had `pred_dict.get("unripe", 0)` and `pred_dict.get("ripe", 0)` — banana-specific class names hardcoded. This would silently fail for tomato (which has "damaged" not "spoiled") or any future fruit model.

**Solution:** Built a keyword-normalisation map. Any class name containing "unripe", "green", "ripe", "overripe", "spoiled", "damaged" etc. maps to a freshness weight. The signal engine now works with any YOLO output without modification.

---

### Challenge 4 — Decision engine gave no actionable number
**Problem:** The original `decision_engine.py` returned `{"action": "DISCOUNT_FAST", "priority": "medium"}`. A vendor receiving this has no idea how much to discount or what to physically do with the product.

**Solution:** Added `suggested_discount_pct` (e.g. 18%), `effective_price` (e.g. ₹33), and `inventory_action` (e.g. "Apply 18% discount tag. Sell within today. Consider bulk-deal offer."). Now the output is directly actionable.

---

### Challenge 5 — Training YOLOv8 with limited compute
**Problem:** Training YOLOv8 locally on a laptop was either too slow or required a GPU not available to all team members.

**Solution:** Trained on Google Colab free tier (T4 GPU). Banana training: ~20 minutes. Tomato training: ~15 minutes. Dataset was zipped and uploaded directly from local machine — no Kaggle API needed since we already had the processed dataset.

---

### Challenge 6 — IoT integration without real hardware
**Problem:** IoT sensors (temperature, humidity, CO₂) would significantly improve freshness prediction accuracy, but we had no physical hardware.

**Solution:** Built a deterministic IoT simulation layer in React that drifts sensor values realistically over time and fires context-appropriate alerts. The architecture is designed so that in production, a Raspberry Pi + DHT22 + MQ-135 sending via MQTT would plug directly into the same `/sensor` endpoint with zero changes to the decision pipeline. The simulation demonstrates the integration point, not fake data.

---

## 8. Future Improvements

### Short-term (1–2 months)
| Improvement | Why |
|---|---|
| Real IoT integration | Connect Raspberry Pi + DHT22 + MQ-135 via MQTT → FastAPI `/sensor` endpoint |
| PostgreSQL + pgvector | Replace FAISS in-memory index with persistent vector database |
| Add mango, onion, potato models | Expand fruit/vegetable coverage |
| Mobile app (React Native) | Vendors use phones, not desktops — PWA or native camera integration |
| `/analyze-batch` full UI | Currently backend-only — surface batch scan in frontend |

### Medium-term (3–6 months)
| Improvement | Why |
|---|---|
| APMC mandi grading adapter | Same pipeline, new YOLO model → Grade A/B/C classification for fair farmer pricing |
| Real demand data (Agmarknet API) | Replace simulated demand with live APMC arrival and price data |
| Multi-vendor dashboard | Aggregate waste savings across multiple vendors |
| YOLOv9 or RT-DETR upgrade | Better accuracy on partial/occluded produce |
| Confidence calibration | Temperature scaling to make model probabilities better calibrated |

### Long-term (6–12 months)
| Improvement | Why |
|---|---|
| Cold chain pharma adapter | Package integrity classification → accept/quarantine/reject for vaccine logistics |
| Fashion retail markdown adapter | Garment condition → weekly discount escalation |
| Federated learning | Vendors contribute scan data to improve shared model without sharing raw images |
| Edge deployment (TensorFlow Lite) | Run YOLO inference on-device — no internet required at point of sale |
| Waste analytics platform | B2B SaaS — sell waste reduction insights to mandi aggregators and retail chains |