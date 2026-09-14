async function main() {
  console.log('========================================================');
  console.log('KIỂM TRA KẾT NỐI WEBSITE CHÍNH (FRONTEND) & BACKEND API');
  console.log('========================================================\n');

  let backendOk = false;
  let frontendOk = false;
  let proxyOk = false;
  let corsOk = false;

  // 1. Direct Backend Test
  try {
    const res = await fetch('http://localhost:3000/api');
    const text = await res.text();
    console.log('[1] Backend API trực tiếp (http://localhost:3000/api):');
    console.log(`    Status: ${res.status} ${res.statusText}`);
    console.log(`    Response Body: "${text.trim()}"`);
    if (res.status === 200 && text.includes('Hello World')) {
      backendOk = true;
      console.log('    => KẾT QUẢ: THÀNH CÔNG (Backend đang chạy tốt!)\n');
    }
  } catch (err) {
    console.error('    => LỖI: Không thể kết nối Backend trực tiếp:', err.message, '\n');
  }

  // 2. Direct Frontend Test
  try {
    const res = await fetch('http://localhost:5173/');
    const html = await res.text();
    console.log('[2] Website chính trực tiếp (http://localhost:5173/):');
    console.log(`    Status: ${res.status} ${res.statusText}`);
    console.log(`    HTML length: ${html.length} bytes`);
    if (res.status === 200 && html.includes('<div id="root">')) {
      frontendOk = true;
      console.log('    => KẾT QUẢ: THÀNH CÔNG (Frontend Vite server đang chạy tốt!)\n');
    }
  } catch (err) {
    console.error('    => LỖI: Không thể kết nối Frontend:', err.message, '\n');
  }

  // 3. Reverse Proxy Test (Frontend port 5173 -> Backend port 3000)
  try {
    const res = await fetch('http://localhost:5173/api');
    const text = await res.text();
    console.log('[3] Kiểm tra Reverse Proxy (http://localhost:5173/api -> http://localhost:3000/api):');
    console.log(`    Status: ${res.status} ${res.statusText}`);
    console.log(`    Proxied Response: "${text.trim()}"`);
    if (res.status === 200 && text.includes('Hello World')) {
      proxyOk = true;
      console.log('    => KẾT QUẢ: THÀNH CÔNG (Proxy Vite hoạt động hoàn hảo, frontend gọi /api tự động tới backend!)\n');
    } else {
      console.log('    => KẾT QUẢ: Thất bại hoặc dữ liệu không khớp.\n');
    }
  } catch (err) {
    console.error('    => LỖI Reverse Proxy:', err.message, '\n');
  }

  // 4. CORS Test
  try {
    const res = await fetch('http://localhost:3000/api', {
      headers: { Origin: 'http://localhost:5173' },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    console.log('[4] Kiểm tra CORS Header (Origin: http://localhost:5173):');
    console.log(`    access-control-allow-origin: ${allowOrigin}`);
    if (allowOrigin === '*' || allowOrigin === 'http://localhost:5173') {
      corsOk = true;
      console.log('    => KẾT QUẢ: THÀNH CÔNG (CORS đã bật, cho phép Frontend gọi trực tiếp Backend!)\n');
    }
  } catch (err) {
    console.error('    => LỖI CORS:', err.message, '\n');
  }

  console.log('========================================================');
  console.log('TỔNG KẾT KẾT NỐI:');
  console.log(` - Backend Trực Tiếp: ${backendOk ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
  console.log(` - Website Chính (Vite): ${frontendOk ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
  console.log(` - Vite Reverse Proxy: ${proxyOk ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
  console.log(` - Cấu Hình CORS: ${corsOk ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
  console.log('========================================================');
}

main();
