import pandas as pd
import joblib
import matplotlib.pyplot as plt

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
# CREATE SPENDING BEHAVIOR LABELS
# =====================================================

def assign_behavior(row):

    # Saver
    if (
        row["Savings_Ratio"] > 30 and
        row["Expense_Ratio"] < 50
    ):
        return "Saver"

    # Aggressive Spender
    elif (
        row["Expense_Ratio"] > 80 and
        row["Savings_Ratio"] < 10
    ):
        return "Aggressive Spender"

    # Debt Heavy
    elif (
        row["Debt_Ratio"] > 40
    ):
        return "Debt Heavy"

    # Balanced
    else:
        return "Balanced"

# Apply labels
df["Behavior_Label"] = df.apply(assign_behavior, axis=1)

# =====================================================
# CLASS DISTRIBUTION
# =====================================================

print("\n===== BEHAVIOR DISTRIBUTION =====")
print(df["Behavior_Label"].value_counts())

# =====================================================
# FEATURES & TARGET
# =====================================================

features = [
    "Income",
    "Disposable_Income",
    "Desired_Savings",
    "Savings_Ratio",
    "Debt_Ratio",
    "Expense_Ratio",
    "Dependents",
    "Age"
]

X = df[features]

y = df["Behavior_Label"]

# =====================================================
# LABEL ENCODING
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
    n_estimators=150,
    max_depth=12,
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
    "../models/spending_behavior_model.pkl"
)

joblib.dump(
    label_encoder,
    "../models/spending_behavior_label_encoder.pkl"
)

joblib.dump(
    features,
    "../models/spending_behavior_features.pkl"
)

print("\n===== MODEL SAVED SUCCESSFULLY =====")

print("Saved Files:")
print("- spending_behavior_model.pkl")
print("- spending_behavior_label_encoder.pkl")
print("- spending_behavior_features.pkl")

# =====================================================
# FEATURE IMPORTANCE CHART
# =====================================================

plt.figure(figsize=(10, 6))

plt.bar(
    importance_df["Feature"],
    importance_df["Importance"]
)

plt.xticks(rotation=45)

plt.title("Feature Importance - Spending Behavior Model")

plt.tight_layout()

plt.savefig("../models/spending_behavior_feature_importance.png")

print("\nFeature importance chart saved.")

# =====================================================
# CLASS DISTRIBUTION CHART
# =====================================================

behavior_counts = df["Behavior_Label"].value_counts()

plt.figure(figsize=(8, 5))

plt.bar(
    behavior_counts.index,
    behavior_counts.values
)

plt.title("Behavior Class Distribution")

plt.tight_layout()

plt.savefig("../models/spending_behavior_distribution.png")

print("Behavior distribution chart saved.")