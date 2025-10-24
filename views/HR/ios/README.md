# iOS Swift Integration for Shop2Pay HR System

This directory contains the iOS Swift implementation for integrating with the Shop2Pay HR system API.

## Files Overview

### 1. `login.swift`
- Main login and registration interface
- User authentication with Node.js API
- Token-based authentication system
- Form validation and error handling
- Thai language interface

### 2. `MainApp.swift`
- Main application entry point
- Dashboard view with user information
- Menu system for HR functions
- Logout functionality
- Session management

### 3. `APIConfig.swift`
- API configuration and endpoints
- Network manager for HTTP requests
- Error handling and response models
- Development vs production URL settings

## Key Features

### Authentication
- Login with username and password
- User registration
- JWT token management
- Automatic session validation
- Secure logout

### User Interface
- Thai language support
- Material design inspired UI
- Responsive design
- Loading states and error alerts
- Password visibility toggle

### API Integration
- RESTful API communication
- Proper error handling
- Rate limiting support
- Token-based authorization
- Network request management

## API Endpoints Used

```swift
// Base URL: http://localhost:3000/api/users

POST /login          // User authentication
POST /register       // User registration  
POST /logout         // User logout
GET  /me            // Get current user info
```

## Setup Instructions

### 1. Server Configuration
Make sure your Node.js server is running on `http://localhost:3000`

### 2. iOS Project Setup
1. Add these Swift files to your iOS project
2. Update the base URL in `APIConfig.swift` if needed
3. Add required imports:
   ```swift
   import SwiftUI
   import Foundation
   ```

### 3. Usage Example
```swift
import SwiftUI

@main
struct Shop2PayApp: App {
    var body: some Scene {
        WindowGroup {
            MainAppView()
        }
    }
}
```

## Data Models

### User Model
```swift
struct User: Codable {
    let id: String
    let username: String
    let role: String
    let email: String?
    let fullName: String?
}
```

### Login Response
```swift
struct LoginResponse: Codable {
    let success: Bool
    let message: String?
    let token: String?
    let user: User?
    let error: String?
}
```

## Security Features

- JWT token storage in UserDefaults
- Token validation on app launch
- Automatic logout on token expiry
- Secure password fields
- Input validation and sanitization

## Error Handling

The app handles various error scenarios:
- Network connectivity issues
- Invalid credentials
- Server errors (401, 403, 404, 429, 500)
- Rate limiting
- Token expiration

## Customization

### Changing API Base URL
Update the `baseURL` in `APIConfig.swift`:
```swift
static let baseURL = "https://your-domain.com"
```

### Adding New API Endpoints
Add endpoints to the `Endpoints` struct in `APIConfig.swift`:
```swift
struct Endpoints {
    static let checkIn = "\(baseURL)/api/attendance/checkin"
    // Add more endpoints here
}
```

### UI Customization
- Colors and fonts can be modified in each View
- Text can be changed for different languages
- Icons can be replaced with custom images

## Testing

### Development Testing
1. Run the Node.js server locally
2. Use the iOS Simulator
3. Test with various user accounts
4. Check network error scenarios

### Production Testing
1. Update base URL to production server
2. Test with HTTPS endpoints
3. Verify token security
4. Test on physical devices

## Troubleshooting

### Common Issues

1. **Network Error**: Check if server is running on correct port
2. **401 Unauthorized**: Verify API endpoints and token format
3. **Decoding Error**: Check if API response matches Swift models
4. **Rate Limited**: Wait for rate limit to reset (15 minutes)

### Debug Tips
- Enable network logging in development
- Check server logs for API errors
- Verify JSON response format
- Test API endpoints with Postman first

## Future Enhancements

### Possible Additions
- Biometric authentication (Face ID/Touch ID)
- Push notifications
- Offline data caching
- Background app refresh
- Check-in/check-out with location
- Work schedule management
- Leave request system
- Payroll integration

### Security Improvements
- Certificate pinning
- Keychain storage for tokens
- Encrypted local storage
- Two-factor authentication
- Session timeout management

## Dependencies

### Required iOS Version
- iOS 14.0 or later
- Xcode 12.0 or later
- Swift 5.3 or later

### No External Dependencies
This implementation uses only native iOS frameworks:
- SwiftUI for UI
- Foundation for networking
- UserDefaults for storage

## License

This code is part of the Shop2Pay HR system and follows the same license terms as the main project.
