import SwiftUI
import PhotosUI

struct SettingsView: View {
    @State private var notificationsEnabled = true
    @State private var biometricEnabled = false
    @State private var autoCheckIn = false
    @State private var selectedLanguage = "ไทย"
    @State private var showingLogoutAlert = false
    @State private var showingEditProfile = false
    @State private var showingChangePassword = false
    @State private var user = UserDefaults.standard.getUser()
    
    // Notification settings
    @State private var salaryNotification = true
    @State private var leaveNotification = true
    @State private var checkInNotification = false
    @State private var announcementNotification = true
    
    let languages = ["ไทย", "English"]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Navigation Bar
                HStack {
                    Text("ตั้งค่า")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.black)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 12)
                .background(Color.white)
                .shadow(color: Color.black.opacity(0.05), radius: 1, x: 0, y: 1)
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Section
                        Button(action: { showingEditProfile = true }) {
                            HStack {
                                ZStack {
                                    Circle()
                                        .fill(Color.black)
                                        .frame(width: 60, height: 60)
                                    
                                    if let photoUrl = user?.photoUrl, !photoUrl.isEmpty {
                                        AsyncImage(url: URL(string: photoUrl)) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                                .frame(width: 60, height: 60)
                                                .clipShape(Circle())
                                        } placeholder: {
                                            Image(systemName: "person.fill")
                                                .font(.system(size: 30))
                                                .foregroundColor(.white)
                                        }
                                    } else {
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 30))
                                            .foregroundColor(.white)
                                    }
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(user?.name ?? "ผู้ใช้")
                                        .font(.headline)
                                        .foregroundColor(.black)
                                    Text(user?.role.name ?? "พนักงาน")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                    Text("ID: \(user?.username ?? "N/A")")
                                        .font(.caption2)
                                        .foregroundColor(.gray)
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                        .padding(.horizontal, 16)
                    
                        // Notifications Settings
                        VStack(spacing: 16) {
                            HStack {
                                Text("การแจ้งเตือน")
                                    .font(.headline)
                                    .foregroundColor(.black)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            
                            VStack(spacing: 8) {
                                Toggle(isOn: $notificationsEnabled) {
                                    HStack(spacing: 16) {
                                        Image(systemName: "bell.fill")
                                            .foregroundColor(Color.red)
                                            .frame(width: 24)
                                        Text("การแจ้งเตือน")
                                            .font(.body)
                                            .foregroundColor(.black)
                                    }
                                }
                                .toggleStyle(SwitchToggleStyle(tint: Color.black))
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                                .onChange(of: notificationsEnabled) { newValue in
                                    saveNotificationSettings()
                                }
                                
                                if notificationsEnabled {
                                    VStack(spacing: 8) {
                                        SettingToggleRow(title: "เงินเดือน", isOn: $salaryNotification)
                                            .onChange(of: salaryNotification) { _ in saveNotificationSettings() }
                                        SettingToggleRow(title: "การลา", isOn: $leaveNotification)
                                            .onChange(of: leaveNotification) { _ in saveNotificationSettings() }
                                        SettingToggleRow(title: "เช็กอิน/เอาท์", isOn: $checkInNotification)
                                            .onChange(of: checkInNotification) { _ in saveNotificationSettings() }
                                        SettingToggleRow(title: "ประกาศบริษัท", isOn: $announcementNotification)
                                            .onChange(of: announcementNotification) { _ in saveNotificationSettings() }
                                    }
                                    .padding(.leading, 40)
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    
                        // Security Settings
                        VStack(spacing: 16) {
                            HStack {
                                Text("ความปลอดภัย")
                                    .font(.headline)
                                    .foregroundColor(.black)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            
                            VStack(spacing: 8) {
                                Toggle(isOn: $biometricEnabled) {
                                    HStack(spacing: 16) {
                                        Image(systemName: "faceid")
                                            .foregroundColor(Color.green)
                                            .frame(width: 24)
                                        Text("เข้าสู่ระบบด้วย Face ID")
                                            .font(.body)
                                            .foregroundColor(.black)
                                    }
                                }
                                .toggleStyle(SwitchToggleStyle(tint: Color.black))
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                                .onChange(of: biometricEnabled) { newValue in
                                    UserDefaults.standard.set(newValue, forKey: "biometric_enabled")
                                }
                                
                                Button(action: { showingChangePassword = true }) {
                                    HStack(spacing: 16) {
                                        Image(systemName: "lock.fill")
                                            .foregroundColor(Color.blue)
                                            .frame(width: 24)
                                        Text("เปลี่ยนรหัสผ่าน")
                                            .font(.body)
                                            .foregroundColor(.black)
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                }
                                .buttonStyle(.plain)
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                                
                                Toggle(isOn: $autoCheckIn) {
                                    HStack(spacing: 16) {
                                        Image(systemName: "location.fill")
                                            .foregroundColor(Color.orange)
                                            .frame(width: 24)
                                        Text("เช็กอินอัตโนมัติเมื่อถึงที่ทำงาน")
                                            .font(.body)
                                            .foregroundColor(.black)
                                    }
                                }
                                .toggleStyle(SwitchToggleStyle(tint: Color.black))
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                                .onChange(of: autoCheckIn) { newValue in
                                    UserDefaults.standard.set(newValue, forKey: "auto_checkin")
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    
                        // App Settings
                        VStack(spacing: 16) {
                            HStack {
                                Text("ตั้งค่าแอป")
                                    .font(.headline)
                                    .foregroundColor(.black)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            
                            VStack(spacing: 8) {
                                HStack(spacing: 16) {
                                    Image(systemName: "globe")
                                        .foregroundColor(Color.indigo)
                                        .frame(width: 24)
                                    Text("ภาษา")
                                        .font(.body)
                                        .foregroundColor(.black)
                                    Spacer()
                                    Picker("ภาษา", selection: $selectedLanguage) {
                                        ForEach(languages, id: \.self) { language in
                                            Text(language).tag(language)
                                        }
                                    }
                                    .pickerStyle(MenuPickerStyle())
                                    .onChange(of: selectedLanguage) { newValue in
                                        UserDefaults.standard.set(newValue, forKey: "app_language")
                                    }
                                }
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                            }
                            .padding(.horizontal, 16)
                        }
                    
                        // About Section
                        VStack(spacing: 16) {
                            HStack {
                                Text("อื่นๆ")
                                    .font(.headline)
                                    .foregroundColor(.black)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            
                            VStack(spacing: 8) {
                                HStack(spacing: 16) {
                                    Image(systemName: "info.circle")
                                        .foregroundColor(Color.green)
                                        .frame(width: 24)
                                    Text("เกี่ยวกับ")
                                        .font(.body)
                                        .foregroundColor(.black)
                                    Spacer()
                                    Text("เวอร์ชัน 1.0.0")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                            }
                            .padding(.horizontal, 16)
                        }
                    
                        // Logout Button
                        Button(action: { showingLogoutAlert = true }) {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .foregroundColor(Color.red)
                                Text("ออกจากระบบ")
                                    .foregroundColor(Color.red)
                                    .fontWeight(.medium)
                            }
                            .padding(.vertical, 16)
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .background(Color.white)
        .navigationBarHidden(true)
        .alert("ออกจากระบบ", isPresented: $showingLogoutAlert) {
            Button("ยกเลิก", role: .cancel) { }
            Button("ออกจากระบบ", role: .destructive) {
                logout()
            }
        } message: {
            Text("คุณแน่ใจหรือไม่ที่จะออกจากระบบ?")
        }
        .sheet(isPresented: $showingEditProfile) {
            EditProfileView(user: $user)
        }
        .sheet(isPresented: $showingChangePassword) {
            ChangePasswordView()
        }
        .onAppear {
            loadSettings()
        }
    }
    
    func loadSettings() {
        // Load saved settings
        notificationsEnabled = UserDefaults.standard.bool(forKey: "notifications_enabled")
        biometricEnabled = UserDefaults.standard.bool(forKey: "biometric_enabled")
        autoCheckIn = UserDefaults.standard.bool(forKey: "auto_checkin")
        selectedLanguage = UserDefaults.standard.string(forKey: "app_language") ?? "ไทย"
        
        // Load notification settings
        salaryNotification = UserDefaults.standard.bool(forKey: "notify_salary")
        leaveNotification = UserDefaults.standard.bool(forKey: "notify_leave")
        checkInNotification = UserDefaults.standard.bool(forKey: "notify_checkin")
        announcementNotification = UserDefaults.standard.bool(forKey: "notify_announcement")
    }
    
    func saveNotificationSettings() {
        UserDefaults.standard.set(notificationsEnabled, forKey: "notifications_enabled")
        UserDefaults.standard.set(salaryNotification, forKey: "notify_salary")
        UserDefaults.standard.set(leaveNotification, forKey: "notify_leave")
        UserDefaults.standard.set(checkInNotification, forKey: "notify_checkin")
        UserDefaults.standard.set(announcementNotification, forKey: "notify_announcement")
    }
    
    func logout() {
        // Clear user data
        UserDefaults.standard.removeObject(forKey: "auth_token")
        UserDefaults.standard.removeObject(forKey: "user_data")
        
        // Call logout API
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            let url = URL(string: "https://www.2pheenong.com/api/users/logout")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            
            URLSession.shared.dataTask(with: request) { _, _, _ in
                // Logout completed
            }.resume()
        }
        
        // Post logout notification
        NotificationCenter.default.post(name: NSNotification.Name("UserDidLogout"), object: nil)
    }
}

struct SettingToggleRow: View {
    let title: String
    @Binding var isOn: Bool
    
    var body: some View {
        Toggle(isOn: $isOn) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.gray)
        }
        .toggleStyle(SwitchToggleStyle(tint: Color.black))
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

struct EditProfileView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var user: User?
    @State private var name: String = ""
    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var selectedItem: PhotosPickerItem? = nil
    @State private var selectedImageData: Data? = nil
    @State private var isLoading = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Navigation Bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.black)
                    }
                    
                    Spacer()
                    
                    Text("แก้ไขโปรไฟล์")
                        .font(.headline)
                        .foregroundColor(.black)
                    
                    Spacer()
                    
                    Button("บันทึก") {
                        saveProfile()
                    }
                    .foregroundColor(.white)
                    .fontWeight(.medium)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.black)
                    .cornerRadius(8)
                    .disabled(isLoading)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .shadow(color: Color.black.opacity(0.05), radius: 1, x: 0, y: 1)
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Image Section
                        VStack {
                            PhotosPicker(selection: $selectedItem, matching: .images) {
                                ZStack {
                                    Circle()
                                        .fill(Color.gray.opacity(0.1))
                                        .frame(width: 120, height: 120)
                                    
                                    if let imageData = selectedImageData,
                                       let uiImage = UIImage(data: imageData) {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 120, height: 120)
                                            .clipShape(Circle())
                                    } else if let photoUrl = user?.photoUrl, !photoUrl.isEmpty {
                                        AsyncImage(url: URL(string: photoUrl)) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                                .frame(width: 120, height: 120)
                                                .clipShape(Circle())
                                        } placeholder: {
                                            Image(systemName: "person.fill")
                                                .font(.system(size: 50))
                                                .foregroundColor(.gray)
                                        }
                                    } else {
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 50))
                                            .foregroundColor(.gray)
                                    }
                                    
                                    Circle()
                                        .fill(Color.black)
                                        .frame(width: 36, height: 36)
                                        .overlay(
                                            Image(systemName: "camera.fill")
                                                .font(.system(size: 16))
                                                .foregroundColor(.white)
                                        )
                                        .offset(x: 42, y: 42)
                                }
                            }
                            .onChange(of: selectedItem) { newItem in
                                Task {
                                    if let data = try? await newItem?.loadTransferable(type: Data.self) {
                                        selectedImageData = data
                                    }
                                }
                            }
                            
                            Text("แตะเพื่อเปลี่ยนรูปโปรไฟล์")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 20)
                        
                        // Personal Information
                        VStack(spacing: 16) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("ชื่อ-นามสกุล")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                TextField("ชื่อ-นามสกุล", text: $name)
                                    .textFieldStyle(.roundedBorder)
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("อีเมล")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                TextField("อีเมล", text: $email)
                                    .textFieldStyle(.roundedBorder)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("เบอร์โทรศัพท์")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                TextField("เบอร์โทรศัพท์", text: $phone)
                                    .textFieldStyle(.roundedBorder)
                                    .keyboardType(.phonePad)
                            }
                        }
                        .padding(.horizontal)
                        
                        // Work Information (Read-only)
                        VStack(spacing: 16) {
                            HStack {
                                Text("ข้อมูลการทำงาน")
                                    .font(.headline)
                                    .foregroundColor(.black)
                                Spacer()
                            }
                            
                            HStack {
                                Text("แผนก:")
                                    .foregroundColor(.gray)
                                Spacer()
                                Text(user?.department ?? "ไม่ระบุ")
                            }
                            
                            HStack {
                                Text("ตำแหน่ง:")
                                    .foregroundColor(.gray)
                                Spacer()
                                Text(user?.role.name ?? "พนักงาน")
                            }
                            
                            HStack {
                                Text("รหัสพนักงาน:")
                                    .foregroundColor(.gray)
                                Spacer()
                                Text(user?.username ?? "N/A")
                            }
                        }
                        .padding()
                        .background(Color.gray.opacity(0.05))
                        .cornerRadius(12)
                        .padding(.horizontal)
                        
                    }
                    .padding(.bottom, 40)
                }
                
                if isLoading {
                    ProgressView()
                        .padding()
                }
            }
        }
        .navigationBarHidden(true)
        .alert("แจ้งเตือน", isPresented: $showingAlert) {
            Button("ตกลง", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
        .onAppear {
            name = user?.name ?? ""
            email = user?.email ?? ""
            phone = UserDefaults.standard.string(forKey: "user_phone") ?? ""
        }
    }
    
    func saveProfile() {
        isLoading = true
        
        guard let token = UserDefaults.standard.string(forKey: "auth_token") else {
            alertMessage = "กรุณาเข้าสู่ระบบใหม่"
            showingAlert = true
            isLoading = false
            return
        }
        
        // Prepare data
        var parameters: [String: Any] = [
            "name": name,
            "email": email,
            "phone": phone
        ]
        
        // Upload image if changed
        if let imageData = selectedImageData {
            let base64Image = imageData.base64EncodedString()
            parameters["profileImage"] = "data:image/jpeg;base64,\(base64Image)"
        }
        
        // API call to update profile
        let url = URL(string: "https://www.2pheenong.com/api/users/profile/update")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
        } catch {
            alertMessage = "เกิดข้อผิดพลาดในการเตรียมข้อมูล"
            showingAlert = true
            isLoading = false
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                isLoading = false
                
                if let error = error {
                    alertMessage = "เกิดข้อผิดพลาด: \(error.localizedDescription)"
                    showingAlert = true
                    return
                }
                
                // Update local user data
                if var updatedUser = user {
                    updatedUser.name = name
                    updatedUser.email = email
                    UserDefaults.standard.setUser(updatedUser)
                    self.user = updatedUser
                }
                
                UserDefaults.standard.set(phone, forKey: "user_phone")
                
                dismiss()
            }
        }.resume()
    }
}

struct ChangePasswordView: View {
    @Environment(\.dismiss) var dismiss
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Navigation Bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.black)
                    }
                    
                    Spacer()
                    
                    Text("เปลี่ยนรหัสผ่าน")
                        .font(.headline)
                        .foregroundColor(.black)
                    
                    Spacer()
                    
                    Button("บันทึก") {
                        changePassword()
                    }
                    .foregroundColor(.white)
                    .fontWeight(.medium)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.black)
                    .cornerRadius(8)
                    .disabled(isLoading || newPassword.isEmpty || confirmPassword.isEmpty)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .shadow(color: Color.black.opacity(0.05), radius: 1, x: 0, y: 1)
                
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("รหัสผ่านปัจจุบัน")
                            .font(.caption)
                            .foregroundColor(.gray)
                        SecureField("รหัสผ่านปัจจุบัน", text: $currentPassword)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("รหัสผ่านใหม่")
                            .font(.caption)
                            .foregroundColor(.gray)
                        SecureField("รหัสผ่านใหม่", text: $newPassword)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("ยืนยันรหัสผ่านใหม่")
                            .font(.caption)
                            .foregroundColor(.gray)
                        SecureField("ยืนยันรหัสผ่านใหม่", text: $confirmPassword)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    if !newPassword.isEmpty && !confirmPassword.isEmpty && newPassword != confirmPassword {
                        Text("รหัสผ่านไม่ตรงกัน")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                    
                    Spacer()
                }
                .padding()
                
                if isLoading {
                    ProgressView()
                        .padding()
                }
            }
        }
        .navigationBarHidden(true)
        .alert("แจ้งเตือน", isPresented: $showingAlert) {
            Button("ตกลง", role: .cancel) {
                if alertMessage.contains("สำเร็จ") {
                    dismiss()
                }
            }
        } message: {
            Text(alertMessage)
        }
    }
    
    func changePassword() {
        guard newPassword == confirmPassword else {
            alertMessage = "รหัสผ่านใหม่ไม่ตรงกัน"
            showingAlert = true
            return
        }
        
        guard newPassword.count >= 6 else {
            alertMessage = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
            showingAlert = true
            return
        }
        
        isLoading = true
        
        guard let token = UserDefaults.standard.string(forKey: "auth_token") else {
            alertMessage = "กรุณาเข้าสู่ระบบใหม่"
            showingAlert = true
            isLoading = false
            return
        }
        
        let parameters: [String: Any] = [
            "currentPassword": currentPassword,
            "newPassword": newPassword
        ]
        
        let url = URL(string: "https://www.2pheenong.com/api/users/change-password")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
        } catch {
            alertMessage = "เกิดข้อผิดพลาดในการเตรียมข้อมูล"
            showingAlert = true
            isLoading = false
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                isLoading = false
                
                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        alertMessage = "เปลี่ยนรหัสผ่านสำเร็จ"
                    } else if httpResponse.statusCode == 401 {
                        alertMessage = "รหัสผ่านปัจจุบันไม่ถูกต้อง"
                    } else {
                        alertMessage = "เกิดข้อผิดพลาด กรุณาลองใหม่"
                    }
                } else if let error = error {
                    alertMessage = "เกิดข้อผิดพลาด: \(error.localizedDescription)"
                } else {
                    alertMessage = "เปลี่ยนรหัสผ่านสำเร็จ"
                }
                
                showingAlert = true
            }
        }.resume()
    }
}

// Extension for UserDefaults
extension UserDefaults {
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
}

#Preview {
    SettingsView()
}