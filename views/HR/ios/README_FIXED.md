# iOS Swift Integration for Shop2Pay HR System - Fixed Version

This directory contains the iOS Swift implementation for integrating with the Shop2Pay HR system API. This version fixes encoding issues with Thai text.

## 🚨 Important: Use Clean Files

Due to encoding issues with Thai characters in Swift source files, use these clean versions:

- ✅ **Use**: `LoginClean.swift` instead of `login.swift`
- ✅ **Use**: `MainAppClean.swift` instead of `MainApp.swift`
- ✅ **Use**: `Localization.swift` for Thai text support
- ✅ **Use**: `APIConfig.swift` (already fixed)

## Files Overview

### Core Files (Use These)

1. **`LoginClean.swift`** ✅ 
   - Clean login and registration interface
   - No encoding issues with Thai text
   - Full API integration with error handling

2. **`MainAppClean.swift`** ✅
   - Clean main application and dashboard
   - Uses localization manager for Thai text
   - Session management and logout

3. **`Localization.swift`** ✅
   - Thai language text definitions
   - Centralized text management
   - Proper UTF-8 encoding

4. **`APIConfig.swift`** ✅
   - Fixed API configuration
   - English error messages to avoid encoding issues
   - Network manager with proper error handling

### Legacy Files (Don't Use)
- ❌ `login.swift` - Has encoding issues
- ❌ `MainApp.swift` - Has encoding issues
- ❌ `README.md` - Old version

## Quick Setup

### 1. Add Required Files to Your iOS Project
```
📁 Your iOS Project/
├── LoginClean.swift          ✅ Add this
├── MainAppClean.swift        ✅ Add this  
├── Localization.swift        ✅ Add this
├── APIConfig.swift           ✅ Add this
└── App.swift (Your main app file)
```

### 2. Update Your Main App File
```swift
import SwiftUI

@main
struct YourApp: App {
    var body: some Scene {
        WindowGroup {
            MainAppView()  // From MainAppClean.swift
        }
    }
}
```

### 3. Server Configuration
Ensure your Node.js server runs on `http://localhost:3000`

## Key Features

### ✅ Fixed Issues
- No more encoding errors with Thai text
- Proper UTF-8 character handling
- Clean Swift compilation
- Separated text into localization file

### 🔐 Authentication
- JWT token management
- Login/Register forms
- Session validation
- Secure logout

### 🎨 User Interface
- Thai language support via Localization manager
- Modern SwiftUI design
- Loading states and animations
- Error handling with proper alerts

### 🌐 API Integration
```swift
// Endpoints used:
POST /api/users/login       // Authentication
POST /api/users/register    // User registration
POST /api/users/logout      // User logout
GET  /api/users/me         // Current user info
```

## Usage Examples

### Basic Login Flow
```swift
// In your main app
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            MainAppView() // Handles login/dashboard automatically
        }
    }
}
```

### Manual Authentication
```swift
let authService = AuthService.shared

authService.login(username: "user", password: "pass") { result in
    switch result {
    case .success(let response):
        if response.success {
            // Login successful
            print("Welcome \(response.user?.fullName ?? "")")
        }
    case .failure(let error):
        // Handle error
        print("Error: \(error.localizedDescription)")
    }
}
```

### Custom Error Messages
```swift
// Thai text from Localization manager
let message = LocalizationManager.Auth.loginFailed
let error = LocalizationManager.ErrorMessages.networkError
```

## Troubleshooting

### Compilation Errors
❌ **If you see encoding errors:**
- Make sure you're using `LoginClean.swift` and `MainAppClean.swift`
- Don't use the original `login.swift` or `MainApp.swift`
- Ensure all files are saved with UTF-8 encoding

✅ **Correct file structure:**
```
├── LoginClean.swift      ← Use this
├── MainAppClean.swift    ← Use this
├── Localization.swift    ← Use this
├── APIConfig.swift       ← Use this
```

### Network Issues
1. **Server not responding**: Check if Node.js server is running
2. **CORS errors**: Server should have CORS enabled for mobile apps
3. **SSL errors**: For production, use HTTPS URLs

### Common API Errors
```swift
case .unauthorized:        // Token expired or invalid
case .rateLimited:         // Too many requests
case .networkError:        // Connection problems
case .decodingError:       // Response format issues
```

## Customization

### Change API URL
Update `APIConfig.swift`:
```swift
static let baseURL = "https://your-server.com"
```

### Add New Text
Add to `Localization.swift`:
```swift
struct YourSection {
    static let newText = "Your Thai text here"
}
```

### Modify UI Colors
```swift
// In your view
.background(Color.blue)           // Change colors
.foregroundColor(.white)          // Change text color
```

## Testing

### Development Testing
```bash
# Start your Node.js server
cd /path/to/your/server
npm start

# Server should run on http://localhost:3000
```

### iOS Simulator Testing
1. Build and run in iOS Simulator
2. Test login with existing user accounts
3. Test registration with new accounts
4. Verify token persistence between app launches

## Production Deployment

### Update URLs
```swift
// In APIConfig.swift
static let productionBaseURL = "https://your-production-server.com"
```

### Security Checklist
- [ ] Use HTTPS in production
- [ ] Implement certificate pinning
- [ ] Store tokens securely (consider Keychain)
- [ ] Add biometric authentication
- [ ] Implement proper session timeout

## File Dependencies

```
LoginClean.swift
├── Localization.swift    (for Thai text)
├── APIConfig.swift       (for API endpoints)
└── Foundation            (for networking)

MainAppClean.swift
├── LoginClean.swift      (for login view)
├── Localization.swift    (for Thai text)
└── SwiftUI               (for UI components)

APIConfig.swift
└── Foundation            (for networking)

Localization.swift
└── Foundation            (for string management)
```

## License

This code is part of the Shop2Pay HR system and follows the same license terms as the main project.

---

## 📋 Quick Checklist

Before building your iOS app:
- [ ] Added `LoginClean.swift` to project
- [ ] Added `MainAppClean.swift` to project  
- [ ] Added `Localization.swift` to project
- [ ] Added `APIConfig.swift` to project
- [ ] Removed old `login.swift` if present
- [ ] Removed old `MainApp.swift` if present
- [ ] Updated main App.swift to use `MainAppView()`
- [ ] Node.js server running on localhost:3000
- [ ] Tested login/register functionality

✅ **Ready to build!** Your iOS app should now compile without encoding errors and connect properly to your Node.js API.
