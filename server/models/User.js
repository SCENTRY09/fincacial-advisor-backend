const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required only if not using Google OAuth
    },
    minlength: 6
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  // Add clerkId field to prevent index conflicts (optional, sparse)
  clerkId: {
    type: String,
    unique: true,
    sparse: true
  },
  picture: {
    type: String,
    default: 'https://flowbite.com/docs/images/people/profile-picture-3.jpg'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // New profile fields
  age: {
    type: Number,
    min: 1,
    max: 120
  },
  location: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    trim: true
  },
  monthlyIncome: {
    type: Number,
    min: 0
  },
  familySize: {
    type: Number,
    min: 1,
    max: 20
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure username is set before saving
userSchema.pre('save', async function(next) {
  console.log('🔍 User pre-save hook triggered');
  
  // Generate username if not provided
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0] + '_' + Date.now();
    console.log('🔍 Generated username:', this.username);
  }
  
  console.log('🔍 Password modified:', this.isModified('password'));
  
  if (!this.isModified('password')) {
    console.log('🔍 Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('🔍 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user profile (without password)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  // Transform _id to id for frontend consistency
  user.id = user._id.toString();
  return user;
};

module.exports = mongoose.model('User', userSchema);
