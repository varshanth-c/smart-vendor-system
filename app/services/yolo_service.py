# =====================================================
# YOLO SERVICE — SMART VENDOR SYSTEM
# =====================================================
# UPGRADES:
# 1. Supports new improved YOLOv8s models from FreshCheck
# 2. Domain config pattern — drop-in adapter for new items
# 3. batch_predict — scan multiple images (crate scan)
# 4. confidence surfaced in output
# 5. Graceful fallback if improved model not found
# =====================================================

import os
from ultralytics import YOLO

# =====================================================
# DOMAIN CONFIG — the multi-industry adapter
# =====================================================
# To add a new domain (e.g. cold chain, mandi):
# 1. Add an entry here with model_path + class_aliases
# 2. Drop in the .pt file
# 3. The entire pipeline works automatically
# =====================================================

DOMAIN_CONFIG = {

    "banana": {
        # Try improved YOLOv8s first, fallback to original
        "model_path": (
            "banana_improved_yolov8s_320px_best.pt"
            if os.path.exists("banana_improved_yolov8s_320px_best.pt")
            else "banana_ripeness_yolov8n_best.pt"
        ),
        "description": "Banana ripeness (Unripe / Ripe / Overripe / Spoiled)",
        "imgsz": 320 if os.path.exists("banana_improved_yolov8s_320px_best.pt") else 224,
    },

    "tomato": {
        "model_path": (
            "tomato_improved_yolov8s_320px_best.pt"
            if os.path.exists("tomato_improved_yolov8s_320px_best.pt")
            else "tomato_ripeness_yolov8n_best.pt"
        ),
        "description": "Tomato ripeness (Unripe / Ripe / Overripe / Damaged)",
        "imgsz": 320 if os.path.exists("tomato_improved_yolov8s_320px_best.pt") else 224,
    },

    # -----------------------------------------------
    # MANDI GRADING ADAPTER — same pipeline, new domain
    # Train a YOLOv8s on graded produce images,
    # drop the .pt here, and the entire API works.
    # -----------------------------------------------
    # "mandi_banana": {
    #     "model_path": "mandi_banana_grade_yolov8s.pt",
    #     "description": "APMC mandi grade A/B/C classifier",
    #     "imgsz": 320,
    # },

    # -----------------------------------------------
    # COLD CHAIN ADAPTER
    # -----------------------------------------------
    # "pharma_package": {
    #     "model_path": "pharma_package_integrity_yolov8s.pt",
    #     "description": "Pharmaceutical packaging integrity check",
    #     "imgsz": 320,
    # },
}

# =====================================================
# LOAD MODELS AT STARTUP
# =====================================================

_loaded_models = {}

for domain, config in DOMAIN_CONFIG.items():
    path = config["model_path"]
    if os.path.exists(path):
        _loaded_models[domain] = YOLO(path)
        print(f"✅ Loaded model [{domain}]: {path}")
    else:
        print(f"⚠️  Model not found [{domain}]: {path} — will raise on predict")


def _get_model(item_name):
    key = item_name.lower()
    if key not in _loaded_models:
        available = list(_loaded_models.keys())
        raise ValueError(
            f"No YOLO model loaded for '{item_name}'. "
            f"Available: {available}"
        )
    return _loaded_models[key], DOMAIN_CONFIG[key]["imgsz"]


# =====================================================
# SINGLE IMAGE PREDICTION
# =====================================================

def predict_freshness(image_path, item_name):
    """
    Runs YOLO on one image.
    Returns {class_name: probability} dict.
    """
    model, imgsz = _get_model(item_name)

    results = model(image_path, imgsz=imgsz, verbose=False)

    probs      = results[0].probs.data.tolist()
    class_names = results[0].names

    prediction = {}
    for idx, prob in enumerate(probs):
        prediction[class_names[idx]] = round(prob, 4)

    return prediction


# =====================================================
# BATCH PREDICTION — crate / multi-item scan
# =====================================================

def batch_predict(image_paths, item_name):
    """
    Scan multiple images at once (e.g. a crate of bananas).
    Returns:
    - per_image: list of individual predictions
    - aggregate: averaged probabilities across all images
    - summary: dominant class + confidence for the batch
    """
    model, imgsz = _get_model(item_name)

    results = model(image_paths, imgsz=imgsz, verbose=False)

    class_names = results[0].names
    per_image   = []
    totals      = {cn: 0.0 for cn in class_names.values()}

    for result in results:
        probs = result.probs.data.tolist()
        pred  = {class_names[i]: round(probs[i], 4) for i in range(len(probs))}
        per_image.append(pred)
        for cn, p in pred.items():
            totals[cn] += p

    n = len(results)
    aggregate = {cn: round(totals[cn] / n, 4) for cn in totals}

    # Dominant class across batch
    dominant_class = max(aggregate, key=aggregate.get)
    dominant_conf  = round(aggregate[dominant_class] * 100, 1)

    return {
        "per_image":       per_image,
        "aggregate":       aggregate,
        "dominant_class":  dominant_class,
        "dominant_conf":   dominant_conf,
        "images_scanned":  n,
    }


# =====================================================
# MODEL INFO ENDPOINT
# =====================================================

def list_available_models():
    """Returns info about all loaded models."""
    info = {}
    for domain, config in DOMAIN_CONFIG.items():
        loaded = domain in _loaded_models
        info[domain] = {
            "loaded":      loaded,
            "model_path":  config["model_path"],
            "description": config["description"],
            "imgsz":       config["imgsz"],
        }
    return info