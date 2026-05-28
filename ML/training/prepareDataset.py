import pandas as pd
import numpy as np

# =====================================================
# LOAD DATASET
# =====================================================

df = pd.read_csv("../dataset/data.csv")

print("\n===== ORIGINAL DATASET LOADED =====")
print(df.shape)

# =====================================================
# FEATURE ENGINEERING
# =====================================================

# -------------------------------
# Savings Ratio
# -------------------------------

df["Savings_Ratio"] = (
    df["Desired_Savings"] / df["Income"]
) * 100

# -------------------------------
# Debt Ratio
# -------------------------------

df["Debt_Ratio"] = (
    df["Loan_Repayment"] / df["Income"]
) * 100

# -------------------------------
# Expense Ratio
# -------------------------------

expense_columns = [
    "Rent",
    "Insurance",
    "Groceries",
    "Transport",
    "Eating_Out",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Education",
    "Miscellaneous"
]

# Total Expenses
df["Total_Expenses"] = df[expense_columns].sum(axis=1)

# Expense Ratio
df["Expense_Ratio"] = (
    df["Total_Expenses"] / df["Income"]
) * 100

# =====================================================
# CREATE RISK LABELS
# =====================================================

def assign_risk(row):

    # High Risk
    if (
        row["Debt_Ratio"] > 40 or
        row["Expense_Ratio"] > 75 or
        row["Savings_Ratio"] < 8
    ):
        return "High Risk"

    # Low Risk
    elif (
        row["Debt_Ratio"] < 25 and
        row["Savings_Ratio"] > 15 and
        row["Expense_Ratio"] < 70
    ):
        return "Low Risk"

    # Medium Risk
    else:
        return "Medium Risk"

# Apply Risk Labels
df["Risk_Label"] = df.apply(assign_risk, axis=1)

# =====================================================
# CREATE SPENDING BEHAVIOR LABELS
# =====================================================

def assign_behavior(row):

    # Debt Heavy
    if row["Debt_Ratio"] > 35:
        return "Debt Heavy"

    # Aggressive Spender
    elif (
        row["Expense_Ratio"] > 75 and
        row["Savings_Ratio"] < 12
    ):
        return "Aggressive Spender"

    # Saver
    elif (
        row["Savings_Ratio"] > 18 and
        row["Expense_Ratio"] < 70
    ):
        return "Saver"

    # Balanced
    else:
        return "Balanced"

# Apply Behavior Labels
df["Behavior_Label"] = df.apply(assign_behavior, axis=1)

# =====================================================
# FINAL FEATURE SELECTION
# =====================================================

final_columns = [
    "Income",
    "Age",
    "Dependents",
    "Desired_Savings",
    "Disposable_Income",
    "Loan_Repayment",
    "Savings_Ratio",
    "Debt_Ratio",
    "Expense_Ratio",
    "Risk_Label",
    "Behavior_Label"
]

ml_df = df[final_columns]

# =====================================================
# SAVE CLEAN DATASET
# =====================================================

output_path = "../dataset/prepared_financial_dataset.csv"

ml_df.to_csv(output_path, index=False)

# =====================================================
# DATASET SUMMARY
# =====================================================

print("\n===== DATASET PREPARED SUCCESSFULLY =====")

print("\nShape:")
print(ml_df.shape)

# -------------------------------
# Risk Distribution
# -------------------------------

print("\n===== RISK DISTRIBUTION =====")
print(ml_df["Risk_Label"].value_counts())

# -------------------------------
# Behavior Distribution
# -------------------------------

print("\n===== BEHAVIOR DISTRIBUTION =====")
print(ml_df["Behavior_Label"].value_counts())

# -------------------------------
# First Rows
# -------------------------------

print("\n===== FIRST 5 ROWS =====")
print(ml_df.head())

# -------------------------------
# Save Path
# -------------------------------

print(f"\nSaved to: {output_path}")