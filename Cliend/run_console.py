#!/usr/bin/env python3
"""
ZK9500 Console Mode Runner
==========================

Run ZK9500 service in console mode for testing and debugging
"""

import asyncio
import signal
import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the service classes
from zk9500_service import ZK9500WindowsService, logger

class ZK9500ConsoleService(ZK9500WindowsService):
    """Console version of ZK9500 service"""
    
    def __init__(self):
        super().__init__()
        self.running = True
    
    def signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully"""
        print(f"\n🛑 Received signal {signum}, shutting down...")
        self.running = False
        self.stop()
    
    async def start_all_servers_console(self):
        """Start WebSocket and HTTP API servers for console mode"""
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
        
        # Wait for all servers to start
        await asyncio.gather(*tasks, return_exceptions=True)
        
        return tasks
    
    def run_console(self):
        """Run service in console mode"""
        try:
            print("="*60)
            print("🚀 ZK9500 Service - Console Mode")
            print("="*60)
            print()
            
            # Set up signal handlers
            signal.signal(signal.SIGINT, self.signal_handler)
            signal.signal(signal.SIGTERM, self.signal_handler)
            
            logger.info("Starting ZK9500 Service in console mode")
            
            # Set up asyncio event loop
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            
            # Start both WebSocket and HTTP API servers
            print("🌐 Starting WebSocket server...")
            print("🌐 Starting HTTP API server...")
            self.loop.run_until_complete(self.start_all_servers_console())
            
            # Get server info
            tailscale_ip = self.websocket_server.zkt_controller.device_info['client_ip']
            ws_port = int(self.config.get('server', 'port', fallback=8765))
            api_port = int(self.config.get('api', 'port', fallback=8080))
            
            print(f"✅ WebSocket server running on ws://{tailscale_ip}:{ws_port}")
            print(f"✅ HTTP API server running on http://{tailscale_ip}:{api_port}")
            print()
            print("📱 ZK9500 Device Status:")
            
            # Try to connect to ZK9500
            if self.websocket_server.zkt_controller.connect():
                device_info = self.websocket_server.zkt_controller.device_info
                print(f"  ✅ Device: Connected ({device_info.get('connection_type', 'unknown')})")
                print(f"  📊 Model: {device_info.get('model', 'unknown')}")
                print(f"  🔢 Serial: {device_info.get('serial', 'unknown')}")
                print(f"  💾 Firmware: {device_info.get('firmware', 'unknown')}")
            else:
                print("  ❌ Device: Not connected")
                print("  💡 Tip: Make sure ZK9500 is plugged in and drivers are installed")
            
            print()
            print("🎯 Ready for connections!")
            print(f"   WebSocket URL: ws://{tailscale_ip}:{ws_port}")
            print(f"   HTTP API URL: http://{tailscale_ip}:{api_port}")
            print()
            print("📝 Logs:")
            print("-" * 40)
            
            # Keep running until stopped
            while self.running:
                try:
                    self.loop.run_until_complete(asyncio.sleep(1))
                except KeyboardInterrupt:
                    break
                except Exception as e:
                    logger.error(f"Error in main loop: {e}")
                    break
            
        except Exception as e:
            logger.error(f"Console service error: {e}")
            print(f"❌ Service error: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources"""
        print("\n🧹 Cleaning up...")
        
        try:
            if self.loop and self.websocket_server.is_running:
                print("  Stopping WebSocket server...")
                self.loop.run_until_complete(self.websocket_server.stop_server())
            
            if self.loop and self.http_server:
                print("  Stopping HTTP API server...")
                self.loop.run_until_complete(self.http_server.stop_server())
            
            if self.loop:
                print("  Closing event loop...")
                self.loop.close()
                
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
        
        print("✅ Console service stopped")

def main():
    """Main entry point"""
    try:
        service = ZK9500ConsoleService()
        service.run_console()
    except KeyboardInterrupt:
        print("\n👋 Service interrupted by user")
    except Exception as e:
        print(f"❌ Service failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 