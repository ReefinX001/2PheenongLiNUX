#!/usr/bin/env python3
"""
ZK9500 Windows Service Bridge
=============================

Windows Service สำหรับเชื่อมต่อ ZK9500 กับ Web Server ผ่าน Tailscale
รันตลอดเวลาเป็น Windows Service

Author: Pattani Installment System
Version: 1.0.0
"""

import asyncio
import websockets
import json
import serial
import serial.tools.list_ports
import logging
import time
import socket
import subprocess
import platform
import threading
import sys
import os
import configparser
import ctypes
from ctypes import wintypes
from typing import Optional, Dict, Any
from pathlib import Path

# USB HID imports
try:
    import hid
    HAS_HID = True
except ImportError:
    HAS_HID = False

try:
    import pywinusb.hid as pywinusb_hid
    HAS_PYWINUSB = True
except ImportError:
    HAS_PYWINUSB = False

# Windows Service imports
try:
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager
    HAS_WIN_SERVICE = True
except ImportError:
    HAS_WIN_SERVICE = False
    print("Warning: Windows Service modules not available. Running in console mode.")

# HTTP API imports
try:
    from zk9500_http_api import ZK9500HTTPServer
    HAS_HTTP_API = True
except ImportError:
    HAS_HTTP_API = False

# Configure logging with UTF-8 encoding to fix Unicode errors
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)

# Create custom formatter to avoid Unicode issues
class SafeFormatter(logging.Formatter):
    def format(self, record):
        # Replace problematic Unicode characters
        formatted = super().format(record)
        # Replace common emoji with text equivalents
        formatted = formatted.replace('✅', '[OK]')
        formatted = formatted.replace('❌', '[FAIL]')
        formatted = formatted.replace('⚠️', '[WARN]')
        formatted = formatted.replace('🚀', '[START]')
        formatted = formatted.replace('🌐', '[NET]')
        formatted = formatted.replace('📱', '[DEV]')
        formatted = formatted.replace('💡', '[TIP]')
        formatted = formatted.replace('🎯', '[READY]')
        formatted = formatted.replace('📝', '[LOG]')
        return formatted

safe_formatter = SafeFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Setup file handler
file_handler = logging.FileHandler(log_dir / "zk9500_service.log", encoding='utf-8')
file_handler.setFormatter(safe_formatter)

# Setup console handler with safe formatter
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(safe_formatter)

logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler]
)
logger = logging.getLogger(__name__)

class ZKFingerSDKInterface:
    """Interface for ZKFinger SDK"""
    
    def __init__(self):
        self.dll = None
        self.initialized = False
        self.devices = []
        self.load_dll()
    
    def load_dll(self):
        """Load ZKFinger SDK DLL"""
        try:
            self.dll = ctypes.CDLL("libzkfp.dll")
            self.setup_function_prototypes()
            return True
        except OSError as e:
            logger.warning(f"ZKFinger SDK DLL not found: {e}")
            return False
        except Exception as e:
            logger.error(f"Error loading ZKFinger SDK: {e}")
            return False
    
    def setup_function_prototypes(self):
        """Setup DLL function prototypes"""
        if not self.dll:
            return False
        
        try:
            # Initialize/Terminate
            self.dll.ZKFPM_Init.argtypes = []
            self.dll.ZKFPM_Init.restype = ctypes.c_int
            
            self.dll.ZKFPM_Terminate.argtypes = []
            self.dll.ZKFPM_Terminate.restype = ctypes.c_int
            
            # Device management
            self.dll.ZKFPM_GetDeviceCount.argtypes = []
            self.dll.ZKFPM_GetDeviceCount.restype = ctypes.c_int
            
            self.dll.ZKFPM_OpenDevice.argtypes = [ctypes.c_int]
            self.dll.ZKFPM_OpenDevice.restype = ctypes.c_void_p  # Use void pointer instead of HANDLE
            
            self.dll.ZKFPM_CloseDevice.argtypes = [ctypes.c_void_p]  # Match with void pointer
            self.dll.ZKFPM_CloseDevice.restype = ctypes.c_int
            
            # Fingerprint capture
            self.dll.ZKFPM_AcquireFingerprint.argtypes = [
                ctypes.c_void_p,  # device handle (matching OpenDevice return type)
                ctypes.POINTER(ctypes.c_ubyte),  # image buffer
                ctypes.c_uint,   # image buffer size
                ctypes.POINTER(ctypes.c_ubyte),  # template buffer
                ctypes.POINTER(ctypes.c_uint)    # template size
            ]
            self.dll.ZKFPM_AcquireFingerprint.restype = ctypes.c_int
            
            return True
        except AttributeError as e:
            logger.error(f"Error setting up ZKFinger SDK prototypes: {e}")
            return False
    
    def initialize(self):
        """Initialize ZKFinger SDK"""
        if not self.dll:
            return False, "DLL not loaded"
        
        try:
            result = self.dll.ZKFPM_Init()
            if result == 0 or result == 1:  # 0=success, 1=already initialized
                self.initialized = True
                return True, "SDK initialized"
            else:
                return False, f"Init failed: {result}"
        except Exception as e:
            return False, f"Init error: {e}"
    
    def terminate(self):
        """Terminate ZKFinger SDK"""
        if self.dll and self.initialized:
            try:
                self.dll.ZKFPM_Terminate()
                self.initialized = False
            except Exception as e:
                logger.warning(f"SDK terminate error: {e}")
    
    def get_device_count(self):
        """Get connected device count"""
        if not self.dll or not self.initialized:
            return 0
        
        try:
            return self.dll.ZKFPM_GetDeviceCount()
        except Exception as e:
            logger.error(f"Get device count error: {e}")
            return 0
    
    def open_device(self, index):
        """Open device by index"""
        if not self.dll or not self.initialized:
            return None
        
        try:
            handle = self.dll.ZKFPM_OpenDevice(index)
            return handle if handle else None
        except Exception as e:
            logger.error(f"Open device error: {e}")
            return None
    
    def close_device(self, handle):
        """Close device handle"""
        if not self.dll or not handle:
            return True
        
        try:
            result = self.dll.ZKFPM_CloseDevice(handle)
            return result == 0
        except Exception as e:
            logger.error(f"Close device error: {e}")
            return False
    
    def capture_fingerprint(self, handle):
        """Capture fingerprint from device"""
        if not self.dll or not handle:
            return None, None
        
        try:
            # Allocate buffers
            image_size = 640 * 480  # Standard fingerprint image size
            template_size = 2048    # Template buffer size
            
            image_buffer = (ctypes.c_ubyte * image_size)()
            template_buffer = (ctypes.c_ubyte * template_size)()
            template_size_ref = ctypes.c_uint(template_size)
            
            # Capture fingerprint
            result = self.dll.ZKFPM_AcquireFingerprint(
                handle,
                image_buffer,
                image_size,
                template_buffer,
                ctypes.byref(template_size_ref)
            )
            
            if result == 0:  # Success
                # Convert to bytes
                image_data = bytes(image_buffer)
                template_data = bytes(template_buffer[:template_size_ref.value])
                return image_data, template_data
            else:
                return None, None
                
        except Exception as e:
            logger.error(f"Capture fingerprint error: {e}")
            return None, None

class ZK9500Controller:
    """Controller for ZK9500 fingerprint scanner"""
    
    def __init__(self, config):
        self.config = config
        self.port: Optional[serial.Serial] = None
        self.hid_device = None
        self.connection_type = None  # 'serial', 'usb_hid', or 'zkfinger_sdk'
        self.zkfinger_sdk = ZKFingerSDKInterface()
        self.device_handle = None
        self.device_info = {
            'model': 'ZK9500',
            'serial': 'unknown',
            'firmware': 'unknown',
            'resolution': '500 DPI',
            'connected': False,
            'connection_type': None,
            'device_count': 0,
            'client_ip': self.get_tailscale_ip(),
            'client_hostname': socket.gethostname(),
            'last_scan_time': None,
            'total_scans': 0
        }
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = int(config.get('device', 'max_reconnect_attempts', fallback=5))
    
    def get_tailscale_ip(self) -> str:
        """Get Tailscale IP address"""
        try:
            # Try tailscale command
            result = subprocess.run(
                ['tailscale', 'ip', '-4'], 
                capture_output=True, 
                text=True, 
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
            )
            if result.returncode == 0 and result.stdout.strip():
                ip = result.stdout.strip()
                logger.info(f"Tailscale IP detected: {ip}")
                return ip
        except Exception as e:
            logger.warning(f"Could not get Tailscale IP via command: {e}")
        
        # Fallback: try to detect from network interfaces
        try:
            import socket
            # Try to connect to a Tailscale IP range to get our Tailscale IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("100.64.0.1", 80))  # Tailscale IP range
                tailscale_ip = s.getsockname()[0]
                if tailscale_ip.startswith("100."):
                    logger.info(f"Tailscale IP detected from socket: {tailscale_ip}")
                    return tailscale_ip
        except Exception as e:
            logger.warning(f"Could not detect Tailscale IP from socket: {e}")
        
        # Ultimate fallback
        fallback_ip = socket.gethostbyname(socket.gethostname())
        logger.warning(f"Using fallback IP: {fallback_ip}")
        return fallback_ip
    
    def find_zk9500_zkfinger_sdk(self) -> Optional[Dict]:
        """Find ZK9500 devices via ZKFinger SDK"""
        logger.info("Scanning for ZK9500 via ZKFinger SDK...")
        
        # Initialize SDK
        success, message = self.zkfinger_sdk.initialize()
        if not success:
            logger.warning(f"ZKFinger SDK init failed: {message}")
            return None
        
        # Get device count
        count = self.zkfinger_sdk.get_device_count()
        logger.info(f"ZKFinger SDK found {count} devices")
        
        if count > 0:
            return {
                'type': 'zkfinger_sdk',
                'device_count': count,
                'sdk': self.zkfinger_sdk
            }
        
        return None

    def find_zk9500_hid_device(self) -> Optional[Dict]:
        """Find ZK9500 device via USB HID (fallback)"""
        logger.info("Scanning for ZK9500 via USB HID...")
        
        # Try hidapi first
        if HAS_HID:
            try:
                # Common ZKTeco vendor IDs and product IDs
                zkteco_devices = [
                    (0x1b55, 0x0124),  # ZK9500 (ค่าจริงที่พบ)
                    (0x1b55, 0x0010),  # ZKTeco ZK9500 variants
                    (0x1b55, 0x0020),  # ZKTeco variants
                    (0x2808, 0x0001),  # Alternative ZKTeco ID
                    (0x1a86, 0x0001),  # Some ZK devices
                ]
                
                for vendor_id, product_id in zkteco_devices:
                    try:
                        device = hid.device()
                        device.open(vendor_id, product_id)
                        
                        # Test if we can get device info
                        manufacturer = device.get_manufacturer_string()
                        product = device.get_product_string()
                        
                        device_info = {
                            'vendor_id': vendor_id,
                            'product_id': product_id,
                            'manufacturer': manufacturer or 'ZKTeco',
                            'product': product or 'ZK9500',
                            'type': 'hidapi'
                        }
                        
                        logger.info(f"Found ZK9500 via HID: {manufacturer} {product}")
                        return device_info
                        
                    except Exception as e:
                        logger.debug(f"HID device {vendor_id:04x}:{product_id:04x} not found: {e}")
                        continue
                        
            except Exception as e:
                logger.debug(f"Error scanning HID devices: {e}")
        
        # Try pywinusb as fallback
        if HAS_PYWINUSB:
            try:
                devices = pywinusb_hid.HidDeviceFilter().get_devices()
                if not devices:
                    logger.debug("No pywinusb devices found")
                    return None
                
                for device in devices:
                    vendor_id = device.vendor_id
                    product_id = device.product_id
                    
                    # Check for ZKTeco devices
                    if vendor_id in [0x1b55, 0x2808, 0x1a86]:
                        try:
                            device.open()
                            
                            device_info = {
                                'vendor_id': vendor_id,
                                'product_id': product_id,
                                'manufacturer': 'ZKTeco',
                                'product': 'ZK9500',
                                'type': 'pywinusb',
                                'device': device
                            }
                            
                            logger.info(f"Found ZK9500 via pywinusb: {vendor_id:04x}:{product_id:04x}")
                            return device_info
                            
                        except Exception as e:
                            logger.debug(f"Cannot open pywinusb device: {e}")
                            continue
                            
            except Exception as e:
                logger.debug(f"Error scanning pywinusb devices: {e}")
        
        logger.warning("No ZK9500 HID device found")
        return None
    
    def connect_zkfinger_sdk(self, device_info: Dict) -> bool:
        """Connect to ZK9500 via ZKFinger SDK"""
        try:
            # Open first device
            self.device_handle = self.zkfinger_sdk.open_device(0)
            
            if self.device_handle:
                self.connection_type = 'zkfinger_sdk'
                self.device_info['connection_type'] = 'zkfinger_sdk'
                self.device_info['model'] = 'ZK9500 (SDK)'
                self.device_info['serial'] = f"ZK{int(time.time()) % 10000}"
                self.device_info['firmware'] = 'SDK v10.0'
                logger.info(f"[OK] Connected to ZK9500 via ZKFinger SDK (Handle: {self.device_handle})")
                return True
            else:
                logger.error("Failed to open ZK9500 device via ZKFinger SDK")
                return False
                
        except Exception as e:
            logger.error(f"ZKFinger SDK connection failed: {e}")
            return False
    
    def connect_hid(self, device_info: Dict) -> bool:
        """Connect to ZK9500 via USB HID"""
        try:
            if device_info['type'] == 'hidapi':
                self.hid_device = hid.device()
                self.hid_device.open(device_info['vendor_id'], device_info['product_id'])
                self.hid_device.set_nonblocking(True)
                
            elif device_info['type'] == 'pywinusb':
                self.hid_device = device_info['device']
                if not self.hid_device.is_opened():
                    self.hid_device.open()
            
            # Test HID communication
            if self.test_hid_communication():
                self.connection_type = 'usb_hid'
                self.device_info['connection_type'] = 'usb_hid'
                logger.info("✅ Connected to ZK9500 via USB HID")
                return True
            else:
                self.disconnect_hid()
                return False
                
        except Exception as e:
            logger.error(f"HID connection failed: {e}")
            self.disconnect_hid()
            return False
    
    def disconnect_hid(self):
        """Disconnect from HID device"""
        if self.hid_device:
            try:
                if hasattr(self.hid_device, 'close'):
                    self.hid_device.close()
                self.hid_device = None
                logger.info("Disconnected from ZK9500 HID device")
            except Exception as e:
                logger.warning(f"Error disconnecting HID device: {e}")
    
    def test_hid_communication(self) -> bool:
        """Test HID communication with ZK9500"""
        try:
            # Send test command via HID
            if self.connection_type == 'usb_hid' and self.hid_device:
                # ZK9500 HID test command (this may need adjustment based on actual protocol)
                test_cmd = [0x01, 0x00, 0x00, 0x00] + [0x00] * 60  # 64-byte packet
                
                if hasattr(self.hid_device, 'write'):
                    # hidapi style
                    self.hid_device.write(test_cmd)
                    time.sleep(0.1)
                    
                    # Try to read response
                    response = self.hid_device.read(64)
                    if response:
                        logger.debug(f"HID test response: {len(response)} bytes")
                        return True
                
                return False
            
            return False
            
        except Exception as e:
            logger.debug(f"HID communication test failed: {e}")
            return False
    
    def find_zk9500_port(self) -> Optional[str]:
        """Find ZK9500 device port"""
        logger.info("Scanning for ZK9500 device...")
        ports = serial.tools.list_ports.comports()
        
        # Check for known ZKTeco vendor IDs
        zkteco_vids = [0x1b55, 0x2808, 0x1a86, 0x0403]  # Common ZKTeco vendor IDs
        
        for port in ports:
            logger.debug(f"Found port: {port.device} - {port.description} (VID: {port.vid}, PID: {port.pid})")
            
            # Check vendor ID
            if port.vid in zkteco_vids:
                logger.info(f"Found ZKTeco device by VID on {port.device}")
                return port.device
            
            # Check description
            description_keywords = ['zk', 'fingerprint', 'biometric', 'zkteco']
            if any(keyword in port.description.lower() for keyword in description_keywords):
                logger.info(f"Found fingerprint device by description on {port.device}")
                return port.device
        
        # Try configured port if specified
        configured_port = self.config.get('device', 'com_port', fallback=None)
        if configured_port:
            try:
                test_port = serial.Serial(configured_port, 9600, timeout=1)
                test_port.close()
                logger.info(f"Using configured port: {configured_port}")
                return configured_port
            except Exception as e:
                logger.warning(f"Configured port {configured_port} not available: {e}")
        
        # Fallback: test common Windows COM ports
        for i in range(1, 21):
            port_name = f'COM{i}'
            try:
                test_port = serial.Serial(port_name, 9600, timeout=1)
                test_port.close()
                logger.info(f"Found available port: {port_name}")
                return port_name
            except:
                continue
        
        return None
    
    def connect(self) -> bool:
        """Connect to ZK9500 device with retry logic"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("Max reconnection attempts reached")
            return False
        
        try:
            # Try ZKFinger SDK first (highest priority)
            zkfinger_device_info = self.find_zk9500_zkfinger_sdk()
            if zkfinger_device_info:
                if self.connect_zkfinger_sdk(zkfinger_device_info):
                    self.device_info['connected'] = True
                    self.device_info['device_count'] = zkfinger_device_info['device_count']
                    self.reconnect_attempts = 0
                    return True
                else:
                    logger.info("ZKFinger SDK connection failed, trying HID...")
            else:
                logger.info("No ZKFinger SDK devices found, trying HID...")
            
            # Try USB HID as fallback
            if HAS_HID or HAS_PYWINUSB:
                hid_device_info = self.find_zk9500_hid_device()
                if hid_device_info:
                    if self.connect_hid(hid_device_info):
                        self.get_device_info()
                        self.device_info['connected'] = True
                        self.reconnect_attempts = 0
                        return True
                    else:
                        logger.info("HID connection failed, trying serial...")
                else:
                    logger.info("No HID device found, trying serial...")
            
            # Fallback to serial connection
            port_name = self.find_zk9500_port()
            if not port_name:
                logger.error("No ZK9500 device found via ZKFinger SDK, serial or HID")
                self.reconnect_attempts += 1
                return False
            
            # Try different baud rates
            baud_rates = [9600, 115200, 57600, 38400, 19200]
            configured_baud = self.config.get('device', 'baud_rate', fallback=None)
            if configured_baud:
                baud_rates.insert(0, int(configured_baud))
            
            for baud_rate in baud_rates:
                try:
                    logger.info(f"Trying {port_name} at {baud_rate} baud")
                    
                    self.port = serial.Serial(
                        port=port_name,
                        baudrate=baud_rate,
                        bytesize=serial.EIGHTBITS,
                        parity=serial.PARITY_NONE,
                        stopbits=serial.STOPBITS_ONE,
                        timeout=3,
                        write_timeout=3
                    )
                    
                    # Test communication
                    if self.test_communication():
                        logger.info(f"✅ Connected to ZK9500 on {port_name} at {baud_rate} baud")
                        self.get_device_info()
                        self.device_info['connected'] = True
                        self.device_info['connection_type'] = 'serial'
                        self.connection_type = 'serial'
                        self.reconnect_attempts = 0  # Reset on successful connection
                        return True
                    else:
                        self.port.close()
                        
                except Exception as e:
                    if self.port and self.port.is_open:
                        self.port.close()
                    logger.debug(f"Failed at {baud_rate} baud: {e}")
                    continue
            
            logger.error("Failed to establish communication with ZK9500")
            self.reconnect_attempts += 1
            return False
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
            self.reconnect_attempts += 1
            return False
    
    def test_communication(self) -> bool:
        """Test communication with device"""
        try:
            # Clear buffers
            self.port.reset_input_buffer()
            self.port.reset_output_buffer()
            
            # Send test command
            test_cmd = bytes([0x01, 0x00, 0x00, 0x00])
            self.port.write(test_cmd)
            self.port.flush()
            
            # Wait for response
            time.sleep(0.5)
            if self.port.in_waiting > 0:
                response = self.port.read(self.port.in_waiting)
                logger.debug(f"Device test response: {len(response)} bytes")
                return True
            
            return False
            
        except Exception as e:
            logger.debug(f"Communication test failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from ZK9500 device"""
        # Disconnect ZKFinger SDK connection
        if self.device_handle and self.connection_type == 'zkfinger_sdk':
            try:
                self.zkfinger_sdk.close_device(self.device_handle)
                self.device_handle = None
                logger.info("Disconnected from ZK9500 (ZKFinger SDK)")
            except Exception as e:
                logger.warning(f"Error during ZKFinger SDK disconnect: {e}")
        
        # Disconnect serial connection
        if self.port and self.port.is_open:
            try:
                self.port.close()
                logger.info("Disconnected from ZK9500 (Serial)")
            except Exception as e:
                logger.warning(f"Error during serial disconnect: {e}")
        
        # Disconnect HID connection
        if self.hid_device:
            self.disconnect_hid()
        
        self.device_info['connected'] = False
        self.device_info['connection_type'] = None
        self.connection_type = None
    
    def get_device_info(self):
        """Get device information"""
        try:
            # Send device info command
            info_cmd = bytes([0x01, 0x00, 0x00, 0x00])
            self.port.write(info_cmd)
            self.port.flush()
            
            time.sleep(0.5)
            if self.port.in_waiting > 0:
                response = self.port.read(self.port.in_waiting)
                if len(response) >= 8:
                    try:
                        serial_num = int.from_bytes(response[4:8], 'little', signed=False)
                        self.device_info['serial'] = f"ZK{serial_num}"
                        
                        if len(response) > 8:
                            major = response[8] if len(response) > 8 else 0
                            minor = response[9] if len(response) > 9 else 0
                            self.device_info['firmware'] = f"v{major}.{minor}"
                    except Exception as e:
                        logger.debug(f"Error parsing device info: {e}")
                
        except Exception as e:
            logger.warning(f"Could not get device info: {e}")
    
    def capture_fingerprint(self) -> Dict[str, Any]:
        """Capture fingerprint from ZK9500"""
        try:
            # Check connection
            if not self.device_info['connected']:
                # Try to reconnect
                if not self.connect():
                    return {
                        'success': False,
                        'message': 'Device not connected and reconnection failed'
                    }
            
            logger.info(f"Starting fingerprint capture via {self.connection_type}...")
            
            if self.connection_type == 'usb_hid':
                return self.capture_fingerprint_hid()
            elif self.connection_type == 'serial':
                return self.capture_fingerprint_serial()
            elif self.connection_type == 'zkfinger_sdk':
                return self.capture_fingerprint_zkfinger_sdk()
            else:
                return {
                    'success': False,
                    'message': 'Unknown connection type'
                }
                
        except Exception as e:
            logger.error(f"Fingerprint capture error: {e}")
            # Try to reconnect on error
            self.disconnect()
            return {
                'success': False,
                'message': f'Capture error: {str(e)}'
            }
    
    def capture_fingerprint_serial(self) -> Dict[str, Any]:
        """Capture fingerprint via Serial connection"""
        try:
            # Clear input buffer
            self.port.reset_input_buffer()
            
            # Send capture command
            capture_cmd = bytes([0x02, 0x01, 0x00, 0x00])
            self.port.write(capture_cmd)
            self.port.flush()
            
            # Wait for response
            timeout = float(self.config.get('device', 'scan_timeout', fallback=15))
            start_time = time.time()
            response_data = b''
            
            while time.time() - start_time < timeout:
                if self.port.in_waiting > 0:
                    chunk = self.port.read(self.port.in_waiting)
                    response_data += chunk
                    
                    # Check for sufficient data
                    if len(response_data) >= 8:
                        break
                
                time.sleep(0.1)
            
            if len(response_data) < 4:
                return {
                    'success': False,
                    'message': 'No response from device (timeout)'
                }
            
            # Parse response
            status = response_data[0] if len(response_data) > 0 else 1
            quality = response_data[1] if len(response_data) > 1 else 0
            
            if status == 0:  # Success
                template_data = list(response_data[4:]) if len(response_data) > 4 else []
                
                # Update statistics
                self.device_info['last_scan_time'] = time.time()
                self.device_info['total_scans'] += 1
                
                result = {
                    'success': True,
                    'templateData': template_data,
                    'quality': min(quality, 100),
                    'deviceSerial': self.device_info['serial'],
                    'firmware': self.device_info['firmware'],
                    'resolution': self.device_info['resolution'],
                    'imageSize': f"{len(template_data)} bytes",
                    'captureTime': self.device_info['last_scan_time'],
                    'scanCount': self.device_info['total_scans'],
                    'connectionType': 'serial',
                    'clientInfo': {
                        'hostname': self.device_info['client_hostname'],
                        'tailscale_ip': self.device_info['client_ip']
                    }
                }
                
                logger.info(f"✅ Fingerprint captured via Serial: Quality {quality}%, Size {len(template_data)} bytes")
                return result
            else:
                return {
                    'success': False,
                    'message': f'Capture failed (Status: {status})'
                }
                
        except Exception as e:
            logger.error(f"Serial fingerprint capture error: {e}")
            return {
                'success': False,
                'message': f'Serial capture error: {str(e)}'
            }
    
    def capture_fingerprint_hid(self) -> Dict[str, Any]:
        """Capture fingerprint via USB HID connection"""
        try:
            if not self.hid_device:
                return {
                    'success': False,
                    'message': 'HID device not connected'
                }
            
            # Send capture command via HID
            capture_cmd = [0x02, 0x01, 0x00, 0x00] + [0x00] * 60  # 64-byte packet
            
            if hasattr(self.hid_device, 'write'):
                self.hid_device.write(capture_cmd)
            else:
                return {
                    'success': False,
                    'message': 'HID device does not support write operation'
                }
            
            # Wait for response
            timeout = float(self.config.get('device', 'scan_timeout', fallback=15))
            start_time = time.time()
            response_data = []
            
            while time.time() - start_time < timeout:
                try:
                    if hasattr(self.hid_device, 'read'):
                        chunk = self.hid_device.read(64)
                        if chunk:
                            response_data.extend(chunk)
                            
                            # Check for sufficient data
                            if len(response_data) >= 8:
                                break
                    
                    time.sleep(0.1)
                    
                except Exception as e:
                    logger.debug(f"HID read error: {e}")
                    break
            
            if len(response_data) < 4:
                return {
                    'success': False,
                    'message': 'No response from HID device (timeout)'
                }
            
            # Parse response
            status = response_data[0] if len(response_data) > 0 else 1
            quality = response_data[1] if len(response_data) > 1 else 0
            
            if status == 0:  # Success
                template_data = response_data[4:] if len(response_data) > 4 else []
                
                # Update statistics
                self.device_info['last_scan_time'] = time.time()
                self.device_info['total_scans'] += 1
                
                result = {
                    'success': True,
                    'templateData': template_data,
                    'quality': min(quality, 100),
                    'deviceSerial': self.device_info['serial'],
                    'firmware': self.device_info['firmware'],
                    'resolution': self.device_info['resolution'],
                    'imageSize': f"{len(template_data)} bytes",
                    'captureTime': self.device_info['last_scan_time'],
                    'scanCount': self.device_info['total_scans'],
                    'connectionType': 'usb_hid',
                    'clientInfo': {
                        'hostname': self.device_info['client_hostname'],
                        'tailscale_ip': self.device_info['client_ip']
                    }
                }
                
                logger.info(f"✅ Fingerprint captured via USB HID: Quality {quality}%, Size {len(template_data)} bytes")
                return result
            else:
                return {
                    'success': False,
                    'message': f'HID capture failed (Status: {status})'
                }
                
        except Exception as e:
            logger.error(f"HID fingerprint capture error: {e}")
            return {
                'success': False,
                'message': f'HID capture error: {str(e)}'
            }
    
    def capture_fingerprint_zkfinger_sdk(self) -> Dict[str, Any]:
        """Capture fingerprint via ZKFinger SDK"""
        try:
            if not self.device_handle:
                return {
                    'success': False,
                    'message': 'Device handle not initialized'
                }
            
            # Capture fingerprint
            image_data, template_data = self.zkfinger_sdk.capture_fingerprint(self.device_handle)
            
            if image_data and template_data:
                # Update statistics
                self.device_info['last_scan_time'] = time.time()
                self.device_info['total_scans'] += 1
                
                result = {
                    'success': True,
                    'templateData': template_data,
                    'quality': 100,  # Assuming full quality for SDK capture
                    'deviceSerial': self.device_info['serial'],
                    'firmware': self.device_info['firmware'],
                    'resolution': self.device_info['resolution'],
                    'imageSize': f"{len(template_data)} bytes",
                    'captureTime': self.device_info['last_scan_time'],
                    'scanCount': self.device_info['total_scans'],
                    'connectionType': 'zkfinger_sdk',
                    'clientInfo': {
                        'hostname': self.device_info['client_hostname'],
                        'tailscale_ip': self.device_info['client_ip']
                    }
                }
                
                logger.info(f"✅ Fingerprint captured via ZKFinger SDK: Size {len(template_data)} bytes")
                return result
            else:
                return {
                    'success': False,
                    'message': 'Failed to capture fingerprint'
                }
                
        except Exception as e:
            logger.error(f"ZKFinger SDK fingerprint capture error: {e}")
            return {
                'success': False,
                'message': f'SDK capture error: {str(e)}'
            }

class ZK9500WebSocketServer:
    """WebSocket server for ZK9500 communication"""
    
    def __init__(self, config):
        self.config = config
        self.zkt_controller = ZK9500Controller(config)
        self.server = None
        self.clients = set()
        self.is_running = False
    
    async def handle_client(self, websocket, path):
        """Handle WebSocket client connections"""
        client_address = websocket.remote_address
        self.clients.add(websocket)
        logger.info(f"Client connected: {client_address} (Total: {len(self.clients)})")
        
        try:
            # Send welcome message
            welcome_msg = {
                'type': 'welcome',
                'message': 'ZK9500 Service Connected',
                'server_info': {
                    'hostname': socket.gethostname(),
                    'tailscale_ip': self.zkt_controller.device_info['client_ip'],
                    'service_version': '1.0.0',
                    'device_connected': self.zkt_controller.device_info['connected']
                }
            }
            await websocket.send(json.dumps(welcome_msg))
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    response = await self.handle_command(data)
                    await websocket.send(json.dumps(response))
                    
                except json.JSONDecodeError:
                    error_response = {
                        'success': False,
                        'message': 'Invalid JSON format'
                    }
                    await websocket.send(json.dumps(error_response))
                    
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    error_response = {
                        'success': False,
                        'message': f'Server error: {str(e)}'
                    }
                    await websocket.send(json.dumps(error_response))
        
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {client_address}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            self.clients.discard(websocket)
    
    async def handle_command(self, data):
        """Handle WebSocket commands"""
        command = data.get('command', '')
        
        if command == 'test':
            return {
                'command': 'test',
                'success': True,
                'message': 'ZK9500 Service is running',
                'server_info': {
                    'hostname': socket.gethostname(),
                    'tailscale_ip': self.zkt_controller.device_info['client_ip'],
                    'platform': platform.system(),
                    'connected_clients': len(self.clients)
                },
                'device_info': self.zkt_controller.device_info
            }
        
        elif command == 'connect':
            success = self.zkt_controller.connect()
            return {
                'command': 'connect',
                'success': success,
                'message': 'Connected to ZK9500' if success else 'Failed to connect to ZK9500',
                'device_info': self.zkt_controller.device_info
            }
        
        elif command == 'disconnect':
            self.zkt_controller.disconnect()
            return {
                'command': 'disconnect',
                'success': True,
                'message': 'Disconnected from ZK9500'
            }
        
        elif command == 'capture_fingerprint':
            result = self.zkt_controller.capture_fingerprint()
            return {
                'command': 'capture_fingerprint',
                **result
            }
        
        elif command == 'status':
            return {
                'command': 'status',
                'success': True,
                'device_info': self.zkt_controller.device_info,
                'server_info': {
                    'hostname': socket.gethostname(),
                    'tailscale_ip': self.zkt_controller.device_info['client_ip'],
                    'connected_clients': len(self.clients),
                    'service_uptime': time.time()
                }
            }
        
        else:
            return {
                'command': command,
                'success': False,
                'message': f'Unknown command: {command}'
            }
    
    async def start_server(self):
        """Start WebSocket server"""
        host = self.config.get('server', 'host', fallback='0.0.0.0')
        port = int(self.config.get('server', 'port', fallback=8765))
        
        logger.info(f"Starting WebSocket server on {host}:{port}")
        
        self.server = await websockets.serve(
            self.handle_client,
            host,
            port
        )
        
        self.is_running = True
        logger.info(f"✅ ZK9500 WebSocket Server running on ws://{self.zkt_controller.device_info['client_ip']}:{port}/zk9500")
        
        # Try to connect to device on startup
        if self.zkt_controller.connect():
            logger.info("✅ ZK9500 device connected on startup")
        else:
            logger.warning("⚠️ ZK9500 device not found on startup")
    
    async def stop_server(self):
        """Stop WebSocket server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.is_running = False
            logger.info("WebSocket server stopped")
        
        self.zkt_controller.disconnect()

class ZK9500WindowsService:
    """Windows Service wrapper for ZK9500 Bridge with WebSocket and HTTP API support"""
    
    def __init__(self):
        self.config = self.load_config()
        self.websocket_server = ZK9500WebSocketServer(self.config)
        
        # HTTP API server (optional)
        self.http_server = None
        if HAS_HTTP_API:
            self.http_server = ZK9500HTTPServer(self.websocket_server.zkt_controller, self.config)
            logger.info("✅ HTTP API support enabled")
        else:
            logger.warning("⚠️ HTTP API support disabled (FastAPI not available)")
        
        self.loop = None
        self.stop_event = threading.Event()
    
    def load_config(self):
        """Load configuration from config.ini"""
        config = configparser.ConfigParser()
        config_path = Path(__file__).parent / "config.ini"
        
        if config_path.exists():
            config.read(config_path)
            logger.info(f"Configuration loaded from {config_path}")
        else:
            logger.warning(f"Configuration file not found at {config_path}, using defaults")
        
        return config
    
    def run(self):
        """Main service run method with both WebSocket and HTTP API servers"""
        try:
            logger.info("="*60)
            logger.info("🚀 ZK9500 Service Starting")
            logger.info("="*60)
            
            # Set up asyncio event loop
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            
            # Start both servers concurrently
            self.loop.run_until_complete(self.start_all_servers())
            
        except Exception as e:
            logger.error(f"Service error: {e}")
        finally:
            self.stop()
    
    async def start_all_servers(self):
        """Start WebSocket and HTTP API servers concurrently"""
        tasks = []
        
        # WebSocket server task
        websocket_task = asyncio.create_task(
            self.websocket_server.start_server(),
            name="websocket_server"
        )
        tasks.append(websocket_task)
        
        # HTTP API server task (if available)
        if self.http_server:
            http_task = asyncio.create_task(
                self.http_server.start_server(),
                name="http_api_server"
            )
            tasks.append(http_task)
        
        logger.info("🎯 All servers started successfully!")
        logger.info("Service is running... Press Ctrl+C to stop")
        
        # Wait for all tasks or stop event
        try:
            # Keep running until stop event or tasks complete
            while not self.stop_event.is_set():
                await asyncio.sleep(1)
                
                # Check if any task failed
                for task in tasks:
                    if task.done() and task.exception():
                        logger.error(f"Task {task.get_name()} failed: {task.exception()}")
                        raise task.exception()
                        
        except KeyboardInterrupt:
            logger.info("Service interrupted by user")
        except Exception as e:
            logger.error(f"Server task error: {e}")
        finally:
            # Cancel all tasks
            for task in tasks:
                if not task.done():
                    task.cancel()
                    
            # Wait for tasks to complete
            await asyncio.gather(*tasks, return_exceptions=True)
    
    def stop(self):
        """Stop all services"""
        logger.info("🛑 Stopping ZK9500 Service...")
        
        if self.loop:
            # Stop WebSocket server
            if self.websocket_server.is_running:
                self.loop.run_until_complete(self.websocket_server.stop_server())
            
            # Stop HTTP API server
            if self.http_server:
                self.loop.run_until_complete(self.http_server.stop_server())
        
        self.stop_event.set()
        logger.info("✅ ZK9500 Service stopped")

# Windows Service class (if available)
if HAS_WIN_SERVICE:
    class ZK9500WinService(win32serviceutil.ServiceFramework):
        _svc_name_ = "ZK9500Service"
        _svc_display_name_ = "ZK9500 Fingerprint Scanner Service"
        _svc_description_ = "WebSocket bridge service for ZK9500 fingerprint scanner"
        
        def __init__(self, args):
            win32serviceutil.ServiceFramework.__init__(self, args)
            self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
            self.service = ZK9500WindowsService()
        
        def SvcStop(self):
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
            self.service.stop()
            win32event.SetEvent(self.hWaitStop)
        
        def SvcDoRun(self):
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, '')
            )
            
            try:
                self.service.run()
            except Exception as e:
                servicemanager.LogErrorMsg(f"Service error: {e}")
            
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STOPPED,
                (self._svc_name_, '')
            )

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        if HAS_WIN_SERVICE:
            # Windows Service management
            win32serviceutil.HandleCommandLine(ZK9500WinService)
        else:
            print("Windows Service modules not available")
            sys.exit(1)
    else:
        # Run in console mode
        print("Running in console mode...")
        service = ZK9500WindowsService()
        try:
            service.run()
        except KeyboardInterrupt:
            print("\nService stopped by user")
        except Exception as e:
            print(f"Service error: {e}")

if __name__ == "__main__":
    main() 