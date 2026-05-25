

import { useState, useEffect } from "react";
import { useAuthState } from "../hooks/useAuthState";
import "../LandingPage/Hero/Hero.css";

export default function FinancialAdvisorChatbotUi() {
  const { user, isAuthenticated } = useAuthState();
  
  const [formData, setFormData] = useState({
    business_type: "",
    existing_savings: "",
    financial_goal: "",
    risk_tolerance: "low",
  });
  
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(user?.monthlyIncome || "");
  const [errors, setErrors] = useState({});
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [formValid, setFormValid] = useState(false);
  const [progress, setProgress] = useState(0);
  const backend_url = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    fetch(`${backend_url}/api/business-types`)
      .then((response) => response.json())
      .then((data) => setBusinessTypes(data.business_types))
      .catch((error) => console.error("Error fetching business types:", error));
  }, []);

  // Update tempIncome when user data changes
  useEffect(() => {
    if (user?.monthlyIncome) {
      setTempIncome(user.monthlyIncome);
    }
  }, [user?.monthlyIncome]);

  // Validation function for positive numbers
  const validatePositiveNumber = (value, fieldName) => {
    const num = parseFloat(value);
    if (value === "") return "";
    if (isNaN(num)) return `${fieldName} must be a valid number`;
    if (num <= 0) return `${fieldName} must be greater than 0`;
    if (num > 999999999) return `${fieldName} is too large`;
    return "";
  };

  useEffect(() => {
    // Validate form fields
    const newErrors = {};
    
    // Validate existing savings
    newErrors.existing_savings = validatePositiveNumber(formData.existing_savings, "Existing savings");
    
    setErrors(newErrors);

    // Check if form is valid and user is authenticated
    const isValid =
      isAuthenticated &&
      user &&
      formData.business_type.trim() !== "" &&
      formData.existing_savings >= 0 && // Allow 0 for savings
      formData.financial_goal.trim() !== "" &&
      Object.values(newErrors).every(error => error === "");

    setFormValid(isValid);
    
    // Calculate progress (fields filled / total fields)
    const total = 4; // business_type, existing_savings, financial_goal, risk_tolerance
    let filled = 0;
    Object.values(formData).forEach((v) => {
      if (v && v !== "") filled++;
    });
    setProgress(Math.round((filled / total) * 100));
  }, [formData, isAuthenticated, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For number fields, only allow positive numbers
    if (['existing_savings'].includes(name)) {
      // Remove any non-numeric characters except decimal point
      const cleanValue = value.replace(/[^0-9.]/g, '');
      
      // Prevent multiple decimal points
      const parts = cleanValue.split('.');
      if (parts.length > 2) return;
      
      // Limit decimal places to 2
      if (parts.length === 2 && parts[1].length > 2) return;
      
      setFormData({ ...formData, [name]: cleanValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleIncomeEdit = () => {
    setIsEditingIncome(true);
  };

  const handleIncomeSave = () => {
    setIsEditingIncome(false);
    // The tempIncome will be used in the form submission
  };

  const handleIncomeCancel = () => {
    setTempIncome(user?.monthlyIncome || "");
    setIsEditingIncome(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formValid || !isAuthenticated || !user) return;
    
    setLoading(true);
    setAdvice(null);
    
    try {
      // Prepare the data with user profile information
      const requestData = {
        name: user.name || "",
        age: user.age || "",
        location: user.location || "",
        preferred_language: user.language || "English",
        monthly_income: tempIncome || user.monthlyIncome || "",
        family_size: user.familySize || "",
        business_type: formData.business_type,
        existing_savings: formData.existing_savings,
        financial_goal: formData.financial_goal,
        risk_tolerance: formData.risk_tolerance,
      };

      const response = await fetch(`${backend_url}/api/financial-advice/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) throw new Error("Failed to fetch advice");
      const result = await response.json();
      setAdvice(result.financial_advice || "No advice available.");
    } catch (error) {
      console.error("Error fetching advice:", error);
      alert("Error fetching advice. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatAdviceContent = (text) => {
    if (!text) return null;
    
    // Clean all markdown symbols first
    const cleanText = text
      .replace(/\*\*/g, '')  // Remove bold markers
      .replace(/\*/g, '')    // Remove italic markers
      .replace(/`/g, '')     // Remove code markers
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/^[-_]{3,}$/gm, ''); // Remove horizontal rules
    
    // Split into sections using numbered patterns
    const sections = cleanText.split(/\n\d+\./g)
      .filter(s => s.trim())
      .map(s => s.trim());
    
    return sections.map((section, index) => {
      // Extract title (first line) and content (rest)
      const lines = section.split('\n');
      const titleLine = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      
      // Determine icon and color based on section number or title keywords
      let icon = '📋';
      let colorClass = 'from-green-500 to-emerald-600';
      let bgClass = 'from-green-50 to-emerald-50';
      
      const titleLower = titleLine.toLowerCase();
      if (titleLower.includes('snapshot') || titleLower.includes('health')) {
        icon = '📊'; colorClass = 'from-blue-500 to-cyan-600'; bgClass = 'from-blue-50 to-cyan-50';
      } else if (titleLower.includes('goal') || titleLower.includes('strategy')) {
        icon = '🎯'; colorClass = 'from-purple-500 to-pink-600'; bgClass = 'from-purple-50 to-pink-50';
      } else if (titleLower.includes('budget')) {
        icon = '💰'; colorClass = 'from-yellow-500 to-orange-600'; bgClass = 'from-yellow-50 to-orange-50';
      } else if (titleLower.includes('investment') || titleLower.includes('roadmap')) {
        icon = '📈'; colorClass = 'from-green-500 to-teal-600'; bgClass = 'from-green-50 to-teal-50';
      } else if (titleLower.includes('emergency') || titleLower.includes('savings')) {
        icon = '🏦'; colorClass = 'from-indigo-500 to-blue-600'; bgClass = 'from-indigo-50 to-blue-50';
      } else if (titleLower.includes('risk') || titleLower.includes('protection')) {
        icon = '⚠️'; colorClass = 'from-red-500 to-pink-600'; bgClass = 'from-red-50 to-pink-50';
      } else if (titleLower.includes('tax')) {
        icon = '💡'; colorClass = 'from-amber-500 to-yellow-600'; bgClass = 'from-amber-50 to-yellow-50';
      } else if (titleLower.includes('business')) {
        icon = '🏢'; colorClass = 'from-teal-500 to-green-600'; bgClass = 'from-teal-50 to-green-50';
      } else if (titleLower.includes('location') || titleLower.includes('benefit')) {
        icon = '📍'; colorClass = 'from-pink-500 to-rose-600'; bgClass = 'from-pink-50 to-rose-50';
      } else if (titleLower.includes('action') || titleLower.includes('plan')) {
        icon = '✓'; colorClass = 'from-green-600 to-emerald-700'; bgClass = 'from-green-100 to-emerald-100';
      } else if (titleLower.includes('summary')) {
        icon = '⭐'; colorClass = 'from-yellow-600 to-amber-700'; bgClass = 'from-yellow-100 to-amber-100';
      }
      
      return { title: titleLine, content, icon, colorClass, bgClass };
    });
  };

  const parseContentWithBullets = (content) => {
    if (!content) return null;
    
    // Clean all markdown and special characters
    const cleanContent = content
      .replace(/\*\*/g, '')  // Remove bold
      .replace(/\*/g, '')    // Remove italic/bullets
      .replace(/`/g, '')     // Remove code markers
      .replace(/#{1,6}\s/g, '') // Remove headings
      .replace(/^[-_]{3,}$/gm, ''); // Remove horizontal rules
    
    const parts = cleanContent.split('\n\n').filter(p => p.trim());
    
    return parts.map((part, idx) => {
      if (part.toLowerCase().includes('quick action')) {
        const actionText = part.replace(/quick action:?/i, '').replace(/\[|\]/g, '').trim();
        return (
          <div key={idx} className="mt-4 p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-l-4 border-green-500">
            <p className="text-sm font-semibold text-green-800 mb-1">⚡ Quick Action</p>
            <p className="text-sm text-gray-800">{actionText}</p>
          </div>
        );
      }
      
      const lines = part.split('\n').filter(l => l.trim());
      const isBulletList = lines.some(l => l.trim().match(/^[•\-*]/));
      
      if (isBulletList) {
        return (
          <ul key={idx} className="space-y-2 mb-4">
            {lines.map((line, i) => {
              // Remove all bullet-like symbols and clean the text
              const text = line
                .replace(/^[•\-*]\s*/, '')
                .replace(/[\[\]]/g, '')
                .trim();
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
      
      // Clean paragraph text
      const cleanPart = part.replace(/[\[\]]/g, '');
      return <p key={idx} className="text-gray-700 leading-relaxed mb-3">{cleanPart}</p>;
    });
  };

  const stripMarkdown = (text) => {
    if (!text) return "";
    return text
      .replace(/\*{2}(.*?)\*{2}/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/#+\s/g, "")
      .replace(/\*/g, "")
      .replace(/\s+/g, " ");
  };

  // Show login message if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl border border-green-100 p-8 max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-green-800 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">
            Please log in to access personalized financial advice. Your profile information will be used to provide tailored recommendations.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white p-3 rounded-lg text-lg font-semibold shadow hover:from-green-600 hover:to-blue-600 transition duration-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* Hero Banner */}
      <div className="w-full py-8 px-4 md:px-0 flex flex-col items-center bg-gradient-to-r from-green-100 to-blue-100 border-b border-green-200">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 mb-1 text-center">Financial Advisor</h1>
        <p className="text-lg text-green-700 mb-2 text-center max-w-2xl">Get personalized, expert financial advice tailored to your rural business, family, and goals. Your journey to financial growth starts here.</p>
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row items-start justify-center w-full max-w-7xl mx-auto px-2 md:px-8 py-6 gap-8">
        {/* Main Form Card */}
        <div className="flex-1 max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-green-100 p-6 animate-fade-in">
          {/* Progress Bar */}
          <div className="w-full h-3 bg-green-50 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                list="business-types"
                name="business_type"
                placeholder="Select or type your business type"
                required
                className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-green-500"
                onChange={handleChange}
                autoComplete="off"
              />
              <datalist id="business-types">
                {businessTypes.map((type, index) => (
                  <option key={index} value={type} />
                ))}
              </datalist>
            </div>
            <div>
              <input
                type="number"
                name="existing_savings"
                placeholder="Existing Savings (₹)"
                min="0"
                step="0.01"
                required
                className={`p-3 border rounded-lg w-full focus:ring-2 focus:ring-green-500 ${errors.existing_savings ? 'border-red-500' : 'border-gray-300'}`}
                onChange={handleChange}
              />
              {errors.existing_savings && <p className="text-red-500 text-xs mt-1">{errors.existing_savings}</p>}
            </div>
            <textarea
              name="financial_goal"
              placeholder="Your Financial Goals"
              required
              className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-green-500"
              onChange={handleChange}
            />
            <select
              name="risk_tolerance"
              required
              className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-green-500"
              onChange={handleChange}
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white p-3 rounded-lg text-lg font-semibold shadow hover:from-green-600 hover:to-blue-600 transition duration-300 disabled:opacity-50"
              disabled={!formValid}
            >
              Get Financial Advice
            </button>
          </form>
          {loading && (
            <div className="flex justify-center items-center h-24">
              <svg className="animate-spin h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            </div>
          )}
          {(!advice && !loading) && (
            <p className="text-center mt-4 text-gray-500">
              No advice to display yet.
            </p>
          )}
        </div>
        {/* Right Sidebar with Illustration and Quote */}
        <div className="hidden md:flex flex-col items-center justify-center w-96 min-h-[28rem] p-6 bg-white/80 rounded-2xl shadow-xl border border-green-100 animate-fade-in">
          <div className="w-20 h-20 rounded-full shadow mb-4 border-4 border-green-200 flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-green-500 to-emerald-600">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <blockquote className="text-lg text-green-800 italic text-center mb-2">"The best way to predict your future is to create it."</blockquote>
          <div className="text-green-600 text-sm text-center mb-4">Your trusted financial partner for rural growth.</div>
          
          {/* User Profile Information */}
          <div className="w-full bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-2 border border-green-200">
            <h3 className="text-sm font-semibold text-green-800 mb-1 text-center">Your Profile Information</h3>
            <div className="space-y-0.5">
              <div className="flex justify-between items-center py-0.5 border-b border-green-100">
                <span className="font-medium text-gray-700 text-xs">Name</span>
                <span className="text-gray-900 text-xs">{user.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-green-100">
                <span className="font-medium text-gray-700 text-xs">Age</span>
                <span className="text-gray-900 text-xs">{user.age || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-green-100">
                <span className="font-medium text-gray-700 text-xs">Location</span>
                <span className="text-gray-900 text-xs">{user.location || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-green-100">
                <span className="font-medium text-gray-700 text-xs">Language</span>
                <span className="text-gray-900 text-xs">{user.language || 'English'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-green-100">
                <span className="font-medium text-gray-700 text-xs">Income</span>
                <div className="flex items-center space-x-1">
                  {isEditingIncome ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={tempIncome}
                        onChange={(e) => setTempIncome(e.target.value)}
                        className="w-16 px-1 py-0.5 text-xs border border-green-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        placeholder="Amount"
                        min="0"
                      />
                      <button
                        onClick={handleIncomeSave}
                        className="text-green-600 hover:text-green-700 text-xs font-medium"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleIncomeCancel}
                        className="text-red-500 hover:text-red-600 text-xs font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900 text-xs">
                        {tempIncome ? `₹${parseInt(tempIncome).toLocaleString()}` : (user.monthlyIncome ? `₹${parseInt(user.monthlyIncome).toLocaleString()}` : 'Not set')}
                      </span>
                      <button
                        onClick={handleIncomeEdit}
                        className="text-green-600 hover:text-green-700 text-xs font-medium ml-1"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-medium text-gray-700 text-xs">Family Size</span>
                <span className="text-gray-900 text-xs">{user.familySize || 'Not set'}</span>
              </div>
            </div>
            <div className="mt-1 pt-1 border-t border-green-200">
              <a href="/profile" className="text-green-600 hover:text-green-700 text-xs font-medium flex items-center justify-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Update Profile
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* Full-width Advice Display */}
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
                  A comprehensive plan designed specifically for {user?.name || 'you'} to achieve financial success
                </p>
              </div>
              
              <div className="grid gap-6 md:gap-8">
                {formattedSections && formattedSections.map((section, index) => (
                  <div 
                    key={index} 
                    className="transform hover:scale-[1.02] transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                      <div className={`bg-gradient-to-r ${section.bgClass} p-6 border-b-2 border-gray-100`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.colorClass} flex items-center justify-center text-3xl shadow-lg transform hover:rotate-12 transition-transform duration-300`}>
                            {section.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${section.colorClass} text-white shadow`}>
                                Step {index + 1}
                              </span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-800">
                              {section.title}
                            </h3>
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
                <button
                  onClick={() => window.print()}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Roadmap
                </button>
                <button
                  onClick={() => setAdvice(null)}
                  className="px-8 py-3 bg-white border-2 border-green-500 text-green-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-green-50 transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
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