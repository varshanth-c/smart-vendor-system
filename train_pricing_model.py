import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from xgboost import XGBRegressor


# =========================================
# LOAD DATA
# =========================================

df = pd.read_csv("realistic_market.csv")


# =========================================
# FEATURES
# =========================================

FEATURES = [
    "item_name",
    "base_price",
    "freshness",
    "days_old",
    "stock",
    "demand_score",
    "market_noise",
    "time_of_day",
    "season",
    "is_weekend"
]

TARGET = "dynamic_price"

X = df[FEATURES]
y = df[TARGET]


# =========================================
# CATEGORICAL / NUMERIC
# =========================================

categorical_features = [
    "item_name",
    "time_of_day",
    "season"
]

numeric_features = [
    "base_price",
    "freshness",
    "days_old",
    "stock",
    "demand_score",
    "market_noise",
    "is_weekend"
]


# =========================================
# PREPROCESSOR
# =========================================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        )
    ],
    remainder="passthrough"
)


# =========================================
# MODEL
# =========================================

model = XGBRegressor(
    n_estimators=500,
    learning_rate=0.03,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.5,
    reg_lambda=2,
    random_state=42
)


# =========================================
# PIPELINE
# =========================================

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", model)
])


# =========================================
# SPLIT
# =========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)


# =========================================
# TRAIN
# =========================================

pipeline.fit(X_train, y_train)


# =========================================
# EVALUATE
# =========================================

preds = pipeline.predict(X_test)

mae = mean_absolute_error(y_test, preds)
r2 = r2_score(y_test, preds)

print(f"\nMAE: {mae:.2f}")
print(f"R2 Score: {r2:.4f}")


# =========================================
# FEATURE IMPORTANCE
# =========================================

model_step = pipeline.named_steps["model"]

feature_names = (
    pipeline.named_steps["preprocessor"]
    .get_feature_names_out()
)

importances = model_step.feature_importances_

importance_df = pd.DataFrame({
    "feature": feature_names,
    "importance": importances
}).sort_values(
    by="importance",
    ascending=False
)

print("\nTop Important Features:")
print(importance_df.head(10))


# =========================================
# SAVE
# =========================================

joblib.dump(
    pipeline,
    "pricing_model.pkl"
)

print("\n✅ pricing_model.pkl saved")