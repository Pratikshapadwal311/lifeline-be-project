/**
 * Profile Model
 * Mongoose schema for emergency medical profiles
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const profileSchema = new mongoose.Schema({
  // Link to user account (optional for backward compatibility)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  
  // Unique identifier for public access
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4(),
    index: true
  },
  
  // Personal Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        return value < new Date(); // Must be in the past
      },
      message: 'Date of birth must be in the past'
    }
  },
  
  age: {
    type: Number,
    min: [0, 'Age cannot be negative'],
    max: [150, 'Age must be realistic']
  },
  
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    trim: true
  },
  
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
    default: 'Unknown'
  },
  
  // Chronic Diseases (checkboxes - for better first aid detection)
  chronicDiseases: {
    type: [String],
    default: []
  },

  // Doctor Information
  doctorName: {
    type: String,
    trim: true,
    maxlength: [100, 'Doctor name cannot exceed 100 characters']
  },

  doctorPhone: {
    type: String,
    trim: true
  },

  // Hospital Preference
  preferredHospital: {
    type: String,
    trim: true,
    maxlength: [200, 'Hospital name cannot exceed 200 characters']
  },

  // Insurance
  insuranceProvider: {
    type: String,
    trim: true,
    maxlength: [100, 'Insurance provider cannot exceed 100 characters']
  },

  insurancePolicyNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Policy number cannot exceed 100 characters']
  },

  // Government ID
  governmentIdNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Government ID cannot exceed 50 characters']
  },

  // Dietary Restrictions
  dietaryRestrictions: {
    type: String,
    trim: true,
    maxlength: [200, 'Dietary restrictions cannot exceed 200 characters']
  },

  // Known Triggers
  knownTriggers: {
    type: String,
    trim: true,
    maxlength: [500, 'Known triggers cannot exceed 500 characters']
  },

  // Medical Information (Sensitive - requires OTP)
  allergies: {
    type: String,
    trim: true,
    maxlength: [500, 'Allergies field cannot exceed 500 characters'],
    default: 'None'
  },
  
  medicalConditions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Medical conditions field cannot exceed 1000 characters'],
    default: 'None'
  },
  
  medications: {
    type: String,
    trim: true,
    maxlength: [1000, 'Medications field cannot exceed 1000 characters'],
    default: 'None'
  },
  
  // Additional Sensitive Information
  organDonor: {
    type: Boolean,
    default: false
  },
  
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  
  photo_url: {
    type: String,
    trim: true
  },
  
  // Emergency Contact (primary — required)
  emergencyContactName: {
    type: String,
    required: [true, 'Emergency contact name is required'],
    trim: true,
    maxlength: [100, 'Contact name cannot exceed 100 characters']
  },

  emergencyContactNumber: {
    type: String,
    required: [true, 'Emergency contact number is required'],
    trim: true,
    validate: {
      validator: function(value) {
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        const indianPhoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
        if (!indianPhoneRegex.test(cleanPhone)) return false;
        const digitsOnly = cleanPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('+91')) return digitsOnly.length === 12;
        if (cleanPhone.startsWith('0'))   return digitsOnly.length === 11;
        return digitsOnly.length === 10;
      },
      message: 'Please provide a valid Indian phone number (10 digits starting with 6-9, or +91-XXXXXXXXXX)'
    }
  },

  // Additional emergency contacts (optional, up to 3 more)
  additionalEmergencyContacts: {
    type: [{
      name:  { type: String, trim: true, maxlength: 100 },
      phone: {
        type: String, trim: true,
        validate: {
          validator: function(value) {
            if (!value) return true;
            const clean = value.replace(/[\s\-\(\)]/g, '');
            const digits = clean.replace(/\D/g, '');
            if (!/^(\+91|0)?[6-9]\d{9}$/.test(clean)) return false;
            if (clean.startsWith('+91')) return digits.length === 12;
            if (clean.startsWith('0'))   return digits.length === 11;
            return digits.length === 10;
          },
          message: 'Additional contact must be a valid Indian phone number'
        }
      }
    }],
    default: [],
    validate: [
      { validator: v => v.length >= 2, message: 'At least 2 additional emergency contacts are required (minimum 3 total)' },
      { validator: v => v.length <= 3, message: 'Maximum 3 additional emergency contacts allowed' }
    ]
  },

  // Additional Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes field cannot exceed 2000 characters']
  },
  
  // Owner Notification
  ownerNotificationContact: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional
        // Check if it's email or phone
        const emailRegex = /^\S+@\S+\.\S+$/;
        const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/;
        return emailRegex.test(value) || phoneRegex.test(value);
      },
      message: 'Must be a valid email or phone number'
    }
  },
  
  // QR Scan Tracking
  lastQrScan: {
    scannedAt: {
      type: Date
    },
    scannedByDevice: {
      type: String,
      trim: true
    }
  },
  
  // OTP for Sensitive Data Access (legacy — kept for API backward compat)
  otp: {
    code:              { type: String, select: false },
    expiresAt:         { type: Date },
    requestedAt:       { type: Date },
    requestedByDevice: { type: String, trim: true }
  },

  // Helper's phone + OTP (collected before sending approval request to contacts)
  helperRequest: {
    phone:       { type: String, trim: true },
    otpCode:     { type: String },
    otpExpiresAt:{ type: Date },
    requestedAt: { type: Date }
  },

  // Approve/Reject access request — created after helper OTP is verified
  accessRequest: {
    requestId:   { type: String },
    helperPhone: { type: String, trim: true }, // saved for audit
    status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    expiresAt:   { type: Date },
    createdAt:   { type: Date }
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // We're handling timestamps manually
  toJSON: {
    transform: function(doc, ret) {
      // Remove MongoDB internal fields
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Update the updatedAt field before saving
profileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
profileSchema.index({ uniqueId: 1 });
profileSchema.index({ createdAt: -1 });

// Static method to get emergency-safe profile (basic fields only - no sensitive data)
profileSchema.statics.getEmergencyProfile = function(uniqueId) {
  return this.findOne({ uniqueId }).select(
    'uniqueId fullName age gender bloodGroup emergencyContactName emergencyContactNumber additionalEmergencyContacts createdAt lastQrScan'
  );
};

// Static method to get sensitive data (requires OTP verification)
profileSchema.statics.getSensitiveData = function(uniqueId) {
  return this.findOne({ uniqueId }).select(
    'uniqueId medicalConditions allergies medications organDonor address city state photo_url notes'
  );
};

// Static method to get full profile (for internal use)
profileSchema.statics.getFullProfile = function(uniqueId) {
  return this.findOne({ uniqueId });
};

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
