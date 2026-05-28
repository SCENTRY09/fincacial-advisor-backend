import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Calendar, 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  MapPin, 
  Globe, 
  DollarSign, 
  Users, 
  Shield, 
  CheckCircle,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import { useAuthState, setAuthState } from '../hooks/useAuthState';
import NavBar from '../components/NavBar';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';

// Move ProfileField component outside to prevent recreation on every render
const ProfileField = React.memo(({ icon: Icon, label, value, isEditing, field, type = "text", placeholder, min, max, formatDisplay, onInputChange }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
    <div className="flex items-center space-x-4">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        {isEditing ? (
          <input
            key={`${field}-input`}
            type={type}
            value={value}
            onChange={(e) => onInputChange(field, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
            placeholder={placeholder}
            min={min}
            max={max}
          />
        ) : (
          <p className="text-lg font-semibold text-gray-900">
            {formatDisplay ? formatDisplay(value) : (value || 'Not specified')}
          </p>
        )}
      </div>
    </div>
  </div>
));



const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuthState();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: '',
    email: '',
    age: '',
    location: '',
    language: '',
    monthlyIncome: '',
    familySize: ''
  });

  const isInitialized = useRef(false);

  // Initialize editedUser when user data is first available
  useEffect(() => {
    if (user && !isInitialized.current) {
      setEditedUser({
        name: user.name || '',
        email: user.email || '',
        age: user.age || '',
        location: user.location || '',
        language: user.language || '',
        monthlyIncome: user.monthlyIncome || '',
        familySize: user.familySize || ''
      });
      isInitialized.current = true;
    }
  }, [user]);

  const handleInputChange = useCallback((field, value) => {
    // Handle empty values properly
    const processedValue = value === '' ? '' : value;
    
    setEditedUser(prev => ({
      ...prev,
      [field]: processedValue
    }));
  }, []);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleEditToggle = () => {
    if (isEditing) {
      handleSaveChanges();
    } else {
      // Reset to current user data when starting to edit
      setEditedUser({
        name: user.name || '',
        email: user.email || '',
        age: user.age || '',
        location: user.location || '',
        language: user.language || '',
        monthlyIncome: user.monthlyIncome || '',
        familySize: user.familySize || ''
      });
      setIsEditing(true);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);
      const loadingToast = toast.loading('Updating profile...', {
        position: "top-center",
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
      });

      // Prepare the data with proper validation
      const updateData = {
        name: editedUser.name?.trim() || '',
        email: editedUser.email?.trim() || ''
      };

      // Only add optional fields if they have valid values
      if (editedUser.age && !isNaN(editedUser.age)) {
        updateData.age = parseInt(editedUser.age);
      }
      if (editedUser.location?.trim()) {
        updateData.location = editedUser.location.trim();
      }
      if (editedUser.language?.trim()) {
        updateData.language = editedUser.language.trim();
      }
      if (editedUser.monthlyIncome && !isNaN(editedUser.monthlyIncome)) {
        updateData.monthlyIncome = parseInt(editedUser.monthlyIncome);
      }
      if (editedUser.familySize && !isNaN(editedUser.familySize)) {
        updateData.familySize = parseInt(editedUser.familySize);
      }

      const response = await apiService.auth.updateProfile(updateData);

      if (response.data.success) {
        toast.dismiss(loadingToast);
        toast.success('Profile updated successfully! 🎉', {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false
        });
        
        // Update editedUser with the new data from server
        setEditedUser({
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          age: response.data.user.age || '',
          location: response.data.user.location || '',
          language: response.data.user.language || '',
          monthlyIncome: response.data.user.monthlyIncome || '',
          familySize: response.data.user.familySize || ''
        });
        
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.dismiss();
      let errorMessage = 'Failed to update profile. Please try again.';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        switch (status) {
          case 400: errorMessage = data.message || 'Please check your input and try again.'; break;
          case 401: errorMessage = 'Session expired. Please login again.'; break;
          case 404: errorMessage = 'User not found.'; break;
          case 500: errorMessage = 'Server error. Please try again later.'; break;
          default: errorMessage = data.message || 'Something went wrong. Please try again.';
        }
      } else if (error.request) { 
        errorMessage = 'Network error. Please check your internet connection.'; 
      }
      
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to current user data when canceling
    setEditedUser({
      name: user.name || '',
      email: user.email || '',
      age: user.age || '',
      location: user.location || '',
      language: user.language || '',
      monthlyIncome: user.monthlyIncome || '',
      familySize: user.familySize || ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <NavBar />
      
      <div className="pt-20 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 text-gray-700 hover:text-green-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">Profile</h1>
                  <p className="text-gray-600 mt-1">Manage your account information</p>
                </div>
              </div>
              
              <button
                onClick={handleEditToggle}
                disabled={isLoading}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                  isEditing 
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl' 
                    : 'bg-white text-gray-700 hover:text-green-600 border border-gray-200 hover:border-green-300 shadow-sm hover:shadow-md'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Profile Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-8 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <span className="text-white text-3xl font-bold">
                            {(isEditing ? editedUser.name : user.name)?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-400 rounded-full border-4 border-white flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              key="header-name-input"
                              type="text"
                              value={editedUser.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              className="text-3xl font-bold bg-white/20 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
                              placeholder="Enter your name"
                            />
                            <div className="flex items-center space-x-4">
                              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                FinAdvise Member
                              </span>
                              <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h2 className="text-3xl font-bold mb-2">{user.name}</h2>
                            <div className="flex items-center space-x-4">
                              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                FinAdvise Member
                              </span>
                              <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="p-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <User className="w-6 h-6 text-green-600" />
                        <span>Personal Information</span>
                      </h3>
                      
                      <ProfileField
                        key="name-field"
                        icon={User}
                        label="Full Name"
                        value={isEditing ? editedUser.name : user.name}
                        isEditing={isEditing}
                        field="name"
                        placeholder="Enter your full name"
                        onInputChange={handleInputChange}
                      />

                      <ProfileField
                        key="age-field"
                        icon={Calendar}
                        label="Age"
                        value={isEditing ? editedUser.age : user.age}
                        isEditing={isEditing}
                        field="age"
                        type="number"
                        placeholder="Enter your age"
                        min="1"
                        max="120"
                        formatDisplay={(value) => value ? `${value} years` : 'Not specified'}
                        onInputChange={handleInputChange}
                      />

                      <ProfileField
                        key="location-field"
                        icon={MapPin}
                        label="Location"
                        value={isEditing ? editedUser.location : user.location}
                        isEditing={isEditing}
                        field="location"
                        placeholder="Enter your location"
                        onInputChange={handleInputChange}
                      />

                      <ProfileField
                        key="language-field"
                        icon={Globe}
                        label="Language"
                        value={isEditing ? editedUser.language : user.language}
                        isEditing={isEditing}
                        field="language"
                        placeholder="Enter your preferred language"
                        onInputChange={handleInputChange}
                      />
                    </div>

                    {/* Financial Information */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                        <span>Financial Information</span>
                      </h3>

                      <ProfileField
                        key="monthlyIncome-field"
                        icon={DollarSign}
                        label="Monthly Income (₹)"
                        value={isEditing ? editedUser.monthlyIncome : user.monthlyIncome}
                        isEditing={isEditing}
                        field="monthlyIncome"
                        type="number"
                        placeholder="Enter monthly income"
                        min="0"
                        formatDisplay={(value) => value ? `₹${parseInt(value).toLocaleString()}` : 'Not specified'}
                        onInputChange={handleInputChange}
                      />

                      <ProfileField
                        key="familySize-field"
                        icon={Users}
                        label="Family Size"
                        value={isEditing ? editedUser.familySize : user.familySize}
                        isEditing={isEditing}
                        field="familySize"
                        type="number"
                        placeholder="Enter family size"
                        min="1"
                        max="20"
                        formatDisplay={(value) => value ? `${value} members` : 'Not specified'}
                        onInputChange={handleInputChange}
                      />

                      <ProfileField
                        key="email-field"
                        icon={Mail}
                        label="Email Address"
                        value={isEditing ? editedUser.email : user.email}
                        isEditing={isEditing}
                        field="email"
                        type="email"
                        placeholder="Enter your email"
                        onInputChange={handleInputChange}
                      />

                      {user.username && (
                        <ProfileField
                          key="username-field"
                          icon={User}
                          label="Username"
                          value={`@${user.username}`}
                          isEditing={false}
                          field="username"
                          onInputChange={handleInputChange}
                        />
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={handleSaveChanges}
                          disabled={isLoading}
                          className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                          className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-5 h-5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Stats */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Shield className="w-6 h-6 text-green-600" />
                  <span>Account Status</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Account Status</span>
                    </div>
                    <span className="text-green-600 font-semibold">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Email Verification</span>
                    </div>
                    <span className={`font-semibold ${user.isEmailVerified ? 'text-green-600' : 'text-orange-600'}`}>
                      {user.isEmailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Last Login</span>
                    </div>
                    <span className="text-gray-600 text-sm">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Star className="w-6 h-6 text-green-600" />
                  <span>Quick Actions</span>
                </h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Privacy Settings</span>
                  </button>
                  <button className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Change Password</span>
                  </button>
                  <button className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Email Preferences</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
