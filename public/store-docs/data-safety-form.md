# CircuiTry3D - Data Safety Section

This document provides the information needed to fill out the Data Safety section in Google Play Console.

## Data Collection Overview

**Does your app collect or share user data?**
✅ Yes

---

## Data Types Collected

### 1. Personal Information

#### Email Address
- **Collected:** ✅ Yes
- **Shared with third parties:** ❌ No
- **Purpose:** 
  - Account management
  - Authentication
  - Communication with users
- **Data handling:**
  - Data is encrypted in transit ✅
  - Data is encrypted at rest ✅
  - Users can request deletion ✅
  - Required for app functionality ✅

---

### 2. Financial Information

#### Purchase History
- **Collected:** ✅ Yes
- **Shared with third parties:** ✅ Yes (Google Play Billing only)
- **Purpose:**
  - In-app purchases
  - Subscription management
  - Payment processing
- **Data handling:**
  - Data is encrypted in transit ✅
  - Data is encrypted at rest ✅
  - Users can request deletion ✅
  - Required for app functionality ✅

---

### 3. App Activity

#### App Interactions
- **Collected:** ✅ Yes
- **Shared with third parties:** ❌ No
- **Purpose:**
  - Analytics
  - App functionality
  - Product personalization
- **Data types:**
  - Circuit designs created
  - Features used
  - Time spent in app
  - User preferences
- **Data handling:**
  - Data is encrypted in transit ✅
  - Data is encrypted at rest ✅
  - Users can request deletion ✅
  - Optional for app functionality ⚠️

#### In-app search history
- **Collected:** ❌ No

---

### 4. App Performance

#### Crash Logs
- **Collected:** ✅ Yes
- **Shared with third parties:** ❌ No
- **Purpose:**
  - App diagnostics
  - Bug fixes
  - Performance improvement
- **Data handling:**
  - Data is encrypted in transit ✅
  - Data is encrypted at rest ✅
  - Users can request deletion ✅
  - Optional for app functionality ✅

#### Diagnostics
- **Collected:** ✅ Yes
- **Shared with third parties:** ❌ No
- **Purpose:**
  - App performance monitoring
  - Feature optimization
- **Data handling:**
  - Data is encrypted in transit ✅
  - Data is encrypted at rest ✅
  - Users can request deletion ✅
  - Optional for app functionality ✅

---

### 5. Device or Other IDs

#### Authentication Tokens
- **Collected:** ✅ Yes
- **Shared with third parties:** ❌ No
- **Purpose:**
  - User authentication
  - Session management
  - Account security
- **Data handling:**
  - Data is encrypted in transit ✅
  - Data is encrypted at rest ✅
  - Users can request deletion ✅
  - Required for app functionality ✅

---

## Data Not Collected

The following data types are **NOT** collected:

❌ Location data (precise or approximate)  
❌ Contacts  
❌ Photos and videos  
❌ Audio files  
❌ Files and docs  
❌ Calendar  
❌ Personal health information  
❌ Messages  
❌ Microphone  
❌ Camera  
❌ Phone number  
❌ Name  
❌ Address  
❌ Web browsing history  
❌ Social graph  
❌ Race and ethnicity  
❌ Sexual orientation  
❌ Device ID (except authentication tokens)  

---

## Security Practices

### Data Encryption
- ✅ All data is encrypted in transit using TLS 1.2 or higher
- ✅ All sensitive data is encrypted at rest using AES-256

### User Controls
- ✅ Users can request data deletion through app settings
- ✅ Users can export their data
- ✅ Users can control optional data collection

### Independent Security Review
- ⚠️ Not yet completed (recommended before launch)

### Compliance
- ✅ Follows Google Play's Families Policy
- ✅ Complies with COPPA
- ✅ Complies with GDPR
- ✅ Complies with CCPA

---

## Data Deletion Instructions

Users can request data deletion by:

1. **In-App Method:**
   - Go to Settings → Account
   - Select "Delete Account"
   - Confirm deletion
   - All data will be permanently deleted within 30 days

2. **Email Request:**
   - Send email to: privacy@circuitry3d.app
   - Include: account email and deletion request
   - We will respond within 48 hours
   - Data deletion completed within 30 days

---

## Third-Party Services

### Google Play Billing
- **Purpose:** Payment processing
- **Data shared:** Purchase history, transaction IDs
- **Privacy Policy:** https://policies.google.com/privacy

### Firebase (if applicable)
- **Purpose:** Analytics, authentication
- **Data shared:** App usage, authentication tokens
- **Privacy Policy:** https://firebase.google.com/support/privacy

---

## Contact Information

**Data Protection Officer:**  
Mitchell Lorin McKnight  
Email: privacy@circuitry3d.app  
Website: https://circuitry3d.app/privacy  

**Response Time:**  
We respond to privacy requests within 48 hours (2 business days)

---

**Last Updated:** October 25, 2025  
**Version:** 1.0.0

---

## Notes for Google Play Console Submission

When filling out the Data Safety form in Google Play Console:

1. Answer honestly and completely
2. Review each category carefully
3. Explain data handling practices clearly
4. Provide your privacy policy URL
5. Test data deletion functionality before submission
6. Keep this document updated with any changes to data practices

For any questions, refer to: https://support.google.com/googleplay/android-developer/answer/10787469
