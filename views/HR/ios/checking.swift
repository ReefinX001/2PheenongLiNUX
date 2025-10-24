import SwiftUI
import CoreLocation
import MapKit
import UIKit

struct CheckInView: View {
    @StateObject private var locationManager = LocationManager()
    @StateObject private var attendanceAPI = AttendanceAPI()
    @State private var currentTime = Date()
    @State private var hasCheckedIn = false
    @State private var hasCheckedOut = false
    @State private var checkInTime: Date?
    @State private var checkOutTime: Date?
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var selectedCheckInType = CheckInType.normal
    @State private var selectedBranch = "สำนักงานใหญ่"
    @State private var isOT = false
    @State private var showingBranchPicker = false
    @State private var userLocation: CLLocationCoordinate2D?
    @State private var availableBranches: [Branch] = []
    @State private var isLoading = false
    @State private var todayStatus: TodayStatus?
    @State private var attendanceHistory: [AttendanceHistoryItem] = []
    @State private var totalWorkingHours: Double = 0.0
    @State private var officeLocations: [Office] = []
    
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var currentOffice: Office? {
        officeLocations.first { $0.name == selectedBranch }
    }
    
    enum CheckInType: String, CaseIterable {
        case normal = "normal"
        case outsideArea = "outside_area"
        case otherBranch = "other_branch"
        
        var displayName: String {
            switch self {
            case .normal: return "เช็กอินปกติ"
            case .outsideArea: return "เช็กอินนอกพื้นที่"
            case .otherBranch: return "เช็กอินต่างสาขา"
            }
        }
        
        var needsApproval: Bool {
            return self == .outsideArea || self == .otherBranch
        }
    }
    
    var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "th_TH")
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }
    
    var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "th_TH")
        formatter.dateFormat = "EEEE d MMMM yyyy"
        return formatter
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Map View (MapKit based)
                    MapViewWrapper(userLocation: $userLocation, officeLocations: officeLocations)
                        .frame(height: 250)
                        .clipShape(RoundedRectangle(cornerRadius: 15))
                        .padding(.horizontal)
                    
                    // Location Status
                    HStack {
                        Image(systemName: locationManager.isInOfficeArea ? "location.fill" : "location.slash.fill")
                            .foregroundColor(locationManager.isInOfficeArea ? .green : .orange)
                        Text(locationManager.isInOfficeArea ? "อยู่ในพื้นที่ทำงาน" : "อยู่นอกพื้นที่ทำงาน")
                            .font(.subheadline)
                            .foregroundColor(locationManager.isInOfficeArea ? .green : .orange)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color(.systemBackground))
                            .shadow(color: .gray.opacity(0.1), radius: 3)
                    )
                    
                    // Clock Display
                    VStack(spacing: 10) {
                        Text(timeFormatter.string(from: currentTime))
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundColor(.blue)
                        
                        Text(dateFormatter.string(from: currentTime))
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color(.systemBackground))
                            .shadow(color: .gray.opacity(0.2), radius: 10, x: 0, y: 5)
                    )
                    .padding(.horizontal)
                    
                    // Check-in Type Selector
                    VStack(alignment: .leading, spacing: 10) {
                        Text("ประเภทการเช็กอิน")
                            .font(.headline)
                        
                        Picker("ประเภท", selection: $selectedCheckInType) {
                            ForEach(CheckInType.allCases, id: \.self) { type in
                                Text(type.displayName).tag(type)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                        
                        // แสดงคำเตือนสำหรับการเช็กอินที่ต้องการอนุมัติ
                        if selectedCheckInType.needsApproval {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                Text("ต้องได้รับอนุมัติจากฝ่าย HR")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                            .padding(.vertical, 4)
                        }
                        
                        if selectedCheckInType == .otherBranch {
                            HStack {
                                Text("สาขา:")
                                Spacer()
                                Button(selectedBranch) {
                                    showingBranchPicker = true
                                }
                                .foregroundColor(.blue)
                                Image(systemName: "chevron.down")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }
                            .padding(.vertical, 8)
                        }
                        
                        Toggle("ทำงานล่วงเวลา (OT)", isOn: $isOT)
                            .padding(.vertical, 4)
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color(.systemBackground))
                            .shadow(color: .gray.opacity(0.1), radius: 5, x: 0, y: 2)
                    )
                    .padding(.horizontal)
                    
                    // Check In/Out Buttons
                    HStack(spacing: 20) {
                        // Check In Button
                        Button(action: performCheckIn) {
                            VStack(spacing: 10) {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(1.2)
                                } else {
                                    Image(systemName: hasCheckedIn ? "checkmark.circle.fill" : "arrow.down.circle.fill")
                                        .font(.system(size: 40))
                                }
                                Text("เช็กอิน")
                                    .font(.headline)
                                if let time = checkInTime {
                                    Text(timeFormatter.string(from: time))
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.8))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 25)
                            .background(
                                RoundedRectangle(cornerRadius: 15)
                                    .fill(hasCheckedIn ? Color.green : Color.blue)
                            )
                            .foregroundColor(.white)
                        }
                        .disabled(hasCheckedIn || isLoading)
                        
                        // Check Out Button
                        Button(action: performCheckOut) {
                            VStack(spacing: 10) {
                                if isLoading && hasCheckedIn {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(1.2)
                                } else {
                                    Image(systemName: hasCheckedOut ? "checkmark.circle.fill" : "arrow.up.circle.fill")
                                        .font(.system(size: 40))
                                }
                                Text("เช็กเอาท์")
                                    .font(.headline)
                                if let time = checkOutTime {
                                    Text(timeFormatter.string(from: time))
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.8))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 25)
                            .background(
                                RoundedRectangle(cornerRadius: 15)
                                    .fill(hasCheckedOut ? Color.green : Color.orange)
                            )
                            .foregroundColor(.white)
                        }
                        .disabled(!hasCheckedIn || hasCheckedOut || isLoading)
                    }
                    .padding(.horizontal)
                    
                    // Today's Status
                    VStack(alignment: .leading, spacing: 15) {
                        Text("สถานะวันนี้")
                            .font(.headline)
                        
                        HStack {
                            Image(systemName: "location.fill")
                                .foregroundColor(.blue)
                            Text(selectedBranch)
                                .font(.subheadline)
                            Spacer()
                        }
                        
                        // แสดงสถานะการอนุมัติ
                        if let status = todayStatus, let approvalStatus = status.approvalStatus {
                            HStack {
                                Image(systemName: getApprovalIcon(status: approvalStatus))
                                    .foregroundColor(getApprovalColor(status: approvalStatus))
                                Text(getApprovalText(status: approvalStatus))
                                    .font(.subheadline)
                                    .foregroundColor(getApprovalColor(status: approvalStatus))
                                Spacer()
                            }
                        }
                        
                        if hasCheckedIn {
                            HStack {
                                Image(systemName: "clock.fill")
                                    .foregroundColor(.green)
                                Text("เวลาทำงาน: \(calculateWorkingHours())")
                                    .font(.subheadline)
                                Spacer()
                            }
                        }
                        
                        HStack {
                            Image(systemName: "calendar")
                                .foregroundColor(.purple)
                            Text("ชั่วโมงทำงานรวม: \(String(format: "%.1f", totalWorkingHours)) ชั่วโมง")
                                .font(.subheadline)
                            Spacer()
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color(.systemBackground))
                            .shadow(color: .gray.opacity(0.1), radius: 5, x: 0, y: 2)
                    )
                    .padding(.horizontal)
                    
                    // Recent Check-ins
                    VStack(alignment: .leading, spacing: 15) {
                        Text("ประวัติการเช็กอิน")
                            .font(.headline)
                        
                        if attendanceHistory.isEmpty {
                            HStack {
                                Spacer()
                                VStack(spacing: 10) {
                                    Image(systemName: "clock.arrow.circlepath")
                                        .font(.system(size: 30))
                                        .foregroundColor(.gray)
                                    Text("ไม่มีประวัติการเช็กอิน")
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                            }
                            .padding(.vertical, 20)
                        } else {
                            ForEach(attendanceHistory.prefix(5), id: \.id) { history in
                                HStack {
                                    VStack(alignment: .leading, spacing: 5) {
                                        Text(formatHistoryDate(history.checkIn))
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                        HStack {
                                            Text("เข้า: \(formatTime(history.checkIn))")
                                                .font(.caption)
                                                .foregroundColor(.green)
                                            if let checkOut = history.checkOut {
                                                Text("ออก: \(formatTime(checkOut))")
                                                    .font(.caption)
                                                    .foregroundColor(.orange)
                                            } else {
                                                Text("ยังไม่เช็กเอาท์")
                                                    .font(.caption)
                                                    .foregroundColor(.red)
                                            }
                                        }
                                        if history.approvalStatus != "not_required" {
                                            HStack {
                                                Image(systemName: getApprovalIcon(status: history.approvalStatus))
                                                    .foregroundColor(getApprovalColor(status: history.approvalStatus))
                                                    .font(.caption)
                                                Text(getApprovalText(status: history.approvalStatus))
                                                    .font(.caption2)
                                                    .foregroundColor(getApprovalColor(status: history.approvalStatus))
                                            }
                                        }
                                    }
                                    Spacer()
                                    if let workingHours = history.workingHours {
                                        Text("\(String(format: "%.1f", workingHours)) ชม.")
                                            .font(.caption)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 5)
                                            .background(Color.blue.opacity(0.1))
                                            .cornerRadius(8)
                                    }
                                }
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(10)
                            }
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color(.systemBackground))
                            .shadow(color: .gray.opacity(0.1), radius: 5, x: 0, y: 2)
                    )
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("เช็กอิน")
            .navigationBarTitleDisplayMode(.large)
            .alert("แจ้งเตือน", isPresented: $showingAlert) {
                Button("ตกลง", role: .cancel) { }
            } message: {
                Text(alertMessage)
            }
            .sheet(isPresented: $showingBranchPicker) {
                BranchPickerView(
                    selectedBranch: $selectedBranch, 
                    branches: availableBranches.map { $0.name }
                )
            }
        }
        .onReceive(timer) { _ in
            currentTime = Date()
        }
        .onAppear {
            // ตั้งค่า LocationManager callback เพื่ออัพเดต userLocation
            locationManager.onLocationUpdate = { coordinate in
                userLocation = coordinate
            }
            
            locationManager.requestLocationPermission()
            locationManager.startUpdatingLocation()
            loadBranches()
            loadTodayStatus()
            loadAttendanceHistory()
        }
        .onChange(of: officeLocations) { _ in
            // เมื่อโหลดสาขาเสร็จแล้ว ให้เช็คพื้นที่ทำงาน
            locationManager.checkOfficeArea(offices: officeLocations)
        }
    }
    
    func performCheckIn() {
        guard validateCheckIn() else { return }
        
        isLoading = true
        
        Task {
            do {
                let location = userLocation.map { 
                    AttendanceLocation(lat: $0.latitude, lng: $0.longitude) 
                }
                
                let selectedBranchId = availableBranches.first { $0.name == selectedBranch }?.id ?? ""
                
                let response = try await attendanceAPI.checkIn(
                    branch: selectedBranchId,
                    checkInType: selectedCheckInType.rawValue,
                    isOT: isOT,
                    location: location,
                    note: ""
                )
                
                await MainActor.run {
                    isLoading = false
                    checkInTime = Date()
                    hasCheckedIn = true
                    
                    var message = "เช็กอินสำเร็จ\n"
                    message += "เวลา: \(timeFormatter.string(from: Date()))\n"
                    message += "ประเภท: \(selectedCheckInType.displayName)\n"
                    
                    if selectedCheckInType == .otherBranch {
                        message += "สาขา: \(selectedBranch)\n"
                    }
                    
                    if isOT {
                        message += "สถานะ: ทำงานล่วงเวลา (OT)\n"
                    }
                    
                    if response.requiresApproval {
                        message += "\n⚠️ รอการอนุมัติจากฝ่าย HR"
                    }
                    
                    alertMessage = message
                    showingAlert = true
                    
                    // โหลดสถานะใหม่
                    loadTodayStatus()
                    loadAttendanceHistory()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    alertMessage = "เกิดข้อผิดพลาด: \(error.localizedDescription)"
                    showingAlert = true
                }
            }
        }
    }
    
    func performCheckOut() {
        isLoading = true
        
        Task {
            do {
                let selectedBranchId = availableBranches.first { $0.name == selectedBranch }?.id ?? ""
                
                _ = try await attendanceAPI.checkOut(branch: selectedBranchId)
                
                await MainActor.run {
                    isLoading = false
                    checkOutTime = Date()
                    hasCheckedOut = true
                    
                    var message = "เช็กเอาท์สำเร็จ\n"
                    message += "เวลา: \(timeFormatter.string(from: Date()))\n"
                    message += "เวลาทำงาน: \(calculateWorkingHours())"
                    
                    if isOT {
                        message += "\nทำงานล่วงเวลา (OT)"
                    }
                    
                    alertMessage = message
                    showingAlert = true
                    
                    // โหลดสถานะใหม่
                    loadTodayStatus()
                    loadAttendanceHistory()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    alertMessage = "เกิดข้อผิดพลาด: \(error.localizedDescription)"
                    showingAlert = true
                }
            }
        }
    }
    
    func validateCheckIn() -> Bool {
        switch selectedCheckInType {
        case .normal:
            if !locationManager.isInOfficeArea {
                alertMessage = "คุณไม่อยู่ในพื้นที่ทำงาน\nกรุณาเลือก 'เช็กอินนอกพื้นที่' หรือ 'เช็กอินต่างสาขา'"
                showingAlert = true
                return false
            }
        case .outsideArea:
            alertMessage = "เช็กอินนอกพื้นที่จะต้องได้รับการอนุมัติจากฝ่าย HR\nต้องการดำเนินการต่อหรือไม่?"
            // ในกรณีจริงควรแสดง confirmation dialog
            break
        case .otherBranch:
            alertMessage = "เช็กอินต่างสาขาจะต้องได้รับการอนุมัติจากฝ่าย HR\nต้องการดำเนินการต่อหรือไม่?"
            // ในกรณีจริงควรแสดง confirmation dialog
            break
        }
        return true
    }
    
    func loadTodayStatus() {
        Task {
            do {
                let selectedBranchId = availableBranches.first { $0.name == selectedBranch }?.id ?? ""
                let status = try await attendanceAPI.getTodayStatus(branch: selectedBranchId)
                
                await MainActor.run {
                    self.todayStatus = status
                    if let checkIn = status.checkIn {
                        hasCheckedIn = true
                        checkInTime = checkIn
                    }
                    if let checkOut = status.checkOut {
                        hasCheckedOut = true
                        checkOutTime = checkOut
                    }
                }
            } catch {
                print("Error loading today status: \(error)")
            }
        }
    }
    
    func loadBranches() {
        Task {
            do {
                let branches = try await attendanceAPI.getBranches()
                await MainActor.run {
                    self.availableBranches = branches
                    if let firstBranch = branches.first {
                        self.selectedBranch = firstBranch.name
                    }
                    
                    // แปลงข้อมูลสาขาเป็น Office locations สำหรับ map
                    self.officeLocations = branches.compactMap { branch in
                        // ใช้พิกัดดีฟอลต์สำหรับแต่ละสาขา หรือดึงจาก API ถ้ามี
                        let defaultCoordinates = getDefaultCoordinateForBranch(branch.name)
                        return Office(
                            name: branch.name,
                            coordinate: defaultCoordinates,
                            radius: 100.0
                        )
                    }
                }
            } catch {
                print("Error loading branches: \(error)")
            }
        }
    }
    
    func getDefaultCoordinateForBranch(_ branchName: String) -> CLLocationCoordinate2D {
        // ในอนาคตควรดึงพิกัดจาก API แต่ตอนนี้ใช้ค่าดีฟอลต์
        switch branchName.lowercased() {
        case let name where name.contains("สำนักงานใหญ่") || name.contains("หลัก"):
            return CLLocationCoordinate2D(latitude: 13.7563, longitude: 100.5018)
        case let name where name.contains("สยาม"):
            return CLLocationCoordinate2D(latitude: 13.7455, longitude: 100.5341)
        case let name where name.contains("อโศก"):
            return CLLocationCoordinate2D(latitude: 13.7367, longitude: 100.5608)
        default:
            // ใช้พิกัดกรุงเทพฯ เป็นค่าดีฟอลต์
            return CLLocationCoordinate2D(latitude: 13.7563, longitude: 100.5018)
        }
    }
    
    func loadAttendanceHistory() {
        Task {
            do {
                let history = try await attendanceAPI.getAttendanceHistory(limit: 10)
                await MainActor.run {
                    self.attendanceHistory = history
                    self.totalWorkingHours = history.compactMap { $0.workingHours }.reduce(0, +)
                }
            } catch {
                print("Error loading attendance history: \(error)")
            }
        }
    }
    
    func formatHistoryDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "th_TH")
        formatter.dateFormat = "EEEE d MMM"
        return formatter.string(from: date)
    }
    
    func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
    
    func getApprovalIcon(status: String) -> String {
        switch status {
        case "pending":
            return "clock.arrow.circlepath"
        case "approved":
            return "checkmark.circle.fill"
        case "rejected":
            return "xmark.circle.fill"
        default:
            return "checkmark.circle"
        }
    }
    
    func getApprovalColor(status: String) -> Color {
        switch status {
        case "pending":
            return .orange
        case "approved":
            return .green
        case "rejected":
            return .red
        default:
            return .gray
        }
    }
    
    func getApprovalText(status: String) -> String {
        switch status {
        case "pending":
            return "รอการอนุมัติ"
        case "approved":
            return "อนุมัติแล้ว"
        case "rejected":
            return "ไม่อนุมัติ"
        case "not_required":
            return "ไม่ต้องอนุมัติ"
        default:
            return "สถานะไม่ทราบ"
        }
    }
    
    func calculateWorkingHours() -> String {
        guard let checkIn = checkInTime else { return "0 ชั่วโมง" }
        let checkOut = checkOutTime ?? Date()
        let interval = checkOut.timeIntervalSince(checkIn)
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        return "\(hours) ชั่วโมง \(minutes) นาที"
    }
}

struct MapViewWrapper: UIViewRepresentable {
    @Binding var userLocation: CLLocationCoordinate2D?
    let officeLocations: [Office]
    
    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.showsUserLocation = true
        mapView.userTrackingMode = .none
        
        // Set initial region around Bangkok
        let initialLocation = CLLocationCoordinate2D(latitude: 13.7563, longitude: 100.5018)
        let region = MKCoordinateRegion(center: initialLocation, latitudinalMeters: 2000, longitudinalMeters: 2000)
        mapView.setRegion(region, animated: false)
        
        // Add office annotations
        for office in officeLocations {
            let annotation = OfficeAnnotation()
            annotation.coordinate = office.coordinate
            annotation.title = office.name
            annotation.subtitle = "พื้นที่ทำงาน"
            annotation.radius = office.radius
            mapView.addAnnotation(annotation)
            
            // Add circle overlay for office radius
            let circle = MKCircle(center: office.coordinate, radius: office.radius)
            mapView.addOverlay(circle)
        }
        
        mapView.delegate = context.coordinator
        return mapView
    }
    
    func updateUIView(_ mapView: MKMapView, context: Context) {
        if let userLocation = userLocation {
            let region = MKCoordinateRegion(center: userLocation, latitudinalMeters: 1000, longitudinalMeters: 1000)
            mapView.setRegion(region, animated: true)
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: MapViewWrapper
        
        init(_ parent: MapViewWrapper) {
            self.parent = parent
        }
        
        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let circle = overlay as? MKCircle {
                let renderer = MKCircleRenderer(circle: circle)
                renderer.fillColor = .blue.withAlphaComponent(0.1)
                renderer.strokeColor = .blue
                renderer.lineWidth = 2.0
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }
        
        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard annotation is OfficeAnnotation else {
                return nil
            }
            
            let identifier = "OfficeAnnotation"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier)
            
            if annotationView == nil {
                annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                annotationView?.canShowCallout = true
            } else {
                annotationView?.annotation = annotation
            }
            
            if let markerView = annotationView as? MKMarkerAnnotationView {
                markerView.markerTintColor = .blue
            }
            
            return annotationView
        }
    }
}

class OfficeAnnotation: NSObject, MKAnnotation {
    var coordinate: CLLocationCoordinate2D = CLLocationCoordinate2D()
    var title: String?
    var subtitle: String?
    var radius: Double = 0
}

struct Office {
    let name: String
    let coordinate: CLLocationCoordinate2D
    let radius: Double
}

struct BranchPickerView: View {
    @Binding var selectedBranch: String
    let branches: [String]
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            List(branches, id: \.self) { branch in
                HStack {
                    Text(branch)
                    Spacer()
                    if selectedBranch == branch {
                        Image(systemName: "checkmark")
                            .foregroundColor(.blue)
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    selectedBranch = branch
                    dismiss()
                }
            }
            .navigationTitle("เลือกสาขา")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("เสร็จ") {
                        dismiss()
                    }
                }
                #else
                ToolbarItem(placement: .primaryAction) {
                    Button("เสร็จ") {
                        dismiss()
                    }
                }
                #endif
            }
        }
    }
}

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var userLocation: CLLocation?
    @Published var isInOfficeArea = false
    
    // Closure สำหรับอัพเดต userLocation coordinate ใน parent view
    var onLocationUpdate: ((CLLocationCoordinate2D) -> Void)?
    
    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }
    
    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    func startUpdatingLocation() {
        locationManager.startUpdatingLocation()
    }
    
    func checkOfficeArea(offices: [Office]) {
        guard let userLocation = userLocation else {
            isInOfficeArea = false
            return
        }
        
        for office in offices {
            let officeLocation = CLLocation(latitude: office.coordinate.latitude, longitude: office.coordinate.longitude)
            let distance = userLocation.distance(from: officeLocation)
            
            if distance <= office.radius {
                isInOfficeArea = true
                return
            }
        }
        
        isInOfficeArea = false
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        userLocation = location
        
        // อัพเดต coordinate ใน CheckInView ผ่าน closure
        onLocationUpdate?(location.coordinate)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }
}

#Preview {
    CheckInView()
}

// MARK: - API Models and Classes

struct Branch: Codable, Identifiable {
    let id: String
    let name: String
    let branchCode: String?
    let isActive: Bool
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name
        case branchCode = "branch_code"
        case isActive
    }
}

struct AttendanceHistoryItem: Codable, Identifiable {
    let id: String
    let checkIn: Date
    let checkOut: Date?
    let checkInType: String
    let isOT: Bool
    let approvalStatus: String
    let branch: BranchInfo?
    let workingHours: Double?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case checkIn, checkOut, checkInType, isOT, approvalStatus, branch, workingHours
    }
}

struct BranchInfo: Codable {
    let id: String
    let name: String
    let branchCode: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name
        case branchCode = "branch_code"
    }
}

struct AttendanceLocation: Codable {
    let lat: Double
    let lng: Double
}

struct CheckInResponse: Codable {
    let success: Bool
    let attendance: AttendanceRecord
    let requiresApproval: Bool
}

struct CheckOutResponse: Codable {
    let success: Bool
    let attendance: AttendanceRecord
}

struct AttendanceRecord: Codable {
    let id: String
    let user: String
    let branch: String
    let checkIn: Date
    let checkOut: Date?
    let checkInType: String
    let isOT: Bool
    let approvalStatus: String
    let location: AttendanceLocation?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case user, branch, checkIn, checkOut, checkInType, isOT, approvalStatus, location
    }
}

struct TodayStatus: Codable {
    let checkIn: Date?
    let checkOut: Date?
    let approvalStatus: String?
    let requiresApproval: Bool
}

struct BranchesResponse: Codable {
    let success: Bool
    let data: [Branch]
}

struct StatusResponse: Codable {
    let success: Bool
    let checkIn: Date?
    let checkOut: Date?
    let approvalStatus: String?
}

struct AttendanceHistoryResponse: Codable {
    let success: Bool
    let data: [AttendanceHistoryItem]
    let pagination: PaginationInfo?
}

struct PaginationInfo: Codable {
    let page: Int
    let limit: Int
    let total: Int
    let pages: Int
}

class AttendanceAPI: ObservableObject {
    private let baseURL = "https://www.2pheenong.com/api/hr/ios-attendance"
    private let session = URLSession.shared
    
    // ใส่ JWT token ของคุณที่นี่
    private let authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODU2MTlmNTRlMTNkZWNjYmM1YTJjYzMiLCJ1c2VybmFtZSI6ImFkbWluMSIsInJvbGUiOiJTdXBlciBBZG1pbiIsImlhdCI6MTc1NjE3MzczNX0.wE1ZJytH5VhSSySq2f2SG6Ualj7YZV-JYCrGbkEqHUk"
    
    private var headers: [String: String] {
        return [
            "Authorization": "Bearer \(authToken)",
            "Content-Type": "application/json"
        ]
    }
    
    func checkIn(branch: String, checkInType: String, isOT: Bool, location: AttendanceLocation?, note: String = "") async throws -> CheckInResponse {
        let url = URL(string: "\(baseURL)/checkin")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let body: [String: Any] = [
            "branch": branch,
            "checkInType": checkInType,
            "isOT": isOT,
            "location": location != nil ? [
                "lat": location!.lat,
                "lng": location!.lng
            ] : [:],
            "note": note
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            throw AttendanceError.serverError("Check-in failed")
        }
        
        return try JSONDecoder().decode(CheckInResponse.self, from: data)
    }
    
    func checkOut(branch: String) async throws -> CheckOutResponse {
        let url = URL(string: "\(baseURL)/checkout")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let body: [String: Any] = [
            "branch": branch
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AttendanceError.serverError("Check-out failed")
        }
        
        return try JSONDecoder().decode(CheckOutResponse.self, from: data)
    }
    
    func getBranches() async throws -> [Branch] {
        let url = URL(string: "\(baseURL)/branches")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AttendanceError.serverError("Failed to load branches")
        }
        
        let branchesResponse = try JSONDecoder().decode(BranchesResponse.self, from: data)
        return branchesResponse.data
    }
    
    func getTodayStatus(branch: String) async throws -> TodayStatus {
        let url = URL(string: "\(baseURL)/status?branch=\(branch)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AttendanceError.serverError("Failed to load status")
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        let statusResponse = try decoder.decode(StatusResponse.self, from: data)
        
        return TodayStatus(
            checkIn: statusResponse.checkIn,
            checkOut: statusResponse.checkOut,
            approvalStatus: statusResponse.approvalStatus,
            requiresApproval: statusResponse.approvalStatus == "pending"
        )
    }
    
    func getAttendanceHistory(limit: Int = 10) async throws -> [AttendanceHistoryItem] {
        let url = URL(string: "\(baseURL)/history?limit=\(limit)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AttendanceError.serverError("Failed to load attendance history")
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        do {
            let historyResponse = try decoder.decode(AttendanceHistoryResponse.self, from: data)
            
            // คำนวณชั่วโมงทำงานสำหรับแต่ละ record
            let historyWithHours = historyResponse.data.map { item -> AttendanceHistoryItem in
                if let checkOut = item.checkOut {
                    let hours = checkOut.timeIntervalSince(item.checkIn) / 3600.0
                    return AttendanceHistoryItem(
                        id: item.id,
                        checkIn: item.checkIn,
                        checkOut: item.checkOut,
                        checkInType: item.checkInType,
                        isOT: item.isOT,
                        approvalStatus: item.approvalStatus,
                        branch: item.branch,
                        workingHours: hours
                    )
                } else {
                    return AttendanceHistoryItem(
                        id: item.id,
                        checkIn: item.checkIn,
                        checkOut: item.checkOut,
                        checkInType: item.checkInType,
                        isOT: item.isOT,
                        approvalStatus: item.approvalStatus,
                        branch: item.branch,
                        workingHours: nil
                    )
                }
            }
            
            return historyWithHours
        } catch {
            throw AttendanceError.decodingError("Failed to parse attendance history: \(error.localizedDescription)")
        }
    }
}

enum AttendanceError: Error {
    case serverError(String)
    case networkError(String)
    case decodingError(String)
    
    var localizedDescription: String {
        switch self {
        case .serverError(let message):
            return message
        case .networkError(let message):
            return "Network error: \(message)"
        case .decodingError(let message):
            return "Data error: \(message)"
        }
    }
}