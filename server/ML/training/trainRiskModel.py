import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# =====================================================
# LOAD DATASET
# =====================================================

df = pd.read_csv("../dataset/prepared_financial_dataset.csv")

print("\n===== DATASET LOADED =====")
print(df.shape)

# =====================================================
# FEATURES & TARGET
# =====================================================

features = [
    "Income",
    "Age",
    "Dependents",
    "Desired_Savings",
    "Disposable_Income",
    "Loan_Repayment",
    "Savings_Ratio",
    "Debt_Ratio",
    "Expense_Ratio"
]

X = df[features]

y = df["Risk_Label"]

# =====================================================
# ENCODE LABELS
# =====================================================

label_encoder = LabelEncoder()

y_encoded = label_encoder.fit_transform(y)

print("\n===== LABEL CLASSES =====")
print(label_encoder.classes_)

# =====================================================
# TRAIN TEST SPLIT
# =====================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_encoded,
    test_size=0.2,
    random_state=42,
    stratify=y_encoded
)

print("\n===== TRAIN TEST SPLIT =====")
print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

# =====================================================
# TRAIN RANDOM FOREST MODEL
# =====================================================

model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight="balanced"
)

print("\n===== TRAINING MODEL =====")

model.fit(X_train, y_train)

print("Model training completed.")

# =====================================================
# PREDICTIONS
# =====================================================

y_pred = model.predict(X_test)

# =====================================================
# EVALUATION
# =====================================================

accuracy = accuracy_score(y_test, y_pred)

print("\n===== MODEL ACCURACY =====")
print(f"Accuracy: {accuracy:.4f}")

print("\n===== CLASSIFICATION REPORT =====")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=label_encoder.classes_
    )
)

print("\n===== CONFUSION MATRIX =====")
print(confusion_matrix(y_test, y_pred))

# =====================================================
# FEATURE IMPORTANCE
# =====================================================

importance_df = pd.DataFrame({
    "Feature": features,
    "Importance": model.feature_importances_
})

importance_df = importance_df.sort_values(
    by="Importance",
    ascending=False
)

print("\n===== FEATURE IMPORTANCE =====")
print(importance_df)

# =====================================================
# SAVE MODEL
# =====================================================

joblib.dump(
    model,
    "../models/risk_prediction_model.pkl"
)

joblib.dump(
    label_encoder,
    "../models/risk_label_encoder.pkl"
)

joblib.dump(
    features,
    "../models/risk_model_features.pkl"
)

print("\n===== MODEL SAVED =====")

print("Saved:")
print("- risk_prediction_model.pkl")
print("- risk_label_encoder.pkl")
print("- risk_model_features.pkl")