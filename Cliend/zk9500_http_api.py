#!/usr/bin/env python3
"""
ZK9500 HTTP REST API Server
===========================

HTTP REST API wrapper for ZK9500 fingerprint scanner service
Provides easy-to-use HTTP endpoints for fingerprint operations

Author: Pattani Installment System
Version: 1.0.0
"""

import json
import asyncio
import threading
import logging
import base64
import socket
from typing import Dict, Any, Optional

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

logger = logging.getLogger(__name__)

class FingerprintRequest(BaseModel):
    """Request model for fingerprint operations"""
    timeout: Optional[int] = 30

class ZK9500HTTPServer:
    """HTTP REST API server for ZK9500 service"""
    
    def __init__(self, zk_controller, config):
        self.zk_controller = zk_controller
        self.config = config
        self.server = None
        self.server_task = None
        
        if not HAS_FASTAPI:
            logger.warning("FastAPI not available. HTTP API will not be started.")
            return
            
        self.app = FastAPI(
            title="ZK9500 Fingerprint REST API",
            description="REST API for ZK9500 fingerprint scanner operations",
            version="1.0.0",
            docs_url="/docs",
            redoc_url="/redoc"
        )
        
        # Add CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        self.setup_routes()
        
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/", tags=["Info"])
        async def root():
            """API information and available endpoints"""
            return {
                "service": "ZK9500 Fingerprint REST API",
                "version": "1.0.0",
                "status": "running",
                "tailscale_ip": self.zk_controller.device_info['client_ip'],
                "hostname": self.zk_controller.device_info['client_hostname'],
                "endpoints": {
                    "GET /": "API information",
                    "GET /status": "Get service and device status",
                    "GET /info": "Get detailed device information",
                    "POST /connect": "Connect to ZK9500 device", 
                    "POST /disconnect": "Disconnect from device",
                    "POST /capture": "Capture fingerprint",
                    "GET /test": "Test service connection",
                    "GET /docs": "API documentation (Swagger UI)",
                    "GET /redoc": "API documentation (ReDoc)"
                }
            }
        
        @self.app.get("/status", tags=["Device"])
        async def get_status():
            """Get service and device status"""
            try:
                return {
                    "success": True,
                    "timestamp": self.get_timestamp(),
                    "service_status": "running",
                    "device_info": self.zk_controller.device_info,
                    "connection_type": self.zk_controller.connection_type,
                    "connected": self.zk_controller.device_info['connected'],
                    "last_scan_time": self.zk_controller.device_info.get('last_scan_time'),
                    "total_scans": self.zk_controller.device_info.get('total_scans', 0)
                }
            except Exception as e:
                logger.error(f"Status error: {e}")
                raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")
        
        @self.app.get("/info", tags=["Device"])
        async def get_device_info():
            """Get detailed device information"""
            try:
                device_info = self.zk_controller.get_device_info()
                return {
                    "success": True,
                    "timestamp": self.get_timestamp(),
                    "device_info": device_info,
                    "server_info": {
                        "hostname": socket.gethostname(),
                        "tailscale_ip": self.zk_controller.device_info['client_ip'],
                        "platform": "Windows",
                        "service_version": "1.0.0"
                    }
                }
            except Exception as e:
                logger.error(f"Device info error: {e}")
                raise HTTPException(status_code=500, detail=f"Device info error: {str(e)}")
        
        @self.app.post("/connect", tags=["Device"])
        async def connect_device():
            """Connect to ZK9500 device"""
            try:
                logger.info("API: Attempting to connect to ZK9500 device")
                success = self.zk_controller.connect()
                
                if success:
                    return {
                        "success": True,
                        "timestamp": self.get_timestamp(),
                        "message": "Successfully connected to ZK9500 device",
                        "device_info": self.zk_controller.device_info,
                        "connection_type": self.zk_controller.connection_type
                    }
                else:
                    raise HTTPException(
                        status_code=404, 
                        detail="ZK9500 device not found or connection failed"
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Connect error: {e}")
                raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
        
        @self.app.post("/disconnect", tags=["Device"])
        async def disconnect_device():
            """Disconnect from ZK9500 device"""
            try:
                logger.info("API: Disconnecting from ZK9500 device")
                self.zk_controller.disconnect()
                return {
                    "success": True,
                    "timestamp": self.get_timestamp(),
                    "message": "Successfully disconnected from ZK9500 device"
                }
            except Exception as e:
                logger.error(f"Disconnect error: {e}")
                raise HTTPException(status_code=500, detail=f"Disconnect error: {str(e)}")
        
        @self.app.post("/capture", tags=["Fingerprint"])
        async def capture_fingerprint(request: Optional[FingerprintRequest] = None):
            """Capture fingerprint from ZK9500 device"""
            try:
                # Check if device is connected
                if not self.zk_controller.device_info['connected']:
                    raise HTTPException(
                        status_code=400, 
                        detail="Device not connected. Please connect to ZK9500 device first using POST /connect"
                    )
                
                logger.info("API: Starting fingerprint capture")
                result = self.zk_controller.capture_fingerprint()
                
                if result['success']:
                    # Convert binary data to base64 for JSON response
                    response_data = result.copy()
                    
                    if result.get('fingerprint_data'):
                        response_data['fingerprint_data_base64'] = base64.b64encode(
                            result['fingerprint_data']
                        ).decode('utf-8')
                        response_data['fingerprint_data_length'] = len(result['fingerprint_data'])
                        # Remove binary data from response
                        del response_data['fingerprint_data']
                    
                    if result.get('template_data'):
                        response_data['template_data_base64'] = base64.b64encode(
                            result['template_data']
                        ).decode('utf-8')
                        response_data['template_data_length'] = len(result['template_data'])
                        # Remove binary data from response
                        del response_data['template_data']
                    
                    response_data['timestamp'] = self.get_timestamp()
                    logger.info("API: Fingerprint capture successful")
                    return response_data
                else:
                    logger.warning(f"API: Fingerprint capture failed - {result.get('error', 'Unknown error')}")
                    raise HTTPException(
                        status_code=400,
                        detail=result.get('error', 'Fingerprint capture failed')
                    )
                    
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Capture error: {e}")
                raise HTTPException(status_code=500, detail=f"Capture error: {str(e)}")
        
        @self.app.get("/test", tags=["Info"])
        async def test_connection():
            """Test service connection and health check"""
            try:
                return {
                    "success": True,
                    "timestamp": self.get_timestamp(),
                    "message": "ZK9500 HTTP API is running and healthy",
                    "server_info": {
                        "hostname": socket.gethostname(),
                        "tailscale_ip": self.zk_controller.device_info['client_ip'],
                        "platform": "Windows",
                        "service_version": "1.0.0"
                    },
                    "device_status": {
                        "connected": self.zk_controller.device_info['connected'],
                        "connection_type": self.zk_controller.connection_type,
                        "model": self.zk_controller.device_info.get('model', 'ZK9500'),
                        "total_scans": self.zk_controller.device_info.get('total_scans', 0)
                    }
                }
            except Exception as e:
                logger.error(f"Test error: {e}")
                raise HTTPException(status_code=500, detail=f"Test error: {str(e)}")
        
        @self.app.exception_handler(Exception)
        async def global_exception_handler(request, exc):
            """Global exception handler"""
            logger.error(f"Unhandled exception: {exc}")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Internal server error",
                    "detail": str(exc),
                    "timestamp": self.get_timestamp()
                }
            )
    
    def get_timestamp(self):
        """Get current timestamp"""
        import datetime
        return datetime.datetime.now().isoformat()
    
    async def start_server(self):
        """Start HTTP API server"""
        if not HAS_FASTAPI:
            logger.warning("FastAPI not available. HTTP API server not started.")
            return
            
        host = self.config.get('api', 'host', fallback='0.0.0.0')
        port = int(self.config.get('api', 'port', fallback=8080))
        
        logger.info(f"Starting HTTP API server on {host}:{port}")
        
        config = uvicorn.Config(
            app=self.app,
            host=host,
            port=port,
            log_level="info",
            access_log=True
        )
        
        self.server = uvicorn.Server(config)
        
        logger.info(f"✅ ZK9500 HTTP API running on http://{self.zk_controller.device_info['client_ip']}:{port}")
        logger.info(f"📖 API Documentation available at http://{self.zk_controller.device_info['client_ip']}:{port}/docs")
        
        try:
            await self.server.serve()
        except Exception as e:
            logger.error(f"HTTP server error: {e}")
    
    async def stop_server(self):
        """Stop HTTP API server"""
        if self.server:
            logger.info("Stopping HTTP API server...")
            self.server.should_exit = True
            if self.server_task:
                self.server_task.cancel()
            logger.info("HTTP API server stopped") 