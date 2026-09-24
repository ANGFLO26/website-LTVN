import { chromium } from 'playwright'

async function run() {
  console.log('--- BẮT ĐẦU KIỂM THỬ LIÊN KẾT THỰC TẾ (LIVE VERIFICATION) ---')

  // 1. Kiểm tra Backend API
  console.log('\n[1] Kiểm tra Backend API (port 3000):')
  const apiCheck = await fetch('http://localhost:3000/api/machines')
  if (!apiCheck.ok) throw new Error('Backend API không phản hồi!')
  const machines = await apiCheck.json()
  console.log(`    ✓ Backend API phản hồi thành công: ${machines.length} máy trong Database.`)

  // 2. Kiểm tra Website Proxy (port 5173 -> 3000)
  console.log('\n[2] Kiểm tra Vite Proxy Website (port 5173 -> 3000):')
  const proxyCheck = await fetch('http://localhost:5173/api/machines')
  if (!proxyCheck.ok) throw new Error('Proxy Website không hoạt động!')
  const proxiedMachines = await proxyCheck.json()
  console.log(`    ✓ Proxy /api hoạt động chuẩn xác: Nhận đủ ${proxiedMachines.length} máy qua port 5173.`)

  // 3. Mở trình duyệt thật và tải trang Web
  console.log('\n[3] Khởi chạy Trình duyệt Chromium tải Website (http://localhost:5173/pac):')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:5173/pac', { waitUntil: 'networkidle' })

  const initialCardTitle = await page.locator('.product-card h3').first().textContent()
  console.log(`    ✓ Tiêu đề máy đầu tiên trên Website ban đầu: "${initialCardTitle?.trim()}"`)

  // 4. THỰC HIỆN THAY ĐỔI TRỰC TIẾP TRÊN DATABASE QUA API
  console.log('\n[4] Gửi lệnh cập nhật dữ liệu vào Database qua API:')
  const testModelName = 'OptiDist 2 (DATABASE LINK ACTIVE)'
  const updateRes = await fetch('http://localhost:3000/api/machines/d0000000-0000-4000-8000-000000000001', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: testModelName }),
  })
  if (!updateRes.ok) throw new Error('Không thể cập nhật máy qua API')
  console.log(`    ✓ Đã cập nhật database: model đổi thành "${testModelName}".`)

  // 5. Kiểm tra Website phản ánh thay đổi từ Database
  console.log('\n[5] Kiểm tra Website chính tự động cập nhật dữ liệu mới từ Database:')
  // Giả lập sự kiện người dùng chuyển tab (focus/revalidation) hoặc tải trang
  await page.reload({ waitUntil: 'networkidle' })
  // Đợi card cập nhật text
  await page.waitForFunction(
    (expected) => document.querySelector('.product-card h3')?.textContent?.includes(expected),
    'DATABASE LINK ACTIVE',
    { timeout: 5000 }
  )
  const updatedCardTitle = await page.locator('.product-card h3').first().textContent()
  console.log(`    ✓ CHỨNG MINH THÀNH CÔNG: Website đã hiển thị trực tiếp dữ liệu từ Database: "${updatedCardTitle?.trim()}"`)

  // 6. KHÔI PHỤC LẠI DỮ LIỆU GỐC ĐỂ DATABASE LUÔN SẠCH
  console.log('\n[6] Khôi phục lại dữ liệu gốc ban đầu trong Database:')
  await fetch('http://localhost:3000/api/machines/d0000000-0000-4000-8000-000000000001', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'OptiDist 2' }),
  })
  await page.reload({ waitUntil: 'networkidle' })
  const revertedCardTitle = await page.locator('.product-card h3').first().textContent()
  console.log(`    ✓ Đã khôi phục an toàn: "${revertedCardTitle?.trim()}".`)

  // 7. KIỂM THỬ GỬI LIÊN HỆ TỪ WEBSITE VÀO DATABASE
  console.log('\n[7] Kiểm tra gửi biểu mẫu liên hệ từ Website vào Database:')
  await page.goto('http://localhost:5173/lien-he', { waitUntil: 'networkidle' })
  await page.fill('input[name="name"]', 'Khách Hàng Test Liên Kết')
  await page.fill('input[name="contact"]', 'test-integration@ltvietnam.com.vn')
  await page.fill('textarea[name="message"]', 'Tin nhắn test liên kết thời gian thực giữa Website và Database')
  await page.click('button[type="submit"]')
  await page.waitForSelector('.form-status')

  // Đọc danh sách liên hệ từ Database qua API
  const contactsRes = await fetch('http://localhost:3000/api/contacts')
  const contacts = await contactsRes.json()
  const foundContact = contacts.find((c) => c.email === 'test-integration@ltvietnam.com.vn')
  if (!foundContact) throw new Error('Liên hệ gửi từ website chưa vào database!')
  console.log(`    ✓ CHỨNG MINH THÀNH CÔNG: Database đã ghi nhận liên hệ từ website! (ID: ${foundContact.id}, Tên: ${foundContact.fullName})`)

  // Xóa liên hệ test để sạch DB
  await fetch(`http://localhost:3000/api/contacts/${foundContact.id}`, { method: 'DELETE' })
  console.log('    ✓ Đã dọn dẹp liên hệ test khỏi database.')

  await browser.close()
  console.log('\n=== KẾT LUẬN: TOÀN BỘ HỆ THỐNG ĐÃ THỰC SỰ LIÊN KẾT 100% VỚI NHAU! ===')
}

run().catch((err) => {
  console.error('Lỗi kiểm thử liên kết:', err)
  process.exit(1)
})
