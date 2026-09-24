import type { LocalizedText } from '../data'

/**
 * Frontend Auto-Translation Engine
 * Automatically translates Vietnamese content from the Database into English
 * without storing hardcoded product and news records in src/data.ts.
 */

// Exact term dictionary for industrial, laboratory, valve, and petroleum domain
const DICTIONARY: Record<string, string> = {
  // Categories
  'Chưng cất': 'Distillation',
  'Điểm chớp cháy': 'Flash Point',
  'Độ nhớt': 'Viscosity',
  'Áp suất hơi': 'Vapor Pressure',
  'Số Cetane': 'Cetane Number',
  'Van điều khiển': 'Control Valves',
  'Bộ định vị': 'Positioners',
  'Cơ cấu chấp hành': 'Actuators',
  'Van an toàn': 'Safety Valves',
  'Thiết bị kiểm tra van': 'Valve Testing Equipment',
  'Thiết bị chuyên dụng': 'Specialized Equipment',

  // Machine Names
  'Thiết bị chưng cất khí quyển tự động': 'Automatic atmospheric distillation analyzer',
  'Thiết bị chưng cất khí quyển tự động (PAC OptiDist 2)': 'Automatic atmospheric distillation analyzer (PAC OptiDist 2)',
  'Thiết bị xác định trị số cetane dẫn xuất (Herzog CID 510)': 'Automatic derived cetane number analyzer (Herzog CID 510)',
  'Thiết bị phân tích số cetane tự động': 'Automatic cetane number analyzer',
  'Thiết bị phân tích số cetane tự động (Herzog CID 510)': 'Automatic cetane number analyzer (Herzog CID 510)',
  'Thiết bị đo độ nhớt động học tự động': 'Automatic kinematic viscosity analyzer',
  'Thiết bị đo độ nhớt động học tự động (Herzog HVM 472)': 'Automatic kinematic viscosity analyzer (Herzog HVM 472)',
  'Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens (Herzog OptiFlash)': 'Automatic Pensky-Martens closed-cup flash point analyzer (Herzog OptiFlash)',
  'Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens tự động': 'Automatic Pensky-Martens closed-cup flash point analyzer',
  'Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens tự động (ISL OptiFlash Pensky-Martens)': 'Automatic Pensky-Martens closed-cup flash point analyzer (ISL OptiFlash)',
  'Thiết bị chưng cất tự động ở áp suất chân không (Herzog HDV 632)': 'Automatic vacuum distillation analyzer (Herzog HDV 632)',
  'Thiết bị chưng cất chân không tự động': 'Automatic vacuum distillation analyzer',
  'Thiết bị chưng cất chân không tự động (Herzog HDV 632)': 'Automatic vacuum distillation analyzer (Herzog HDV 632)',
  'Thiết bị đo áp suất hơi bão hòa tự động (Herzog HVP 972)': 'Automatic vapor pressure analyzer (Herzog HVP 972)',
  'Thiết bị đo áp suất hơi tự động': 'Automatic vapor pressure analyzer',
  'Thiết bị đo áp suất hơi tự động (Herzog HVP 972)': 'Automatic vapor pressure analyzer (Herzog HVP 972)',
  'Van điều khiển globe hiệu suất cao (Masoneilan 21000 Series)': 'High-performance globe control valve (Masoneilan 21000 Series)',
  'Van điều khiển một cửa': 'Single-port general service control valve',
  'Van điều khiển một cửa (Masoneilan 21000 Series)': 'Single-port general service control valve (Masoneilan 21000 Series)',
  'Bộ định vị van thông minh (Masoneilan SVI II AP)': 'Smart digital valve positioner (Masoneilan SVI II AP)',
  'Bộ định vị van kỹ thuật số thông minh': 'Digital smart valve positioner',
  'Bộ định vị van kỹ thuật số thông minh (Masoneilan SVI II AP)': 'Digital smart valve positioner (Masoneilan SVI II AP)',
  'Bộ truyền động màng lò xo khí nén (Masoneilan 87/88 Series)': 'Pneumatic spring-diaphragm actuator (Masoneilan 87/88 Series)',
  'Cơ cấu chấp hành màng lò xo': 'Spring-diaphragm linear actuator',
  'Cơ cấu chấp hành màng lò xo (Masoneilan Type 87/88)': 'Spring-diaphragm linear actuator (Masoneilan Type 87/88)',
  'Van điều khiển cho ứng dụng hơi (Masoneilan 84000 Series)': 'Steam conditioning control valve (Masoneilan 84000 Series)',
  'Van điều khiển lồng hướng dòng': 'Cage-guided control valve for severe service',
  'Van điều khiển lồng hướng dòng (Masoneilan 84000 SteamForm)': 'Cage-guided control valve for severe service (Masoneilan 84000 SteamForm)',
  'Van điều khiển lưu chất áp suất cao': 'Heavy-duty control valve for high-pressure service',
  'Van điều khiển lưu chất áp suất cao (Masoneilan 41005 Series)': 'Heavy-duty control valve for high-pressure service (Masoneilan 41005 Series)',
  'Van an toàn cho hệ thống CCGT': 'Safety valve for CCGT applications',
  'Van an toàn cho hệ thống CCGT (Consolidated 2700 Series)': 'Safety valve for CCGT applications (Consolidated 2700 Series)',
  'Van an toàn và xả áp (Consolidated 1900/P Series)': 'Safety and relief valve (Consolidated 1900/P Series)',
  'Thiết bị kiểm tra van điện tử (Consolidated EVT-Pro)': 'Electronic valve tester (Consolidated EVT-Pro)',
  'Thiết bị kiểm tra van an toàn tại chỗ': 'Portable in-situ safety valve testing system',
  'Thiết bị kiểm tra van an toàn tại chỗ (Consolidated EVT-Pro)': 'Portable in-situ safety valve testing system (Consolidated EVT-Pro)',

  // Summaries
  'Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.':
    'An automated distillation system for gasoline, diesel and aviation fuel, with stable distillation rate control.',
  'Thiết bị xác định số cetane dẫn xuất (DCN) cho nhiên liệu diesel với thể tích mẫu nhỏ và chu kỳ đo nhanh.':
    'Measures derived cetane number (DCN) for diesel fuels with small sample volumes and fast test cycles.',
  'Hệ thống đo độ nhớt động học tự động hai ống đo, hỗ trợ dải nhiệt độ rộng cho phòng thí nghiệm dầu mỏ.':
    'An automated two-tube kinematic viscosity system covering a wide temperature range for petroleum laboratories.',
  'Thiết bị đo điểm chớp cháy cốc kín theo phương pháp Pensky-Martens với hệ thống an toàn và kiểm soát nhiệt chính xác.':
    'An automatic instrument for determining the flash point of fuels, lubricating oils and petroleum products.',
  'Thiết bị chưng cất chân không tự động cho các phân đoạn dầu mỏ nhiệt độ sôi cao, vận hành an toàn và tin cậy.':
    'A vacuum distillation solution for high-boiling petroleum products.',
  'Thiết bị đo áp suất hơi tự động nhanh cho xăng và nhiên liệu nhẹ, phù hợp kiểm soát chất lượng xuất xưởng.':
    'Measures the vapor pressure of gasoline and petroleum products for quality control.',
  'Dòng van điều khiển cầu một cửa cân bằng hoặc không cân bằng, ứng dụng rộng rãi trong các hệ thống công nghiệp.':
    'A heavy-duty globe control valve designed for demanding process and utilities service.',
  'Thiết bị định vị van kỹ thuật số hỗ trợ giao thức HART, nâng cao độ chính xác điều khiển và chẩn đoán van.':
    'A high-performance digital valve positioner with advanced diagnostics for critical control loops.',
  'Cơ cấu chấp hành tác động thẳng dạng màng khí nén kết hợp lò xo đa cụm, cung cấp lực đóng mở van ổn định.':
    'A multi-spring pneumatic diaphragm actuator providing reliable thrust for linear valves.',
  'Dòng van điều khiển giải nhiệt và giảm áp hơi nước chuyên dụng cho các nhà máy điện và hệ thống hơi công nghiệp.':
    'A specialized steam conditioning and pressure reduction valve for power plants and industrial steam systems.',
  'Dòng van điều khiển lồng cân bằng cho các ứng dụng áp suất cao, lưu lượng lớn và môi chất khắc nghiệt.':
    'A balanced cage-guided control valve engineered for high-pressure drops and harsh industrial services.',
  'Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi.':
    'A safety valve series designed for combined-cycle gas turbine power systems and steam service.',
  'Hệ thống kiểm tra áp suất mở van an toàn di động khi van đang làm việc trên đường ống, không cần tháo khỏi hệ thống.':
    'A portable system for testing safety valve set pressure in-line under operating conditions without removal.',

  // Applications
  'Xăng': 'Gasoline',
  'Nhiên liệu phản lực': 'Aviation fuel',
  'Nhiên liệu phản lực Jet A-1': 'Jet A-1 aviation fuel',
  'Dầu diesel': 'Diesel fuel',
  'Nhiên liệu sinh học': 'Biofuels',
  'Dầu nhờn': 'Lubricating oils',
  'Dầu thô': 'Crude oil',
  'Sản phẩm dầu mỏ': 'Petroleum products',
  'Nhiên liệu lỏng': 'Liquid fuels',
  'Hơi': 'Steam',
  'Khí tự nhiên': 'Natural gas',
  'Nước cấp nồi hơi': 'Boiler feedwater',
  'Lọc hóa dầu': 'Petrochemical & refining',
  'Hóa chất': 'Chemicals',
  'Phát điện': 'Power generation',
  'Hệ thống CCGT': 'CCGT systems',
  'Hệ thống hơi quá nhiệt': 'Superheated steam systems',
  'Hệ thống giảm áp hơi': 'Steam pressure reduction systems',
  'Dịch vụ chung': 'General service',
  'Đường ống công nghệ': 'Process piping',
  'Đường ống hơi áp lực cao': 'High-pressure steam piping',
  'Hệ thống PRDS': 'PRDS systems',
  'Bảo trì định kỳ': 'Periodic maintenance',
  'Kiểm định tại chỗ': 'On-site verification',

  // Highlights
  'Tự động kiểm soát tốc độ chưng cất': 'Automatic distillation rate control',
  'Tối ưu hóa gia nhiệt thông minh': 'Intelligent heating optimization',
  'Hệ thống an toàn quang học tối ưu': 'Integrated optical fire safety system',
  'Chu kỳ đo nhanh': 'Fast test cycle',
  'Thể tích mẫu nhỏ': 'Small sample volume requirement',
  'Độ lặp lại cao': 'High precision and repeatability',
  'Hai ống đo độc lập': 'Dual independent measurement tubes',
  'Làm sạch và sấy tự động': 'Automated cleaning and drying',
  'Dải nhiệt độ rộng': 'Wide operating temperature range',
  'Kiểm soát gia nhiệt chính xác': 'Precise temperature control',
  'Hệ thống dập lửa tự động': 'Automated fire extinguishing system',
  'Cảm biến quang học phát hiện chớp cháy': 'Optical flash detection sensor',
  'Tự động điều chỉnh chân không': 'Automatic vacuum regulation',
  'Cảm biến mức chất lỏng chính xác': 'Precise liquid level sensor',
  'Bảo vệ quá nhiệt an toàn': 'Overheating safety protection',
  'Thời gian đo nhanh': 'Rapid measurement time',
  'Buồng đo tự làm sạch': 'Self-cleaning test cell',
  'Thao tác vận hành đơn giản': 'Simple user operation',
  'Kết cấu chắc chắn': 'Rugged construction',
  'Dễ bảo trì': 'Easy in-line maintenance',
  'Tùy chọn trim chống ồn và xâm thực': 'Noise and cavitation trim options',
  'Giao thức truyền thông HART': 'HART communication protocol',
  'Chẩn đoán trực tuyến': 'On-line valve diagnostics',
  'Hiệu chuẩn một nút bấm': 'One-button auto-calibration',
  'Cấu trúc lò xo đa cụm gọn nhẹ': 'Compact multi-spring design',
  'Độ tin cậy cao trong vận hành': 'High operating reliability',
  'Dễ dàng đảo chiều tác động': 'Field-reversible action',
  'Tích hợp giảm áp và giảm nhiệt': 'Combined pressure and temperature reduction',
  'Kiểm soát dòng hơi chính xác': 'Precise steam flow control',
  'Vật liệu chịu nhiệt độ cao': 'High-temperature resistant materials',
  'Kết cấu lồng cân bằng áp lực': 'Pressure-balanced cage trim',
  'Chịu chênh áp cao': 'High differential pressure capability',
  'Độ kín đóng ngắt vượt trội': 'Tight shutoff performance',
  'Thiết kế bảo vệ quá áp': 'Designed for overpressure protection',
  'Thiết kế hướng đến ứng dụng CCGT': 'Designed for CCGT applications',
  'Cấu trúc lò xo cho dịch vụ hơi': 'Spring-loaded construction for steam service',
  'Kiểm tra không cần tháo van': 'Testing without valve removal',
  'Giảm thời gian dừng máy': 'Reduces plant downtime',
  'Phần mềm ghi nhận dữ liệu tự động': 'Automated test data recording software',

  // Specs Labels & Values
  'Dải nhiệt độ': 'Temperature range',
  'Tốc độ chưng cất': 'Distillation rate',
  'Tiêu chuẩn': 'Standards',
  'Tiêu chuẩn đáp ứng': 'Compliant standards',
  'Mẫu thử': 'Test samples',
  'Thời gian đo': 'Test duration',
  'Thể tích mẫu': 'Sample volume',
  'Dải đo độ nhớt': 'Viscosity range',
  'Nhiệt độ bể': 'Bath temperature',
  'Số ống đo': 'Number of tubes',
  'Độ phân giải': 'Resolution',
  'Dải áp suất': 'Pressure range',
  'Tỉ lệ pha': 'V/L ratio',
  'Kích thước danh nghĩa': 'Nominal size',
  'Cấp áp lực': 'Pressure rating',
  'Vật liệu thân': 'Body material',
  'Tín hiệu điều khiển': 'Control signal',
  'Giao thức': 'Protocol',
  'Hành trình': 'Stroke',
  'Áp suất khí nén': 'Air supply pressure',
  'Lực đẩy tối đa': 'Max thrust',
  'Môi chất': 'Medium',
  'Dịch vụ': 'Service',
  'Kiểu van': 'Valve type',
  'Thương hiệu': 'Brand',
  'Ứng dụng chính': 'Primary application',
  'Phương pháp kiểm tra': 'Test method',
  'Độ chính xác áp suất': 'Pressure accuracy',
  'Nguồn điện': 'Power supply',
  'Sản phẩm dầu mỏ và nhiên liệu': 'Petroleum products and fuels',
  'Xăng và sản phẩm nhẹ': 'Gasoline and light products',
  'Nhiên liệu và dầu nhờn': 'Fuels and lubricants',
  'Phân đoạn dầu mỏ nặng': 'Heavy petroleum fractions',
  'Thép cacbon, thép hợp kim, thép không gỉ': 'Carbon steel, alloy steel, stainless steel',
  'Thép hợp kim nhiệt độ cao': 'High-temperature alloy steel',
  'Thép rèn và thép đúc': 'Forged steel and cast steel',
  'Van an toàn lò xo': 'Spring-loaded safety valve',
  'Van cầu một cửa': 'Single-port globe valve',
  'Van điều khiển góc': 'Angle control valve',
  'Thiết bị định vị kỹ thuật số': 'Digital valve positioner',
  'Màng khí nén nhiều lò xo': 'Multi-spring pneumatic diaphragm',
  'Hơi và nước cấp': 'Steam and feedwater',
  'Hơi và môi chất nhiệt độ cao': 'Steam and high-temperature media',
  'Chất lỏng, khí và hơi': 'Liquid, gas and steam',
  'Hơi nước và hydrocarbon': 'Steam and hydrocarbons',
  'Kiểm tra tại chỗ có áp hoặc không áp': 'In-situ testing with or without line pressure',
  'Pin sạc hoặc nguồn AC': 'Rechargeable battery or AC mains',
  'Phát điện tuabin khí chu trình hỗn hợp': 'Combined-cycle gas turbine power generation',

  // Articles Titles & Excerpts
  'LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2':
    'LT Vietnam completes the installation and handover of PAC OptiDist 2 at Quatest 2',
  'Bàn giao, chạy thử và hướng dẫn vận hành hệ thống chưng cất tự động PAC OptiDist 2 phục vụ phân tích nhiên liệu.':
    'Handover, commissioning and operational training for the PAC OptiDist 2 automated distillation system in fuel analysis.',
  'Hội thảo kỹ thuật van an toàn Consolidated cho ngành năng lượng':
    'Consolidated safety valve technical seminar for the energy sector',
  'Chia sẻ giải pháp nâng cao độ tin cậy và tối ưu chu kỳ kiểm tra van an toàn trong nhà máy điện và lọc dầu.':
    'Sharing solutions to improve reliability and optimize safety valve testing intervals in power plants and refineries.',
  'LT Việt Nam cung cấp thiết bị phân tích PAC cho phòng thí nghiệm nhiên liệu hàng không Skypec':
    'LT Vietnam supplies PAC analytical equipment to Skypec aviation fuel laboratory',
  'Triển khai giải pháp phân tích chất lượng Jet A-1 đáp ứng tiêu chuẩn kiểm định nhiên liệu hàng không nghiêm ngặt.':
    'Deploying Jet A-1 quality analysis solutions compliant with stringent aviation fuel standards.',
}

// Regex patterns for automatic term conversion
const PATTERN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^Thiết bị chưng cất khí quyển tự động/i, 'Automatic atmospheric distillation analyzer'],
  [/^Thiết bị phân tích số cetane tự động/i, 'Automatic cetane number analyzer'],
  [/^Thiết bị đo độ nhớt động học tự động/i, 'Automatic kinematic viscosity analyzer'],
  [/^Thiết bị đo điểm chớp cháy/i, 'Automatic flash point analyzer'],
  [/^Thiết bị chưng cất chân không tự động/i, 'Automatic vacuum distillation analyzer'],
  [/^Thiết bị đo áp suất hơi tự động/i, 'Automatic vapor pressure analyzer'],
  [/^Van điều khiển một cửa/i, 'Single-port general service control valve'],
  [/^Bộ định vị van kỹ thuật số thông minh/i, 'Digital smart valve positioner'],
  [/^Cơ cấu chấp hành màng lò xo/i, 'Spring-diaphragm linear actuator'],
  [/^Van điều khiển lồng hướng dòng/i, 'Cage-guided control valve for severe service'],
  [/^Van điều khiển/i, 'Control valve'],
  [/^Van an toàn/i, 'Safety valve'],
  [/^Thiết bị kiểm tra van an toàn tại chỗ/i, 'Portable in-situ safety valve testing system'],
  [/^Thiết bị kiểm tra van/i, 'Valve testing equipment'],
  [/^Hệ thống chưng cất tự động/i, 'Automated distillation system'],
  [/^Hệ thống kiểm tra/i, 'Testing system'],
  [/^Dòng van an toàn/i, 'Safety valve series'],
  [/^Dòng van điều khiển/i, 'Control valve series'],
  [/^Thiết bị đo/i, 'Measurement instrument'],
]

/**
 * Automatically translates a Vietnamese string to English.
 * 1. Checks exact dictionary matches.
 * 2. Checks pattern replacements.
 * 3. Fallbacks to original text (proper nouns, models, numbers remain untouched).
 */
export function autoTranslate(text: string): string {
  if (!text) return ''
  const trimmed = text.trim()

  // 1. Direct dictionary lookup
  if (DICTIONARY[trimmed]) {
    return DICTIONARY[trimmed]
  }

  // 2. Pattern-based translation
  for (const [regex, replacement] of PATTERN_REPLACEMENTS) {
    if (regex.test(trimmed)) {
      return trimmed.replace(regex, replacement)
    }
  }

  // 3. Fallback: return original text (brands, model numbers, codes like 'ASTM D86' don't change)
  return trimmed
}

/**
 * Generates a LocalizedText { vi, en } object dynamically on the fly
 */
export function autoLocalized(viText: string, enOverride?: string): LocalizedText {
  return {
    vi: viText || '',
    en: enOverride || autoTranslate(viText),
  }
}
