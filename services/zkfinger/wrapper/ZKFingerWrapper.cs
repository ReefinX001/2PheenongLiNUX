
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using libzkfpcsharp;
using System.Runtime.InteropServices;
using System.Text;

namespace ZKFingerWrapper
{
    class Program
    {
        static IntPtr mDevHandle = IntPtr.Zero;
        static IntPtr mDBHandle = IntPtr.Zero;
        static byte[] FPBuffer;
        static byte[] CapTmp = new byte[2048];
        static int cbCapTmp = 2048;
        static int mfpWidth = 0;
        static int mfpHeight = 0;

        static void Main(string[] args)
        {
            if (args.Length < 1)
            {
                Console.WriteLine("ERROR:Missing command");
                return;
            }

            string command = args[0].ToLower();

            try
            {
                switch (command)
                {
                    case "init":
                        InitializeSDK();
                        break;
                    case "connect":
                        ConnectDevice();
                        break;
                    case "scan":
                        ScanFingerprint();
                        break;
                    case "disconnect":
                        DisconnectDevice();
                        break;
                    default:
                        Console.WriteLine("ERROR:Unknown command");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR:{ex.Message}");
            }
        }

        static void InitializeSDK()
        {
            int ret = zkfp2.Init();
            if (ret == zkfperrdef.ZKFP_ERR_OK)
            {
                int deviceCount = zkfp2.GetDeviceCount();
                Console.WriteLine($"SUCCESS:SDK initialized, devices found: {deviceCount}");
            }
            else
            {
                Console.WriteLine($"ERROR:SDK initialization failed, code: {ret}");
            }
        }

        static void ConnectDevice()
        {
            int ret = zkfp2.Init();
            if (ret != zkfperrdef.ZKFP_ERR_OK)
            {
                Console.WriteLine($"ERROR:SDK init failed: {ret}");
                return;
            }

            int deviceCount = zkfp2.GetDeviceCount();
            if (deviceCount == 0)
            {
                Console.WriteLine("ERROR:No devices found");
                return;
            }

            mDevHandle = zkfp2.OpenDevice(0);
            if (mDevHandle == IntPtr.Zero)
            {
                Console.WriteLine("ERROR:Failed to open device");
                return;
            }

            mDBHandle = zkfp2.DBInit();
            if (mDBHandle == IntPtr.Zero)
            {
                Console.WriteLine("ERROR:Failed to initialize database");
                return;
            }

            FPBuffer = new byte[zkfp2.GetCaptureImageSize(mDevHandle)];
            mfpWidth = zkfp2.GetCaptureImageWidth(mDevHandle);
            mfpHeight = zkfp2.GetCaptureImageHeight(mDevHandle);

            Console.WriteLine($"SUCCESS:Device connected, image size: {mfpWidth}x{mfpHeight}");
        }

        static void ScanFingerprint()
        {
            if (mDevHandle == IntPtr.Zero)
            {
                Console.WriteLine("ERROR:Device not connected");
                return;
            }

            Console.WriteLine("INFO:Please place finger on scanner...");

            int ret = zkfp2.AcquireFingerprint(mDevHandle, FPBuffer, CapTmp, ref cbCapTmp);
            if (ret == zkfp.ZKFP_ERR_OK)
            {
                // บันทึกภาพลายนิ้วมือ
                string imagePath = SaveFingerprintImage();

                // แปลง template เป็น Base64
                string templateBase64 = Convert.ToBase64String(CapTmp, 0, cbCapTmp);

                Console.WriteLine($"SUCCESS:Fingerprint captured|ImagePath:{imagePath}|Template:{templateBase64}");
            }
            else
            {
                Console.WriteLine($"ERROR:Failed to capture fingerprint, code: {ret}");
            }
        }

        static string SaveFingerprintImage()
        {
            try
            {
                string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                string fileName = $"fingerprint_{timestamp}.bmp";
                string imagePath = Path.Combine(Environment.CurrentDirectory, "temp", fileName);

                // สร้างโฟลเดอร์ temp ถ้ายังไม่มี
                Directory.CreateDirectory(Path.GetDirectoryName(imagePath));

                // สร้างภาพจาก FPBuffer
                Bitmap bmp = new Bitmap(mfpWidth, mfpHeight, PixelFormat.Format8bppIndexed);

                // ตั้งค่า color palette สำหรับ grayscale
                ColorPalette palette = bmp.Palette;
                for (int i = 0; i < 256; i++)
                {
                    palette.Entries[i] = Color.FromArgb(i, i, i);
                }
                bmp.Palette = palette;

                // Copy pixel data
                BitmapData bmpData = bmp.LockBits(new Rectangle(0, 0, mfpWidth, mfpHeight),
                                                  ImageLockMode.WriteOnly, PixelFormat.Format8bppIndexed);
                Marshal.Copy(FPBuffer, 0, bmpData.Scan0, FPBuffer.Length);
                bmp.UnlockBits(bmpData);

                bmp.Save(imagePath, ImageFormat.Bmp);
                bmp.Dispose();

                return imagePath;
            }
            catch (Exception ex)
            {
                return $"ERROR:Failed to save image - {ex.Message}";
            }
        }

        static void DisconnectDevice()
        {
            if (mDevHandle != IntPtr.Zero)
            {
                zkfp2.CloseDevice(mDevHandle);
                mDevHandle = IntPtr.Zero;
            }

            if (mDBHandle != IntPtr.Zero)
            {
                zkfp2.DBFree(mDBHandle);
                mDBHandle = IntPtr.Zero;
            }

            zkfp2.Terminate();
            Console.WriteLine("SUCCESS:Device disconnected");
        }
    }
}