import SwiftUI

// MARK: - Main App Content View
struct MainAppView: View {
    @State private var isLoggedIn = false
    @State private var currentUser: User?
    @StateObject private var authService = AuthService.shared
    
    var body: some View {
        Group {
            if isLoggedIn {
                DashboardView(isLoggedIn: $isLoggedIn, currentUser: $currentUser)
            } else {
                LoginView(isLoggedIn: $isLoggedIn)
            }
        }
        .onAppear {
            checkAuthStatus()
        }
    }
    
    private func checkAuthStatus() {
        // Check if user has valid token
        if let token = UserDefaults.standard.getToken(),
           let user = UserDefaults.standard.getUser() {
            
            // Verify token with server
            authService.getCurrentUser { result in
                switch result {
                case .success(let serverUser):
                    // Token is valid, update user data
                    UserDefaults.standard.setUser(serverUser)
                    currentUser = serverUser
                    isLoggedIn = true
                    
                case .failure(_):
                    // Token is invalid, clear local data
                    UserDefaults.standard.removeToken()
                    UserDefaults.standard.removeUser()
                    isLoggedIn = false
                    currentUser = nil
                }
            }
        } else {
            isLoggedIn = false
        }
    }
}

// MARK: - Dashboard View
struct DashboardView: View {
    @Binding var isLoggedIn: Bool
    @Binding var currentUser: User?
    @StateObject private var authService = AuthService.shared
    @State private var showingLogoutAlert = false
    @State private var isLoggingOut = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // User Info Card
                if let user = currentUser {
                    VStack(spacing: 15) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.blue)
                        
                        Text("\(LocalizationManager.Dashboard.welcome), \(user.fullName ?? user.username)")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("\(LocalizationManager.Dashboard.position): \(user.role)")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                        
                        if let email = user.email {
                            Text("\(LocalizationManager.Dashboard.email): \(email)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(15)
                    .shadow(color: .gray.opacity(0.3), radius: 5, x: 0, y: 3)
                }
                
                // Menu Options
                VStack(spacing: 15) {
                    DashboardMenuItem(
                        icon: "clock.fill",
                        title: LocalizationManager.Dashboard.checkInOut,
                        subtitle: LocalizationManager.Dashboard.checkInOutSubtitle,
                        color: .green
                    ) {
                        // Action for check-in/out
                        print("Check-in/out tapped")
                    }
                    
                    DashboardMenuItem(
                        icon: "calendar.badge.clock",
                        title: LocalizationManager.Dashboard.workHistory,
                        subtitle: LocalizationManager.Dashboard.workHistorySubtitle,
                        color: .orange
                    ) {
                        // Action for work history
                        print("Work history tapped")
                    }
                    
                    DashboardMenuItem(
                        icon: "person.2.fill",
                        title: LocalizationManager.Dashboard.employeeInfo,
                        subtitle: LocalizationManager.Dashboard.employeeInfoSubtitle,
                        color: .purple
                    ) {
                        // Action for employee info
                        print("Employee info tapped")
                    }
                    
                    DashboardMenuItem(
                        icon: "gear.badge",
                        title: LocalizationManager.Dashboard.settings,
                        subtitle: LocalizationManager.Dashboard.settingsSubtitle,
                        color: .gray
                    ) {
                        // Action for settings
                        print("Settings tapped")
                    }
                }
                .padding(.horizontal)
                
                Spacer()
                
                // Logout Button
                Button(action: {
                    showingLogoutAlert = true
                }) {
                    HStack {
                        if isLoggingOut {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "arrow.right.square.fill")
                            Text(LocalizationManager.Dashboard.logout)
                                .fontWeight(.medium)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .shadow(color: .red.opacity(0.3), radius: 5, x: 0, y: 3)
                }
                .padding(.horizontal)
                .disabled(isLoggingOut)
            }
            .padding()
            .navigationTitle(LocalizationManager.App.title)
            .navigationBarTitleDisplayMode(.inline)
            .alert(LocalizationManager.Dashboard.logout, isPresented: $showingLogoutAlert) {
                Button(LocalizationManager.Auth.cancel, role: .cancel) { }
                Button(LocalizationManager.Dashboard.logout, role: .destructive) {
                    performLogout()
                }
            } message: {
                Text(LocalizationManager.Dashboard.logoutConfirm)
            }
        }
    }
    
    private func performLogout() {
        isLoggingOut = true
        
        authService.logout { result in
            isLoggingOut = false
            
            // Always logout from UI regardless of API response
            withAnimation {
                isLoggedIn = false
                currentUser = nil
            }
            
            switch result {
            case .success:
                print("Logged out successfully")
            case .failure(let error):
                print("Logout error: \(error.localizedDescription)")
                // Continue with logout anyway since local data is cleared
            }
        }
    }
}

// MARK: - Dashboard Menu Item
struct DashboardMenuItem: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 15) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                    .frame(width: 40)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.gray)
                    .font(.caption)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .gray.opacity(0.2), radius: 3, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - App Entry Point
struct Shop2PayApp: App {
    var body: some Scene {
        WindowGroup {
            MainAppView()
        }
    }
}

#Preview {
    MainAppView()
}
