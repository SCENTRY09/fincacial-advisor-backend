import pandas as pd
import joblib
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

# =====================================================
# LOAD DATASET
# =====================================================

df = pd.read_csv("../dataset/prepared_financial_dataset.csv")

print("\n===== DATASET LOADED =====")
print(df.shape)

# =====================================================
# CREATE FINANCIAL SCORE
# =====================================================

def calculate_financial_score(row):

    score = 50

    # Savings Contribution
    if row["Savings_Ratio"] > 30:
        score += 25
    elif row["Savings_Ratio"] > 20:
        score += 15
    elif row["Savings_Ratio"] > 10:
        score += 5

    # Expense Penalty
    if row["Expense_Ratio"] > 80:
        score -= 25
    elif row["Expense_Ratio"] > 70:
        score -= 15
    elif row["Expense_Ratio"] > 60:
        score -= 5

    # Debt Penalty
    if row["Debt_Ratio"] > 50:
        score -= 25
    elif row["Debt_Ratio"] > 35:
        score -= 15
    elif row["Debt_Ratio"] > 20:
        score -= 5

    # Disposable Income Bonus
    if row["Disposable_Income"] > row["Income"] * 0.30:
        score += 10

    # Clamp score
    score = max(0, min(score, 100))

    return score

# Apply score
df["Financial_Score"] = df.apply(
    calculate_financial_score,
    axis=1
)

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

y = df["Financial_Score"]

# =====================================================
# TRAIN TEST SPLIT
# =====================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("\n===== TRAIN TEST SPLIT =====")
print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

# =====================================================
# TRAIN RANDOM FOREST REGRESSOR
# =====================================================

model = RandomForestRegressor(
    n_estimators=150,
    max_depth=12,
    random_state=42
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

mae = mean_absolute_error(y_test, y_pred)

mse = mean_squared_error(y_test, y_pred)

r2 = r2_score(y_test, y_pred)

print("\n===== MODEL EVALUATION =====")

print(f"MAE: {mae:.4f}")

print(f"MSE: {mse:.4f}")

print(f"R2 Score: {r2:.4f}")

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
    "../models/financial_score_model.pkl"
)

joblib.dump(
    features,
    "../models/financial_score_features.pkl"
)

print("\n===== MODEL SAVED SUCCESSFULLY =====")

print("Saved Files:")
print("- financial_score_model.pkl")
print("- financial_score_features.pkl")

# =====================================================
# FEATURE IMPORTANCE CHART
# =====================================================

plt.figure(figsize=(10, 6))

plt.bar(
    importance_df["Feature"],
    importance_df["Importance"]
)

plt.xticks(rotation=45)

plt.title("Feature Importance - Financial Score Model")

plt.tight_layout()

plt.savefig("../models/financial_score_feature_importance.png")

print("\nFeature importance chart saved.")