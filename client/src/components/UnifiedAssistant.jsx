import React, { useState, useRef, useEffect, useCallback } from 'react';
import SimpleIcons from './SimpleIcons';
import { useNavigate } from 'react-router-dom';

const UnifiedAssistant = () => {
  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      content: "Hi there 👋\nHow can we help?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showOptions, setShowOptions] = useState(true);

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const backend_url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  // Voice commands
  const voiceCommands = {
    "go home": () => navigate("/"),
    "go to news": () => navigate("/news"),
    "go to learn": () => navigate("/learn"),
    "go to calculator": () => navigate("/ppf"),
    "go to community": () => navigate("/community"),
    "go to chatbot": () => navigate("/chatbot"),
    "go to expenses": () => navigate("/expenses"),
    "go to scams": () => navigate("/scams"),
    "help": () => speakResponse("Say 'go to' followed by: home, news, learn, calculator, community, chatbot, expenses, scams."),
  };

  // Chat functions
  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${backend_url}/api/financial-advice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages.map(msg => ({ role: msg.role, content: msg.content }))
        }),
      });

      if (response.ok) {
      const data = await response.json();
      const botMessage = {
        id: Date.now() + 1,
        role: 'bot',
        content: data.response,
        timestamp: new Date().toISOString()
      };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  // Voice functions
  const speakResponse = useCallback((text) => {
    if (isMuted || !synthesisRef.current) return;
    const utterance = new SpeechSynthesisUtterance(text);
    synthesisRef.current.speak(utterance);
  }, [isMuted, synthesisRef]);

  const processVoiceCommand = useCallback((command) => {
    const matchedCommand = Object.keys(voiceCommands).find(cmd => 
      command.includes(cmd) || cmd.includes(command)
    );
    
    if (matchedCommand) {
      voiceCommands[matchedCommand]();
      speakResponse("Done.");
      } else {
        speakResponse("Not recognized. Say 'help' for commands.");
    }
  }, [voiceCommands, speakResponse]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          processVoiceCommand(finalTranscript.toLowerCase());
        }
      };
    }

    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }
  }, [processVoiceCommand]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleOptionClick = (option) => {
    switch (option) {
      case 'message':
        setActiveTab('messages');
        setShowOptions(false);
        break;
      case 'schedule':
        navigate('/meetings');
        break;
      case 'youtube':
        window.open('https://www.youtube.com', '_blank');
        break;
      default:
        console.log('Unknown option:', option);
        break;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
             case 'home':
  return (
           <div className="space-y-3">
             {showOptions && (
               <>
                 <div className="bg-white rounded-lg p-3 shadow-sm border border-green-200 cursor-pointer hover:shadow-md transition-all duration-300 message-hover glow-effect bounce-in"
                      onClick={() => handleOptionClick('message')}>
                   <div className="flex items-center justify-between">
                     <div>
                       <h3 className="font-semibold text-gray-900 text-sm">Send us a message</h3>
                       <p className="text-xs text-gray-600 mt-1">We'll be back online tomorrow.</p>
                     </div>
                     <div className="text-gray-400 text-lg animate-pulse">→</div>
                   </div>
                 </div>

                 <div className="bg-white rounded-lg p-3 shadow-sm border border-green-200 cursor-pointer hover:shadow-md transition-all duration-300 message-hover glow-effect bounce-in"
                      style={{animationDelay: '0.1s'}}
                      onClick={() => handleOptionClick('schedule')}>
                   <div>
                     <p className="text-xs text-gray-700 mb-2">Schedule a time to meet with an account executive to discuss how Dhan Sarthi can help you!</p>
                     <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105 shimmer">
                       Find a time
                     </button>
                   </div>
                 </div>

                 <div className="bg-white rounded-lg p-3 shadow-sm border border-green-200 cursor-pointer hover:shadow-md transition-all duration-300 message-hover glow-effect bounce-in"
                      style={{animationDelay: '0.2s'}}
                      onClick={() => handleOptionClick('youtube')}>
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-xs text-gray-700">Visit our YouTube page for a Dhan Sarthi demo and training content!</p>
                     </div>
                     <div className="text-gray-400 animate-bounce">
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                       </svg>
                     </div>
                   </div>
                 </div>
               </>
             )}

                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 glow-effect">
                 <div className="flex items-center justify-between mb-2">
                   <h3 className="font-semibold text-green-900 text-sm flex items-center">
                     Voice Navigation
                     <span className="ml-1 text-yellow-500 animate-pulse">🎤</span>
                   </h3>
                   <div className="flex items-center space-x-2">
                     <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                     <span className="text-xs text-green-700">
                       {isListening ? 'Listening...' : 'Ready'}
                     </span>
                   </div>
                 </div>
               
               <div className="flex space-x-2">
                 <button
                   className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center gap-1 hover:scale-105 ${
                     isListening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shimmer'
                   }`}
                   onClick={toggleListening}
                 >
                   {isListening ? 'Stop' : 'Start Voice'}
                 </button>
                 
        <button
                   className="p-1.5 rounded-lg bg-white border border-green-300 hover:bg-green-50 transition-all duration-300 hover:scale-105"
                   onClick={toggleMute}
        >
                   {isMuted ? <SimpleIcons.Volume2 className="w-3 h-3 text-gray-600" /> : <SimpleIcons.Volume2 className="w-3 h-3 text-gray-600" />}
        </button>
      </div>

                                {transcript && (
                   <div className="mt-2 p-2 bg-white rounded border border-green-200 animate-fade-in glow-effect">
                     <p className="text-xs text-gray-600 flex items-center">
                       <span className="mr-1 text-green-500">💬</span>
                       You said: {transcript}
                     </p>
                   </div>
                 )}
             </div>
           </div>
         );

             case 'messages':
         return (
           <div className="flex-1 overflow-y-auto space-y-2">
             {messages.map((message) => (
               <div key={message.id} className={`flex items-start space-x-2 animate-fade-in message-hover ${
                 message.role === 'user' ? 'justify-end' : ''
               }`}>
                 {message.role === 'bot' && (
                               <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110">
              <SimpleIcons.Bot className="w-2.5 h-2.5 text-white" />
            </div>
                 )}
                 
                 <div className={`max-w-[85%] p-2 rounded-lg shadow-sm border transition-all duration-300 ${
                   message.role === 'user' 
                     ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-none hover:from-green-600 hover:to-emerald-700' 
                     : 'bg-white border-green-100 rounded-tl-none hover:border-green-200 hover:shadow-md'
                 }`}>
                   <p className="text-xs font-medium whitespace-pre-line">{message.content}</p>
                   <p className={`text-xs mt-1 ${
                     message.role === 'user' ? 'text-green-100' : 'text-gray-500'
                   }`}>
                     {formatTime(message.timestamp)}
                   </p>
                 </div>
                 
                 {message.role === 'user' && (
                               <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110">
              <SimpleIcons.User className="w-2.5 h-2.5 text-white" />
            </div>
                 )}
               </div>
             ))}

             {isLoading && (
               <div className="flex items-start space-x-2 animate-fade-in">
                             <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md animate-pulse">
              <SimpleIcons.Bot className="w-2.5 h-2.5 text-white" />
            </div>
                 <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm border border-green-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-2">
                     <SimpleIcons.Loader2 className="w-2.5 h-2.5 text-green-600 animate-spin" />
                     <p className="text-xs text-gray-600">
                       Dhan Sarthi is typing<span className="typing-dots"></span>
                     </p>
                   </div>
                 </div>
               </div>
             )}

             <div ref={messagesEndRef} />
           </div>
         );

             case 'help':
         return (
           <div className="space-y-3">
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 glow-effect">
                   <h3 className="font-semibold text-green-900 mb-2 text-sm flex items-center">
                     Voice Commands
                     <span className="ml-1 text-blue-500 animate-pulse">🎯</span>
                   </h3>
                   <div className="space-y-2">
                     <p className="text-xs text-green-800">Say "go to" followed by:</p>
                     <div className="grid grid-cols-2 gap-1">
                       {['home', 'news', 'learn', 'calculator', 'community', 'chatbot', 'expenses', 'scams'].map((cmd, index) => (
                         <span key={cmd} className="text-xs bg-white px-2 py-1 rounded border text-green-700 hover:bg-green-50 transition-all duration-300 hover:scale-105 hover:shadow-sm" style={{animationDelay: `${index * 0.1}s`}}>
                           {cmd}
                         </span>
                       ))}
              </div>
              </div>
            </div>

                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 glow-effect">
                 <h3 className="font-semibold text-green-900 mb-2 text-sm flex items-center">
                   Quick Actions
                   <span className="ml-1 text-purple-500 animate-pulse">⚡</span>
                 </h3>
                 <div className="space-y-2">
                   <button
                     className="w-full text-left text-xs text-green-800 hover:bg-green-100 p-2 rounded transition-all duration-300 hover:scale-105 hover:shadow-sm"
                     onClick={() => sendMessage("What are the best government schemes for farmers?")}
                   >
                     🌾 Ask about government schemes
                   </button>
              <button
                     className="w-full text-left text-xs text-green-800 hover:bg-green-100 p-2 rounded transition-all duration-300 hover:scale-105 hover:shadow-sm"
                     onClick={() => sendMessage("How can I save money effectively?")}
              >
                     💰 Get saving advice
              </button>
              <button
                     className="w-full text-left text-xs text-green-800 hover:bg-green-100 p-2 rounded transition-all duration-300 hover:scale-105 hover:shadow-sm"
                     onClick={() => sendMessage("What are good investment options?")}
              >
                     📈 Investment guidance
              </button>
            </div>
          </div>
           </div>
         );

      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
            <button
        className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 animate-pulse"
        onClick={() => setIsOpen(!isOpen)}
      >
        <SimpleIcons.Bot className="w-7 h-7" />
            </button>

             {isOpen && (
         <div className="absolute bottom-16 right-0 w-[380px] h-[420px] bg-white rounded-xl shadow-2xl border border-green-200 flex flex-col animate-fade-in overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50 opacity-50"></div>
          
                     {/* Enhanced Floating particles effect */}
           <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-4 left-4 w-2 h-2 bg-green-300 rounded-full animate-pulse opacity-60"></div>
             <div className="absolute top-8 right-6 w-1 h-1 bg-emerald-400 rounded-full animate-ping opacity-40"></div>
             <div className="absolute bottom-16 left-8 w-1.5 h-1.5 bg-green-200 rounded-full animate-bounce opacity-50"></div>
             <div className="absolute top-12 left-12 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-30" style={{animationDelay: '1s'}}></div>
             <div className="absolute bottom-8 right-12 w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce opacity-40" style={{animationDelay: '0.5s'}}></div>
             <div className="absolute top-20 right-4 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-35" style={{animationDelay: '1.5s'}}></div>
           </div>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl relative z-10 hover:from-green-600 hover:to-emerald-700 transition-all duration-300">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                <SimpleIcons.Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-xs font-bold flex items-center">
                  Dhan Sarthi
                  <span className="ml-1 text-yellow-300 animate-pulse">✨</span>
                </h1>
                <p className="text-green-100 text-xs font-medium">Your Personal Financial Guide</p>
              </div>
            </div>
                         <div className="flex space-x-1">
               <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></div>
               <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
               <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
               <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
             </div>
            <button
              className="text-white hover:text-gray-200 transition-all duration-300 hover:scale-110"
              onClick={() => setIsOpen(false)}
            >
              <SimpleIcons.X className="w-4 h-4" />
            </button>
          </div>

                     <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide bg-gradient-to-b from-gray-50 to-white relative z-10">
                  <style>
                    {`
                      .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                      }
                      .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                      }
                      .animate-fade-in {
                        animation: fadeIn 0.5s ease-in-out;
                      }
                      @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                 .message-hover {
                   transition: all 0.3s ease;
                 }
                 .message-hover:hover {
                   transform: translateY(-1px);
                   box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
                 }
                 .typing-dots {
                   display: inline-block;
                 }
                      .typing-dots::after {
                        content: '';
                        animation: typing 1.5s infinite;
                      }
                      @keyframes typing {
                        0%, 20% { content: ''; }
                        40% { content: '.'; }
                        60% { content: '..'; }
                        80%, 100% { content: '...'; }
                      }
                 .glow-effect {
                   box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
                 }
                 .glow-effect:hover {
                   box-shadow: 0 0 30px rgba(34, 197, 94, 0.5);
                 }
                 .shimmer {
                   background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                   background-size: 200% 100%;
                   animation: shimmer 2s infinite;
                 }
                 @keyframes shimmer {
                   0% { background-position: -200% 0; }
                   100% { background-position: 200% 0; }
                 }
                 .bounce-in {
                   animation: bounceIn 0.6s ease-out;
                 }
                 @keyframes bounceIn {
                   0% { transform: scale(0.3); opacity: 0; }
                   50% { transform: scale(1.05); }
                   70% { transform: scale(0.9); }
                   100% { transform: scale(1); opacity: 1; }
                 }
                    `}
                  </style>
            {renderContent()}
                      </div>
                      
                     {activeTab === 'messages' && (
             <div className="border-t border-green-200 p-3 bg-gradient-to-r from-green-50 to-emerald-50 relative z-10">
               <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                 <button
                   type="button"
                   onClick={toggleListening}
                   disabled={isLoading}
                   className={`p-1.5 rounded-full transition-all duration-300 shadow-sm hover:shadow-md ${
                     isListening 
                       ? 'bg-red-100 text-red-500 animate-pulse shadow-lg scale-110' 
                       : 'bg-green-100 text-green-600 hover:bg-green-200 hover:scale-105 disabled:opacity-50'
                   }`}
                 >
                   <SimpleIcons.Mic className="w-3 h-3" />
                 </button>
                 
                 <div className="flex-1 relative group">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask me about finance, investments, government schemes..."
                     disabled={isLoading || isListening}
                     className="w-full p-1.5 pr-8 text-xs border border-green-300 rounded-md focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 disabled:opacity-50 transition-all duration-300 group-hover:border-green-400"
                      />
                   {/* Input focus effect */}
                   <div className="absolute inset-0 rounded-md bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-focus-within:opacity-10 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    
                    <button
                      type="submit"
                   disabled={!inputMessage.trim() || isLoading || isListening}
                   className="p-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <SimpleIcons.Send className="w-3 h-3" />
                    </button>
                  </form>
                  
               {/* Enhanced Quick suggestions */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[
                      "Government schemes",
                      "Investment advice",
                      "How to save money?",
                      "Tax saving tips"
                    ].map((suggestion, index) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                     disabled={isLoading || isListening}
                        className="px-2 py-0.5 text-xs bg-white border border-green-300 rounded-full hover:bg-green-50 hover:border-green-400 hover:shadow-sm transition-all duration-300 disabled:opacity-50 hover:scale-105"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  </div>
                )}
                
                     <div className="border-t border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-b-xl relative z-10">
             <div className="flex">
                  <button
                 className={`flex-1 flex flex-col items-center py-2 px-2 text-xs transition-all duration-300 ${
                   activeTab === 'home' ? 'text-green-600 bg-green-100' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    }`}
                    onClick={() => {
                   setActiveTab('home');
                   setShowOptions(true);
                 }}
               >
                 <SimpleIcons.Home className="w-3 h-3 mb-1" />
                 Home
                  </button>
                  <button
                 className={`flex-1 flex flex-col items-center py-2 px-2 text-xs transition-all duration-300 ${
                   activeTab === 'messages' ? 'text-green-600 bg-green-100' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                 }`}
                 onClick={() => setActiveTab('messages')}
               >
                 <SimpleIcons.MessageCircle className="w-3 h-3 mb-1" />
                 Messages
                  </button>
                      <button
                 className={`flex-1 flex flex-col items-center py-2 px-2 text-xs transition-all duration-300 ${
                   activeTab === 'help' ? 'text-green-600 bg-green-100' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                 }`}
                 onClick={() => setActiveTab('help')}
               >
                 <SimpleIcons.HelpCircle className="w-3 h-3 mb-1" />
                 Help
                      </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
};

export default UnifiedAssistant;

