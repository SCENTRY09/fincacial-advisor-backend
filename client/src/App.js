import "./App.css";
import { Routes, Route } from "react-router-dom";
// import Home from "./Pages/Home";
import { ToastContainer } from "react-toastify";
import NewsPage from "./Pages/NewsPage";
import LearningCenter from "./Pages/Learnings";
// import UserProfile from "./Pages/ProfilePage";
import VerticalRoadmap from "./Pages/Roadmap";
import YouTubeShorts from "./components/Shorts";
import FinancialAdvisor from "./Pages/Heropage";
import ErrorPage from "./components/ErrorPage";
import GovernmentSchemes from "./Pages/GovernmentScheme";
// import PPFCalculator from "./Pages/PpfCalculator";
import PPFCalculator from "./Pages/FinancialCalculatorsDashboard";
// import WomenEmpowerment from "./Pages/WomensSection";
import UnifiedAssistant from "./components/UnifiedAssistant";
import ErrorBoundary from "./components/ErrorBoundary";
import MicroinvestmentPlatform from "./Pages/mip";
import PoultryFarmGuide from "./Pages/poultry";
import RuralBusinessOpportunities from "./Pages/ruralbusiness";
import BusinessGuide from "./Pages/BusinessGuide";
import Chatbot from "./Pages/chatbot";
import DiscussionForums from "./Pages/community";
import DairyForumPage from "./Pages/dairyforum";
import SuccessStories from "./Pages/SuccessStoriesAvi";
import QASessions from "./Pages/qna";
import DocOCR from "./Pages/docOCR";

import LoginPage from "./Pages/Login";
import RegistrationPage from "./Pages/Signup";
import SuccessLogin from "./Pages/SuccessLogin";
import Profile from "./Pages/Profile";

import ProtectedRoute from "./components/protected-route"; 

import FinancialAdvisorChatbotUi from "./Pages/financialAdvisiorChatBotUi";
import LandingPage from "./LandingPage/Landingpage";  

import ExpenseTracker from "./Pages/ExpenseTracker"; // Adjust the path based on your file structure
import ScamsPage from "./Pages/ScamsPage";


function App() {
  return (
    <div className="App">
      
      <ErrorBoundary>
        <UnifiedAssistant />
      </ErrorBoundary>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{
          fontSize: '14px',
          fontWeight: '500',
        }}
      />

      <Routes>
        <Route path="/financialAdvisior" element={<ProtectedRoute><FinancialAdvisor /></ProtectedRoute>} />
        <Route path="/" element={<LandingPage />} />

        {/* <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} /> */}

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/success-login" element={<SuccessLogin />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/news" element={<ProtectedRoute><NewsPage /></ProtectedRoute>} />
        <Route path="/learn" element={<ProtectedRoute><LearningCenter /></ProtectedRoute>} />

        {/* <Route path="/profiles" element={<UserProfile />} /> */}

        <Route path="/road" element={<ProtectedRoute><VerticalRoadmap /></ProtectedRoute>} />
        <Route path="/shorts" element={<ProtectedRoute><YouTubeShorts /></ProtectedRoute>} />
        <Route path="/scheme" element={<ProtectedRoute><GovernmentSchemes /></ProtectedRoute>} />
        <Route path="/ppf" element={<PPFCalculator /> }/>
        {/* <Route path="/womens" element={<ProtectedRoute><WomenEmpowerment /></ProtectedRoute>} /> */}
        <Route path="/mip" element={<ProtectedRoute><MicroinvestmentPlatform /></ProtectedRoute>} />
        <Route path="/poultry" element={<ProtectedRoute><PoultryFarmGuide /></ProtectedRoute>} />
        <Route path="/rural" element={<ProtectedRoute><RuralBusinessOpportunities /></ProtectedRoute>} />
        <Route path="/business-guide/:businessType" element={<ProtectedRoute><BusinessGuide /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><DiscussionForums /></ProtectedRoute>} />

        <Route path="/chatbot" element={<ErrorBoundary><ProtectedRoute><Chatbot /></ProtectedRoute></ErrorBoundary>} />        
        <Route path="/dairy" element={<DairyForumPage />} />
        <Route path="/stories" element={<SuccessStories />} />
        
        <Route path="/qna" element={<ProtectedRoute><QASessions /></ProtectedRoute>} />

        <Route path="/advisor" element={<ProtectedRoute><FinancialAdvisorChatbotUi /></ProtectedRoute>} />
        <Route path="/ocr" element={<ProtectedRoute><DocOCR /></ProtectedRoute>} />

         <Route path="/expenses" element={<ProtectedRoute><ExpenseTracker /></ProtectedRoute>} />

         <Route path="/scams" element={<ProtectedRoute><ScamsPage /></ProtectedRoute>} />
         <Route path="/meetings" element={<ProtectedRoute><div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Schedule a Meeting</h1><p>Meeting scheduling feature coming soon!</p></div></ProtectedRoute>} />

        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </div>
  );
}

export default App;
