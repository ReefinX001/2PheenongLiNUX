import Foundation

// MARK: - Localization Manager
class LocalizationManager {
    static let shared = LocalizationManager()
    
    private init() {}
    
    // MARK: - Error Messages
    struct ErrorMessages {
        static let invalidURL = "URL ไม่ถูกต้อง"
        static let noData = "ไม่มีข้อมูลตอบกลับจากเซิร์ฟเวอร์"
        static let decodingError = "ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง"
        static let networkError = "เกิดข้อผิดพลาดในการเชื่อมต่อ"
        static let serverError = "เซิร์ฟเวอร์พบข้อผิดพลาด"
        static let unauthorized = "ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่"
        static let forbidden = "ไม่มีสิทธิ์ในการดำเนินการนี้"
        static let notFound = "ไม่พบข้อมูลที่ร้องขอ"
        static let rateLimited = "มีการร้องขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่"
    }
    
    // MARK: - Login/Register Messages
    struct Auth {
        static let loginTitle = "เข้าสู่ระบบ"
        static let registerTitle = "ลงทะเบียน"
        static let username = "ชื่อผู้ใช้"
        static let password = "รหัสผ่าน"
        static let confirmPassword = "ยืนยันรหัสผ่าน"
        static let email = "อีเมล"
        static let fullName = "ชื่อ-นามสกุล"
        static let forgotPassword = "ลืมรหัสผ่าน?"
        static let createAccount = "สร้างบัญชี"
        static let noAccount = "ยังไม่มีบัญชี?"
        static let register = "ลงทะเบียน"
        static let cancel = "ยกเลิก"
        static let ok = "ตกลง"
        static let loading = "กำลังโหลด..."
        static let pleaseEnterUsername = "กรุณากรอกชื่อผู้ใช้"
        static let pleaseEnterPassword = "กรุณากรอกรหัสผ่าน"
        static let passwordMismatch = "รหัสผ่านไม่ตรงกัน"
        static let invalidEmail = "รูปแบบอีเมลไม่ถูกต้อง"
        static let passwordTooShort = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
        static let registrationSuccess = "สร้างบัญชีสำเร็จ! กรุณาเข้าสู่ระบบ"
        static let loginFailed = "เข้าสู่ระบบไม่สำเร็จ"
        static let registrationFailed = "สร้างบัญชีไม่สำเร็จ"
    }
    
    // MARK: - Dashboard Messages
    struct Dashboard {
        static let welcome = "สวัสดี"
        static let position = "ตำแหน่ง"
        static let email = "อีเมล"
        static let checkInOut = "เช็คอิน/เช็คเอาท์"
        static let checkInOutSubtitle = "บันทึกเวลาการทำงาน"
        static let workHistory = "ประวัติการทำงาน"
        static let workHistorySubtitle = "ดูประวัติการเข้า-ออกงาน"
        static let employeeInfo = "ข้อมูลพนักงาน"
        static let employeeInfoSubtitle = "ดูข้อมูลส่วนตัว"
        static let settings = "ตั้งค่า"
        static let settingsSubtitle = "จัดการการตั้งค่าแอป"
        static let logout = "ออกจากระบบ"
        static let logoutConfirm = "คุณต้องการออกจากระบบหรือไม่?"
    }
    
    // MARK: - App Info
    struct App {
        static let name = "Shop2Pay"
        static let subtitle = "ระบบเช็กอินพนักงาน"
        static let copyright = "© 2024 Shop2Pay"
        static let title = "Shop2Pay HR"
    }
    
    // MARK: - Alerts
    struct Alerts {
        static let notification = "แจ้งเตือน"
        static let error = "ข้อผิดพลาด"
        static let warning = "คำเตือน"
        static let success = "สำเร็จ"
        static let contactIT = "กรุณาติดต่อฝ่าย IT เพื่อรีเซ็ตรหัสผ่าน"
    }
}

// MARK: - Extension for APIError with Thai Localization
extension APIError {
    var localizedDescription: String {
        switch self {
        case .invalidURL:
            return LocalizationManager.ErrorMessages.invalidURL
        case .noData:
            return LocalizationManager.ErrorMessages.noData
        case .decodingError:
            return LocalizationManager.ErrorMessages.decodingError
        case .networkError(let message):
            return "\(LocalizationManager.ErrorMessages.networkError): \(message)"
        case .serverError(let message):
            return "\(LocalizationManager.ErrorMessages.serverError): \(message)"
        case .unauthorized:
            return LocalizationManager.ErrorMessages.unauthorized
        case .forbidden:
            return LocalizationManager.ErrorMessages.forbidden
        case .notFound:
            return LocalizationManager.ErrorMessages.notFound
        case .rateLimited:
            return LocalizationManager.ErrorMessages.rateLimited
        }
    }
}
