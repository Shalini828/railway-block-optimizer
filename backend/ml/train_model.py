import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)
import joblib


# ==========================================
# 1. LOAD DATA
# ==========================================

DATA_FILE = "backend/ml/ml_training_data.csv"

df = pd.read_csv(DATA_FILE)

print("=" * 60)
print("        RAILWAY MAINTENANCE ML MODEL")
print("=" * 60)

print()
print("Dataset shape:", df.shape)


# ==========================================
# 2. SELECT FEATURES
# ==========================================

features = [
    "criticality",
    "health_score",
    "failure_risk",
    "asset_age_years",
    "days_since_inspection",
    "defect_count",
    "urgent_defect_count",
    "max_safety_impact",
    "repeat_failure",
    "maintenance_count",
    "corrective_maintenance_count",
    "previous_failure_count"
]

target = "urgent_maintenance"


X = df[features]
y = df[target]


# ==========================================
# 3. TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print()
print("Training records:", len(X_train))
print("Testing records :", len(X_test))


# ==========================================
# 4. CREATE MODEL
# ==========================================

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_split=5,
    random_state=42,
    class_weight="balanced"
)


# ==========================================
# 5. TRAIN
# ==========================================

print()
print("Training model...")

model.fit(
    X_train,
    y_train
)

print("Training completed!")


# ==========================================
# 6. PREDICTION
# ==========================================

y_pred = model.predict(X_test)


# ==========================================
# 7. EVALUATION
# ==========================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

print()
print("=" * 60)
print("MODEL PERFORMANCE")
print("=" * 60)

print(
    f"Accuracy: {accuracy:.4f}"
)

print()
print("Classification Report:")
print(
    classification_report(
        y_test,
        y_pred
    )
)

print()
print("Confusion Matrix:")
print(
    confusion_matrix(
        y_test,
        y_pred
    )
)


# ==========================================
# 8. FEATURE IMPORTANCE
# ==========================================

importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    by="importance",
    ascending=False
)

print()
print("Feature Importance:")
print(importance.to_string(index=False))


# ==========================================
# 9. SAVE MODEL
# ==========================================

MODEL_FILE = "backend/ml/railway_risk_model.pkl"

joblib.dump(
    model,
    MODEL_FILE
)

print()
print("=" * 60)
print(f"Model saved to: {MODEL_FILE}")
print("=" * 60)