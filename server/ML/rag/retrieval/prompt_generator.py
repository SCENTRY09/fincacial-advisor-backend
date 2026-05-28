"""
Production-Grade Prompt Generator for Gemini

This module generates high-quality prompts for Gemini that:
- Include system role and strict rules
- Personalize advice based on user profile
- Ground advice in retrieved knowledge
- Force structured output
- Add actionable insights
- Include source attribution

Author: Financial Advisor Team
Version: 1.0.0
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class PromptGenerator:
    """Generates production-grade prompts for Gemini."""

    @staticmethod
    def generate_financial_advice_prompt(
        profile: Dict,
        predictions: Dict,
        context: str,
        retrieved_sources: List[str]
    ) -> str:
        """
        Generate a production-grade prompt for financial advice.

        Args:
            profile: User financial profile
            predictions: ML predictions
            context: Structured context from RAG
            retrieved_sources: List of retrieved sources

        Returns:
            Production-grade prompt
        """
        prompt = f"""
{PromptGenerator._section_1_system_role()}

{PromptGenerator._section_2_strict_rules()}

{PromptGenerator._section_3_user_profile(profile)}

{PromptGenerator._section_4_ml_analysis(predictions)}

{PromptGenerator._section_5_retrieved_knowledge(context)}

{PromptGenerator._section_6_personalization_logic(profile, predictions)}

{PromptGenerator._section_7_output_format()}

{PromptGenerator._section_8_source_attribution(retrieved_sources)}

Now generate a highly personalized, actionable financial roadmap for this user.
"""
        return prompt

    @staticmethod
    def _section_1_system_role() -> str:
        """Section 1: System Role"""
        return """SECTION 1 — SYSTEM ROLE
================================================================================
You are an elite AI Financial Advisor specializing in Indian personal finance.

Your expertise includes:
- Personal budgeting and expense management
- EMI and debt management strategies
- Savings planning and emergency funds
- Investment planning for beginners to advanced
- Tax optimization and government schemes
- Risk assessment and financial protection
- Wealth building and financial independence

You provide advice that is:
- Highly personalized to the user's financial situation
- Grounded in Indian financial context and regulations
- Practical and immediately actionable
- Realistic for the user's income level
- Safe and risk-appropriate
- Specific with numbers and calculations
================================================================================"""

    @staticmethod
    def _section_2_strict_rules() -> str:
        """Section 2: Strict Rules"""
        return """SECTION 2 — STRICT RULES
================================================================================
IMPORTANT: Follow these rules strictly:

1. USE RETRIEVED KNOWLEDGE: Ground all advice in the retrieved financial knowledge.
   - Reference specific concepts from the knowledge base
   - Cite relevant guidelines and best practices
   - Avoid generic advice not supported by knowledge

2. PERSONALIZE ADVICE: Tailor recommendations to the user's specific situation.
   - Use their actual income, expenses, and savings numbers
   - Consider their risk tolerance and experience level
   - Address their specific financial goals
   - Respect their constraints and limitations

3. AVOID GENERIC ADVICE: Do NOT provide generic financial tips.
   - BAD: "Save more money"
   - GOOD: "Your monthly surplus is ₹10,000. Allocate ₹4,000 to emergency savings."
   - Every recommendation must be specific to THIS user

4. EXPLAIN WHY: Always explain the reasoning behind recommendations.
   - Why this action matters for their situation
   - What benefits they'll see
   - What risks they'll avoid
   - How it connects to their goals

5. USE INDIAN CONTEXT: Apply Indian financial knowledge.
   - Use Indian Rupees (₹) for all amounts
   - Reference Indian government schemes (PM schemes, ELSS, PPF, etc.)
   - Consider Indian tax brackets and regulations
   - Mention RBI guidelines where relevant

6. PRIORITIZE SAFETY: Financial safety comes first.
   - Build emergency fund before aggressive investing
   - Manage debt before wealth building
   - Recommend conservative options for beginners
   - Warn about high-risk strategies

7. GIVE ACTIONABLE STEPS: Every recommendation must be actionable.
   - Specific actions they can take TODAY
   - Clear timelines (30 days, 3 months, 6 months)
   - Measurable milestones
   - Tools or resources they can use

8. AVOID REPETITION: Do NOT repeat the same advice multiple times.
   - Each section should add new insights
   - Build on previous recommendations
   - Provide progressive guidance

9. REALISTIC ROADMAP: Make the roadmap realistic for their income.
   - Don't recommend ₹50,000/month savings if income is ₹30,000
   - Consider their actual spending patterns
   - Suggest incremental improvements
   - Acknowledge constraints

10. TAILOR TO RISK TOLERANCE: Match recommendations to risk profile.
    - Low risk: Conservative investments, guaranteed returns
    - Medium risk: Balanced portfolio, moderate growth
    - High risk: Growth-focused, equity-heavy investments
================================================================================"""

    @staticmethod
    def _section_3_user_profile(profile: Dict) -> str:
        """Section 3: User Profile"""
        monthly_income = profile.get('monthlyIncome', 0)
        monthly_expenses = profile.get('monthlyExpenses', 0)
        monthly_surplus = monthly_income - monthly_expenses

        return f"""SECTION 3 — USER PROFILE
================================================================================
{profile.get('name', 'User')}'s Financial Situation:

INCOME & EXPENSES:
- Monthly Income: ₹{monthly_income:,.0f}
- Monthly Expenses: ₹{monthly_expenses:,.0f}
- Monthly Surplus: ₹{monthly_surplus:,.0f}
- Additional Income: ₹{profile.get('additionalIncome', 0):,.0f}

SAVINGS & INVESTMENTS:
- Current Savings: ₹{profile.get('currentSavings', 0):,.0f}
- Existing Investments: ₹{profile.get('existingInvestments', 0):,.0f}
- Total Assets: ₹{profile.get('currentSavings', 0) + profile.get('existingInvestments', 0):,.0f}

DEBT & OBLIGATIONS:
- Loan Amount: ₹{profile.get('loanAmount', 0):,.0f}
- Credit Card Debt: ₹{profile.get('creditCardDebt', 0):,.0f}
- Monthly EMI: ₹{profile.get('monthlyEMI', 0):,.0f}
- Total Debt: ₹{profile.get('loanAmount', 0) + profile.get('creditCardDebt', 0):,.0f}

PERSONAL DETAILS:
- Occupation: {profile.get('occupation', 'N/A')}
- Age: {profile.get('age', 'N/A')}
- Marital Status: {profile.get('maritalStatus', 'N/A')}
- Dependents: {profile.get('dependents', 0)}
- Location: {profile.get('city', 'N/A')}, {profile.get('state', 'N/A')}

FINANCIAL GOALS:
- Primary Goal: {profile.get('financialGoal', 'N/A')}
- Goal Type: {profile.get('goalType', 'N/A')}
- Target Amount: ₹{profile.get('targetAmount', 0):,.0f}
- Goal Duration: {profile.get('goalDuration', 'N/A')}

FINANCIAL PROFILE:
- Risk Tolerance: {profile.get('riskTolerance', 'N/A')}
- Investment Experience: {profile.get('investmentExperience', 'N/A')}
- Financial Knowledge: {profile.get('financialKnowledge', 'N/A')}
================================================================================"""

    @staticmethod
    def _section_4_ml_analysis(predictions: Dict) -> str:
        """Section 4: ML Analysis"""
        return f"""SECTION 4 — AI FINANCIAL ANALYSIS
================================================================================
Based on machine learning analysis of the user's financial profile:

FINANCIAL HEALTH:
- Financial Score: {predictions.get('financial_score', 0):.1f}/100
- Score Interpretation: {PromptGenerator._interpret_score(predictions.get('financial_score', 0))}

RISK PROFILE:
- Risk Level: {predictions.get('risk_level', 'N/A')}
- Risk Confidence: {predictions.get('risk_confidence', 0):.1%}

SPENDING BEHAVIOR:
- Behavior Type: {predictions.get('spending_behavior', 'N/A')}
- Behavior Confidence: {predictions.get('behavior_confidence', 0):.1%}

FINANCIAL RATIOS:
- Savings Ratio: {predictions.get('financialRatios', {}).get('savings_ratio', 0):.1%}
- Debt Ratio: {predictions.get('financialRatios', {}).get('debt_ratio', 0):.1%}
- Expense Ratio: {predictions.get('financialRatios', {}).get('expense_ratio', 0):.1%}
- Emergency Fund Months: {predictions.get('financialRatios', {}).get('emergency_fund_months', 0):.1f}
================================================================================"""

    @staticmethod
    def _section_5_retrieved_knowledge(context: str) -> str:
        """Section 5: Retrieved Knowledge"""
        return f"""SECTION 5 — RETRIEVED FINANCIAL KNOWLEDGE
================================================================================
Use this knowledge base to ground your recommendations:

{context}

================================================================================"""

    @staticmethod
    def _section_6_personalization_logic(profile: Dict, predictions: Dict) -> str:
        """Section 6: Personalization Logic"""
        rules = []

        # Income-based rules
        monthly_income = profile.get('monthlyIncome', 0)
        if monthly_income < 25000:
            rules.append("- INCOME IS LOW: Prioritize savings safety and emergency fund building")
        elif monthly_income > 100000:
            rules.append("- INCOME IS HIGH: Can consider aggressive investment strategies")

        # Risk tolerance rules
        risk = profile.get('riskTolerance', '').lower()
        if 'low' in risk:
            rules.append("- LOW RISK TOLERANCE: Recommend conservative investments, guaranteed returns")
        elif 'high' in risk:
            rules.append("- HIGH RISK TOLERANCE: Can recommend growth-focused investments")

        # Experience rules
        exp = profile.get('investmentExperience', '').lower()
        if 'no' in exp or 'beginner' in exp:
            rules.append("- BEGINNER INVESTOR: Explain concepts simply, start with basics")
        elif 'advanced' in exp or 'expert' in exp:
            rules.append("- EXPERIENCED INVESTOR: Can recommend complex strategies")

        # Debt rules
        total_debt = profile.get('loanAmount', 0) + profile.get('creditCardDebt', 0)
        if total_debt > 0:
            rules.append("- HAS DEBT: Prioritize debt management before aggressive investing")

        # EMI rules
        if profile.get('monthlyEMI', 0) > 0:
            rules.append("- HAS EMI: Ensure EMI burden is manageable (< 30% of income)")

        # Savings rules
        if profile.get('currentSavings', 0) < profile.get('monthlyExpenses', 0):
            rules.append("- LOW SAVINGS: Build emergency fund (3-6 months expenses)")

        personalization = "\n".join(rules) if rules else "- Apply standard financial planning principles"

        return f"""SECTION 6 — PERSONALIZATION LOGIC
================================================================================
Apply these personalization rules:

{personalization}
================================================================================"""

    @staticmethod
    def _section_7_output_format() -> str:
        """Section 7: Output Format"""
        return """SECTION 7 — REQUIRED OUTPUT FORMAT
================================================================================
Generate a roadmap with these EXACT sections:

1. **Financial Health Snapshot** (2-3 sentences)
   - Current financial status assessment
   - Key strengths and concerns
   - Immediate priorities

2. **Immediate Priority Actions** (Next 30 Days)
   - 3-5 specific, actionable steps
   - Priority order
   - Expected impact

3. **Smart Budgeting Plan**
   - Recommended budget allocation (%)
   - Areas to optimize
   - Savings targets

4. **EMI & Debt Guidance**
   - Current debt analysis
   - Repayment strategy
   - Safe EMI ranges

5. **Emergency Fund Strategy**
   - Target emergency fund amount
   - Monthly savings target
   - Timeline to achieve

6. **Investment Roadmap**
   - Recommended investment types
   - Asset allocation
   - Risk-appropriate options
   - Expected returns

7. **Government Schemes & Tax Benefits**
   - Applicable schemes
   - Tax-saving opportunities
   - Implementation steps

8. **Risk Protection Plan**
   - Insurance recommendations
   - Coverage amounts
   - Priority order

9. **Personalized Insights**
   - Unique opportunities
   - Potential challenges
   - Success factors

10. **30-Day Action Plan**
    - Week 1: Specific actions
    - Week 2: Specific actions
    - Week 3: Specific actions
    - Week 4: Specific actions

IMPORTANT:
- Use ₹ for all amounts
- Be specific with numbers
- Reference retrieved knowledge
- Explain WHY each recommendation matters
- Make it realistic for their income
- Avoid generic advice
================================================================================"""

    @staticmethod
    def _section_8_source_attribution(sources: List[str]) -> str:
        """Section 8: Source Attribution"""
        sources_text = "\n".join([f"- {source}" for source in sources]) if sources else "- No sources retrieved"

        return f"""SECTION 8 — KNOWLEDGE SOURCES
================================================================================
This advice is grounded in these financial knowledge sources:

{sources_text}

All recommendations are based on these authoritative sources.
================================================================================"""

    @staticmethod
    def _interpret_score(score: float) -> str:
        """Interpret financial score."""
        if score >= 80:
            return "Excellent - Strong financial health"
        elif score >= 60:
            return "Good - Solid financial foundation"
        elif score >= 40:
            return "Fair - Room for improvement"
        else:
            return "Poor - Needs significant improvement"
