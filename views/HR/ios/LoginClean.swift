import SwiftUI
import Foundation

// MARK: - User Model
struct User: Codable {
    let id: String
    let username: String
    let role: String
    let email: String?
    let fullName: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case username, role, email, fullName
    }
}

// MARK: - Login Response Model
struct LoginResponse: Codable {
    let success: Bool
    let message: String?
    let token: String?
    let user: User?
    let error: String?
}

// MARK: - API Service
class AuthService: ObservableObject {
    static let shared = AuthService()
    private let networkManager = NetworkManager.shared
    
    private init() {}
    
    func login(username: String, password: String, completion: @escaping (Result<LoginResponse, APIError>) -> Void) {
        guard let url = URL(string: APIConfig.Endpoints.login) else {
            completion(.failure(.invalidURL))
            return
        }
        
        let loginData = [
            "username": username,
            "password": password
        ]
        
        guard let body = try? JSONSerialization.data(withJSONObject: loginData) else {
            completion(.failure(.networkError("Cannot prepare data")))
            return
        }
        
        networkManager.request(
            url: url,
            method: .POST,
            body: body,
            responseType: LoginResponse.self,
            completion: completion
        )
    }
    
    func register(username: String, password: String, email: String, fullName: String, completion: @escaping (Result<LoginResponse, APIError>) -> Void) {
        guard let url = URL(string: APIConfig.Endpoints.register) else {
            completion(.failure(.invalidURL))
            return
        }
        
        let registerData = [
            "username": username,
            "password": password,
            "email": email,
            "fullName": fullName,
            "role": "Employee" // Default role
        ]
        
        guard let body = try? JSONSerialization.data(withJSONObject: registerData) else {
            completion(.failure(.networkError("Cannot prepare data")))
            return
        }
        
        networkManager.request(
            url: url,
            method: .POST,
            body: body,
            responseType: LoginResponse.self,
            completion: completion
        )
    }
    
    func logout(completion: @escaping (Result<Bool, APIError>) -> Void) {
        guard let token = UserDefaults.standard.getToken(),
              let url = URL(string: APIConfig.Endpoints.logout) else {
            // Clear local data even if API call fails
            UserDefaults.standard.removeToken()
            UserDefaults.standard.removeUser()
            completion(.success(true))
            return
        }
        
        let headers = ["Authorization": "Bearer \(token)"]
        
        networkManager.request(
            url: url,
            method: .POST,
            headers: headers,
            responseType: EmptyResponse.self
        ) { result in
            // Clear local data regardless of API response
            UserDefaults.standard.removeToken()
            UserDefaults.standard.removeUser()
            
            switch result {
            case .success:
                completion(.success(true))
            case .failure(let error):
                // Even if logout API fails, we still consider it successful
                // since local data is cleared
                print("Logout API error: \(error.localizedDescription)")
                completion(.success(true))
            }
        }
    }
    
    func getCurrentUser(completion: @escaping (Result<User, APIError>) -> Void) {
        guard let token = UserDefaults.standard.getToken(),
              let url = URL(string: APIConfig.Endpoints.me) else {
            completion(.failure(.unauthorized))
            return
        }
        
        let headers = ["Authorization": "Bearer \(token)"]
        
        networkManager.request(
            url: url,
            method: .GET,
            headers: headers,
            responseType: LoginResponse.self
        ) { result in
            switch result {
            case .success(let response):
                if let user = response.user {
                    completion(.success(user))
                } else {
                    completion(.failure(.serverError(response.error ?? "User not found")))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
}

// MARK: - User Defaults Helper
extension UserDefaults {
    func setToken(_ token: String) {
        set(token, forKey: "auth_token")
    }
    
    func getToken() -> String? {
        return string(forKey: "auth_token")
    }
    
    func removeToken() {
        removeObject(forKey: "auth_token")
    }
    
    func setUser(_ user: User) {
        if let encoded = try? JSONEncoder().encode(user) {
            set(encoded, forKey: "user_data")
        }
    }
    
    func getUser() -> User? {
        if let data = data(forKey: "user_data"),
           let user = try? JSONDecoder().decode(User.self, from: data) {
            return user
        }
        return nil
    }
    
    func removeUser() {
        removeObject(forKey: "user_data")
    }
}

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var isShowingPassword = false
    @State private var isLoading = false
    @State private var showingRegister = false
    @Binding var isLoggedIn: Bool
    
    @StateObject private var authService = AuthService.shared
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.2)]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 25) {
                    Spacer()
                    
                    // Logo and App Name
                    VStack(spacing: 20) {
                        Image(systemName: "person.badge.clock.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.blue)
                            .shadow(radius: 10)
                        
                        Text(LocalizationManager.App.name)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                        
                        Text(LocalizationManager.App.subtitle)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.bottom, 30)
                    
                    // Login Form
                    VStack(spacing: 20) {
                        // Username Field
                        HStack {
                            Image(systemName: "person.fill")
                                .foregroundColor(.gray)
                                .frame(width: 20)
                            
                            TextField(LocalizationManager.Auth.username, text: $username)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(color: .gray.opacity(0.2), radius: 5, x: 0, y: 2)
                        
                        // Password Field
                        HStack {
                            Image(systemName: "lock.fill")
                                .foregroundColor(.gray)
                                .frame(width: 20)
                            
                            if isShowingPassword {
                                TextField(LocalizationManager.Auth.password, text: $password)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField(LocalizationManager.Auth.password, text: $password)
                            }
                            
                            Button(action: {
                                isShowingPassword.toggle()
                            }) {
                                Image(systemName: isShowingPassword ? "eye.slash.fill" : "eye.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(color: .gray.opacity(0.2), radius: 5, x: 0, y: 2)
                        
                        // Forgot Password
                        HStack {
                            Spacer()
                            Button(LocalizationManager.Auth.forgotPassword) {
                                alertMessage = LocalizationManager.Alerts.contactIT
                                showingAlert = true
                            }
                            .font(.caption)
                            .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Login Button
                    Button(action: performLogin) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            } else {
                                Text(LocalizationManager.Auth.loginTitle)
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.blue, Color.blue.opacity(0.8)]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .shadow(color: .blue.opacity(0.3), radius: 5, x: 0, y: 3)
                    }
                    .padding(.horizontal)
                    .disabled(username.isEmpty || password.isEmpty || isLoading)
                    
                    // Register Link
                    HStack {
                        Text(LocalizationManager.Auth.noAccount)
                            .foregroundColor(.gray)
                        Button(LocalizationManager.Auth.register) {
                            showingRegister = true
                        }
                        .foregroundColor(.blue)
                        .fontWeight(.medium)
                    }
                    .font(.subheadline)
                    
                    Spacer()
                    
                    // Footer
                    Text(LocalizationManager.App.copyright)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .padding(.bottom)
                }
            }
            .alert(LocalizationManager.Alerts.notification, isPresented: $showingAlert) {
                Button(LocalizationManager.Auth.ok, role: .cancel) { }
            } message: {
                Text(alertMessage)
            }
            .sheet(isPresented: $showingRegister) {
                RegisterView(isPresented: $showingRegister)
            }
        }
    }
    
    func performLogin() {
        // Validate input
        guard !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            alertMessage = LocalizationManager.Auth.pleaseEnterUsername
            showingAlert = true
            return
        }
        
        guard !password.isEmpty else {
            alertMessage = LocalizationManager.Auth.pleaseEnterPassword
            showingAlert = true
            return
        }
        
        isLoading = true
        
        // Call API
        authService.login(username: username.trimmingCharacters(in: .whitespacesAndNewlines), 
                         password: password) { result in
            isLoading = false
            
            switch result {
            case .success(let response):
                if response.success, let token = response.token, let user = response.user {
                    // Save token and user data
                    UserDefaults.standard.setToken(token)
                    UserDefaults.standard.setUser(user)
                    
                    // Success login
                    withAnimation {
                        isLoggedIn = true
                    }
                } else {
                    // Login failed
                    alertMessage = response.error ?? response.message ?? LocalizationManager.Auth.loginFailed
                    showingAlert = true
                    password = "" // Clear password on failure
                }
                
            case .failure(let error):
                // Network or parsing error
                alertMessage = error.localizedDescription
                showingAlert = true
                password = ""
            }
        }
    }
}

#Preview {
    LoginView(isLoggedIn: .constant(false))
}

// MARK: - Register View
struct RegisterView: View {
    @Binding var isPresented: Bool
    @State private var username = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var email = ""
    @State private var fullName = ""
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var isLoading = false
    @State private var registrationSuccess = false
    
    @StateObject private var authService = AuthService.shared
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 10) {
                        Image(systemName: "person.badge.plus.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)
                        
                        Text(LocalizationManager.Auth.registerTitle)
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("Fill in details to create account")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.top, 20)
                    
                    // Form Fields
                    VStack(spacing: 15) {
                        // Full Name
                        HStack {
                            Image(systemName: "person.fill")
                                .foregroundColor(.gray)
                                .frame(width: 20)
                            
                            TextField(LocalizationManager.Auth.fullName, text: $fullName)
                                .autocapitalization(.words)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(color: .gray.opacity(0.2), radius: 3, x: 0, y: 2)
                        
                        // Email
                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(.gray)
                                .frame(width: 20)
                            
                            TextField(LocalizationManager.Auth.email, text: $email)
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                                .disableAutocorrection(true)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(color: .gray.opacity(0.2), radius: 3, x: 0, y: 2)
                        
                        // Username
                        HStack {
                            Image(systemName: "person.circle.fill")
                                .foregroundColor(.gray)
                                .frame(width: 20)
                            
                            TextField(LocalizationManager.Auth.username, text: $username)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(color: .gray.opacity(0.2), radius: 3, x: 0, y: 2)
                        
                        // Password
                        HStack {
                            Image(systemName: "lock.fill")
                                .foregroundColor(.gray)
                                .frame(width: 20)
                            
                            SecureField(LocalizationManager.Auth.password, text: $password)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(color: .gray.opacity(0.2), radius: 3, x: 0, y: 2)
                        
                        // Confirm Password
                        HStack {
                            Image(systemName: "lock.circle.fill")
                                .foregroundColor(.gray)
                                .frame(width: 20)
                            
                            SecureField(LocalizationManager.Auth.confirmPassword, text: $confirmPassword)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(10)
                        .shadow(color: .gray.opacity(0.2), radius: 3, x: 0, y: 2)
                    }
                    .padding(.horizontal)
                    
                    // Register Button
                    Button(action: performRegister) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            } else {
                                Text(LocalizationManager.Auth.createAccount)
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.green, Color.green.opacity(0.8)]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .shadow(color: .green.opacity(0.3), radius: 5, x: 0, y: 3)
                    }
                    .padding(.horizontal)
                    .disabled(isFormInvalid || isLoading)
                    
                    Spacer()
                }
            }
            .navigationTitle(LocalizationManager.Auth.registerTitle)
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button(LocalizationManager.Auth.cancel) {
                    isPresented = false
                }
            )
            .alert(LocalizationManager.Alerts.notification, isPresented: $showingAlert) {
                if registrationSuccess {
                    Button(LocalizationManager.Auth.ok) {
                        isPresented = false
                    }
                } else {
                    Button(LocalizationManager.Auth.ok, role: .cancel) { }
                }
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private var isFormInvalid: Bool {
        fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
        email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
        username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty ||
        password != confirmPassword
    }
    
    func performRegister() {
        // Validate passwords match
        guard password == confirmPassword else {
            alertMessage = LocalizationManager.Auth.passwordMismatch
            showingAlert = true
            return
        }
        
        // Validate email format
        guard isValidEmail(email) else {
            alertMessage = LocalizationManager.Auth.invalidEmail
            showingAlert = true
            return
        }
        
        // Validate password strength
        guard password.count >= 6 else {
            alertMessage = LocalizationManager.Auth.passwordTooShort
            showingAlert = true
            return
        }
        
        isLoading = true
        
        authService.register(
            username: username.trimmingCharacters(in: .whitespacesAndNewlines),
            password: password,
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            fullName: fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        ) { result in
            isLoading = false
            
            switch result {
            case .success(let response):
                if response.success {
                    alertMessage = LocalizationManager.Auth.registrationSuccess
                    registrationSuccess = true
                    showingAlert = true
                } else {
                    alertMessage = response.error ?? response.message ?? LocalizationManager.Auth.registrationFailed
                    showingAlert = true
                }
                
            case .failure(let error):
                alertMessage = error.localizedDescription
                showingAlert = true
            }
        }
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegEx = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPred = NSPredicate(format:"SELF MATCHES %@", emailRegEx)
        return emailPred.evaluate(with: email)
    }
}
