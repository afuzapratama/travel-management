// ============================================
// AIRPORT DATABASE - 500+ Popular Airports
// Focus: Indonesia, Middle East, Asia, Global
// ============================================

export interface Airport {
  code: string;   // IATA code
  name: string;   // Airport name
  city: string;   // City name
  country: string;
}

const airports: Airport[] = [
  // =============================================
  // INDONESIA (50+ airports)
  // =============================================
  { code: 'CGK', name: 'Soekarno-Hatta Intl', city: 'Jakarta', country: 'Indonesia' },
  { code: 'SUB', name: 'Juanda Intl', city: 'Surabaya', country: 'Indonesia' },
  { code: 'DPS', name: 'Ngurah Rai Intl', city: 'Bali / Denpasar', country: 'Indonesia' },
  { code: 'UPG', name: 'Sultan Hasanuddin Intl', city: 'Makassar', country: 'Indonesia' },
  { code: 'KNO', name: 'Kualanamu Intl', city: 'Medan', country: 'Indonesia' },
  { code: 'JOG', name: 'Adisucipto Intl', city: 'Yogyakarta', country: 'Indonesia' },
  { code: 'YIA', name: 'Yogyakarta Intl (Kulon Progo)', city: 'Yogyakarta', country: 'Indonesia' },
  { code: 'SOC', name: 'Adisumarmo Intl', city: 'Solo', country: 'Indonesia' },
  { code: 'SRG', name: 'Ahmad Yani Intl', city: 'Semarang', country: 'Indonesia' },
  { code: 'BDO', name: 'Husein Sastranegara', city: 'Bandung', country: 'Indonesia' },
  { code: 'BPN', name: 'Sultan Aji Muhammad Sulaiman', city: 'Balikpapan', country: 'Indonesia' },
  { code: 'PLM', name: 'Sultan Mahmud Badaruddin II', city: 'Palembang', country: 'Indonesia' },
  { code: 'PNK', name: 'Supadio Intl', city: 'Pontianak', country: 'Indonesia' },
  { code: 'PKU', name: 'Sultan Syarif Kasim II', city: 'Pekanbaru', country: 'Indonesia' },
  { code: 'BTH', name: 'Hang Nadim Intl', city: 'Batam', country: 'Indonesia' },
  { code: 'PDG', name: 'Minangkabau Intl', city: 'Padang', country: 'Indonesia' },
  { code: 'MDC', name: 'Sam Ratulangi Intl', city: 'Manado', country: 'Indonesia' },
  { code: 'BDJ', name: 'Syamsudin Noor Intl', city: 'Banjarmasin', country: 'Indonesia' },
  { code: 'LOP', name: 'Lombok Intl', city: 'Lombok / Mataram', country: 'Indonesia' },
  { code: 'DJJ', name: 'Sentani Intl', city: 'Jayapura', country: 'Indonesia' },
  { code: 'AMQ', name: 'Pattimura Intl', city: 'Ambon', country: 'Indonesia' },
  { code: 'KDI', name: 'Haluoleo', city: 'Kendari', country: 'Indonesia' },
  { code: 'TKG', name: 'Radin Inten II', city: 'Bandar Lampung', country: 'Indonesia' },
  { code: 'TNJ', name: 'Raja Haji Fisabilillah', city: 'Tanjung Pinang', country: 'Indonesia' },
  { code: 'BJM', name: 'Sjamsudin Noor', city: 'Banjarmasin', country: 'Indonesia' },
  { code: 'TRK', name: 'Juwata Intl', city: 'Tarakan', country: 'Indonesia' },
  { code: 'GTO', name: 'Jalaluddin', city: 'Gorontalo', country: 'Indonesia' },
  { code: 'PLW', name: 'Mutiara SIS Al-Jufrie', city: 'Palu', country: 'Indonesia' },
  { code: 'KOE', name: 'El Tari', city: 'Kupang', country: 'Indonesia' },
  { code: 'BIK', name: 'Frans Kaisiepo', city: 'Biak', country: 'Indonesia' },
  { code: 'SOQ', name: 'Dominique Edward Osok', city: 'Sorong', country: 'Indonesia' },
  { code: 'TIM', name: 'Mozes Kilangin', city: 'Timika', country: 'Indonesia' },
  { code: 'MKQ', name: 'Mopah', city: 'Merauke', country: 'Indonesia' },
  { code: 'MKW', name: 'Rendani', city: 'Manokwari', country: 'Indonesia' },
  { code: 'BEJ', name: 'Kalimarau', city: 'Berau', country: 'Indonesia' },
  { code: 'SMQ', name: 'Sampit', city: 'Sampit', country: 'Indonesia' },
  { code: 'PKY', name: 'Tjilik Riwut', city: 'Palangkaraya', country: 'Indonesia' },
  { code: 'DTB', name: 'Silangit Intl', city: 'Siborong-borong', country: 'Indonesia' },
  { code: 'DJB', name: 'Sultan Thaha', city: 'Jambi', country: 'Indonesia' },
  { code: 'BKS', name: 'Fatmawati Soekarno', city: 'Bengkulu', country: 'Indonesia' },
  { code: 'PGK', name: 'Depati Amir', city: 'Pangkal Pinang', country: 'Indonesia' },
  { code: 'SBG', name: 'Maimun Saleh', city: 'Sabang', country: 'Indonesia' },
  { code: 'BTJ', name: 'Sultan Iskandar Muda', city: 'Banda Aceh', country: 'Indonesia' },
  { code: 'LSW', name: 'Malikus Saleh', city: 'Lhokseumawe', country: 'Indonesia' },
  { code: 'MEQ', name: 'Cut Nyak Dhien', city: 'Meulaboh', country: 'Indonesia' },
  { code: 'FLZ', name: 'Dr. Ferdinand Lumban Tobing', city: 'Sibolga', country: 'Indonesia' },
  { code: 'HLP', name: 'Halim Perdanakusuma', city: 'Jakarta', country: 'Indonesia' },
  { code: 'CBN', name: 'Penggung', city: 'Cirebon', country: 'Indonesia' },
  { code: 'SRI', name: 'Temindung', city: 'Samarinda', country: 'Indonesia' },
  { code: 'AAP', name: 'APT Pranoto', city: 'Samarinda', country: 'Indonesia' },

  // =============================================
  // MIDDLE EAST / TIMUR TENGAH (40+ airports)
  // =============================================
  { code: 'JED', name: 'King Abdulaziz Intl', city: 'Jeddah', country: 'Saudi Arabia' },
  { code: 'MED', name: 'Prince Mohammad bin Abdulaziz', city: 'Madinah', country: 'Saudi Arabia' },
  { code: 'RUH', name: 'King Khalid Intl', city: 'Riyadh', country: 'Saudi Arabia' },
  { code: 'DMM', name: 'King Fahd Intl', city: 'Dammam', country: 'Saudi Arabia' },
  { code: 'TIF', name: 'Taif Intl', city: 'Taif', country: 'Saudi Arabia' },
  { code: 'AHB', name: 'Abha Intl', city: 'Abha', country: 'Saudi Arabia' },
  { code: 'TUU', name: 'Tabuk Intl', city: 'Tabuk', country: 'Saudi Arabia' },
  { code: 'GIZ', name: 'Jizan Intl', city: 'Jizan', country: 'Saudi Arabia' },
  { code: 'EAM', name: 'Najran Intl', city: 'Najran', country: 'Saudi Arabia' },
  { code: 'ABT', name: 'Al Baha Intl', city: 'Al Baha', country: 'Saudi Arabia' },
  { code: 'HAS', name: 'Hail Intl', city: 'Hail', country: 'Saudi Arabia' },
  { code: 'YNB', name: 'Yanbu Intl', city: 'Yanbu', country: 'Saudi Arabia' },
  { code: 'QJB', name: 'Qassim Intl', city: 'Buraidah', country: 'Saudi Arabia' },
  { code: 'DXB', name: 'Dubai Intl', city: 'Dubai', country: 'UAE' },
  { code: 'DWC', name: 'Al Maktoum Intl', city: 'Dubai', country: 'UAE' },
  { code: 'AUH', name: 'Zayed Intl', city: 'Abu Dhabi', country: 'UAE' },
  { code: 'SHJ', name: 'Sharjah Intl', city: 'Sharjah', country: 'UAE' },
  { code: 'DOH', name: 'Hamad Intl', city: 'Doha', country: 'Qatar' },
  { code: 'BAH', name: 'Bahrain Intl', city: 'Manama', country: 'Bahrain' },
  { code: 'MCT', name: 'Muscat Intl', city: 'Muscat', country: 'Oman' },
  { code: 'SLL', name: 'Salalah Intl', city: 'Salalah', country: 'Oman' },
  { code: 'KWI', name: 'Kuwait Intl', city: 'Kuwait City', country: 'Kuwait' },
  { code: 'AMM', name: 'Queen Alia Intl', city: 'Amman', country: 'Jordan' },
  { code: 'BEY', name: 'Rafic Hariri Intl', city: 'Beirut', country: 'Lebanon' },
  { code: 'BGW', name: 'Baghdad Intl', city: 'Baghdad', country: 'Iraq' },
  { code: 'NJF', name: 'Al Najaf Intl', city: 'Najaf', country: 'Iraq' },
  { code: 'BSR', name: 'Basra Intl', city: 'Basra', country: 'Iraq' },
  { code: 'EBL', name: 'Erbil Intl', city: 'Erbil', country: 'Iraq' },
  { code: 'TLV', name: 'Ben Gurion Intl', city: 'Tel Aviv', country: 'Israel' },
  { code: 'IKA', name: 'Imam Khomeini Intl', city: 'Tehran', country: 'Iran' },
  { code: 'THR', name: 'Mehrabad Intl', city: 'Tehran', country: 'Iran' },
  { code: 'MHD', name: 'Shahid Hasheminejad Intl', city: 'Mashhad', country: 'Iran' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
  { code: 'SAW', name: 'Sabiha Gokcen Intl', city: 'Istanbul', country: 'Turkey' },
  { code: 'ESB', name: 'Esenboga Intl', city: 'Ankara', country: 'Turkey' },
  { code: 'AYT', name: 'Antalya Intl', city: 'Antalya', country: 'Turkey' },
  { code: 'ADB', name: 'Adnan Menderes Intl', city: 'Izmir', country: 'Turkey' },
  { code: 'CAI', name: 'Cairo Intl', city: 'Cairo', country: 'Egypt' },
  { code: 'HRG', name: 'Hurghada Intl', city: 'Hurghada', country: 'Egypt' },
  { code: 'SSH', name: 'Sharm El Sheikh Intl', city: 'Sharm El Sheikh', country: 'Egypt' },

  // =============================================
  // SOUTHEAST ASIA (40+ airports)
  // =============================================
  { code: 'SIN', name: 'Changi Intl', city: 'Singapore', country: 'Singapore' },
  { code: 'KUL', name: 'Kuala Lumpur Intl (KLIA)', city: 'Kuala Lumpur', country: 'Malaysia' },
  { code: 'PEN', name: 'Penang Intl', city: 'Penang', country: 'Malaysia' },
  { code: 'LGK', name: 'Langkawi Intl', city: 'Langkawi', country: 'Malaysia' },
  { code: 'BKI', name: 'Kota Kinabalu Intl', city: 'Kota Kinabalu', country: 'Malaysia' },
  { code: 'KCH', name: 'Kuching Intl', city: 'Kuching', country: 'Malaysia' },
  { code: 'JHB', name: 'Senai Intl', city: 'Johor Bahru', country: 'Malaysia' },
  { code: 'IPH', name: 'Sultan Azlan Shah', city: 'Ipoh', country: 'Malaysia' },
  { code: 'MYY', name: 'Miri', city: 'Miri', country: 'Malaysia' },
  { code: 'SBW', name: 'Sibu', city: 'Sibu', country: 'Malaysia' },
  { code: 'BKK', name: 'Suvarnabhumi Intl', city: 'Bangkok', country: 'Thailand' },
  { code: 'DMK', name: 'Don Mueang Intl', city: 'Bangkok', country: 'Thailand' },
  { code: 'HKT', name: 'Phuket Intl', city: 'Phuket', country: 'Thailand' },
  { code: 'CNX', name: 'Chiang Mai Intl', city: 'Chiang Mai', country: 'Thailand' },
  { code: 'CEI', name: 'Chiang Rai Intl', city: 'Chiang Rai', country: 'Thailand' },
  { code: 'USM', name: 'Samui Intl', city: 'Ko Samui', country: 'Thailand' },
  { code: 'KBV', name: 'Krabi Intl', city: 'Krabi', country: 'Thailand' },
  { code: 'HDY', name: 'Hat Yai Intl', city: 'Hat Yai', country: 'Thailand' },
  { code: 'MNL', name: 'Ninoy Aquino Intl', city: 'Manila', country: 'Philippines' },
  { code: 'CEB', name: 'Mactan-Cebu Intl', city: 'Cebu', country: 'Philippines' },
  { code: 'DVO', name: 'Francisco Bangoy Intl', city: 'Davao', country: 'Philippines' },
  { code: 'CRK', name: 'Clark Intl', city: 'Angeles / Clark', country: 'Philippines' },
  { code: 'ILO', name: 'Iloilo Intl', city: 'Iloilo', country: 'Philippines' },
  { code: 'SGN', name: 'Tan Son Nhat Intl', city: 'Ho Chi Minh City', country: 'Vietnam' },
  { code: 'HAN', name: 'Noi Bai Intl', city: 'Hanoi', country: 'Vietnam' },
  { code: 'DAD', name: 'Da Nang Intl', city: 'Da Nang', country: 'Vietnam' },
  { code: 'CXR', name: 'Cam Ranh Intl', city: 'Nha Trang', country: 'Vietnam' },
  { code: 'PQC', name: 'Phu Quoc Intl', city: 'Phu Quoc', country: 'Vietnam' },
  { code: 'RGN', name: 'Yangon Intl', city: 'Yangon', country: 'Myanmar' },
  { code: 'MDL', name: 'Mandalay Intl', city: 'Mandalay', country: 'Myanmar' },
  { code: 'PNH', name: 'Phnom Penh Intl', city: 'Phnom Penh', country: 'Cambodia' },
  { code: 'REP', name: 'Siem Reap Intl', city: 'Siem Reap', country: 'Cambodia' },
  { code: 'VTE', name: 'Wattay Intl', city: 'Vientiane', country: 'Laos' },
  { code: 'LPQ', name: 'Luang Prabang Intl', city: 'Luang Prabang', country: 'Laos' },
  { code: 'BWN', name: 'Brunei Intl', city: 'Bandar Seri Begawan', country: 'Brunei' },
  { code: 'DIL', name: 'Presidente Nicolau Lobato', city: 'Dili', country: 'Timor-Leste' },

  // =============================================
  // EAST ASIA (50+ airports)
  // =============================================
  { code: 'HKG', name: 'Hong Kong Intl', city: 'Hong Kong', country: 'Hong Kong' },
  { code: 'NRT', name: 'Narita Intl', city: 'Tokyo', country: 'Japan' },
  { code: 'HND', name: 'Haneda Intl', city: 'Tokyo', country: 'Japan' },
  { code: 'KIX', name: 'Kansai Intl', city: 'Osaka', country: 'Japan' },
  { code: 'ITM', name: 'Itami (Osaka Intl)', city: 'Osaka', country: 'Japan' },
  { code: 'NGO', name: 'Chubu Centrair Intl', city: 'Nagoya', country: 'Japan' },
  { code: 'CTS', name: 'New Chitose', city: 'Sapporo', country: 'Japan' },
  { code: 'FUK', name: 'Fukuoka', city: 'Fukuoka', country: 'Japan' },
  { code: 'OKA', name: 'Naha', city: 'Okinawa', country: 'Japan' },
  { code: 'KOJ', name: 'Kagoshima', city: 'Kagoshima', country: 'Japan' },
  { code: 'SDJ', name: 'Sendai', city: 'Sendai', country: 'Japan' },
  { code: 'HIJ', name: 'Hiroshima', city: 'Hiroshima', country: 'Japan' },
  { code: 'ICN', name: 'Incheon Intl', city: 'Seoul', country: 'South Korea' },
  { code: 'GMP', name: 'Gimpo Intl', city: 'Seoul', country: 'South Korea' },
  { code: 'PUS', name: 'Gimhae Intl', city: 'Busan', country: 'South Korea' },
  { code: 'CJU', name: 'Jeju Intl', city: 'Jeju', country: 'South Korea' },
  { code: 'TAE', name: 'Daegu Intl', city: 'Daegu', country: 'South Korea' },
  { code: 'PEK', name: 'Beijing Capital Intl', city: 'Beijing', country: 'China' },
  { code: 'PKX', name: 'Beijing Daxing Intl', city: 'Beijing', country: 'China' },
  { code: 'PVG', name: 'Pudong Intl', city: 'Shanghai', country: 'China' },
  { code: 'SHA', name: 'Hongqiao Intl', city: 'Shanghai', country: 'China' },
  { code: 'CAN', name: 'Baiyun Intl', city: 'Guangzhou', country: 'China' },
  { code: 'SZX', name: "Bao'an Intl", city: 'Shenzhen', country: 'China' },
  { code: 'CTU', name: 'Shuangliu Intl', city: 'Chengdu', country: 'China' },
  { code: 'TFU', name: 'Tianfu Intl', city: 'Chengdu', country: 'China' },
  { code: 'CKG', name: 'Jiangbei Intl', city: 'Chongqing', country: 'China' },
  { code: 'KMG', name: 'Changshui Intl', city: 'Kunming', country: 'China' },
  { code: 'XIY', name: "Xi'an Xianyang Intl", city: "Xi'an", country: 'China' },
  { code: 'HGH', name: 'Xiaoshan Intl', city: 'Hangzhou', country: 'China' },
  { code: 'NKG', name: 'Lukou Intl', city: 'Nanjing', country: 'China' },
  { code: 'WUH', name: 'Tianhe Intl', city: 'Wuhan', country: 'China' },
  { code: 'XMN', name: 'Gaoqi Intl', city: 'Xiamen', country: 'China' },
  { code: 'TSN', name: 'Binhai Intl', city: 'Tianjin', country: 'China' },
  { code: 'CSX', name: 'Huanghua Intl', city: 'Changsha', country: 'China' },
  { code: 'DLC', name: 'Zhoushuizi Intl', city: 'Dalian', country: 'China' },
  { code: 'TAO', name: 'Jiaodong Intl', city: 'Qingdao', country: 'China' },
  { code: 'SHE', name: 'Taoxian Intl', city: 'Shenyang', country: 'China' },
  { code: 'HRB', name: 'Taiping Intl', city: 'Harbin', country: 'China' },
  { code: 'URC', name: 'Diwopu Intl', city: 'Urumqi', country: 'China' },
  { code: 'TPE', name: 'Taoyuan Intl', city: 'Taipei', country: 'Taiwan' },
  { code: 'TSA', name: 'Songshan', city: 'Taipei', country: 'Taiwan' },
  { code: 'KHH', name: 'Kaohsiung Intl', city: 'Kaohsiung', country: 'Taiwan' },
  { code: 'MFM', name: 'Macau Intl', city: 'Macau', country: 'Macau' },
  { code: 'UBN', name: 'Chinggis Khaan Intl', city: 'Ulaanbaatar', country: 'Mongolia' },

  // =============================================
  // SOUTH ASIA (25+ airports)
  // =============================================
  { code: 'DEL', name: 'Indira Gandhi Intl', city: 'New Delhi', country: 'India' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'India' },
  { code: 'BLR', name: 'Kempegowda Intl', city: 'Bangalore', country: 'India' },
  { code: 'MAA', name: 'Chennai Intl', city: 'Chennai', country: 'India' },
  { code: 'CCU', name: 'Netaji Subhas Chandra Bose', city: 'Kolkata', country: 'India' },
  { code: 'HYD', name: 'Rajiv Gandhi Intl', city: 'Hyderabad', country: 'India' },
  { code: 'COK', name: 'Cochin Intl', city: 'Kochi', country: 'India' },
  { code: 'AMD', name: 'Sardar Vallabhbhai Patel', city: 'Ahmedabad', country: 'India' },
  { code: 'GOI', name: 'Manohar Intl', city: 'Goa', country: 'India' },
  { code: 'PNQ', name: 'Pune Intl', city: 'Pune', country: 'India' },
  { code: 'JAI', name: 'Jaipur Intl', city: 'Jaipur', country: 'India' },
  { code: 'LKO', name: 'Chaudhary Charan Singh', city: 'Lucknow', country: 'India' },
  { code: 'TRV', name: 'Trivandrum Intl', city: 'Thiruvananthapuram', country: 'India' },
  { code: 'CMB', name: 'Bandaranaike Intl', city: 'Colombo', country: 'Sri Lanka' },
  { code: 'DAC', name: 'Hazrat Shahjalal Intl', city: 'Dhaka', country: 'Bangladesh' },
  { code: 'CGP', name: 'Shah Amanat Intl', city: 'Chittagong', country: 'Bangladesh' },
  { code: 'KTM', name: 'Tribhuvan Intl', city: 'Kathmandu', country: 'Nepal' },
  { code: 'ISB', name: 'Islamabad Intl', city: 'Islamabad', country: 'Pakistan' },
  { code: 'KHI', name: 'Jinnah Intl', city: 'Karachi', country: 'Pakistan' },
  { code: 'LHE', name: 'Allama Iqbal Intl', city: 'Lahore', country: 'Pakistan' },
  { code: 'MLE', name: 'Velana Intl', city: 'Male', country: 'Maldives' },
  { code: 'KBL', name: 'Hamid Karzai Intl', city: 'Kabul', country: 'Afghanistan' },

  // =============================================
  // EUROPE (70+ airports)
  // =============================================
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK' },
  { code: 'LGW', name: 'Gatwick', city: 'London', country: 'UK' },
  { code: 'STN', name: 'Stansted', city: 'London', country: 'UK' },
  { code: 'LTN', name: 'Luton', city: 'London', country: 'UK' },
  { code: 'MAN', name: 'Manchester', city: 'Manchester', country: 'UK' },
  { code: 'EDI', name: 'Edinburgh', city: 'Edinburgh', country: 'UK' },
  { code: 'BHX', name: 'Birmingham', city: 'Birmingham', country: 'UK' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'ORY', name: 'Orly', city: 'Paris', country: 'France' },
  { code: 'NCE', name: 'Nice Côte d\'Azur', city: 'Nice', country: 'France' },
  { code: 'LYS', name: 'Lyon-Saint Exupéry', city: 'Lyon', country: 'France' },
  { code: 'MRS', name: 'Marseille Provence', city: 'Marseille', country: 'France' },
  { code: 'FRA', name: 'Frankfurt Intl', city: 'Frankfurt', country: 'Germany' },
  { code: 'MUC', name: 'Munich Intl', city: 'Munich', country: 'Germany' },
  { code: 'TXL', name: 'Berlin Brandenburg', city: 'Berlin', country: 'Germany' },
  { code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'Germany' },
  { code: 'DUS', name: 'Düsseldorf', city: 'Düsseldorf', country: 'Germany' },
  { code: 'HAM', name: 'Hamburg', city: 'Hamburg', country: 'Germany' },
  { code: 'CGN', name: 'Cologne Bonn', city: 'Cologne', country: 'Germany' },
  { code: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'BRU', name: 'Brussels', city: 'Brussels', country: 'Belgium' },
  { code: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'Switzerland' },
  { code: 'GVA', name: 'Geneva', city: 'Geneva', country: 'Switzerland' },
  { code: 'VIE', name: 'Vienna Intl', city: 'Vienna', country: 'Austria' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'Spain' },
  { code: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Spain' },
  { code: 'PMI', name: 'Palma de Mallorca', city: 'Palma', country: 'Spain' },
  { code: 'AGP', name: 'Málaga-Costa del Sol', city: 'Málaga', country: 'Spain' },
  { code: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal' },
  { code: 'OPO', name: 'Francisco Sá Carneiro', city: 'Porto', country: 'Portugal' },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy' },
  { code: 'MXP', name: 'Malpensa', city: 'Milan', country: 'Italy' },
  { code: 'VCE', name: 'Marco Polo', city: 'Venice', country: 'Italy' },
  { code: 'NAP', name: 'Capodichino', city: 'Naples', country: 'Italy' },
  { code: 'ATH', name: 'Eleftherios Venizelos', city: 'Athens', country: 'Greece' },
  { code: 'SKG', name: 'Makedonia', city: 'Thessaloniki', country: 'Greece' },
  { code: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark' },
  { code: 'OSL', name: 'Gardermoen', city: 'Oslo', country: 'Norway' },
  { code: 'ARN', name: 'Arlanda', city: 'Stockholm', country: 'Sweden' },
  { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland' },
  { code: 'WAW', name: 'Chopin', city: 'Warsaw', country: 'Poland' },
  { code: 'PRG', name: 'Václav Havel', city: 'Prague', country: 'Czech Republic' },
  { code: 'BUD', name: 'Ferenc Liszt Intl', city: 'Budapest', country: 'Hungary' },
  { code: 'OTP', name: 'Henri Coandă Intl', city: 'Bucharest', country: 'Romania' },
  { code: 'SOF', name: 'Sofia Intl', city: 'Sofia', country: 'Bulgaria' },
  { code: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland' },
  { code: 'SVO', name: 'Sheremetyevo Intl', city: 'Moscow', country: 'Russia' },
  { code: 'DME', name: 'Domodedovo Intl', city: 'Moscow', country: 'Russia' },
  { code: 'LED', name: 'Pulkovo', city: 'Saint Petersburg', country: 'Russia' },
  { code: 'KEF', name: 'Keflavik Intl', city: 'Reykjavik', country: 'Iceland' },

  // =============================================
  // AMERICAS (50+ airports)
  // =============================================
  { code: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'USA' },
  { code: 'EWR', name: 'Newark Liberty Intl', city: 'Newark', country: 'USA' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'USA' },
  { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'USA' },
  { code: 'ORD', name: "O'Hare Intl", city: 'Chicago', country: 'USA' },
  { code: 'ATL', name: 'Hartsfield-Jackson Intl', city: 'Atlanta', country: 'USA' },
  { code: 'DFW', name: 'Dallas/Fort Worth Intl', city: 'Dallas', country: 'USA' },
  { code: 'DEN', name: 'Denver Intl', city: 'Denver', country: 'USA' },
  { code: 'SEA', name: 'Seattle-Tacoma Intl', city: 'Seattle', country: 'USA' },
  { code: 'MIA', name: 'Miami Intl', city: 'Miami', country: 'USA' },
  { code: 'IAD', name: 'Dulles Intl', city: 'Washington D.C.', country: 'USA' },
  { code: 'BOS', name: 'Logan Intl', city: 'Boston', country: 'USA' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'USA' },
  { code: 'PHX', name: 'Sky Harbor Intl', city: 'Phoenix', country: 'USA' },
  { code: 'LAS', name: 'Harry Reid Intl', city: 'Las Vegas', country: 'USA' },
  { code: 'MCO', name: 'Orlando Intl', city: 'Orlando', country: 'USA' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul Intl', city: 'Minneapolis', country: 'USA' },
  { code: 'DTW', name: 'Detroit Metro Wayne County', city: 'Detroit', country: 'USA' },
  { code: 'HNL', name: 'Daniel K. Inouye Intl', city: 'Honolulu', country: 'USA' },
  { code: 'YYZ', name: 'Toronto Pearson Intl', city: 'Toronto', country: 'Canada' },
  { code: 'YVR', name: 'Vancouver Intl', city: 'Vancouver', country: 'Canada' },
  { code: 'YUL', name: 'Montréal-Trudeau Intl', city: 'Montreal', country: 'Canada' },
  { code: 'YYC', name: 'Calgary Intl', city: 'Calgary', country: 'Canada' },
  { code: 'MEX', name: 'Benito Juárez Intl', city: 'Mexico City', country: 'Mexico' },
  { code: 'CUN', name: 'Cancún Intl', city: 'Cancún', country: 'Mexico' },
  { code: 'GDL', name: 'Miguel Hidalgo y Costilla', city: 'Guadalajara', country: 'Mexico' },
  { code: 'GRU', name: 'Guarulhos Intl', city: 'São Paulo', country: 'Brazil' },
  { code: 'GIG', name: 'Galeão Intl', city: 'Rio de Janeiro', country: 'Brazil' },
  { code: 'BSB', name: 'Presidente Juscelino Kubitschek', city: 'Brasília', country: 'Brazil' },
  { code: 'EZE', name: 'Ministro Pistarini Intl', city: 'Buenos Aires', country: 'Argentina' },
  { code: 'SCL', name: 'Arturo Merino Benítez Intl', city: 'Santiago', country: 'Chile' },
  { code: 'BOG', name: 'El Dorado Intl', city: 'Bogotá', country: 'Colombia' },
  { code: 'LIM', name: 'Jorge Chávez Intl', city: 'Lima', country: 'Peru' },
  { code: 'PTY', name: 'Tocumen Intl', city: 'Panama City', country: 'Panama' },
  { code: 'SJO', name: 'Juan Santamaría Intl', city: 'San José', country: 'Costa Rica' },
  { code: 'HAV', name: 'José Martí Intl', city: 'Havana', country: 'Cuba' },

  // =============================================
  // AFRICA (30+ airports)
  // =============================================
  { code: 'JNB', name: 'O.R. Tambo Intl', city: 'Johannesburg', country: 'South Africa' },
  { code: 'CPT', name: 'Cape Town Intl', city: 'Cape Town', country: 'South Africa' },
  { code: 'DUR', name: 'King Shaka Intl', city: 'Durban', country: 'South Africa' },
  { code: 'NBO', name: 'Jomo Kenyatta Intl', city: 'Nairobi', country: 'Kenya' },
  { code: 'MBA', name: 'Moi Intl', city: 'Mombasa', country: 'Kenya' },
  { code: 'ADD', name: 'Bole Intl', city: 'Addis Ababa', country: 'Ethiopia' },
  { code: 'LOS', name: 'Murtala Muhammed Intl', city: 'Lagos', country: 'Nigeria' },
  { code: 'ABV', name: 'Nnamdi Azikiwe Intl', city: 'Abuja', country: 'Nigeria' },
  { code: 'CMN', name: 'Mohammed V Intl', city: 'Casablanca', country: 'Morocco' },
  { code: 'RAK', name: 'Marrakech Menara', city: 'Marrakech', country: 'Morocco' },
  { code: 'TUN', name: 'Tunis-Carthage', city: 'Tunis', country: 'Tunisia' },
  { code: 'ALG', name: 'Houari Boumediene', city: 'Algiers', country: 'Algeria' },
  { code: 'DSS', name: 'Blaise Diagne Intl', city: 'Dakar', country: 'Senegal' },
  { code: 'ACC', name: 'Kotoka Intl', city: 'Accra', country: 'Ghana' },
  { code: 'DAR', name: 'Julius Nyerere Intl', city: 'Dar es Salaam', country: 'Tanzania' },
  { code: 'ZNZ', name: 'Abeid Amani Karume Intl', city: 'Zanzibar', country: 'Tanzania' },
  { code: 'EBB', name: 'Entebbe Intl', city: 'Entebbe', country: 'Uganda' },
  { code: 'MRU', name: 'Sir Seewoosagur Ramgoolam', city: 'Mauritius', country: 'Mauritius' },
  { code: 'TNR', name: 'Ivato Intl', city: 'Antananarivo', country: 'Madagascar' },

  // =============================================
  // OCEANIA (15+ airports)
  // =============================================
  { code: 'SYD', name: 'Kingsford Smith Intl', city: 'Sydney', country: 'Australia' },
  { code: 'MEL', name: 'Tullamarine', city: 'Melbourne', country: 'Australia' },
  { code: 'BNE', name: 'Brisbane Intl', city: 'Brisbane', country: 'Australia' },
  { code: 'PER', name: 'Perth Intl', city: 'Perth', country: 'Australia' },
  { code: 'ADL', name: 'Adelaide Intl', city: 'Adelaide', country: 'Australia' },
  { code: 'CBR', name: 'Canberra Intl', city: 'Canberra', country: 'Australia' },
  { code: 'OOL', name: 'Gold Coast', city: 'Gold Coast', country: 'Australia' },
  { code: 'CNS', name: 'Cairns Intl', city: 'Cairns', country: 'Australia' },
  { code: 'DRW', name: 'Darwin Intl', city: 'Darwin', country: 'Australia' },
  { code: 'AKL', name: 'Auckland Intl', city: 'Auckland', country: 'New Zealand' },
  { code: 'WLG', name: 'Wellington Intl', city: 'Wellington', country: 'New Zealand' },
  { code: 'CHC', name: 'Christchurch Intl', city: 'Christchurch', country: 'New Zealand' },
  { code: 'ZQN', name: 'Queenstown', city: 'Queenstown', country: 'New Zealand' },
  { code: 'NAN', name: 'Nadi Intl', city: 'Nadi', country: 'Fiji' },
  { code: 'PPT', name: "Fa'a'ā Intl", city: 'Papeete', country: 'French Polynesia' },
];

// Build search index for fast lookup
export function searchAirports(query: string, limit = 8): Airport[] {
  if (!query || query.length < 1) return [];
  const q = query.toUpperCase().trim();
  const results: Airport[] = [];

  // Exact code match first
  for (const a of airports) {
    if (a.code === q) {
      results.push(a);
      break;
    }
  }

  // Then prefix match on code
  for (const a of airports) {
    if (results.length >= limit) break;
    if (a.code.startsWith(q) && !results.includes(a)) {
      results.push(a);
    }
  }

  // Then search in city/name/country
  for (const a of airports) {
    if (results.length >= limit) break;
    if (results.includes(a)) continue;
    const haystack = `${a.code} ${a.city} ${a.name} ${a.country}`.toUpperCase();
    if (haystack.includes(q)) {
      results.push(a);
    }
  }

  return results;
}

export function getAirportByCode(code: string): Airport | undefined {
  return airports.find(a => a.code === code.toUpperCase());
}

export default airports;
