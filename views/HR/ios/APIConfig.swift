import Foundation

// MARK: - API Configuration
struct APIConfig {
    // Base URL for the API
    static let baseURL = "http://localhost:3000"
    
    // API Endpoints
    struct Endpoints {
        static let users = "\(baseURL)/api/users"
        static let login = "\(users)/login"
        static let register = "\(users)/register"
        static let logout = "\(users)/logout"
        static let me = "\(users)/me"
        static let loginHistory = "\(users)/login-history"
        static let currentSession = "\(users)/current-session"
    }
    
    // Request timeout in seconds
    static let requestTimeout: TimeInterval = 30
    
    // For production, you might want to use HTTPS and a proper domain
    static let productionBaseURL = "https://your-production-domain.com"
    
    // Helper to determine if we're in development
    static var isDevelopment: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
    
    // Get the appropriate base URL based on environment
    static var currentBaseURL: String {
        return isDevelopment ? baseURL : productionBaseURL
    }
}

// MARK: - API Response Models
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let message: String?
    let data: T?
    let error: String?
}

struct EmptyResponse: Codable {}

// MARK: - Error Types
enum APIError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case networkError(String)
    case serverError(String)
    case unauthorized
    case forbidden
    case notFound
    case rateLimited
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received from server"
        case .decodingError:
            return "Invalid data format from server"
        case .networkError(let message):
            return "Network error: \(message)"
        case .serverError(let message):
            return "Server error: \(message)"
        case .unauthorized:
            return "Unauthorized access. Please login again"
        case .forbidden:
            return "Access forbidden"
        case .notFound:
            return "Resource not found"
        case .rateLimited:
            return "Too many requests. Please wait and try again"
        }
    }
}

// MARK: - Network Manager
class NetworkManager {
    static let shared = NetworkManager()
    
    private let session: URLSession
    
    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = APIConfig.requestTimeout
        configuration.timeoutIntervalForResource = APIConfig.requestTimeout * 2
        self.session = URLSession(configuration: configuration)
    }
    
    func request<T: Codable>(
        url: URL,
        method: HTTPMethod = .GET,
        headers: [String: String]? = nil,
        body: Data? = nil,
        responseType: T.Type,
        completion: @escaping (Result<T, APIError>) -> Void
    ) {
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add custom headers
        headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        // Add body if provided
        if let body = body {
            request.httpBody = body
        }
        
        session.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                // Handle network error
                if let error = error {
                    completion(.failure(.networkError(error.localizedDescription)))
                    return
                }
                
                // Check HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    switch httpResponse.statusCode {
                    case 200...299:
                        break // Success, continue processing
                    case 401:
                        completion(.failure(.unauthorized))
                        return
                    case 403:
                        completion(.failure(.forbidden))
                        return
                    case 404:
                        completion(.failure(.notFound))
                        return
                    case 429:
                        completion(.failure(.rateLimited))
                        return
                    default:
                        completion(.failure(.serverError("HTTP \(httpResponse.statusCode)")))
                        return
                    }
                }
                
                // Check if we have data
                guard let data = data else {
                    completion(.failure(.noData))
                    return
                }
                
                // Try to decode the response
                do {
                    let response = try JSONDecoder().decode(T.self, from: data)
                    completion(.success(response))
                } catch {
                    print("Decoding error: \(error)")
                    completion(.failure(.decodingError))
                }
            }
        }.resume()
    }
}

// MARK: - HTTP Methods
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case PATCH = "PATCH"
    case DELETE = "DELETE"
}
