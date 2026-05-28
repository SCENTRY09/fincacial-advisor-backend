import { useState, useEffect } from "react";
import { useAuthState } from "../hooks/useAuthState";
import "../LandingPage/Hero/Hero.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const OCCUPATION_OPTIONS = [
  "Salaried Employee", "Self-Employed", "Business Owner", "Farmer",
  "Freelancer", "Student", "Retired", "Homemaker", "Government Employee", "Other",
];

const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

const GOAL_TYPE_OPTIONS = [
  "Retirement", "Buy a House", "Children's Education", "Emergency Fund",
  "Start a Business", "Wealth Creation", "Debt Repayment", "Travel", "Other",
];

const GOAL_DURATION_OPTIONS = [
  "Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "More than 10 years",
];

const INVESTMENT_EXP_OPTIONS = [
  "No experience", "Less than 1 year", "1–3 years", "3–5 years", "More than 5 years",
];

const FINANCIAL_KNOWLEDGE_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Expert"];

const TOTAL_FIELDS = 18; // used for progress calculation

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  // Section 1 — Personal
  occupation: "",
  maritalStatus: "",
  dependents: "",
  city: "",
  state: "",
  // Section 2 — Income
  monthlyIncome: "",
  additionalIncome: "",
  monthlyExpenses: "",
  savings: "",
  existingInvestments: "",
  // Section 3 — Debt
  loanAmount: "",
  creditCardDebt: "",
  monthlyEMI: "",
  // Section 4 — Goals
  goalType: "",
  goalDuration: "",
  targetAmount: "",
  // Section 5 — Risk
  riskTolerance: "medium",
  investmentExperience: "",
  financialKnowledge: "",
  // Legacy fields kept for API compatibility
  business_type: "",
  existing_savings: "",
  financial_goal: "",
  risk_tolerance: "medium",
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm(f) {
  const errs = {};

  // Personal
  if (!f.occupation) errs.occupation = "Occupation is required";
  if (!f.maritalStatus) errs.maritalStatus = "Marital status is required";
  if (f.dependents === "" || f.dependents === null) {
    errs.dependents = "Number of dependents is required";
  } else if (isNaN(Number(f.dependents)) || Number(f.dependents) < 0) {
    errs.dependents = "Must be 0 or more";
  }
  if (!f.city.trim()) errs.city = "City is required";
  if (!f.state.trim()) errs.state = "State is required";

  // Income
  const numFields = [
    ["monthlyIncome", "Monthly income", true],
    ["additionalIncome", "Additional income", false],
    ["monthlyExpenses", "Monthly expenses", true],
    ["savings", "Savings", true],
    ["existingInvestments", "Existing investments", false],
    ["loanAmount", "Loan amount", false],
    ["creditCardDebt", "Credit card debt", false],
    ["monthlyEMI", "Monthly EMI", false],
    ["targetAmount", "Target amount", true],
  ];
  numFields.forEach(([key, label, required]) => {
    const val = f[key];
    if (val === "" || val === null || val === undefined) {
      if (required) errs[key] = `${label} is required`;
    } else {
      const n = Number(val);
      if (isNaN(n) || n < 0) errs[key] = `${label} must be 0 or more`;
    }
  });

  // Goals
  if (!f.goalType) errs.goalType = "Goal type is required";
  if (!f.goalDuration) errs.goalDuration = "Goal duration is required";

  // Risk
  if (!f.investmentExperience) errs.investmentExperience = "Investment experience is required";
  if (!f.financialKnowledge) errs.financialKnowledge = "Financial knowledge level is required";

  // Legacy
  if (!f.business_type.trim()) errs.business_type = "Business type is required";
  if (!f.financial_goal.trim()) errs.financial_goal = "Financial goal description is required";

  return errs;
}

function countFilled(f) {
  const keys = [
    "occupation", "maritalStatus", "dependents", "city", "state",
    "monthlyIncome", "additionalIncome", "monthlyExpenses", "savings", "existingInvestments",
    "loanAmount", "creditCardDebt", "monthlyEMI",
    "goalType", "goalDuration", "targetAmount",
    "investmentExperience", "financialKnowledge",
  ];
  return keys.filter(k => f[k] !== "" && f[k] !== null && f[k] !== undefined).length;
}

// ─── Reusable field components ────────────────────────────────────────────────

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function TextInput({ name, placeholder, value, onChange, error, type = "text", min, step }) {
  return (
    <div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        className={`p-2.5 border rounded-lg w-full text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      />
      <FieldError msg={error} />
    </div>
  );
}

function SelectInput({ name, value, onChange, options, placeholder, error }) {
  return (
    <div>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`p-2.5 border rounded-lg w-full text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <FieldError msg={error} />
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-green-800 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancialAdvisorChatbotUi() {
  const { user, isAuthenticated } = useAuthState();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(user?.monthlyIncome || "");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [progress, setProgress] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const backend_url = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // Fetch business types
  useEffect(() => {
    fetch(`${backend_url}/api/business-types`)
      .then(r => r.json())
      .then(d => setBusinessTypes(d.business_types || []))
      .catch(e => console.error("Error fetching business types:", e));
  }, [backend_url]);

  // Sync income from user profile
  useEffect(() => {
    if (user?.monthlyIncome) setTempIncome(user.monthlyIncome);
  }, [user?.monthlyIncome]);

  // Keep legacy savings field in sync with new savings field
  useEffect(() => {
    if (formData.savings !== formData.existing_savings) {
      setFormData(prev => ({ ...prev, existing_savings: prev.savings }));
    }
  }, [formData.savings]);

  // Keep legacy risk field in sync
  useEffect(() => {
    if (formData.riskTolerance !== formData.risk_tolerance) {
      setFormData(prev => ({ ...prev, risk_tolerance: prev.riskTolerance }));
    }
  }, [formData.riskTolerance]);

  // Validate and update progress on every change
  useEffect(() => {
    const errs = validateForm(formData);
    setErrors(errs);
    setProgress(Math.round((countFilled(formData) / TOTAL_FIELDS) * 100));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Sanitise numeric fields — allow only digits and one decimal point
    const numericFields = [
      "monthlyIncome", "additionalIncome", "monthlyExpenses", "savings",
      "existingInvestments", "loanAmount", "creditCardDebt", "monthlyEMI",
      "targetAmount", "dependents", "existing_savings",
    ];
    if (numericFields.includes(name)) {
      const clean = value.replace(/[^0-9.]/g, "");
      const parts = clean.split(".");
      if (parts.length > 2) return;
      if (parts.length === 2 && parts[1].length > 2) return;
      setFormData(prev => ({ ...prev, [name]: clean }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const isFormValid = () => {
    if (!isAuthenticated || !user) return false;
    return Object.keys(validateForm(formData)).length === 0;
  };

  // Show errors for all fields on submit attempt
  const markAllTouched = () => {
    const all = {};
    Object.keys(INITIAL_FORM).forEach(k => { all[k] = true; });
    setTouched(all);
  };

  const visibleError = (field) => (touched[field] || submitAttempted) ? errors[field] : undefined;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    markAllTouched();

    if (!isFormValid()) return;

    setLoading(true);
    setAdvice(null);

    try {
      // Build a structured ML-quality payload.
      // userId is NEVER sent from the frontend — the backend reads req.user._id.
      const requestData = {
        // ── From user profile (server-verified) ──
        name: user.name || "",
        age: user.age || "",
        location: user.location || "",
        preferred_language: user.language || "English",
        family_size: user.familySize || "",

        // ── Section 1: Personal ──
        occupation: formData.occupation,
        maritalStatus: formData.maritalStatus,
        dependents: Number(formData.dependents),
        city: formData.city,
        state: formData.state,

        // ── Section 2: Income ──
        monthly_income: tempIncome || user.monthlyIncome || "",
        monthlyIncome: Number(formData.monthlyIncome) || Number(tempIncome) || 0,
        additionalIncome: Number(formData.additionalIncome) || 0,
        monthlyExpenses: Number(formData.monthlyExpenses) || 0,
        savings: Number(formData.savings) || 0,
        existingInvestments: Number(formData.existingInvestments) || 0,

        // ── Section 3: Debt ──
        loanAmount: Number(formData.loanAmount) || 0,
        creditCardDebt: Number(formData.creditCardDebt) || 0,
        monthlyEMI: Number(formData.monthlyEMI) || 0,

        // ── Section 4: Goals ──
        goalType: formData.goalType,
        goalDuration: formData.goalDuration,
        targetAmount: Number(formData.targetAmount) || 0,
        financial_goal: formData.financial_goal ||
          `${formData.goalType} in ${formData.goalDuration} with target ₹${formData.targetAmount}`,

        // ── Section 5: Risk ──
        risk_tolerance: formData.riskTolerance,
        investmentExperience: formData.investmentExperience,
        financialKnowledge: formData.financialKnowledge,

        // ── Legacy fields ──
        business_type: formData.business_type,
        existing_savings: Number(formData.savings) || 0,
      };

      const response = await fetch(`${backend_url}/api/financial-advice/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch advice");
      }

      const result = await response.json();
      setAdvice(result.financial_advice || "No advice available.");
    } catch (error) {
      console.error("Error fetching advice:", error);
      alert(`Error: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // ── Income inline edit ───────────────────────────────────────────────────────
  const handleIncomeEdit = () => setIsEditingIncome(true);
  const handleIncomeSave = () => setIsEditingIncome(false);
  const handleIncomeCancel = () => {
    setTempIncome(user?.monthlyIncome || "");
    setIsEditingIncome(false);
  };

  // ── Advice formatting (unchanged from original) ──────────────────────────────
  const formatAdviceContent = (text) => {
    if (!text) return null;
    const cleanText = text
      .replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "")
      .replace(/#{1,6}\s/g, "").replace(/^[-_]{3,}$/gm, "");
    const sections = cleanText.split(/\n\d+\./g).filter(s => s.trim()).map(s => s.trim());
    return sections.map((section) => {
      const lines = section.split("\n");
      const titleLine = lines[0].trim();
      const content = lines.slice(1).join("\n").trim();
      let icon = "📋", colorClass = "from-green-500 to-emerald-600", bgClass = "from-green-50 to-emerald-50";
      const t = titleLine.toLowerCase();
      if (t.includes("snapshot") || t.includes("health")) { icon = "📊"; colorClass = "from-blue-500 to-cyan-600"; bgClass = "from-blue-50 to-cyan-50"; }
      else if (t.includes("goal") || t.includes("strategy")) { icon = "🎯"; colorClass = "from-purple-500 to-pink-600"; bgClass = "from-purple-50 to-pink-50"; }
      else if (t.includes("budget")) { icon = "💰"; colorClass = "from-yellow-500 to-orange-600"; bgClass = "from-yellow-50 to-orange-50"; }
      else if (t.includes("investment") || t.includes("roadmap")) { icon = "📈"; colorClass = "from-green-500 to-teal-600"; bgClass = "from-green-50 to-teal-50"; }
      else if (t.includes("emergency") || t.includes("savings")) { icon = "🏦"; colorClass = "from-indigo-500 to-blue-600"; bgClass = "from-indigo-50 to-blue-50"; }
      else if (t.includes("risk") || t.includes("protection")) { icon = "⚠️"; colorClass = "from-red-500 to-pink-600"; bgClass = "from-red-50 to-pink-50"; }
      else if (t.includes("tax")) { icon = "💡"; colorClass = "from-amber-500 to-yellow-600"; bgClass = "from-amber-50 to-yellow-50"; }
      else if (t.includes("business")) { icon = "🏢"; colorClass = "from-teal-500 to-green-600"; bgClass = "from-teal-50 to-green-50"; }
      else if (t.includes("location") || t.includes("benefit")) { icon = "📍"; colorClass = "from-pink-500 to-rose-600"; bgClass = "from-pink-50 to-rose-50"; }
      else if (t.includes("action") || t.includes("plan")) { icon = "✓"; colorClass = "from-green-600 to-emerald-700"; bgClass = "from-green-100 to-emerald-100"; }
      else if (t.includes("summary")) { icon = "⭐"; colorClass = "from-yellow-600 to-amber-700"; bgClass = "from-yellow-100 to-amber-100"; }
      return { title: titleLine, content, icon, colorClass, bgClass };
    });
  };

  const parseContentWithBullets = (content) => {
    if (!content) return null;
    const cleanContent = content
      .replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "")
      .replace(/#{1,6}\s/g, "").replace(/^[-_]{3,}$/gm, "");
    const parts = cleanContent.split("\n\n").filter(p => p.trim());
    return parts.map((part, idx) => {
      if (part.toLowerCase().includes("quick action")) {
        const actionText = part.replace(/quick action:?/i, "").replace(/\[|\]/g, "").trim();
        return (
          <div key={idx} className="mt-4 p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-l-4 border-green-500">
            <p className="text-sm font-semibold text-green-800 mb-1">⚡ Quick Action</p>
            <p className="text-sm text-gray-800">{actionText}</p>
          </div>
        );
      }
      const lines = part.split("\n").filter(l => l.trim());
      const isBulletList = lines.some(l => l.trim().match(/^[•\-*]/));
      if (isBulletList) {
        return (
          <ul key={idx} className="space-y-2 mb-4">
            {lines.map((line, i) => {
              const text = line.replace(/^[•\-*]\s*/, "").replace(/[\[\]]/g, "").trim();
              if (!text) return null;
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1 flex-shrink-0">✓</span>
                  <span className="text-gray-700 leading-relaxed">{text}</span>
                </li>
              );
            })}
          </ul>
        );
      }
      return <p key={idx} className="text-gray-700 leading-relaxed mb-3">{part.replace(/[\[\]]/g, "")}</p>;
    });
  };

  // ── Auth guard ───────────────────────────────────────────────────────────────
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl border border-green-100 p-8 max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-green-800 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access personalized financial advice.</p>
          <button onClick={() => window.location.href = "/login"}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white p-3 rounded-lg text-lg font-semibold shadow hover:from-green-600 hover:to-blue-600 transition duration-300">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">

      {/* Hero Banner */}
      <div className="w-full py-8 px-4 flex flex-col items-center bg-gradient-to-r from-green-100 to-blue-100 border-b border-green-200">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 mb-1 text-center">Financial Advisor</h1>
        <p className="text-lg text-green-700 text-center max-w-2xl">
          Get personalized, expert financial advice tailored to your profile, goals, and risk appetite.
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center w-full max-w-7xl mx-auto px-3 md:px-8 py-6 gap-8">

        {/* ── Form Card ── */}
        <div className="flex-1 w-full max-w-2xl mx-auto animate-fade-in">

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Profile Completion</span>
              <span className="font-semibold text-green-700">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* ── Section 1: Personal Information ── */}
            <SectionCard title="Personal Information" icon="👤">
              <div>
                <Label required>Occupation</Label>
                <SelectInput name="occupation" value={formData.occupation} onChange={handleChange}
                  options={OCCUPATION_OPTIONS} placeholder="Select occupation"
                  error={visibleError("occupation")} />
              </div>
              <div>
                <Label required>Marital Status</Label>
                <SelectInput name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}
                  options={MARITAL_OPTIONS} placeholder="Select status"
                  error={visibleError("maritalStatus")} />
              </div>
              <div>
                <Label required>Number of Dependents</Label>
                <TextInput name="dependents" type="number" placeholder="e.g. 2" min="0"
                  value={formData.dependents} onChange={handleChange}
                  error={visibleError("dependents")} />
              </div>
              <div>
                <Label required>City</Label>
                <TextInput name="city" placeholder="e.g. Pune" value={formData.city}
                  onChange={handleChange} error={visibleError("city")} />
              </div>
              <div className="sm:col-span-2">
                <Label required>State</Label>
                <TextInput name="state" placeholder="e.g. Maharashtra" value={formData.state}
                  onChange={handleChange} error={visibleError("state")} />
              </div>
            </SectionCard>

            {/* ── Section 2: Income & Expenses ── */}
            <SectionCard title="Income & Expenses" icon="💰">
              <div>
                <Label required>Monthly Income (₹)</Label>
                <TextInput name="monthlyIncome" type="number" placeholder="e.g. 50000" min="0"
                  value={formData.monthlyIncome} onChange={handleChange}
                  error={visibleError("monthlyIncome")} />
              </div>
              <div>
                <Label>Additional Income (₹)</Label>
                <TextInput name="additionalIncome" type="number" placeholder="e.g. 10000" min="0"
                  value={formData.additionalIncome} onChange={handleChange}
                  error={visibleError("additionalIncome")} />
              </div>
              <div>
                <Label required>Monthly Expenses (₹)</Label>
                <TextInput name="monthlyExpenses" type="number" placeholder="e.g. 30000" min="0"
                  value={formData.monthlyExpenses} onChange={handleChange}
                  error={visibleError("monthlyExpenses")} />
              </div>
              <div>
                <Label required>Current Savings (₹)</Label>
                <TextInput name="savings" type="number" placeholder="e.g. 100000" min="0"
                  value={formData.savings} onChange={handleChange}
                  error={visibleError("savings")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Existing Investments (₹)</Label>
                <TextInput name="existingInvestments" type="number" placeholder="e.g. 50000" min="0"
                  value={formData.existingInvestments} onChange={handleChange}
                  error={visibleError("existingInvestments")} />
              </div>
            </SectionCard>

            {/* ── Section 3: Debt Information ── */}
            <SectionCard title="Debt Information" icon="🏦">
              <div>
                <Label>Total Loan Amount (₹)</Label>
                <TextInput name="loanAmount" type="number" placeholder="e.g. 500000" min="0"
                  value={formData.loanAmount} onChange={handleChange}
                  error={visibleError("loanAmount")} />
              </div>
              <div>
                <Label>Credit Card Debt (₹)</Label>
                <TextInput name="creditCardDebt" type="number" placeholder="e.g. 20000" min="0"
                  value={formData.creditCardDebt} onChange={handleChange}
                  error={visibleError("creditCardDebt")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Monthly EMI (₹)</Label>
                <TextInput name="monthlyEMI" type="number" placeholder="e.g. 15000" min="0"
                  value={formData.monthlyEMI} onChange={handleChange}
                  error={visibleError("monthlyEMI")} />
              </div>
            </SectionCard>

            {/* ── Section 4: Financial Goals ── */}
            <SectionCard title="Financial Goals" icon="🎯">
              <div>
                <Label required>Goal Type</Label>
                <SelectInput name="goalType" value={formData.goalType} onChange={handleChange}
                  options={GOAL_TYPE_OPTIONS} placeholder="Select goal"
                  error={visibleError("goalType")} />
              </div>
              <div>
                <Label required>Goal Duration</Label>
                <SelectInput name="goalDuration" value={formData.goalDuration} onChange={handleChange}
                  options={GOAL_DURATION_OPTIONS} placeholder="Select duration"
                  error={visibleError("goalDuration")} />
              </div>
              <div>
                <Label required>Target Amount (₹)</Label>
                <TextInput name="targetAmount" type="number" placeholder="e.g. 1000000" min="0"
                  value={formData.targetAmount} onChange={handleChange}
                  error={visibleError("targetAmount")} />
              </div>
              <div>
                <Label required>Business / Occupation Type</Label>
                <div>
                  <input list="business-types" name="business_type" placeholder="Select or type"
                    value={formData.business_type} onChange={handleChange} autoComplete="off"
                    className={`p-2.5 border rounded-lg w-full text-sm focus:ring-2 focus:ring-green-500 transition ${
                      visibleError("business_type") ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`} />
                  <datalist id="business-types">
                    {businessTypes.map((t, i) => <option key={i} value={t} />)}
                  </datalist>
                  <FieldError msg={visibleError("business_type")} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label required>Describe Your Financial Goal</Label>
                <textarea name="financial_goal" placeholder="e.g. I want to save ₹10 lakh for my child's education in 5 years"
                  value={formData.financial_goal} onChange={handleChange} rows={3}
                  className={`p-2.5 border rounded-lg w-full text-sm focus:ring-2 focus:ring-green-500 transition resize-none ${
                    visibleError("financial_goal") ? "border-red-400 bg-red-50" : "border-gray-300"
                  }`} />
                <FieldError msg={visibleError("financial_goal")} />
              </div>
            </SectionCard>

            {/* ── Section 5: Risk Profile ── */}
            <SectionCard title="Risk Profile" icon="📊">
              <div>
                <Label required>Risk Tolerance</Label>
                <select name="riskTolerance" value={formData.riskTolerance} onChange={handleChange}
                  className="p-2.5 border border-gray-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-green-500 transition">
                  <option value="low">Low — I prefer safety over returns</option>
                  <option value="medium">Medium — Balanced approach</option>
                  <option value="high">High — I can handle volatility</option>
                </select>
              </div>
              <div>
                <Label required>Investment Experience</Label>
                <SelectInput name="investmentExperience" value={formData.investmentExperience}
                  onChange={handleChange} options={INVESTMENT_EXP_OPTIONS}
                  placeholder="Select experience" error={visibleError("investmentExperience")} />
              </div>
              <div className="sm:col-span-2">
                <Label required>Financial Knowledge Level</Label>
                <SelectInput name="financialKnowledge" value={formData.financialKnowledge}
                  onChange={handleChange} options={FINANCIAL_KNOWLEDGE_OPTIONS}
                  placeholder="Select level" error={visibleError("financialKnowledge")} />
              </div>
            </SectionCard>

            {/* ── Validation summary ── */}
            {submitAttempted && Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm font-semibold mb-1">Please fix the following:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {Object.values(errors).map((e, i) => (
                    <li key={i} className="text-red-600 text-xs">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Submit ── */}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white p-3.5 rounded-xl text-base font-bold shadow-lg hover:from-green-600 hover:to-blue-600 transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating Your Roadmap...
                </>
              ) : (
                <>🚀 Get My Financial Roadmap</>
              )}
            </button>
          </form>

          {!advice && !loading && (
            <p className="text-center mt-4 text-gray-400 text-sm">
              Fill in all sections above to generate your personalised advice.
            </p>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="hidden lg:flex flex-col items-center w-80 gap-4 sticky top-6">
          {/* Avatar + quote */}
          <div className="w-full bg-white rounded-2xl shadow-xl border border-green-100 p-5 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full shadow mb-3 border-4 border-green-200 flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-green-500 to-emerald-600">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <p className="text-base font-bold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500 mb-3">{user?.email}</p>
            <blockquote className="text-sm text-green-800 italic text-center">
              "The best way to predict your future is to create it."
            </blockquote>
          </div>

          {/* Profile summary */}
          <div className="w-full bg-white rounded-2xl shadow-xl border border-green-100 p-4">
            <h3 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-3">Profile Summary</h3>
            <div className="space-y-1.5">
              {[
                ["Name", user.name],
                ["Age", user.age],
                ["Location", user.location],
                ["Language", user.language || "English"],
                ["Family Size", user.familySize],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-medium text-gray-800">{val || "Not set"}</span>
                </div>
              ))}
              {/* Editable income */}
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-gray-500">Income</span>
                {isEditingIncome ? (
                  <div className="flex items-center gap-1">
                    <input type="number" value={tempIncome} onChange={e => setTempIncome(e.target.value)}
                      className="w-20 px-1.5 py-0.5 text-xs border border-green-300 rounded focus:ring-1 focus:ring-green-500" min="0" />
                    <button onClick={handleIncomeSave} className="text-green-600 text-xs font-bold">✓</button>
                    <button onClick={handleIncomeCancel} className="text-red-500 text-xs font-bold">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-800">
                      {tempIncome ? `₹${parseInt(tempIncome).toLocaleString()}` : "Not set"}
                    </span>
                    <button onClick={handleIncomeEdit} className="text-green-600 text-xs">✏️</button>
                  </div>
                )}
              </div>
            </div>
            <a href="/profile" className="mt-3 flex items-center justify-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Update Profile
            </a>
          </div>

          {/* Progress card */}
          <div className="w-full bg-white rounded-2xl shadow-xl border border-green-100 p-4">
            <h3 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">Form Progress</h3>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 text-right">{progress}% complete</p>
          </div>
        </div>
      </div>

      {/* ── Full-width Advice Display (unchanged layout) ── */}
      {advice && (() => {
        const formattedSections = formatAdviceContent(advice);
        return (
          <div className="w-full py-12 px-4 md:px-8 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-t border-green-200 animate-fade-in">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4">
                  Your Personalized Financial Roadmap 🚀
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  A comprehensive plan designed specifically for {user?.name || "you"} to achieve financial success
                </p>
              </div>

              <div className="grid gap-6 md:gap-8">
                {formattedSections && formattedSections.map((section, index) => (
                  <div key={index} className="transform hover:scale-[1.02] transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${0.1 * index}s` }}>
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                      <div className={`bg-gradient-to-r ${section.bgClass} p-6 border-b-2 border-gray-100`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.colorClass} flex items-center justify-center text-3xl shadow-lg`}>
                            {section.icon}
                          </div>
                          <div className="flex-1">
                            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${section.colorClass} text-white shadow mb-1`}>
                              Step {index + 1}
                            </span>
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-800">{section.title}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 md:p-8">
                        <div className="prose prose-lg max-w-none">
                          {parseContentWithBullets(section.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button onClick={() => window.print()}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Roadmap
                </button>
                <button onClick={() => { setAdvice(null); setSubmitAttempted(false); }}
                  className="px-8 py-3 bg-white border-2 border-green-500 text-green-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-green-50 transform hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Get New Advice
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
