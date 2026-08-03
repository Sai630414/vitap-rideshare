/**
 * Form Validation Utilities for VIT RideShare — Feature 9
 * Standardized Regex Patterns and Error Messages
 */

export const VALIDATION_PATTERNS = {
  // Indian Phone Number (10 digits starting with 6-9, optional +91 prefix)
  phone: /^(?:\+91|91)?[6-9]\d{9}$/,
  
  // VIT-AP College Email
  vitEmail: /^[a-zA-Z0-9._%+-]+@(vitapstudent\.ac\.in|vitap\.ac\.in)$/i,
  
  // Password (min 8 chars, at least 1 letter and 1 number)
  password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  
  // Vehicle Number Plate (Indian format, e.g. AP39TV1234 or AP09AB1234)
  vehicleNumber: /^[A-Z]{2}\s?[0-9]{2}\s?[A-Z]{1,2}\s?[0-9]{4}$/i,
  
  // Driving Licence Number (e.g. AP3920210001234 or AP-39-2021-0001234)
  drivingLicence: /^[A-Z]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{4,11}$/i,
  
  // Registration Number (e.g. 21MIC7189, 23BCE1001)
  registrationNumber: /^[0-9]{2}[A-Z]{3}[0-9]{4}$/i,
  
  // 6-digit Numeric OTP
  otp: /^\d{6}$/,

  // Full Name (min 2 words or 3 chars)
  name: /^[a-zA-Z\s.]{3,50}$/,
};

export const validateField = (pattern: RegExp, value: string): boolean => {
  if (!value) return false;
  return pattern.test(value.trim());
};

export const getValidationError = (field: keyof typeof VALIDATION_PATTERNS, value: string): string | null => {
  if (!value || !value.trim()) return 'This field is required';
  
  switch (field) {
    case 'vitEmail':
      return VALIDATION_PATTERNS.vitEmail.test(value.trim())
        ? null
        : 'Must be a valid @vitapstudent.ac.in or @vitap.ac.in email address';
    case 'phone':
      return VALIDATION_PATTERNS.phone.test(value.trim())
        ? null
        : 'Enter a valid 10-digit mobile number';
    case 'password':
      return VALIDATION_PATTERNS.password.test(value)
        ? null
        : 'Password must be at least 8 characters with letters and numbers';
    case 'vehicleNumber':
      return VALIDATION_PATTERNS.vehicleNumber.test(value.trim())
        ? null
        : 'Enter a valid vehicle number (e.g. AP39TV1234)';
    case 'drivingLicence':
      return VALIDATION_PATTERNS.drivingLicence.test(value.trim())
        ? null
        : 'Enter a valid driving licence number';
    case 'registrationNumber':
      return VALIDATION_PATTERNS.registrationNumber.test(value.trim())
        ? null
        : 'Enter a valid VIT registration number (e.g. 21MIC7189)';
    case 'otp':
      return VALIDATION_PATTERNS.otp.test(value.trim())
        ? null
        : 'Enter the 6-digit numeric OTP code';
    case 'name':
      return VALIDATION_PATTERNS.name.test(value.trim())
        ? null
        : 'Enter your full name (at least 3 characters)';
    default:
      return null;
  }
};
