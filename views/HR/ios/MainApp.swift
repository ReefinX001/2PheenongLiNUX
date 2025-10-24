import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

// MARK: - UserDefaults Extension
extension UserDefaults {
    func getToken() -> String? {
        return string(forKey: "userToken")
    }
    
    func setToken(_ token: String) {
        set(token, forKey: "userToken")
    }
    
    func removeToken() {
        removeObject(forKey: "userToken")
    }
    
    func getUser() -> User? {
        guard let data = data(forKey: "currentUser"),
              let user = try? JSONDecoder().decode(User.self, from: data) else {
            return nil
        }
        return user
    }
    
    func setUser(_ user: User) {
        if let data = try? JSONEncoder().encode(user) {
            set(data, forKey: "currentUser")
        }
    }
}

// MARK: - User Model
struct User: Codable {
    let id: Int
    let name: String
    let photoUrl: String?
    let role: Role
}

struct Role: Codable {
    let id: Int
    let name: String
}

// Import the CustomerMainTabView from CustomerTabView.swift
struct ContentView: View {
    @State private var isLoggedIn = UserDefaults.standard.getToken() != nil
    @State private var selectedTab = 0
    @State private var loginObserver: Any?
    @State private var logoutObserver: Any?
    @State private var showSplash = true
    
    var body: some View {
        ZStack {
            if showSplash {
                SplashView()
                    .transition(.opacity)
            } else {
                Group {
                    if isLoggedIn {
                        // Employee View (after login)
                        EmployeeTabView(isLoggedIn: $isLoggedIn)
                            .transition(.asymmetric(
                                insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)
                            ))
                    } else {
                        // Customer View (before login)
                        CustomerMainView()
                            .transition(.asymmetric(
                                insertion: .move(edge: .leading).combined(with: .opacity),
                                removal: .move(edge: .trailing).combined(with: .opacity)
                            ))
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: isLoggedIn)
            }
        }
        .onAppear {
            checkLoginStatus()
            setupNotificationObservers()
            
            // Hide splash after 1.5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.easeOut(duration: 0.5)) {
                    showSplash = false
                }
            }
        }
        .onDisappear {
            removeNotificationObservers()
        }
    }
    
    func checkLoginStatus() {
        // Check if token exists and is valid
        if let token = UserDefaults.standard.getToken(), !token.isEmpty {
            isLoggedIn = true
        } else {
            isLoggedIn = false
        }
    }
    
    func setupNotificationObservers() {
        loginObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("UserDidLogin"),
            object: nil,
            queue: .main
        ) { _ in
            self.isLoggedIn = true
        }
        
        logoutObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("UserDidLogout"),
            object: nil,
            queue: .main
        ) { _ in
            self.isLoggedIn = false
        }
    }
    
    func removeNotificationObservers() {
        if let observer = loginObserver {
            NotificationCenter.default.removeObserver(observer)
        }
        if let observer = logoutObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}

// MARK: - Customer Main View
struct CustomerMainView: View {
    @State private var showingLogin = false
    @State private var selectedTab = 0
    @State private var buttonScale: CGFloat = 1.0
    
    var body: some View {
        ZStack {
            // Main customer interface
            CustomerMainTabView()
            
            // Floating login button - Minimalist design
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button(action: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                            buttonScale = 0.95
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            buttonScale = 1.0
                            showingLogin = true
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "person.circle")
                                .font(.system(size: 18))
                            Text("เข้าสู่ระบบ")
                                .font(.system(size: 16, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 14)
                        .background(
                            Capsule()
                                .fill(Color.primary)
                        )
                        .shadow(color: Color.primary.opacity(0.3), radius: 12, x: 0, y: 6)
                    }
                    .scaleEffect(buttonScale)
                    .padding(.trailing, 20)
                    .padding(.bottom, 30)
                }
            }
        }
        .sheet(isPresented: $showingLogin) {
            NavigationView {
                LoginView(isLoggedIn: Binding(
                    get: { UserDefaults.standard.getToken() != nil },
                    set: { _ in }
                ))
                .navigationBarTitleDisplayMode(.inline)
            }
            .onDisappear {
                // Check if user logged in successfully
                if UserDefaults.standard.getToken() != nil {
                    // This will trigger ContentView to refresh
                    NotificationCenter.default.post(name: NSNotification.Name("UserDidLogin"), object: nil)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("UserDidLogin"))) { _ in
            // Handle login notification if needed
        }
    }
}

// MARK: - Employee Tab View
struct EmployeeTabView: View {
    @Binding var isLoggedIn: Bool
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Home
            EmployeeHomeView(isLoggedIn: $isLoggedIn)
                .tabItem {
                    Label("หน้าหลัก", systemImage: selectedTab == 0 ? "house.fill" : "house")
                }
                .tag(0)
            
            // Check In
            CheckInView()
                .tabItem {
                    Label("เช็คอิน", systemImage: selectedTab == 1 ? "clock.badge.checkmark.fill" : "clock.badge.checkmark")
                }
                .tag(1)
            
            // Leave Request
            LeaveRequestView()
                .tabItem {
                    Label("ลางาน", systemImage: selectedTab == 2 ? "calendar.badge.clock.fill" : "calendar.badge.clock")
                }
                .tag(2)
            
            // Notifications
            NotificationListView()
                .tabItem {
                    Label("แจ้งเตือน", systemImage: selectedTab == 3 ? "bell.fill" : "bell")
                }
                .tag(3)
                .badge(getUnreadNotificationCount())
            
            // Settings
            SettingsView()
                .tabItem {
                    Label("ตั้งค่า", systemImage: selectedTab == 4 ? "gearshape.fill" : "gearshape")
                }
                .tag(4)
        }
        .tint(.primary)
    }
    
    func getUnreadNotificationCount() -> Int {
        // This would be fetched from your notification service
        return 0
    }
}

// MARK: - Employee Home View
struct EmployeeHomeView: View {
    @Binding var isLoggedIn: Bool
    @State private var userName = UserDefaults.standard.getUser()?.name ?? "ผู้ใช้"
    @State private var salary: Double = 45000
    @State private var notifications = [
        Notification(id: 1, title: "เงินเดือนเข้าแล้ว", message: "เงินเดือนประจำเดือนนี้เข้าบัญชีแล้ว", date: Date(), isRead: false),
        Notification(id: 2, title: "ประกาศวันหยุด", message: "วันศุกร์หน้าเป็นวันหยุดพิเศษ", date: Date().addingTimeInterval(-86400), isRead: true),
        Notification(id: 3, title: "อัพเดทนโยบาย", message: "มีการปรับปรุงนโยบายการลา", date: Date().addingTimeInterval(-172800), isRead: true)
    ]
    @State private var greeting = ""
    
    var body: some View {
        NavigationView {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    // Welcome Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(greeting)
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                            Text(userName)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.primary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.top)
                    
                    // Profile Card
                    MinimalProfileCard(userName: userName, salary: salary)
                        .padding(.horizontal)
                    
                    // Quick Actions
                    QuickActionsView()
                        .padding(.horizontal)
                    
                    // Notifications Section
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Text("แจ้งเตือนล่าสุด")
                                .font(.system(size: 18, weight: .semibold))
                            Spacer()
                            if notifications.filter({ !$0.isRead }).count > 0 {
                                Text("\(notifications.filter { !$0.isRead }.count) ใหม่")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Capsule().fill(Color.red))
                            }
                        }
                        .padding(.horizontal)
                        
                        VStack(spacing: 12) {
                            ForEach(notifications.prefix(3)) { notification in
                                MinimalNotificationCard(notification: notification)
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    Spacer(minLength: 20)
                }
            }
            .navigationTitle("หน้าหลัก")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                updateGreeting()
            }
        }
    }
    
    func updateGreeting() {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 {
            greeting = "สวัสดีตอนเช้า"
        } else if hour < 18 {
            greeting = "สวัสดีตอนบ่าย"
        } else {
            greeting = "สวัสดีตอนเย็น"
        }
    }
}

// MARK: - New Minimalist Components

struct MinimalProfileCard: View {
    let userName: String
    let salary: Double
    @State private var user = UserDefaults.standard.getUser()
    
    var formattedSalary: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "th_TH")
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: salary)) ?? "฿0"
    }
    
    var body: some View {
        HStack(spacing: 16) {
            // Profile Image
            if let photoUrl = user?.photoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 60, height: 60)
                        .clipShape(Circle())
                } placeholder: {
                    Circle()
                        .fill(Color(UIColor.secondarySystemBackground))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Image(systemName: "person.fill")
                                .foregroundColor(.secondary)
                        )
                }
            } else {
                Circle()
                    .fill(Color(UIColor.secondarySystemBackground))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.secondary)
                    )
            }
            
            VStack(alignment: .leading, spacing: 6) {
                if let role = user?.role.name {
                    Text(role)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                }
                Text(formattedSalary)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.primary)
                Text("เงินเดือนประจำเดือน")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(UIColor.secondarySystemBackground))
        )
    }
}

struct QuickActionsView: View {
    let actions = [
        QuickAction(icon: "clock", title: "เช็คอิน", color: .blue),
        QuickAction(icon: "calendar", title: "ลางาน", color: .orange),
        QuickAction(icon: "doc.text", title: "เอกสาร", color: .green),
        QuickAction(icon: "chart.bar", title: "รายงาน", color: .purple)
    ]
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(actions, id: \.title) { action in
                Button(action: {}) {
                    VStack(spacing: 12) {
                        Circle()
                            .fill(action.color.opacity(0.15))
                            .frame(width: 48, height: 48)
                            .overlay(
                                Image(systemName: action.icon)
                                    .font(.system(size: 20))
                                    .foregroundColor(action.color)
                            )
                        Text(action.title)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(UIColor.secondarySystemBackground))
                    )
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
}

struct QuickAction {
    let icon: String
    let title: String
    let color: Color
}

struct MinimalNotificationCard: View {
    let notification: Notification
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(notification.isRead ? Color(UIColor.tertiarySystemBackground) : Color.blue.opacity(0.15))
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: "bell.fill")
                        .font(.system(size: 16))
                        .foregroundColor(notification.isRead ? .secondary : .blue)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(.system(size: 15, weight: notification.isRead ? .regular : .medium))
                    .foregroundColor(.primary)
                
                Text(notification.message)
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                Text(timeAgo(from: notification.date))
                    .font(.system(size: 11))
                    .foregroundColor(Color(UIColor.tertiaryLabel))
            }
            
            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.secondarySystemBackground))
        )
    }
    
    func timeAgo(from date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 3600 {
            return "\(Int(interval / 60)) นาทีที่แล้ว"
        } else if interval < 86400 {
            return "\(Int(interval / 3600)) ชั่วโมงที่แล้ว"
        } else {
            return "\(Int(interval / 86400)) วันที่แล้ว"
        }
    }
}

// MARK: - Splash View
struct SplashView: View {
    @State private var scale: CGFloat = 0.7
    @State private var opacity: Double = 0
    
    var body: some View {
        ZStack {
            Color(UIColor.systemBackground)
                .ignoresSafeArea()
            
            VStack(spacing: 20) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.primary)
                    .scaleEffect(scale)
                    .opacity(opacity)
                
                Text("MyApp")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .opacity(opacity)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                scale = 1.0
                opacity = 1.0
            }
        }
    }
}

struct Notification: Identifiable {
    let id: Int
    let title: String
    let message: String
    let date: Date
    let isRead: Bool
}

#Preview {
    ContentView()
}