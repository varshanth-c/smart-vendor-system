from ultralytics import YOLO


# =====================================================
# LOAD MODELS
# =====================================================

banana_model = YOLO(
    "banana_ripeness_yolov8n_best.pt"
)

tomato_model = YOLO(
    "tomato_ripeness_yolov8n_best.pt"
)


# =====================================================
# PREDICT FUNCTION
# =====================================================

def predict_freshness(
    image_path,
    item_name
):

    # -------------------------------------------------
    # SELECT MODEL
    # -------------------------------------------------

    if item_name == "banana":
        model = banana_model

    elif item_name == "tomato":
        model = tomato_model

    else:
        raise ValueError(
            f"No YOLO model available for {item_name}"
        )

    # -------------------------------------------------
    # RUN PREDICTION
    # -------------------------------------------------

    results = model(image_path)

    probs = results[0].probs.data.tolist()

    class_names = results[0].names

    # -------------------------------------------------
    # BUILD OUTPUT
    # -------------------------------------------------

    prediction = {}

    for idx, prob in enumerate(probs):

        prediction[
            class_names[idx]
        ] = round(prob, 4)

    return prediction