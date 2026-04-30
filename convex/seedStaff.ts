// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Staff data from: Staff And Sales Team Salary - Final - Kamal.xlsx ────────

const WORKING: any[] = [
  { employeeCode: "304", nameAr: "Khaled Abdel Hamed M. Ismail", nameEn: "Khaled Abdel Hamed M. Ismail", nationalId: "27381802396", qidExpiryDate: "2026-12-17", sponsorshipStatus: "Outside/Gloria Hotel", nationality: "Egypt", hireDate: "2026-01-27", departmentKey: "OFFICE", designationName: "CEO", basicSalary: 10000,  status: "active" },
  { employeeCode: "210", nameAr: "Mohamed Gamal", nameEn: "Mohamed Gamal", nationalId: "29881802315", qidExpiryDate: "2026-11-24", sponsorshipStatus: "Outside", nationality: "Egypt", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "PRO", basicSalary: 5500,  status: "active" },
  { employeeCode: "216", nameAr: "Bernal Lota", nameEn: "Bernal Lota", nationalId: "28860801389", qidExpiryDate: "2026-10-08", sponsorshipStatus: "Outside", nationality: "Philippines", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Operation Manager", basicSalary: 5000,  status: "active" },
  { employeeCode: "212", nameAr: "Rizwan Althaf", nameEn: "Rizwan Althaf", nationalId: "29935620503", qidExpiryDate: "2026-12-19", sponsorshipStatus: "Outside/PETRO FOAM", nationality: "India", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Sales Coordinator", basicSalary: 2000, otherAllowance: 1000, status: "active" },
  { employeeCode: "276", nameAr: "Muhammad Shahidul Alam", nameEn: "Muhammad Shahidul Alam", nationalId: "28105007330", qidExpiryDate: "2026-06-25", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Accountant", basicSalary: 3000, otherAllowance: 500, status: "active" },
  { employeeCode: "279", nameAr: "Mohammed Akbar Ali", nameEn: "Mohammed Akbar Ali", nationalId: "27605011422", qidExpiryDate: "2026-06-09", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Data Entry", basicSalary: 2500,  status: "active" },
  { employeeCode: "306", nameAr: "Gaurav Kumar Umesh", nameEn: "Gaurav Kumar Umesh", nationalId: "29235627769", qidExpiryDate: "2026-10-09", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2026-02-04", departmentKey: "OFFICE", designationName: "Production Manager", basicSalary: 2000,  status: "active" },
  { employeeCode: "215", nameAr: "Lamin Tunkara", nameEn: "Lamin Tunkara", nationalId: "29227000152", qidExpiryDate: "2026-05-23", sponsorshipStatus: "Outside", nationality: "Gambia", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Security", basicSalary: 1500, otherAllowance: 600, status: "active" },
  { employeeCode: "291", nameAr: "Mohammed Sahab Uddin", nameEn: "Mohammed Sahab Uddin", nationalId: "28805035699", qidExpiryDate: "2026-04-18", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-09-13", departmentKey: "OFFICE", designationName: "Maintenance", basicSalary: 2000, otherAllowance: 500, status: "active" },
  { employeeCode: "280", nameAr: "Azam Rahman Mohammad", nameEn: "Azam Rahman Mohammad", nationalId: "29335601196", qidExpiryDate: "2026-12-06", sponsorshipStatus: "Outside/PETRO FOAM", nationality: "India", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Messenger", basicSalary: 500,  status: "active" },
  { employeeCode: "214", nameAr: "Yaseen Ali Baig", nameEn: "Yaseen Ali Baig", nationalId: "28835617128", qidExpiryDate: "2026-05-31", sponsorshipStatus: "Outside/Sheikh Mansour", nationality: "India", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Driver", basicSalary: 1600, otherAllowance: 1900, status: "active" },
  { employeeCode: "307", nameAr: "Ailyn Robelles Corocoto", nameEn: "Ailyn Robelles Corocoto", nationalId: "27960807431", qidExpiryDate: "2026-11-13", sponsorshipStatus: "Outside", nationality: "Philippines", hireDate: "2026-03-25", departmentKey: "OFFICE", designationName: "Sales Supervisor", basicSalary: 2500, otherAllowance: 1500, status: "active" },
  { employeeCode: "308", nameAr: "Saylito Almodiel", nameEn: "Saylito Almodiel", nationalId: "28860809285", qidExpiryDate: "2026-12-31", sponsorshipStatus: "Outside", nationality: "Philippines", hireDate: "2026-04-01", departmentKey: "OFFICE", designationName: "Facility Supervisor", basicSalary: 2000, otherAllowance: 2000, status: "active" },
  { employeeCode: "217", nameAr: "Mathew Joseph", nameEn: "Mathew Joseph", nationalId: "26935619216", qidExpiryDate: "2026-07-27", sponsorshipStatus: "Outside/Mansour Suites", nationality: "India", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Sales Supervisor", basicSalary: 4000, otherAllowance: 500, status: "active" },
  { employeeCode: "219", nameAr: "Jaya Prakash", nameEn: "Jaya Prakash", nationalId: "27935613139", qidExpiryDate: "2026-07-19", sponsorshipStatus: "Arirang Bakery", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "220", nameAr: "Mohamad Alam Mohamad Fazlu", nameEn: "Mohamad Alam Mohamad Fazlu", nationalId: "27505000103", qidExpiryDate: "2026-12-03", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "222", nameAr: "Abdul Jabbar", nameEn: "Abdul Jabbar", nationalId: "27735619023", qidExpiryDate: "2026-07-19", sponsorshipStatus: "Arirang Bakery", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "223", nameAr: "Farook Mattola Valappil", nameEn: "Farook Mattola Valappil", nationalId: "27535606213", qidExpiryDate: "2026-02-24", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "224", nameAr: "Abdulla Al Mamun Abul", nameEn: "Abdulla Al Mamun Abul", nationalId: "28805015058", qidExpiryDate: "2026-11-02", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 950, status: "active" },
  { employeeCode: "225", nameAr: "Ajmal Chittuparambil Ali", nameEn: "Ajmal Chittuparambil Ali", nationalId: "28935615075", qidExpiryDate: "2026-06-03", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "226", nameAr: "Abdula Nizar Ellikkal Punnakkal", nameEn: "Abdula Nizar Ellikkal Punnakkal", nationalId: "27335622707", qidExpiryDate: "2026-03-12", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "278", nameAr: "Ashok Baby Kochakkan", nameEn: "Ashok Baby Kochakkan", nationalId: "26935604566", qidExpiryDate: "2026-06-29", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-02-12", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "283", nameAr: "Hameed", nameEn: "Hameed", nationalId: "28035653878", qidExpiryDate: "2026-03-26", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-08-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "active" },
  { employeeCode: "293", nameAr: "Sainudheen Arackal Moideen", nameEn: "Sainudheen Arackal Moideen", nationalId: "27135632420", qidExpiryDate: "2026-11-28", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-09-17", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1500, otherAllowance: 1500, status: "active" },
  { employeeCode: "294", nameAr: "Mushthaque Kunnumkai Puthiyapurayil", nameEn: "Mushthaque Kunnumkai Puthiyapurayil", nationalId: "30135605594", qidExpiryDate: "2026-01-03", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-09-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1500, otherAllowance: 1000, status: "active" },
  { employeeCode: "295", nameAr: "Muhammad Rafeek Angekkara", nameEn: "Muhammad Rafeek Angekkara", nationalId: "28935630705", qidExpiryDate: "2026-03-31", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-09-15", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1500, otherAllowance: 1500, status: "active" },
  { employeeCode: "300", nameAr: "Badusha Kunjimarakkar", nameEn: "Badusha Kunjimarakkar", nationalId: "27735617372", qidExpiryDate: "2027-01-24", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2026-01-14", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1250, otherAllowance: 1250, status: "active" },
  { employeeCode: "233", nameAr: "Hamsa Arathuvalappil Ummer", nameEn: "Hamsa Arathuvalappil Ummer", nationalId: "30135611516", qidExpiryDate: "2026-06-19", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2026-01-02", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 950, status: "active" },
  { employeeCode: "229", nameAr: "Mohamed Thajideen Khotar Bava", nameEn: "Mohamed Thajideen Khotar Bava", nationalId: "30235609927", qidExpiryDate: "2026-09-29", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Merchandiser", basicSalary: 1300, otherAllowance: 400, status: "active" },
  { employeeCode: "231", nameAr: "Md Masud Rana", nameEn: "Md Masud Rana", nationalId: "29805010038", qidExpiryDate: "2026-12-20", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Merchandiser", basicSalary: 1300, otherAllowance: 400, status: "active" },
  { employeeCode: "232", nameAr: "Habibur Rahman Kala", nameEn: "Habibur Rahman Kala", nationalId: "26505003115", qidExpiryDate: "2026-09-12", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Merchandiser", basicSalary: 1300, otherAllowance: 400, status: "active" },
  { employeeCode: "302", nameAr: "Ibrahim Ali", nameEn: "Ibrahim Ali", nationalId: "28805044084", qidExpiryDate: "2027-01-06", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2026-01-17", departmentKey: "SALES TEAM", designationName: "Merchandiser", basicSalary: 1000, otherAllowance: 700, status: "active" },
  { employeeCode: "234", nameAr: "Shadulla Fazlulkarim", nameEn: "Shadulla Fazlulkarim", nationalId: "26805001294", qidExpiryDate: "2027-01-13", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1700, otherAllowance: 400, status: "active" },
  { employeeCode: "236", nameAr: "Ajima Miya", nameEn: "Ajima Miya", nationalId: "27952403214", qidExpiryDate: "2027-01-13", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1300, otherAllowance: 600, status: "active" },
  { employeeCode: "237", nameAr: "Sivaruban Pakiyarasa Velaachchi", nameEn: "Sivaruban Pakiyarasa Velaachchi", nationalId: "28714407637", qidExpiryDate: "2026-07-09", sponsorshipStatus: "Arirang Bakery", nationality: "Sri Lanka", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1300, otherAllowance: 300, status: "active" },
  { employeeCode: "238", nameAr: "Kaushar Alli", nameEn: "Kaushar Alli", nationalId: "28835675582", qidExpiryDate: "2026-12-19", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-05-30", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1200, otherAllowance: 300, status: "active" },
  { employeeCode: "239", nameAr: "Seti Ram Thapa Magar", nameEn: "Seti Ram Thapa Magar", nationalId: "29952410202", qidExpiryDate: "2027-02-16", sponsorshipStatus: "Arirang Bakery", nationality: "Nepal", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1400, otherAllowance: 450, status: "active" },
  { employeeCode: "241", nameAr: "Salak Miah Mustofa Miah", nameEn: "Salak Miah Mustofa Miah", nationalId: "29405001751", qidExpiryDate: "2026-12-07", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1300, otherAllowance: 600, status: "active" },
  { employeeCode: "242", nameAr: "Gobinda Thapa", nameEn: "Gobinda Thapa", nationalId: "28652454189", qidExpiryDate: "2027-02-16", sponsorshipStatus: "Arirang Bakery", nationality: "Nepal", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1200, otherAllowance: 300, status: "active" },
  { employeeCode: "243", nameAr: "Subol Mollik", nameEn: "Subol Mollik", nationalId: "29405012923", qidExpiryDate: "2026-03-09", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1200, otherAllowance: 300, status: "active" },
  { employeeCode: "244", nameAr: "Mahamudul Hasan Khan Abdulhai Khan", nameEn: "Mahamudul Hasan Khan Abdulhai Khan", nationalId: "29605000307", qidExpiryDate: "2026-12-06", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1300, otherAllowance: 450, status: "active" },
  { employeeCode: "245", nameAr: "Md Shah Alom", nameEn: "Md Shah Alom", nationalId: "29505015891", qidExpiryDate: "2026-12-25", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1300, otherAllowance: 400, status: "active" },
  { employeeCode: "246", nameAr: "Dinesh Gurung", nameEn: "Dinesh Gurung", nationalId: "29752414122", qidExpiryDate: "2026-03-19", sponsorshipStatus: "Arirang Bakery", nationality: "Nepal", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1250, otherAllowance: 300, status: "active" },
  { employeeCode: "247", nameAr: "Md Rijon Miah", nameEn: "Md Rijon Miah", nationalId: "29605007755", qidExpiryDate: "2026-04-25", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-04-20", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1200, otherAllowance: 300, status: "active" },
  { employeeCode: "248", nameAr: "Mohammad Mushahid", nameEn: "Mohammad Mushahid", nationalId: "28705032143", qidExpiryDate: "2026-03-08", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1200, otherAllowance: 300, status: "active" },
  { employeeCode: "249", nameAr: "Ismtullah Mohammad Moinuddin Ansari", nameEn: "Ismtullah Mohammad Moinuddin Ansari", nationalId: "29235620388", qidExpiryDate: "2026-05-22", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1200, otherAllowance: 300, status: "active" },
  { employeeCode: "251", nameAr: "Salahaddin Dhobi", nameEn: "Salahaddin Dhobi", nationalId: "29252401649", qidExpiryDate: "2026-05-12", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "260", nameAr: "Md Suhel Miah", nameEn: "Md Suhel Miah", nationalId: "29005032618", qidExpiryDate: "2026-03-07", sponsorshipStatus: "Arirang Bakery", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1150, otherAllowance: 300, status: "active" },
  { employeeCode: "253", nameAr: "Mohammad Minhaj Alam Hazi Izhar", nameEn: "Mohammad Minhaj Alam Hazi Izhar", nationalId: "30435604989", qidExpiryDate: "2027-01-09", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "254", nameAr: "Amrit Pasad Mandal", nameEn: "Amrit Pasad Mandal", nationalId: "28652456308", qidExpiryDate: "2026-06-20", sponsorshipStatus: "Outside", nationality: "Nepal", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "255", nameAr: "Md Kalam", nameEn: "Md Kalam", nationalId: "30252404540", qidExpiryDate: "2026-05-16", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "256", nameAr: "Ram Sandesh Kumar Yadav", nameEn: "Ram Sandesh Kumar Yadav", nationalId: "30152413508", qidExpiryDate: "2026-12-11", sponsorshipStatus: "Outside", nationality: "Nepal", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "259", nameAr: "Sayem Sheakh Dalim Sheakh", nameEn: "Sayem Sheakh Dalim Sheakh", nationalId: "30105003110", qidExpiryDate: "2026-06-30", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "261", nameAr: "Mohammad Ibrahim Khalil", nameEn: "Mohammad Ibrahim Khalil", nationalId: "29505018001", qidExpiryDate: "2027-11-18", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "263", nameAr: "Md Shilpu Miah Ejaj Ullah", nameEn: "Md Shilpu Miah Ejaj Ullah", nationalId: "30205007297", qidExpiryDate: "2026-04-12", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "266", nameAr: "Raju Mukhia Bin", nameEn: "Raju Mukhia Bin", nationalId: "29152433397", qidExpiryDate: "2026-11-05", sponsorshipStatus: "Outside", nationality: "Nepal", hireDate: "2025-05-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "267", nameAr: "Md Arif Ahommed Abu Taher", nameEn: "Md Arif Ahommed Abu Taher", nationalId: "29305029388", qidExpiryDate: "2026-06-08", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "268", nameAr: "Sha Alam Abdur Rahim", nameEn: "Sha Alam Abdur Rahim", nationalId: "29905010554", qidExpiryDate: "2026-06-28", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "269", nameAr: "Md Mehedi Hasan", nameEn: "Md Mehedi Hasan", nationalId: "30005010804", qidExpiryDate: "2026-06-28", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "270", nameAr: "Sagor Miah Md Rafiq Miah", nameEn: "Sagor Miah Md Rafiq Miah", nationalId: "29805011901", qidExpiryDate: "2026-06-28", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "273", nameAr: "Haruna Jaiteh", nameEn: "Haruna Jaiteh", nationalId: "29127000162", qidExpiryDate: "2026-09-16", sponsorshipStatus: "Outside", nationality: "Gambia", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "274", nameAr: "Md Aslam Ansari", nameEn: "Md Aslam Ansari", nationalId: "30452405082", qidExpiryDate: "2026-11-20", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "284", nameAr: "Junayed Ahmed Rusmat Ali", nameEn: "Junayed Ahmed Rusmat Ali", nationalId: "28605030204", qidExpiryDate: "2026-12-30", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-01-09", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "286", nameAr: "Md Awolad Miah", nameEn: "Md Awolad Miah", nationalId: "30305006175", qidExpiryDate: "2027-01-16", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-09-02", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "287", nameAr: "Nohammed Faruque Ahmad", nameEn: "Nohammed Faruque Ahmad", nationalId: "28505040126", qidExpiryDate: "2026-08-16", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-09-05", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "288", nameAr: "Md Jomir Iah", nameEn: "Md Jomir Iah", nationalId: "28505038211", qidExpiryDate: "2026-06-08", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-09-05", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "289", nameAr: "Mohammad Mosfiqul Kabir Tamim", nameEn: "Mohammad Mosfiqul Kabir Tamim", nationalId: "30305014361", qidExpiryDate: "2026-05-18", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2025-09-05", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "290", nameAr: "Ajanthan Kopalaretnam", nameEn: "Ajanthan Kopalaretnam", nationalId: "29614410097", qidExpiryDate: "2026-03-14", sponsorshipStatus: "Outside", nationality: "Sri Lanka", hireDate: "2025-09-07", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "303", nameAr: "Mostakim Mahmud Mohammad Amran", nameEn: "Mostakim Mahmud Mohammad Amran", nationalId: "30605003220", qidExpiryDate: "2026-06-12", sponsorshipStatus: "Outside", nationality: "Bangladesh", hireDate: "2026-01-05", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" },
  { employeeCode: "250", nameAr: "Kari Mohammad", nameEn: "Kari Mohammad", nationalId: "28252437697", qidExpiryDate: "2027-01-15", sponsorshipStatus: "Outside/PETRO FOAM", nationality: "Bangladesh", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "active" }
];

const ON_VACATION: any[] = [
  { employeeCode: "213", nameAr: "Mohamed Sasan Shiyam", nameEn: "Mohamed Sasan Shiyam", nationalId: "29214415160", qidExpiryDate: "2026-09-06", sponsorshipStatus: "Outside", nationality: "Sri Lanka", hireDate: "2025-01-01", departmentKey: "OFFICE", designationName: "Store Officer", basicSalary: 2000, otherAllowance: 1000, status: "on_leave" },
  { employeeCode: "277", nameAr: "Sidhik Mangalampully", nameEn: "Sidhik Mangalampully", nationalId: "27535622335", qidExpiryDate: "2026-09-25", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 950, status: "on_leave" },
  { employeeCode: "275", nameAr: "Sheikh Yousuf Ali", nameEn: "Sheikh Yousuf Ali", nationalId: "29705009232", qidExpiryDate: "2027-04-11", sponsorshipStatus: "Arirang Bakery", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 950, status: "on_leave" },
  { employeeCode: "218", nameAr: "Sujesh Parambikattil Sujathan", nameEn: "Sujesh Parambikattil Sujathan", nationalId: "27935641056", qidExpiryDate: "2026-11-10", sponsorshipStatus: "Arirang Bakery", nationality: "India", hireDate: "2025-01-01", departmentKey: "SALES TEAM", designationName: "Sales Man", basicSalary: 1550, otherAllowance: 450, status: "on_leave" },
  { employeeCode: "257", nameAr: "Ajay Prasad Kushwaha", nameEn: "Ajay Prasad Kushwaha", nationalId: "29252448333", qidExpiryDate: "2026-12-11", sponsorshipStatus: "Outside", nationality: "India", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "on_leave" },
  { employeeCode: "265", nameAr: "Mujeeb Ur Rehman Sakhi Rehman", nameEn: "Mujeeb Ur Rehman Sakhi Rehman", nationalId: "30058610370", qidExpiryDate: "2026-03-01", sponsorshipStatus: "Outside", nationality: "Pakistan", hireDate: "2025-01-01", departmentKey: "PRODUCTION", designationName: "Baker", basicSalary: 1000, otherAllowance: 300, status: "on_leave" }
];

const DEPT_NAMES: Record<string, { nameAr: string; nameEn: string }> = {
  "OFFICE":      { nameAr: "الإدارة", nameEn: "Office" },
  "SALES TEAM":  { nameAr: "فريق المبيعات", nameEn: "Sales Team" },
  "PRODUCTION":  { nameAr: "الإنتاج", nameEn: "Production" },
};

export const seedRealStaff = mutation({
  args: {},
  handler: async (ctx: any) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found");
    const branch = await ctx.db.query("branches")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .first();
    if (!branch) throw new Error("No branch found");

    const now = Date.now();
    const results: string[] = [];

    // ── 1. Delete existing employees ────────────────────────────────────────
    const existingEmps = await ctx.db.query("hrEmployees")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    for (const emp of existingEmps) {
      const balances = await ctx.db.query("hrLeaveBalances")
        .withIndex("by_employee_year", (q: any) => q.eq("employeeId", emp._id))
        .collect();
      for (const b of balances) await ctx.db.delete(b._id);
      const reqs = await ctx.db.query("hrLeaveRequests")
        .withIndex("by_employee", (q: any) => q.eq("employeeId", emp._id))
        .collect();
      for (const r of reqs) await ctx.db.delete(r._id);
      const att = await ctx.db.query("hrAttendance")
        .withIndex("by_employee", (q: any) => q.eq("employeeId", emp._id))
        .collect();
      for (const a of att) await ctx.db.delete(a._id);
      await ctx.db.delete(emp._id);
    }
    results.push(`Deleted ${existingEmps.length} existing employees`);

    // ── 2. Ensure departments ───────────────────────────────────────────────
    const deptMap: Record<string, any> = {};
    for (const [key, names] of Object.entries(DEPT_NAMES)) {
      const existing = await ctx.db.query("hrDepartments")
        .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
        .collect();
      let dept = existing.find((d: any) => d.nameEn === names.nameEn);
      if (!dept) {
        const id = await ctx.db.insert("hrDepartments", { companyId: company._id, code: key, nameAr: names.nameAr, nameEn: names.nameEn, isActive: true, createdAt: now });
        dept = { _id: id };
        results.push(`Created dept: ${names.nameEn}`);
      }
      deptMap[key] = dept._id;
    }

    // ── 3. Ensure designations ──────────────────────────────────────────────
    const allEmps = [...WORKING, ...ON_VACATION];
    const desigNames = [...new Set(allEmps.map((e: any) => e.designationName))];
    const desigMap: Record<string, any> = {};
    for (const name of desigNames) {
      const existing = await ctx.db.query("hrDesignations")
        .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
        .collect();
      let d = existing.find((x: any) => x.nameEn === name);
      if (!d) {
        const code = name.toUpperCase().replace(/[^A-Z0-9]/g, "_").substring(0, 20);
        const id = await ctx.db.insert("hrDesignations", { companyId: company._id, code, nameAr: name, nameEn: name, isActive: true, createdAt: now });
        d = { _id: id };
      }
      desigMap[name] = d._id;
    }

    // ── 4. Leave types ──────────────────────────────────────────────────────
    const leaveTypes = await ctx.db.query("hrLeaveTypes")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    let annualLT = leaveTypes.find((lt: any) =>
      lt.nameEn?.toLowerCase().includes("annual") || lt.nameAr?.includes("سنوي")
    );
    if (!annualLT) {
      const id = await ctx.db.insert("hrLeaveTypes", {
        companyId: company._id, code: "ANNUAL", nameAr: "إجازة سنوية", nameEn: "Annual Leave",
        defaultDaysPerYear: 30, isActive: true, isPaid: true, createdAt: now,
      });
      annualLT = { _id: id, defaultDaysPerYear: 30, isActive: true };
      leaveTypes.push(annualLT);
      results.push("Created leave type: Annual Leave");
    }

    // ── 5. Insert employees ─────────────────────────────────────────────────
    const year = new Date().getFullYear();
    const insertEmp = async (e: any) => {
      const id = await ctx.db.insert("hrEmployees", {
        companyId: company._id,
        branchId: branch._id,
        employeeCode: e.employeeCode,
        nameAr: e.nameAr,
        nameEn: e.nameEn,
        nationalId: e.nationalId,
        qidExpiryDate: e.qidExpiryDate,
        sponsorshipStatus: e.sponsorshipStatus,
        nationality: e.nationality,
        hireDate: e.hireDate,
        departmentId: deptMap[e.departmentKey],
        designationId: desigMap[e.designationName],
        employmentType: "full_time",
        status: e.status,
        basicSalary: e.basicSalary,
        otherAllowance: e.otherAllowance ?? undefined,
        housingAllowance: 0,
        transportAllowance: 0,
        salaryBasis: "monthly",
        createdAt: now,
        updatedAt: now,
      });
      for (const lt of leaveTypes) {
        if (lt.isActive) {
          await ctx.db.insert("hrLeaveBalances", {
            companyId: company._id, employeeId: id, leaveTypeId: lt._id,
            year, allocatedDays: lt.defaultDaysPerYear, usedDays: 0, pendingDays: 0,
          });
        }
      }
      return id;
    };

    for (const e of WORKING) await insertEmp(e);
    results.push(`Inserted ${WORKING.length} active employees`);

    for (const e of ON_VACATION) {
      const empId = await insertEmp(e);
      if (annualLT) {
        await ctx.db.insert("hrLeaveRequests", {
          companyId: company._id, employeeId: empId, leaveTypeId: annualLT._id,
          startDate: "2026-04-01", endDate: "2026-04-30", totalDays: 30,
          reason: "Annual Leave — currently on vacation", status: "approved",
          approvedAt: now, createdAt: now,
        });
        const bal = await ctx.db.query("hrLeaveBalances")
          .withIndex("by_employee_type_year", (q: any) =>
            q.eq("employeeId", empId).eq("leaveTypeId", annualLT._id).eq("year", year))
          .unique();
        if (bal) await ctx.db.patch(bal._id, { usedDays: 30, pendingDays: 0 });
      }
    }
    results.push(`Inserted ${ON_VACATION.length} on-leave employees with leave records`);

    return { success: true, summary: results, total: WORKING.length + ON_VACATION.length };
  },
});

export const getStaffSummary = query({
  args: {},
  handler: async (ctx: any) => {
    const company = await ctx.db.query("companies").first();
    if (!company) return null;
    const all = await ctx.db.query("hrEmployees")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const byDept: Record<string, number> = {};
    for (const e of all) {
      const dept = e.departmentId ? String(e.departmentId) : "unknown";
      byDept[dept] = (byDept[dept] ?? 0) + 1;
    }
    return {
      total: all.length,
      active: all.filter((e: any) => e.status === "active").length,
      onLeave: all.filter((e: any) => e.status === "on_leave").length,
      totalSalary: all.reduce((s: number, e: any) => s + (e.basicSalary || 0) + (e.otherAllowance || 0), 0),
    };
  },
});

// ─── Seed Sales Reps (Route Salesmen) ────────────────────────────────────────
const SALES_REPS_DATA: any[] = [
  { code: "SR-01", nameAr: "FAROOK", nameEn: "Farook Mattola Valappil", notes: "Route #01 | Employee #223" },
  { code: "SR-02", nameAr: "ASOK", nameEn: "Ashok Baby Kochakkan", notes: "Route #02 | Employee #278" },
  { code: "SR-03", nameAr: "AJMAL", nameEn: "Ajmal Chittuparambil Ali", notes: "Route #03 | Employee #225" },
  { code: "SR-04", nameAr: "HAMEED", nameEn: "Hameed", notes: "Route #04 | Employee #283" },
  { code: "SR-05", nameAr: "ABDUL JABBER", nameEn: "Abdul Jabbar", notes: "Route #05 | Employee #222" },
  { code: "SR-06", nameAr: "NIZER", nameEn: "Abdula Nizar Ellikkal Punnakkal", notes: "Route #06 | Employee #226" },
  { code: "SR-07", nameAr: "ALAM", nameEn: "Mohamad Alam Mohamad Fazlu", notes: "Route #07 | Employee #220" },
  { code: "SR-08", nameAr: "RAFEEK", nameEn: "Muhammad Rafeek Angekkara", notes: "Route #08 | Employee #295" },
  { code: "SR-11", nameAr: "JP", nameEn: "Jaya Prakash", notes: "Route #11 | Employee #219" },
  { code: "SR-12", nameAr: "BADUSHA", nameEn: "Badusha Kunjimarakkar", notes: "Route #12 | Employee #300" },
  { code: "SR-13", nameAr: "MUSHTHAQUE", nameEn: "Mushthaque Kunnumkai Puthiyapurayil", notes: "Route #13 | Employee #294" },
  { code: "SR-14", nameAr: "SAINUDDIN", nameEn: "Sainudheen Arackal Moideen", notes: "Route #14 | Employee #293" },
  { code: "SR-15", nameAr: "MAMUN", nameEn: "Abdulla Al Mamun Abul", notes: "Route #15 | Employee #224" },
  { code: "SR-16", nameAr: "S.YOUSUF", nameEn: "Sheikh Yousuf Ali", notes: "Route #16 | Employee #275" },
  { code: "SR-17", nameAr: "HAMZA", nameEn: "Hamsa Arathuvalappil Ummer", notes: "Route #17 | Employee #233" }
];

export const seedSalesReps = mutation({
  args: {},
  handler: async (ctx: any) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found");
    const branch = await ctx.db.query("branches")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .first();

    const results: string[] = [];
    const now = Date.now();

    for (const rep of SALES_REPS_DATA) {
      const existing = await ctx.db.query("salesReps")
        .withIndex("by_company_code", (q: any) => q.eq("companyId", company._id).eq("code", rep.code))
        .first();

      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          nameAr: rep.nameAr,
          nameEn: rep.nameEn,
          notes: rep.notes,
        });
        results.push(`UPDATED ${rep.code} ${rep.nameAr}`);
      } else {
        await ctx.db.insert("salesReps", {
          companyId: company._id,
          branchId: branch?._id,
          code: rep.code,
          nameAr: rep.nameAr,
          nameEn: rep.nameEn,
          notes: rep.notes,
          isActive: true,
          createdAt: now,
        });
        results.push(`CREATED ${rep.code} ${rep.nameAr}`);
      }
    }

    return { results, total: SALES_REPS_DATA.length };
  },
});

// ─── Seed Delivery Vehicles ───────────────────────────────────────────────────
// plate → { code, descriptionEn, salesRepCode? }
const VEHICLES_DATA: { plate: string; code: string; descriptionEn: string; salesRepCode?: string }[] = [
  { plate: "232795", code: "VH-01", descriptionEn: "Route 01 — Farook",        salesRepCode: "SR-01" },
  { plate: "285490", code: "VH-02", descriptionEn: "Route 02 — Ashok",         salesRepCode: "SR-02" },
  { plate: "277624", code: "VH-03", descriptionEn: "Route 03 — Ajmal",         salesRepCode: "SR-03" },
  { plate: "96157",  code: "VH-04", descriptionEn: "Route 04 — Hameed",        salesRepCode: "SR-04" },
  { plate: "95872",  code: "VH-05", descriptionEn: "Route 05 — Abdul Jabbar",  salesRepCode: "SR-05" },
  { plate: "246586", code: "VH-06", descriptionEn: "Route 06 — Nizar",         salesRepCode: "SR-06" },
  { plate: "280890", code: "VH-07", descriptionEn: "Route 07 — Alam",          salesRepCode: "SR-07" },
  { plate: "310810", code: "VH-08", descriptionEn: "Route 08 — Rafeek",        salesRepCode: "SR-08" },
  { plate: "259106", code: "VH-11", descriptionEn: "Route 11 — JP",            salesRepCode: "SR-11" },
  { plate: "326477", code: "VH-12", descriptionEn: "Route 12 — Badusha",       salesRepCode: "SR-12" },
  { plate: "232720", code: "VH-13", descriptionEn: "Route 13 — Mushthaque",    salesRepCode: "SR-13" },
  { plate: "258196", code: "VH-14", descriptionEn: "Route 14 — Sainudheen",    salesRepCode: "SR-14" },
  { plate: "243340", code: "VH-15", descriptionEn: "Route 15 — Mamun",         salesRepCode: "SR-15" },
  { plate: "252058", code: "VH-17", descriptionEn: "Route 17 — Hamza",         salesRepCode: "SR-17" },
  // Spare / parking-area vehicles (no assigned sales rep)
  { plate: "232981", code: "VH-P01", descriptionEn: "Parking Area" },
  { plate: "229640", code: "VH-P02", descriptionEn: "Ailyn Robelles Corocoto" },
  { plate: "230895", code: "VH-P03", descriptionEn: "Mohamed Gamal" },
  { plate: "373362", code: "VH-P04", descriptionEn: "Mathew Joseph" },
  { plate: "711809", code: "VH-P05", descriptionEn: "Bernal Lota" },
  { plate: "95843",  code: "VH-P06", descriptionEn: "Yaseen Ali Baig (1)" },
  { plate: "162540", code: "VH-P07", descriptionEn: "Yaseen Ali Baig (2)" },
  { plate: "275975", code: "VH-P08", descriptionEn: "Muhammad Shahidul Alam" },
];

export const seedVehicles = mutation({
  args: {},
  handler: async (ctx: any) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found");
    const branch = await ctx.db.query("branches")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .first();

    // Build a map of salesRep code → _id
    const allReps = await ctx.db.query("salesReps")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const repByCode: Record<string, any> = {};
    for (const r of allReps) repByCode[r.code] = r._id;

    const results: string[] = [];
    const now = Date.now();

    for (const v of VEHICLES_DATA) {
      const existing = await ctx.db.query("deliveryVehicles")
        .withIndex("by_company_code", (q: any) => q.eq("companyId", company._id).eq("code", v.code))
        .first();

      const assignedSalesRepId = v.salesRepCode ? repByCode[v.salesRepCode] : undefined;

      if (existing) {
        await ctx.db.patch(existing._id, {
          plateNumber: v.plate,
          descriptionEn: v.descriptionEn,
          assignedSalesRepId,
        });
        results.push(`UPDATED ${v.code} — ${v.plate}`);
      } else {
        await ctx.db.insert("deliveryVehicles", {
          companyId: company._id,
          branchId: branch?._id,
          code: v.code,
          plateNumber: v.plate,
          descriptionEn: v.descriptionEn,
          descriptionAr: v.descriptionEn,
          assignedSalesRepId,
          isActive: true,
          createdAt: now,
        });
        results.push(`CREATED ${v.code} — ${v.plate}`);
      }
    }

    return { results, total: VEHICLES_DATA.length };
  },
});

// ─── FG Items Seed ────────────────────────────────────────────────────────────

const FG_ITEMS = [
  { code: "FG-001", nameEn: "Milk Bread 750g", nameAr: "Milk Bread 750g", sellingPrice: 5.0 },
  { code: "FG-002", nameEn: "Jambu Bread Brown 1100g", nameAr: "Jambu Bread Brown 1100g", sellingPrice: 9.0 },
  { code: "FG-003", nameEn: "Jambu Bread Milk/White 1100g", nameAr: "Jambu Bread Milk/White 1100g", sellingPrice: 7.0 },
  { code: "FG-004", nameEn: "Brown Bread", nameAr: "Brown Bread", sellingPrice: 5.5 },
  { code: "FG-005", nameEn: "Hotdog 5 (Combo)", nameAr: "Hotdog 5 (Combo)", sellingPrice: 3.0 },
  { code: "FG-006", nameEn: "Hotdog 6", nameAr: "Hotdog 6", sellingPrice: 3.0 },
  { code: "FG-007", nameEn: "Hotdog Big 3PCS", nameAr: "Hotdog Big 3PCS", sellingPrice: 4.0 },
  { code: "FG-008", nameEn: "Hotdog Med. 5PCS", nameAr: "Hotdog Med. 5PCS", sellingPrice: 5.0 },
  { code: "FG-009", nameEn: "Hamburger 6", nameAr: "Hamburger 6", sellingPrice: 3.0 },
  { code: "FG-010", nameEn: "Hamburger 4", nameAr: "Hamburger 4", sellingPrice: 2.5 },
  { code: "FG-011", nameEn: "Hamburger Big 2PCS SET", nameAr: "Hamburger Big 2PCS SET", sellingPrice: 3.0 },
  { code: "FG-012", nameEn: "Morning Roll", nameAr: "Morning Roll", sellingPrice: 5.5 },
  { code: "FG-013", nameEn: "Dinner Roll", nameAr: "Dinner Roll", sellingPrice: 3.0 },
  { code: "FG-014", nameEn: "Butter Roll", nameAr: "Butter Roll", sellingPrice: 3.0 },
  { code: "FG-015", nameEn: "Pizza Base", nameAr: "Pizza Base", sellingPrice: 7.0 },
  { code: "FG-016", nameEn: "Red Bun 6PCS", nameAr: "Red Bun 6PCS", sellingPrice: 8.0 },
  { code: "FG-017", nameEn: "Potato Bun 6PCS", nameAr: "Potato Bun 6PCS", sellingPrice: 10.0 },
  { code: "FG-018", nameEn: "Vanilla Slice Cake", nameAr: "Vanilla Slice Cake", sellingPrice: 0.75 },
  { code: "FG-019", nameEn: "Fruit Slice Cake", nameAr: "Fruit Slice Cake", sellingPrice: 0.75 },
  { code: "FG-020", nameEn: "Apple Puff 80G", nameAr: "Apple Puff 80G", sellingPrice: 1.25 },
  { code: "FG-021", nameEn: "Strawberry Puff 80G", nameAr: "Strawberry Puff 80G", sellingPrice: 1.25 },
  { code: "FG-022", nameEn: "Zataar Croissant 80G", nameAr: "Zataar Croissant 80G", sellingPrice: 1.25 },
  { code: "FG-023", nameEn: "Strawberry Croissant 80g", nameAr: "Strawberry Croissant 80g", sellingPrice: 1.25 },
  { code: "FG-024", nameEn: "Chocolate Croissant", nameAr: "Chocolate Croissant", sellingPrice: 1.25 },
  { code: "FG-025", nameEn: "Cheese Croissant 80G", nameAr: "Cheese Croissant 80G", sellingPrice: 1.25 },
  { code: "FG-026", nameEn: "Chsse Puff 80G", nameAr: "Chsse Puff 80G", sellingPrice: 1.25 },
  { code: "FG-027", nameEn: "Plain Croissant 80g", nameAr: "Plain Croissant 80g", sellingPrice: 0.9 },
  { code: "FG-028", nameEn: "Plain Puff 80g", nameAr: "Plain Puff 80g", sellingPrice: 0.9 },
  { code: "FG-029", nameEn: "Mini Muffins (Choco) VADA", nameAr: "Mini Muffins (Choco) VADA", sellingPrice: 3.5 },
  { code: "FG-030", nameEn: "Mini Muffin (Vanilla)", nameAr: "Mini Muffin (Vanilla)", sellingPrice: 3.5 },
  { code: "FG-031", nameEn: "Bread Crumbs Box", nameAr: "Bread Crumbs Box", sellingPrice: 4.0 },
  { code: "FG-032", nameEn: "Bread Crumbs Pkt", nameAr: "Bread Crumbs Pkt", sellingPrice: 5.0 },
  { code: "FG-033", nameEn: "Rusk Box 330g", nameAr: "Rusk Box 330g", sellingPrice: 5.0 },
  { code: "FG-034", nameEn: "Toast Zatar 330g", nameAr: "Toast Zatar 330g", sellingPrice: 7.5 },
  { code: "FG-035", nameEn: "Toast Family 330g", nameAr: "Toast Family 330g", sellingPrice: 7.5 },
  { code: "FG-036", nameEn: "Toast Fiber 330g", nameAr: "Toast Fiber 330g", sellingPrice: 7.5 },
  { code: "FG-037", nameEn: "Toast Omega 330g", nameAr: "Toast Omega 330g", sellingPrice: 7.5 },
  { code: "FG-038", nameEn: "Soya Toast 330g", nameAr: "Soya Toast 330g", sellingPrice: 7.5 },
  { code: "FG-039", nameEn: "Slim Toast 330g", nameAr: "Slim Toast 330g", sellingPrice: 7.5 },
  { code: "FG-040", nameEn: "Kaak Zatar", nameAr: "Kaak Zatar", sellingPrice: 5.0 },
  { code: "FG-041", nameEn: "Kaak Sesame", nameAr: "Kaak Sesame", sellingPrice: 5.0 },
  { code: "FG-042", nameEn: "Kaak Shami", nameAr: "Kaak Shami", sellingPrice: 5.0 },
  { code: "FG-043", nameEn: "Roti 150g", nameAr: "Roti 150g", sellingPrice: 0.8 },
  { code: "FG-044", nameEn: "Sliced Milk Bread 650", nameAr: "Sliced Milk Bread 650", sellingPrice: 5.0 },
  { code: "FG-045", nameEn: "Sliced Milk Bread 350", nameAr: "Sliced Milk Bread 350", sellingPrice: 3.0 },
  { code: "FG-046", nameEn: "Sliced Brown Bread 650", nameAr: "Sliced Brown Bread 650", sellingPrice: 7.0 },
  { code: "FG-047", nameEn: "Sliced Brown Bread 350", nameAr: "Sliced Brown Bread 350", sellingPrice: 4.0 },
  { code: "FG-048", nameEn: "Multi Cereal Bread 750", nameAr: "Multi Cereal Bread 750", sellingPrice: 6.0 },
  { code: "FG-049", nameEn: "Sliced Multicereal 650", nameAr: "Sliced Multicereal 650", sellingPrice: 6.0 },
  { code: "FG-050", nameEn: "Sliced Multicereal 350", nameAr: "Sliced Multicereal 350", sellingPrice: 4.0 },
  { code: "FG-051", nameEn: "Sliced White Bread 600", nameAr: "Sliced White Bread 600", sellingPrice: 4.5 },
  { code: "FG-052", nameEn: "Sliced White Bread 350", nameAr: "Sliced White Bread 350", sellingPrice: 2.75 },
  { code: "FG-053", nameEn: "Pandisal Bread", nameAr: "Pandisal Bread", sellingPrice: 4.0 },
  { code: "FG-054", nameEn: "Pandi Coco", nameAr: "Pandi Coco", sellingPrice: 4.5 },
  { code: "FG-055", nameEn: "Butter Bread", nameAr: "Butter Bread", sellingPrice: 4.5 },
  { code: "FG-056", nameEn: "Spanish Bread", nameAr: "Spanish Bread", sellingPrice: 4.5 },
  { code: "FG-057", nameEn: "Cup Cake 2pcs", nameAr: "Cup Cake 2pcs", sellingPrice: 0.75 },
  { code: "FG-058", nameEn: "Cream Bun", nameAr: "Cream Bun", sellingPrice: 0.8 },
  { code: "FG-059", nameEn: "Mini Bun 4 Pcs", nameAr: "Mini Bun 4 Pcs", sellingPrice: 2.0 },
  { code: "FG-060", nameEn: "Large Burger (Additional)", nameAr: "Large Burger (Additional)", sellingPrice: 4.0 },
  { code: "FG-061", nameEn: "Dates Roll", nameAr: "Dates Roll", sellingPrice: 1.0 },
  { code: "FG-062", nameEn: "Yellow Bread/Potato 750g", nameAr: "Yellow Bread/Potato 750g", sellingPrice: 7.0 },
  { code: "FG-063", nameEn: "Fruit English Cake", nameAr: "Fruit English Cake", sellingPrice: 5.0 },
  { code: "FG-064", nameEn: "Marble English Cake", nameAr: "Marble English Cake", sellingPrice: 5.0 },
  { code: "FG-065", nameEn: "Chocolate English Cake", nameAr: "Chocolate English Cake", sellingPrice: 5.0 },
  { code: "FG-066", nameEn: "Dates English Cake", nameAr: "Dates English Cake", sellingPrice: 5.0 },
  { code: "FG-067", nameEn: "Vanilla English Cake", nameAr: "Vanilla English Cake", sellingPrice: 5.0 },
  { code: "FG-068", nameEn: "Slice Cake 65g (Orange)", nameAr: "Slice Cake 65g (Orange)", sellingPrice: 0.75 },
  { code: "FG-069", nameEn: "Slice Cake 65g (Marble)", nameAr: "Slice Cake 65g (Marble)", sellingPrice: 0.75 },
  { code: "FG-070", nameEn: "Slice Cake 65g (Chocolate)", nameAr: "Slice Cake 65g (Chocolate)", sellingPrice: 0.75 },
  { code: "FG-071", nameEn: "Hotdog Mini 8pcs", nameAr: "Hotdog Mini 8pcs", sellingPrice: 3.25 },
  { code: "FG-072", nameEn: "Orange Cup Cake", nameAr: "Orange Cup Cake", sellingPrice: 0.75 },
  { code: "FG-073", nameEn: "Chocolate Cup Cake", nameAr: "Chocolate Cup Cake", sellingPrice: 0.75 },
  { code: "FG-074", nameEn: "Banana Cup Cake", nameAr: "Banana Cup Cake", sellingPrice: 0.75 },
  { code: "FG-075", nameEn: "Croissant 60g (Vanilla Cream)", nameAr: "Croissant 60g (Vanilla Cream)", sellingPrice: 1.0 },
  { code: "FG-076", nameEn: "Croissant 60g (Chocolate)", nameAr: "Croissant 60g (Chocolate)", sellingPrice: 1.0 },
  { code: "FG-077", nameEn: "RAFP Roti", nameAr: "RAFP Roti", sellingPrice: 9.5 },
  { code: "FG-078", nameEn: "Croissant 60g (Cheese)", nameAr: "Croissant 60g (Cheese)", sellingPrice: 1.0 },
  { code: "FG-079", nameEn: "Chai Bun 60g", nameAr: "Chai Bun 60g", sellingPrice: 0.75 },
  { code: "FG-080", nameEn: "Rusk (Packet)", nameAr: "Rusk (Packet)", sellingPrice: 2.5 },
  { code: "FG-081", nameEn: "Bread Crumbs 500g", nameAr: "Bread Crumbs 500g", sellingPrice: 4.0 },
  { code: "FG-082", nameEn: "French Bread 350g", nameAr: "French Bread 350g", sellingPrice: 5.5 },
  { code: "FG-083", nameEn: "Strawberry Croissant 60g", nameAr: "Strawberry Croissant 60g", sellingPrice: 1.25 },
  { code: "FG-084", nameEn: "Dry Puff 1kg", nameAr: "Dry Puff 1kg", sellingPrice: 15.0 },
  { code: "FG-085", nameEn: 'Hotdog Big 9" 1PC', nameAr: 'Hotdog Big 9" 1PC', sellingPrice: 0.8 },
];

export const seedFGItems = mutation({
  args: {},
  handler: async (ctx: any) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found");

    // Get PC uom
    const uoms = await ctx.db.query("unitOfMeasure")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const pcUom = uoms.find((u: any) => u.code === "PC" || u.nameEn === "Piece");
    if (!pcUom) throw new Error("UOM 'PC' not found — run initial seed first");

    // Load all existing FG items
    const existing = await ctx.db.query("items")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const fgItems = existing.filter((i: any) => i.itemType === "finished_good");

    const newCodes = new Set(FG_ITEMS.map((i: any) => i.code));
    const existingByCode = new Map(fgItems.map((i: any) => [i.code, i]));

    // Items to delete: existing FG items NOT in the new list
    const toDelete = fgItems.filter((i: any) => !newCodes.has(i.code));

    async function deleteItemAndRelated(item: any) {
      // Stock balances
      const balances = await ctx.db.query("stockBalance")
        .withIndex("by_item_warehouse", (q: any) => q.eq("itemId", item._id))
        .collect();
      for (const b of balances) await ctx.db.delete(b._id);

      // Supplier links
      const supplierLinks = await ctx.db.query("supplierItems")
        .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
        .filter((q: any) => q.eq(q.field("itemId"), item._id))
        .collect();
      for (const s of supplierLinks) await ctx.db.delete(s._id);

      // Recipes
      const recipes = await ctx.db.query("recipes")
        .withIndex("by_output_item", (q: any) => q.eq("outputItemId", item._id))
        .collect();
      for (const recipe of recipes) {
        const rLines = await ctx.db.query("recipeLines")
          .withIndex("by_recipe", (q: any) => q.eq("recipeId", recipe._id))
          .collect();
        for (const rl of rLines) await ctx.db.delete(rl._id);
        await ctx.db.delete(recipe._id);
      }

      // Production orders
      const itemProdOrders = await ctx.db.query("productionOrders")
        .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
        .filter((q: any) => q.eq(q.field("outputItemId"), item._id))
        .collect();
      for (const po of itemProdOrders) {
        const poLines = await ctx.db.query("productionOrderLines")
          .withIndex("by_order", (q: any) => q.eq("orderId", po._id))
          .collect();
        for (const pol of poLines) await ctx.db.delete(pol._id);
        await ctx.db.delete(po._id);
      }

      await ctx.db.delete(item._id);
    }

    for (const item of toDelete) {
      await deleteItemAndRelated(item);
    }

    // Upsert: insert new, update name only for existing (preserve cost/price)
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    for (const item of FG_ITEMS) {
      const existing = existingByCode.get(item.code);
      if (existing) {
        // Keep cost & selling price — only sync names
        await ctx.db.patch(existing._id, {
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          normalizedName: item.nameEn.toUpperCase().trim(),
          isActive: true,
        });
        updated++;
      } else {
        await ctx.db.insert("items", {
          companyId: company._id,
          code: item.code,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          itemType: "finished_good",
          baseUomId: pcUom._id,
          costingMethod: "weighted_average",
          sellingPrice: item.sellingPrice,
          allowNegativeStock: false,
          isActive: true,
          createdAt: now,
          normalizedName: item.nameEn.toUpperCase().trim(),
        });
        inserted++;
      }
    }

    // ── Recipe cleanup ───────────────────────────────────────────────────────
    // Get all valid FG item IDs after upsert
    const allItemsAfter = await ctx.db.query("items")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const validFgIds = new Set(
      allItemsAfter
        .filter((i: any) => i.itemType === "finished_good")
        .map((i: any) => i._id)
    );

    // Get all recipes and delete orphans (outputItem no longer exists as FG)
    const allRecipes = await ctx.db.query("recipes")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();

    let recipesDeleted = 0;
    let recipesKept = 0;
    for (const recipe of allRecipes) {
      const isValid = validFgIds.has(recipe.outputItemId);
      if (!isValid) {
        // Delete recipe lines first
        const rLines = await ctx.db.query("recipeLines")
          .withIndex("by_recipe", (q: any) => q.eq("recipeId", recipe._id))
          .collect();
        for (const rl of rLines) await ctx.db.delete(rl._id);
        await ctx.db.delete(recipe._id);
        recipesDeleted++;
      } else {
        recipesKept++;
      }
    }

    return { deleted: toDelete.length, inserted, updated, recipesDeleted, recipesKept };
  },
});

// ─────────────────────────────────────────────────────────────────
// WH Items — 220 bakery items from WH.xlsx RM-PM List rows 338-557
// ─────────────────────────────────────────────────────────────────
const WH_ITEMS = [
  { code: "1000311", nameEn: "APPLE FILLING ( 2.7Kg )", nameAr: "APPLE FILLING ( 2.7Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 25.9259, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000312", nameEn: "AREEJ MARGARINE (25Kg )", nameAr: "AREEJ MARGARINE (25Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 11.5396, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000313", nameEn: "BAKING PAPER (1X500 Pcs)", nameAr: "BAKING PAPER (1X500 Pcs)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.15, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000314", nameEn: "BAKING POWDER (10Kg )", nameAr: "BAKING POWDER (10Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 7.8, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000315", nameEn: "BLEACH LIQUID 6X3.78 LTR CLOROX", nameAr: "BLEACH LIQUID 6X3.78 LTR CLOROX", itemType: "raw_material" as const, uomCode: "LTR", basePrice: 3.8801, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000316", nameEn: "BREAD IMPROVER (15KG)", nameAr: "BREAD IMPROVER (15KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 15.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000317", nameEn: "BREAD WIRE 10KG PACK", nameAr: "BREAD WIRE 10KG PACK", itemType: "raw_material" as const, uomCode: "KG", basePrice: 32.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000318", nameEn: "BROWN BREAD 750G 25x40", nameAr: "BROWN BREAD 750G 25x40", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000319", nameEn: "BURGER BUN 4 PCS (10x12)", nameAr: "BURGER BUN 4 PCS (10x12)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000320", nameEn: "BUTTER BLOCK (10Kg)", nameAr: "BUTTER BLOCK (10Kg)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 6.25, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000321", nameEn: "CAKE GEL (1 Pack X 5Kg)", nameAr: "CAKE GEL (1 Pack X 5Kg)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 14.4, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000322", nameEn: "CALCIUM PROPIONATE (20KG)", nameAr: "CALCIUM PROPIONATE (20KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 17.1786, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000323", nameEn: "CHAI BUN - CHINA PAPER STICKER 6CM*6CM 2", nameAr: "CHAI BUN - CHINA PAPER STICKER 6CM*6CM 2", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.09, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000324", nameEn: "CHOCKLATE FILLING ( 5Kg )", nameAr: "CHOCKLATE FILLING ( 5Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 18.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000325", nameEn: "CLING FILM 1X45CM 5KG (JMBO)", nameAr: "CLING FILM 1X45CM 5KG (JMBO)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 8.4, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000326", nameEn: "COTTON GLOVES 600 PAIR", nameAr: "COTTON GLOVES 600 PAIR", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.7, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000327", nameEn: "Cream Bun PLASTIC 10kg/roll", nameAr: "Cream Bun PLASTIC 10kg/roll", itemType: "raw_material" as const, uomCode: "KG", basePrice: 17.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000328", nameEn: "CREAM CHEESE ( 1Kg )", nameAr: "CREAM CHEESE ( 1Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 22.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000329", nameEn: "CROISSANT BUTTER ( 10KG )", nameAr: "CROISSANT BUTTER ( 10KG )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 13.5, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000330", nameEn: "CUP CAKE 65 G 10KG/ROLL", nameAr: "CUP CAKE 65 G 10KG/ROLL", itemType: "raw_material" as const, uomCode: "KG", basePrice: 16.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000331", nameEn: "CUP CAKE PAPER (12X1000PCS)  9.5CM", nameAr: "CUP CAKE PAPER (12X1000PCS)  9.5CM", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.0121, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000332", nameEn: "DATES PASTE ( 5Kg*3 )", nameAr: "DATES PASTE ( 5Kg*3 )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 9.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000333", nameEn: "DINNER ROLL 10kg", nameAr: "DINNER ROLL 10kg", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000334", nameEn: "DRY YEAST (500g X 20)", nameAr: "DRY YEAST (500g X 20)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 12.3, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000335", nameEn: "FACE MASK 1X50PCS", nameAr: "FACE MASK 1X50PCS", itemType: "raw_material" as const, uomCode: "PC", basePrice: 3.5, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000336", nameEn: "FLOUR (MULTICEREAL) (25Kg )", nameAr: "FLOUR (MULTICEREAL) (25Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 18.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000337", nameEn: "FLOUR NO.1 (50Kg)", nameAr: "FLOUR NO.1 (50Kg)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 2.666, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000338", nameEn: "FOOD FLAVOR - BANANA 1LTR", nameAr: "FOOD FLAVOR - BANANA 1LTR", itemType: "raw_material" as const, uomCode: "PC", basePrice: 58.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000339", nameEn: "FRESH EGG (1Ctn X 360)", nameAr: "FRESH EGG (1Ctn X 360)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.4665, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000340", nameEn: "GARBAGE BAG 124*140 10S", nameAr: "GARBAGE BAG 124*140 10S", itemType: "raw_material" as const, uomCode: "PC", basePrice: 38.0, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000341", nameEn: "GHEE (15L )", nameAr: "GHEE (15L )", itemType: "raw_material" as const, uomCode: "LTR", basePrice: 6.4273, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000342", nameEn: "GLUTEN (25Kg )", nameAr: "GLUTEN (25Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 8.8, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000343", nameEn: "HAIR NET 10*100 PCS", nameAr: "HAIR NET 10*100 PCS", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.033, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000344", nameEn: "HAND GLOVES MEDICAL (VINYL)", nameAr: "HAND GLOVES MEDICAL (VINYL)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 6.5, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000345", nameEn: "HAND GLOVES RUBBER 120 GM PAIR", nameAr: "HAND GLOVES RUBBER 120 GM PAIR", itemType: "raw_material" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000346", nameEn: "HAND GLOVES RUBBER 90GM PAIR", nameAr: "HAND GLOVES RUBBER 90GM PAIR", itemType: "raw_material" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000347", nameEn: "HOTDOG 6 PCS (18x9)", nameAr: "HOTDOG 6 PCS (18x9)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000348", nameEn: "ICE CUBE 25 KG", nameAr: "ICE CUBE 25 KG", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.5, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000349", nameEn: "Impulse sealer for PP/PE bag (metal Body) 12\" 2pcs", nameAr: "Impulse sealer for PP/PE bag (metal Body) 12\" 2pcs", itemType: "raw_material" as const, uomCode: "PC", basePrice: 110.0, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000350", nameEn: "MAXI ROLL 2PLY 400GRM (1X6)", nameAr: "MAXI ROLL 2PLY 400GRM (1X6)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.8333, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000351", nameEn: "MILK BREAD 750 G (10x16+2)", nameAr: "MILK BREAD 750 G (10x16+2)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000352", nameEn: "MILK POWDER (25KG)", nameAr: "MILK POWDER (25KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 9.33, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000353", nameEn: "MORNING ROLL 25x40", nameAr: "MORNING ROLL 25x40", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000354", nameEn: "MUNNA BUTTER (20Kg ) (Veg Shortning)", nameAr: "MUNNA BUTTER (20Kg ) (Veg Shortning)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 8.5, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000355", nameEn: "PALM OIL (18L)", nameAr: "PALM OIL (18L)", itemType: "raw_material" as const, uomCode: "LTR", basePrice: 4.9543, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000356", nameEn: "POTASIUM SORBATE ( 5 Kg*2 )", nameAr: "POTASIUM SORBATE ( 5 Kg*2 )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 55.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000357", nameEn: "ROGANA POWDER ( 10Kg )", nameAr: "ROGANA POWDER ( 10Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 18.5, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000358", nameEn: "SALT ( 25Kg )", nameAr: "SALT ( 25Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.62, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000359", nameEn: "SESAME SEEDS (1KG)", nameAr: "SESAME SEEDS (1KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 9.43, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000360", nameEn: "SOLVENENT", nameAr: "SOLVENENT", itemType: "raw_material" as const, uomCode: "PC", basePrice: 305.0, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000361", nameEn: "STRAWBERRY FILLING ( 5Kg*4 )", nameAr: "STRAWBERRY FILLING ( 5Kg*4 )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 5.8, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000362", nameEn: "STROM HAND WASH LIQUID 4X5LTR", nameAr: "STROM HAND WASH LIQUID 4X5LTR", itemType: "raw_material" as const, uomCode: "LTR", basePrice: 1.6, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000363", nameEn: "SUGAR (50Kg )", nameAr: "SUGAR (50Kg )", itemType: "raw_material" as const, uomCode: "KG", basePrice: 2.2, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000364", nameEn: "SUGAR POWDER (50Kg )", nameAr: "SUGAR POWDER (50Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.6, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000365", nameEn: "TUBE ROLL/PLUM CAKE PLASTIC 19.50CM", nameAr: "TUBE ROLL/PLUM CAKE PLASTIC 19.50CM", itemType: "raw_material" as const, uomCode: "KG", basePrice: 7.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000366", nameEn: "VANILLA ESSENCE 28ml*12", nameAr: "VANILLA ESSENCE 28ml*12", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.2417, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000367", nameEn: "VANILLA POWDER 10KG", nameAr: "VANILLA POWDER 10KG", itemType: "raw_material" as const, uomCode: "PC", basePrice: 32.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000368", nameEn: "VANILLA SLICE CAKE 65G (7x4)", nameAr: "VANILLA SLICE CAKE 65G (7x4)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000369", nameEn: "VINYL GLOVES (10X100P) L", nameAr: "VINYL GLOVES (10X100P) L", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.05, purchaseType: "OTHERS" as const, mgroup: "Others" },
  { code: "1000370", nameEn: "ZEDO PLUS (25KG)", nameAr: "ZEDO PLUS (25KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 14.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000371", nameEn: "CHAKKI ATTA FLOUR ( 50Kg )", nameAr: "CHAKKI ATTA FLOUR ( 50Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.4, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000372", nameEn: "MULTICEREAL FLOUR ( 25Kg )", nameAr: "MULTICEREAL FLOUR ( 25Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 18.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000373", nameEn: "ZAATAR FILLING ( 10Kg )", nameAr: "ZAATAR FILLING ( 10Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 4.5, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000374", nameEn: "CINNAMON POWDER ( 1Kg )", nameAr: "CINNAMON POWDER ( 1Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 30.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000375", nameEn: "CARDMON POWDER (1Kg )", nameAr: "CARDMON POWDER (1Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 23.6, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000376", nameEn: "MAHLAB POWDER ( 5Kg )", nameAr: "MAHLAB POWDER ( 5Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 100.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000377", nameEn: "OATS FILLING (10KG)", nameAr: "OATS FILLING (10KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 22.5, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000378", nameEn: "YELLOW COLOUR (100g Tin)", nameAr: "YELLOW COLOUR (100g Tin)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 7.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000379", nameEn: "RED COLOUR ( 28ml )", nameAr: "RED COLOUR ( 28ml )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.625, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000380", nameEn: "ORANGE COLOUR ( 190g )", nameAr: "ORANGE COLOUR ( 190g )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 421.0526, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000381", nameEn: "BLACK SEEDS", nameAr: "BLACK SEEDS", itemType: "raw_material" as const, uomCode: "PC", basePrice: 12.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000382", nameEn: "CORN STARCH FLOUR (1 Kg)", nameAr: "CORN STARCH FLOUR (1 Kg)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 9.6, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000383", nameEn: "COCOA POWDER ( 1Kg )", nameAr: "COCOA POWDER ( 1Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 62.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000384", nameEn: "MUFFIN MIX CHOCOLATE (1KG)", nameAr: "MUFFIN MIX CHOCOLATE (1KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 14.55, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000385", nameEn: "MUFFIN MIX VANILLA (1KG)", nameAr: "MUFFIN MIX VANILLA (1KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 9.8, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000386", nameEn: "CUSTARD POWDER ( 10Kg )", nameAr: "CUSTARD POWDER ( 10Kg )", itemType: "raw_material" as const, uomCode: "PC", basePrice: 7.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000387", nameEn: "ROSE WATER BOTTLE (500ML)", nameAr: "ROSE WATER BOTTLE (500ML)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.9167, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000388", nameEn: "ANEES SEEDS (1KG)", nameAr: "ANEES SEEDS (1KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 15.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000389", nameEn: "ALL PURPOSE FLOUR (50KG)", nameAr: "ALL PURPOSE FLOUR (50KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.1, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000390", nameEn: "TUTTI FRUITTY (1KG)", nameAr: "TUTTI FRUITTY (1KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 6.53, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000391", nameEn: "FOOD FLAVOR - ORANGE 1LTR", nameAr: "FOOD FLAVOR - ORANGE 1LTR", itemType: "raw_material" as const, uomCode: "PC", basePrice: 60.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000392", nameEn: "FOOD FLAVOR - BUTTER 1LTR", nameAr: "FOOD FLAVOR - BUTTER 1LTR", itemType: "raw_material" as const, uomCode: "PC", basePrice: 60.0, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000393", nameEn: "FINE BRAN FLOUR (30KG)", nameAr: "FINE BRAN FLOUR (30KG)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.2, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000394", nameEn: "NUTTELLA FILLING (825gX6)", nameAr: "NUTTELLA FILLING (825gX6)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 31.3091, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000395", nameEn: "SLICED MILK BREAD 650 G", nameAr: "SLICED MILK BREAD 650 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000396", nameEn: "SLICED MILK BREAD 350 G", nameAr: "SLICED MILK BREAD 350 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000397", nameEn: "SLICED WHITE BREAD 600 G", nameAr: "SLICED WHITE BREAD 600 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000398", nameEn: "SLICED WHITE BREAD 350 G", nameAr: "SLICED WHITE BREAD 350 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000399", nameEn: "PLAIN BAG JUMBO", nameAr: "PLAIN BAG JUMBO", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000400", nameEn: "BUTTER ROLL 300G PLASTIC", nameAr: "BUTTER ROLL 300G PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000401", nameEn: "POTATO BUN 6 PCS PLASTIC", nameAr: "POTATO BUN 6 PCS PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000402", nameEn: "MINI MUFFINS VANILLA 15 PCS", nameAr: "MINI MUFFINS VANILLA 15 PCS", itemType: "raw_material" as const, uomCode: "KG", basePrice: 11.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000403", nameEn: "MINI MUFFINS CHOCOLATE 15 PCS", nameAr: "MINI MUFFINS CHOCOLATE 15 PCS", itemType: "raw_material" as const, uomCode: "KG", basePrice: 11.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000404", nameEn: "FRUIT SLICE CAKE 200 G", nameAr: "FRUIT SLICE CAKE 200 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 11.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000405", nameEn: "BREAD CRUMBS PKT 400 G", nameAr: "BREAD CRUMBS PKT 400 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.34, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000406", nameEn: "SLICED BROWN BREAD 650 G", nameAr: "SLICED BROWN BREAD 650 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000407", nameEn: "SLICED BROWN BREAD 350 G", nameAr: "SLICED BROWN BREAD 350 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000408", nameEn: "MULTI CEREAL 650 G", nameAr: "MULTI CEREAL 650 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000409", nameEn: "MULTI CEREAL 350 G", nameAr: "MULTI CEREAL 350 G", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000410", nameEn: "CHAPATI 4PCS SET PLASTIC", nameAr: "CHAPATI 4PCS SET PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 14.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000411", nameEn: "DATE ROLL 90 G PLASTIC", nameAr: "DATE ROLL 90 G PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000412", nameEn: "PANDISAL BREAD 330 G PLASTIC", nameAr: "PANDISAL BREAD 330 G PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000413", nameEn: "PANDI CO CO 330 G PLASTIC", nameAr: "PANDI CO CO 330 G PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000414", nameEn: "BUTTER BREAD 330 G PLASTIC", nameAr: "BUTTER BREAD 330 G PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000415", nameEn: "PLAIN BAG SMALL CLEAR", nameAr: "PLAIN BAG SMALL CLEAR", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.4, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000416", nameEn: "HOTDOG 8 PCS ROLL PLASTIC", nameAr: "HOTDOG 8 PCS ROLL PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000417", nameEn: "HOTDOG 6 PCS ROLL PLASTIC", nameAr: "HOTDOG 6 PCS ROLL PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000418", nameEn: "BURGER BUN 4 PCS ROLL PLASTIC", nameAr: "BURGER BUN 4 PCS ROLL PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000419", nameEn: "CROISSANT PLAIN 80 G (15KG)", nameAr: "CROISSANT PLAIN 80 G (15KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000420", nameEn: "CROISSANT CHOCOLATE 80 G (20KG)", nameAr: "CROISSANT CHOCOLATE 80 G (20KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000421", nameEn: "CROISSANT ZAATAR 80 G (20KG)", nameAr: "CROISSANT ZAATAR 80 G (20KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000422", nameEn: "CROISSANT STRAWBERRY 80 G (15KG)", nameAr: "CROISSANT STRAWBERRY 80 G (15KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000423", nameEn: "PUFF STRAWBERRY 80 G (15KG)", nameAr: "PUFF STRAWBERRY 80 G (15KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000424", nameEn: "CROISSANT CHEESE (10KG)", nameAr: "CROISSANT CHEESE (10KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000425", nameEn: "CROISSANT CUSTARD 80 G (10KG)", nameAr: "CROISSANT CUSTARD 80 G (10KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000426", nameEn: "PUFF CHEESE 80 G (10KG)", nameAr: "PUFF CHEESE 80 G (10KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000427", nameEn: "PUFF APPLE 80 G (15KG)", nameAr: "PUFF APPLE 80 G (15KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000428", nameEn: "PLAIN ROLL FOR ENGLISH CAKE (28KG)", nameAr: "PLAIN ROLL FOR ENGLISH CAKE (28KG)", itemType: "raw_material" as const, uomCode: "KG", basePrice: 15.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000429", nameEn: "RUSK ZATAR BOX 330 G", nameAr: "RUSK ZATAR BOX 330 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.78, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000430", nameEn: "RUSK FAMILY BOX 330 G", nameAr: "RUSK FAMILY BOX 330 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.78, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000431", nameEn: "RUSK FIBER BOX 330 G", nameAr: "RUSK FIBER BOX 330 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.78, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000432", nameEn: "RUSK OMEGA BOX 330 G", nameAr: "RUSK OMEGA BOX 330 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.78, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000433", nameEn: "RUSK SOYA BOX 330 G", nameAr: "RUSK SOYA BOX 330 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.78, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000434", nameEn: "RUSK SLIM BOX 330 G", nameAr: "RUSK SLIM BOX 330 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.78, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000435", nameEn: "RUSK PLAIN BOX 330 G", nameAr: "RUSK PLAIN BOX 330 G", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.65, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000436", nameEn: "KAAK ZATAR (STICKER)", nameAr: "KAAK ZATAR (STICKER)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000437", nameEn: "KAAK SESAME (STICKER)", nameAr: "KAAK SESAME (STICKER)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000438", nameEn: "KAAK SHAMI 200 G (STICKER)", nameAr: "KAAK SHAMI 200 G (STICKER)", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000439", nameEn: "DATES ENGLISH CAKE STICKER", nameAr: "DATES ENGLISH CAKE STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000440", nameEn: "FRUIT ENGLISH CAKE STICKER", nameAr: "FRUIT ENGLISH CAKE STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000441", nameEn: "MARRBL ENGLISH CAKE STICKER", nameAr: "MARRBL ENGLISH CAKE STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000442", nameEn: "CHOCOLATE ENGLISH CAKE STICKER", nameAr: "CHOCOLATE ENGLISH CAKE STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000443", nameEn: "VANILLA ENGLISH CAKE STICKER", nameAr: "VANILLA ENGLISH CAKE STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.3, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000444", nameEn: "ENGLISH CAKE TRAY", nameAr: "ENGLISH CAKE TRAY", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.75, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000445", nameEn: "KAAK BOXES", nameAr: "KAAK BOXES", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.58, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000446", nameEn: "BREAD CRUMBS 500g PKT PLASTIC", nameAr: "BREAD CRUMBS 500g PKT PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000447", nameEn: "CROISSANT 60g (Vanilla Cream) STICKER", nameAr: "CROISSANT 60g (Vanilla Cream) STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000448", nameEn: "CROISSANT 60g (Chocolate) STICKER", nameAr: "CROISSANT 60g (Chocolate) STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000449", nameEn: "CROISSANT 60g (Apples & Cinnemon) STICKER", nameAr: "CROISSANT 60g (Apples & Cinnemon) STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000450", nameEn: "CROISSANT 60g (Cheese) STICKER", nameAr: "CROISSANT 60g (Cheese) STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000451", nameEn: "CHEESE & BUTTER CROISSANT 60g STICKER", nameAr: "CHEESE & BUTTER CROISSANT 60g STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000452", nameEn: "RUSK 165g PKT PLASTIC", nameAr: "RUSK 165g PKT PLASTIC", itemType: "raw_material" as const, uomCode: "KG", basePrice: 13.0, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000453", nameEn: "Vinegar 3.78x4", nameAr: "Vinegar 3.78x4", itemType: "raw_material" as const, uomCode: "LTR", basePrice: 1.15, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000454", nameEn: "Tortilla Bread", nameAr: "Tortilla Bread", itemType: "raw_material" as const, uomCode: "PAC", basePrice: 5.83, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000455", nameEn: "Bread Crumbs 500g", nameAr: "Bread Crumbs 500g", itemType: "raw_material" as const, uomCode: "PAC", basePrice: 1.2, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000456", nameEn: "Bread Crumbs 1kg", nameAr: "Bread Crumbs 1kg", itemType: "raw_material" as const, uomCode: "KG", basePrice: 2.38, purchaseType: "RM" as const, mgroup: "RM Dry" },
  { code: "1000457", nameEn: "PLAIN BIG BAG", nameAr: "PLAIN BIG BAG", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.4, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000458", nameEn: "VANILLA MUFFIN STICKER", nameAr: "VANILLA MUFFIN STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000459", nameEn: "CHOCOLATE MUFFIN STICKER", nameAr: "CHOCOLATE MUFFIN STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000460", nameEn: "ZAATAR PUFF STICKER", nameAr: "ZAATAR PUFF STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000461", nameEn: "BANANA MUFFIN STICKER", nameAr: "BANANA MUFFIN STICKER", itemType: "raw_material" as const, uomCode: "PC", basePrice: 0.06, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000462", nameEn: "STRAWBERRY CROISSANT 80G", nameAr: "STRAWBERRY CROISSANT 80G", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000463", nameEn: "STRAWBERRY CROISSANT 60g", nameAr: "STRAWBERRY CROISSANT 60g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000464", nameEn: "STRAWBERRY PUFF 80g", nameAr: "STRAWBERRY PUFF 80g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000465", nameEn: "CHOCOLATE CROISSANT 80g", nameAr: "CHOCOLATE CROISSANT 80g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000466", nameEn: "PIZZA BASE 10pcs", nameAr: "PIZZA BASE 10pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000467", nameEn: "MILK BREAD 750g", nameAr: "MILK BREAD 750g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000468", nameEn: "SLICE MILK BREAD 350g", nameAr: "SLICE MILK BREAD 350g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000469", nameEn: "SLICE MILK BREAD 650g", nameAr: "SLICE MILK BREAD 650g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000470", nameEn: "SLICE WHITE BREAD 600g", nameAr: "SLICE WHITE BREAD 600g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 4.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000471", nameEn: "SLICE WHITE BREAD 350g", nameAr: "SLICE WHITE BREAD 350g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000472", nameEn: "ABL BROWN BREAD 750g", nameAr: "ABL BROWN BREAD 750g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000473", nameEn: "SLICE BROWN BREAD 350g", nameAr: "SLICE BROWN BREAD 350g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 4.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000474", nameEn: "SLICE BROWN BREAD 650g", nameAr: "SLICE BROWN BREAD 650g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000475", nameEn: "SLICE MULTICEREAL BREAD 350g", nameAr: "SLICE MULTICEREAL BREAD 350g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 4.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000476", nameEn: "SLICE MULTICEREAL BREAD 650g", nameAr: "SLICE MULTICEREAL BREAD 650g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 6.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000477", nameEn: "HOTDOG 6pcs Set", nameAr: "HOTDOG 6pcs Set", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000478", nameEn: "HOTDOG COMBO 5pcs Set", nameAr: "HOTDOG COMBO 5pcs Set", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000479", nameEn: "Hamburger 4pcs Set", nameAr: "Hamburger 4pcs Set", itemType: "finished_good" as const, uomCode: "PC", basePrice: 2.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000480", nameEn: "Hamburger Big 2pcs Set", nameAr: "Hamburger Big 2pcs Set", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000481", nameEn: "Hamburger 6pcs Set", nameAr: "Hamburger 6pcs Set", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000482", nameEn: "Large Burger 350g Single", nameAr: "Large Burger 350g Single", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000483", nameEn: "Morning Roll 15pcs", nameAr: "Morning Roll 15pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000484", nameEn: "Dinner Roll", nameAr: "Dinner Roll", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000485", nameEn: "Butter Roll", nameAr: "Butter Roll", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000486", nameEn: "CHAI BUN 60g", nameAr: "CHAI BUN 60g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.75, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000487", nameEn: "CREAM BUN 80g", nameAr: "CREAM BUN 80g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.8, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000488", nameEn: "DATE ROLL 90g", nameAr: "DATE ROLL 90g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000489", nameEn: "Hotdog Big 3pcs", nameAr: "Hotdog Big 3pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 4.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000490", nameEn: "Hotdog Medium 5pcs", nameAr: "Hotdog Medium 5pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000491", nameEn: "Hotdog Mini 8pcs", nameAr: "Hotdog Mini 8pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000492", nameEn: "English Cake Vanilla 250g", nameAr: "English Cake Vanilla 250g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000493", nameEn: "English Cake Chocolate 250g", nameAr: "English Cake Chocolate 250g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000494", nameEn: "English Cake Fruite 250g", nameAr: "English Cake Fruite 250g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000495", nameEn: "English Cake Dates 250g", nameAr: "English Cake Dates 250g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000496", nameEn: "English Cake Marble 250g", nameAr: "English Cake Marble 250g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000497", nameEn: "Vanilla Cupcake 2pcs", nameAr: "Vanilla Cupcake 2pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.75, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000498", nameEn: "Vanilla Slice Cake 65g", nameAr: "Vanilla Slice Cake 65g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.75, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000499", nameEn: "Chocolate Slice Cake 60g", nameAr: "Chocolate Slice Cake 60g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.75, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000500", nameEn: "Marble Slice Cake 60g", nameAr: "Marble Slice Cake 60g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.75, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000501", nameEn: "CHEESE CROISSANT 80G", nameAr: "CHEESE CROISSANT 80G", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000502", nameEn: "CHEESE PUFF 80G", nameAr: "CHEESE PUFF 80G", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000503", nameEn: "APPLE PUFF 80G", nameAr: "APPLE PUFF 80G", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000504", nameEn: "ZAATAR CROISSANT 80g", nameAr: "ZAATAR CROISSANT 80g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 1.25, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000505", nameEn: "PLAIN CROISSANT 80g", nameAr: "PLAIN CROISSANT 80g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.9, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000506", nameEn: "POTATO BUN 6pcs", nameAr: "POTATO BUN 6pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 10.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000507", nameEn: "RED BUN 6pcs", nameAr: "RED BUN 6pcs", itemType: "finished_good" as const, uomCode: "PC", basePrice: 8.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000508", nameEn: "JUMBO WHITE 1100g", nameAr: "JUMBO WHITE 1100g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000509", nameEn: "JUMBO BROWN 1100g", nameAr: "JUMBO BROWN 1100g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 9.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000510", nameEn: "PREMIUM RUSK 330g", nameAr: "PREMIUM RUSK 330g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000511", nameEn: "ZAATAR TOAST 330g", nameAr: "ZAATAR TOAST 330g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000512", nameEn: "FAMILY TOAST 330g", nameAr: "FAMILY TOAST 330g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000513", nameEn: "FIBER TOAST 330g", nameAr: "FIBER TOAST 330g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000514", nameEn: "Banana Cupcake 2p", nameAr: "Banana Cupcake 2p", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.75, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000515", nameEn: "Vanilla Muffin 60g (Tulip)", nameAr: "Vanilla Muffin 60g (Tulip)", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000516", nameEn: "Chocklate Muffin 60g (Tulip)", nameAr: "Chocklate Muffin 60g (Tulip)", itemType: "finished_good" as const, uomCode: "PC", basePrice: 3.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000517", nameEn: "Omega 3 Toast", nameAr: "Omega 3 Toast", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000518", nameEn: "Soya Toast", nameAr: "Soya Toast", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000519", nameEn: "Slim Toast", nameAr: "Slim Toast", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000520", nameEn: "Chapathi 4pcs set", nameAr: "Chapathi 4pcs set", itemType: "finished_good" as const, uomCode: "PC", basePrice: 0.8, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000521", nameEn: "Kaak  Shami", nameAr: "Kaak  Shami", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000522", nameEn: "Kaak Sesame", nameAr: "Kaak Sesame", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000523", nameEn: "Kaak Zatar", nameAr: "Kaak Zatar", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000524", nameEn: "French Bread 350g", nameAr: "French Bread 350g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.5, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000525", nameEn: "Yellow Bread/Potato 750g", nameAr: "Yellow Bread/Potato 750g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 7.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000526", nameEn: "Bread Crumbs 500g", nameAr: "Bread Crumbs 500g", itemType: "finished_good" as const, uomCode: "PC", basePrice: 4.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000527", nameEn: "Bread Crumbs 1kg", nameAr: "Bread Crumbs 1kg", itemType: "finished_good" as const, uomCode: "PC", basePrice: 5.0, purchaseType: "RM" as const, mgroup: "FG" },
  { code: "1000528", nameEn: "PLAIN PLASTICK 14KG", nameAr: "PLAIN PLASTICK 14KG", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.5, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000529", nameEn: "CROISSANT & DISPLAY BOX", nameAr: "CROISSANT & DISPLAY BOX", itemType: "raw_material" as const, uomCode: "PC", basePrice: 2.9, purchaseType: "PACK" as const, mgroup: "Packaging" },
  { code: "1000530", nameEn: "Flex Seed 1x15 Kg", nameAr: "Flex Seed 1x15 Kg", itemType: "raw_material" as const, uomCode: "KG", basePrice: 9.3333, purchaseType: "RM" as const, mgroup: "RM Dry" },
];

export const seedWHItems = mutation({
  args: {},
  handler: async (ctx: any) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found");

    // ── Ensure required UOMs exist ──────────────────────────────────────────
    const allUoms = await ctx.db.query("unitOfMeasure")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();

    async function getOrCreateUom(code: string, nameAr: string, nameEn: string) {
      const found = allUoms.find((u: any) => u.code === code);
      if (found) return found._id;
      const id = await ctx.db.insert("unitOfMeasure", {
        companyId: company._id, code, nameAr, nameEn,
        isBase: true, conversionFactor: 1, isActive: true,
      });
      allUoms.push({ _id: id, code, companyId: company._id });
      return id;
    }

    const uomIds: Record<string, any> = {
      PC:  await getOrCreateUom("PC",  "قطعة",       "Piece"),
      KG:  await getOrCreateUom("KG",  "كيلو جرام",   "Kilogram"),
      LTR: await getOrCreateUom("LTR", "لتر",         "Litre"),
      PAC: await getOrCreateUom("PAC", "عبوة",        "Pack"),
    };

    // ── Load all existing items ─────────────────────────────────────────────
    const allExisting = await ctx.db.query("items")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();

    const existingByCode = new Map(allExisting.map((i: any) => [i.code, i]));

    // ── Only process non-FG WH items (154 items: RM Dry + Packaging + Others)
    const WH_RM_ITEMS = WH_ITEMS.filter((i) => i.mgroup !== "FG");
    const whRmCodes = new Set(WH_RM_ITEMS.map((i) => i.code));

    // Items to delete: non-FG items NOT in the 154 WH RM list
    const toDelete = allExisting.filter(
      (i: any) => i.itemType !== "finished_good" && !whRmCodes.has(i.code)
    );
    const toDeleteIds = new Set(toDelete.map((i: any) => i._id));

    // ── Preload related tables ONCE to avoid per-item full-table scans ──────
    // supplierItems: by_company scan once → group by itemId in memory
    const allSupplierLinks = await ctx.db.query("supplierItems")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const supplierLinksByItem = new Map<string, any[]>();
    for (const sl of allSupplierLinks) {
      if (sl.itemId) {
        if (!supplierLinksByItem.has(sl.itemId)) supplierLinksByItem.set(sl.itemId, []);
        supplierLinksByItem.get(sl.itemId)!.push(sl);
      }
    }

    // productionOrders: by_company scan once → group by outputItemId in memory
    const allProdOrders = await ctx.db.query("productionOrders")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const prodOrdersByItem = new Map<string, any[]>();
    for (const po of allProdOrders) {
      if (po.outputItemId) {
        if (!prodOrdersByItem.has(po.outputItemId)) prodOrdersByItem.set(po.outputItemId, []);
        prodOrdersByItem.get(po.outputItemId)!.push(po);
      }
    }

    // ── Batch cascade delete using in-memory maps (no per-item full scans) ──
    let deleted = 0;
    for (const item of toDelete) {
      // stockBalance: indexed by item — 1 indexed read per item (fine)
      const balances = await ctx.db.query("stockBalance")
        .withIndex("by_item_warehouse", (q: any) => q.eq("itemId", item._id))
        .collect();
      for (const b of balances) await ctx.db.delete(b._id);

      // supplierItems: from preloaded map (0 reads)
      for (const sl of supplierLinksByItem.get(item._id) ?? [])
        await ctx.db.delete(sl._id);

      // recipes: indexed by outputItemId — 1 indexed read per item (fine)
      const recipes = await ctx.db.query("recipes")
        .withIndex("by_output_item", (q: any) => q.eq("outputItemId", item._id))
        .collect();
      for (const recipe of recipes) {
        const rLines = await ctx.db.query("recipeLines")
          .withIndex("by_recipe", (q: any) => q.eq("recipeId", recipe._id))
          .collect();
        for (const rl of rLines) await ctx.db.delete(rl._id);
        await ctx.db.delete(recipe._id);
      }

      // productionOrders: from preloaded map (0 reads)
      for (const po of prodOrdersByItem.get(item._id) ?? []) {
        const poLines = await ctx.db.query("productionOrderLines")
          .withIndex("by_order", (q: any) => q.eq("orderId", po._id))
          .collect();
        for (const pol of poLines) await ctx.db.delete(pol._id);
        await ctx.db.delete(po._id);
      }

      await ctx.db.delete(item._id);
      deleted++;
    }

    // ── Upsert 154 WH RM/Packaging/Others items ─────────────────────────────
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const item of WH_RM_ITEMS) {
      const uomId = uomIds[item.uomCode] ?? uomIds.PC;
      const existing = existingByCode.get(item.code);

      if (existing) {
        // Update name, price, uom — preserve any linked transactions
        await ctx.db.patch(existing._id, {
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          normalizedName: item.nameEn.toUpperCase().trim(),
          baseUomId: uomId,
          lastCost: item.basePrice,
          standardCost: item.basePrice,
          purchaseType: item.purchaseType,
          purchaseCategory: item.mgroup,
          isActive: true,
        });
        updated++;
      } else {
        await ctx.db.insert("items", {
          companyId: company._id,
          code: item.code,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          itemType: "raw_material",
          baseUomId: uomId,
          costingMethod: "weighted_average",
          lastCost: item.basePrice,
          standardCost: item.basePrice,
          allowNegativeStock: false,
          isActive: true,
          createdAt: now,
          normalizedName: item.nameEn.toUpperCase().trim(),
          purchaseType: item.purchaseType,
          purchaseCategory: item.mgroup,
          externalCode: item.code,
          externalSource: "wh_xlsx",
        });
        inserted++;
      }
    }

    const fgKept = allExisting.filter((i: any) => i.itemType === "finished_good").length;
    return { deleted, inserted, updated, fgKept, totalWH: WH_RM_ITEMS.length };
  },
});

// ── April 2026 Supplier + SupplierItems seed ────────────────────────────────
// 20 suppliers, 65 item-supplier links derived from April 2026 purchases
// Each entry: [itemCode, supplierName, purchaseUom, purchasePrice, baseUom, conv, supplierItemName]
const APRIL_SUPPLIER_LINKS: Array<{
  itemCode: string;
  supplierName: string;
  purchaseUom: string;
  purchasePrice: number;
  baseUom: string;
  conv: number;
  supplierItemName: string;
}> = [
  { itemCode: "1000311", supplierName: "HOLLANDI",           purchaseUom: "KG",   purchasePrice: 70.0,  baseUom: "KG",   conv: 2.7,     supplierItemName: "APPLE FILLING ( 2.7Kg )" },
  { itemCode: "1000312", supplierName: "Al Ajmera",          purchaseUom: "BAG",  purchasePrice: 290.0, baseUom: "KG",   conv: 25.0,    supplierItemName: "AREEJ MARGARINE (25Kg )" },
  { itemCode: "1000313", supplierName: "RAWABI",             purchaseUom: "CRT",  purchasePrice: 73.0,  baseUom: "PCS",  conv: 500.0,   supplierItemName: "BAKING PAPER (1X500 Pcs)" },
  { itemCode: "1000313", supplierName: "REALPACK",           purchaseUom: "CRT",  purchasePrice: 75.0,  baseUom: "PCS",  conv: 500.0,   supplierItemName: "BAKING PAPER (1X500 Pcs)" },
  { itemCode: "1000314", supplierName: "HOLLANDI",           purchaseUom: "BAG",  purchasePrice: 78.0,  baseUom: "KG",   conv: 10.0,    supplierItemName: "BAKING POWDER (10Kg )" },
  { itemCode: "1000316", supplierName: "Al Ajmera",          purchaseUom: "BAG",  purchasePrice: 150.0, baseUom: "KG",   conv: 10.0,    supplierItemName: "BREAD IMPROVER (10Kg )" },
  { itemCode: "1000318", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "BROWN BREAD 25x40" },
  { itemCode: "1000319", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "BURGER BUN 4 PCS (10x12)" },
  { itemCode: "1000321", supplierName: "HOLLANDI",           purchaseUom: "PACK", purchasePrice: 72.0,  baseUom: "KG",   conv: 5.0,     supplierItemName: "CAKE GEL (1 Pack X 5Kg)" },
  { itemCode: "1000322", supplierName: "GULF STREAM",        purchaseUom: "BAG",  purchasePrice: 350.0, baseUom: "KG",   conv: 20.0,    supplierItemName: "CALCIUM PROPIONATE (20KG)" },
  { itemCode: "1000371", supplierName: "RAWABI",             purchaseUom: "BAG",  purchasePrice: 120.0, baseUom: "KG",   conv: 50.0,    supplierItemName: "CHAKKI ATTA FLOUR ( 50Kg )" },
  { itemCode: "1000410", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "CHAPATI 4PCS SET PLASTIC" },
  { itemCode: "1000323", supplierName: "PRINT CARE",         purchaseUom: "PCS",  purchasePrice: 0.1,   baseUom: "PCS",  conv: 1.0,     supplierItemName: "CHINA PAPER STICKER 6CM*6CM 2" },
  { itemCode: "1000324", supplierName: "HOLLANDI",           purchaseUom: "PCS",  purchasePrice: 90.0,  baseUom: "KG",   conv: 5.0,     supplierItemName: "CHOCKLATE FILLING ( 5Kg )" },
  { itemCode: "1000325", supplierName: "RAWABI",             purchaseUom: "PCS",  purchasePrice: 60.0,  baseUom: "KG",   conv: 5.0,     supplierItemName: "CLING FILM 1X45CM 5KG (JMBO)" },
  { itemCode: "1000326", supplierName: "Cash/delta",         purchaseUom: "CRT",  purchasePrice: 280.0, baseUom: "PAIR", conv: 400.0,   supplierItemName: "COTTON GLOVES (10PAIR/PKT)" },
  { itemCode: "1000328", supplierName: "AL WAJBA",           purchaseUom: "KG",   purchasePrice: 22.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "CREAM CHEESE (1Kg )" },
  { itemCode: "1000329", supplierName: "QNITED",             purchaseUom: "CRT",  purchasePrice: 135.0, baseUom: "KG",   conv: 10.0,    supplierItemName: "CROISSANT BUTTER ( 10KG )" },
  { itemCode: "1000331", supplierName: "HOTPACK",            purchaseUom: "CRT",  purchasePrice: 330.0, baseUom: "PCS",  conv: 20000.0, supplierItemName: "CUP CAKE PAPER (20X1000pcs) 9.5CM" },
  { itemCode: "1000331", supplierName: "CASH/ROBBY",         purchaseUom: "CRT",  purchasePrice: 180.0, baseUom: "PCS",  conv: 25000.0, supplierItemName: "CUP CAKE PAPER (25X1000pcs) 9.5CM" },
  { itemCode: "1000327", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 17.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "Cream Bun PLASTIC 10kg/roll" },
  { itemCode: "1000332", supplierName: "Al Ajmera",          purchaseUom: "CRT",  purchasePrice: 108.0, baseUom: "KG",   conv: 12.0,    supplierItemName: "DATES PASTE ( 1Kg*12 )" },
  { itemCode: "1000333", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "DINNER ROLL 7x14" },
  { itemCode: "1000334", supplierName: "VALENCIA",           purchaseUom: "CRT",  purchasePrice: 123.0, baseUom: "KG",   conv: 10.0,    supplierItemName: "DRY YEAST (500g X 20)" },
  { itemCode: "1000444", supplierName: "REALPACK",           purchaseUom: "PCS",  purchasePrice: 0.75,  baseUom: "PCS",  conv: 1.0,     supplierItemName: "ENGLISH CAKE TRAY/PAN CAKE 800PCS" },
  { itemCode: "1000335", supplierName: "RAWABI",             purchaseUom: "BOX",  purchasePrice: 3.75,  baseUom: "BOX",  conv: 1.0,     supplierItemName: "FACE MASK 1X50PCS" },
  { itemCode: "1000393", supplierName: "QFM",                purchaseUom: "BAG",  purchasePrice: 22.0,  baseUom: "KG",   conv: 10.0,    supplierItemName: "FINE BRAN FLOUR (30KG)" },
  { itemCode: "1000530", supplierName: "BRADMA",             purchaseUom: "BAG",  purchasePrice: 140.0, baseUom: "KG",   conv: 15.0,    supplierItemName: "FLEX SEED (15 KG)" },
  { itemCode: "1000337", supplierName: "QFM",                purchaseUom: "BAG",  purchasePrice: 140.0, baseUom: "KG",   conv: 50.0,    supplierItemName: "FLOUR NO.1 (50Kg)" },
  { itemCode: "1000339", supplierName: "Al Ajmera",          purchaseUom: "CRT",  purchasePrice: 155.0, baseUom: "PCS",  conv: 360.0,   supplierItemName: "FRESH EGG (1Ctn X 360)" },
  { itemCode: "1000339", supplierName: "Abdul Rahman/Cash",  purchaseUom: "CRT",  purchasePrice: 96.0,  baseUom: "PCS",  conv: 360.0,   supplierItemName: "FRESH EGG (1Ctn X 360)" },
  { itemCode: "1000340", supplierName: "RAWABI",             purchaseUom: "CRT",  purchasePrice: 55.0,  baseUom: "CRT",  conv: 1.0,     supplierItemName: "GARBAGE BAG 124*140 10S" },
  { itemCode: "1000341", supplierName: "RAWABI",             purchaseUom: "TIN",  purchasePrice: 100.0, baseUom: "LTR",  conv: 15.0,    supplierItemName: "GHEE (15L )" },
  { itemCode: "1000342", supplierName: "VALENCIA",           purchaseUom: "BAG",  purchasePrice: 220.0, baseUom: "KG",   conv: 25.0,    supplierItemName: "GLUTEN (25Kg )" },
  { itemCode: "1000343", supplierName: "RAWABI",             purchaseUom: "CRT",  purchasePrice: 50.0,  baseUom: "PCS",  conv: 1000.0,  supplierItemName: "HAIR NET 10*100 PCS" },
  { itemCode: "1000345", supplierName: "Cash",               purchaseUom: "PAIR", purchasePrice: 5.0,   baseUom: "PAIR", conv: 1.0,     supplierItemName: "HAND GLOVES" },
  { itemCode: "1000344", supplierName: "CASH",               purchaseUom: "CRT",  purchasePrice: 280.0, baseUom: "PAIR", conv: 100.0,   supplierItemName: "HAND GLOVES BABY (10PAIR/PKT)" },
  { itemCode: "1000347", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "HOTDOG 6 PCS (18x9)" },
  { itemCode: "1000348", supplierName: "WEST BAY",           purchaseUom: "BAG",  purchasePrice: 12.5,  baseUom: "KG",   conv: 25.0,    supplierItemName: "ICE CUBE 25 KG" },
  { itemCode: "1000350", supplierName: "Al Ajmera",          purchaseUom: "CRT",  purchasePrice: 22.0,  baseUom: "CRT",  conv: 1.0,     supplierItemName: "MAXI ROLL 2PLY 400GRM (1X6)" },
  { itemCode: "1000351", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "MILK BREAD 750 G (10x16+2)" },
  { itemCode: "1000352", supplierName: "VALENCIA",           purchaseUom: "BAG",  purchasePrice: 240.0, baseUom: "KG",   conv: 25.0,    supplierItemName: "MILK POWDER (25KG)" },
  { itemCode: "1000352", supplierName: "Al Ajmera",          purchaseUom: "BAG",  purchasePrice: 220.0, baseUom: "KG",   conv: 25.0,    supplierItemName: "MILK POWDER (25KG)" },
  { itemCode: "1000353", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "MORNING ROLL 25x40" },
  { itemCode: "1000354", supplierName: "Al Ajmera",          purchaseUom: "CRT",  purchasePrice: 185.0, baseUom: "KG",   conv: 20.0,    supplierItemName: "MUNNA BUTTER (20Kg ) (Veg Shortning)" },
  { itemCode: "1000355", supplierName: "RAWABI",             purchaseUom: "PCS",  purchasePrice: 110.0, baseUom: "LTR",  conv: 17.0,    supplierItemName: "PALM OIL (17L)" },
  { itemCode: "1000355", supplierName: "BRADMA",             purchaseUom: "PCS",  purchasePrice: 113.0, baseUom: "LTR",  conv: 18.0,    supplierItemName: "PALM OIL (18L)" },
  { itemCode: "1000355", supplierName: "QFM",                purchaseUom: "PCS",  purchasePrice: 110.0, baseUom: "LTR",  conv: 18.0,    supplierItemName: "PALM OIL (18L)" },
  { itemCode: "1000357", supplierName: "QNITED",             purchaseUom: "BAG",  purchasePrice: 185.0, baseUom: "KG",   conv: 10.0,    supplierItemName: "ROGANA POWDER (10Kg )" },
  { itemCode: "1000358", supplierName: "RAWABI",             purchaseUom: "BAG",  purchasePrice: 20.0,  baseUom: "KG",   conv: 25.0,    supplierItemName: "SALT ( 25Kg )" },
  { itemCode: "1000359", supplierName: "Al Ajmera",          purchaseUom: "BAG",  purchasePrice: 145.0, baseUom: "KG",   conv: 15.0,    supplierItemName: "SESAME SEEDS ( 15Kg )" },
  { itemCode: "1000360", supplierName: "RAMELIE",            purchaseUom: "PCS",  purchasePrice: 165.0, baseUom: "PCS",  conv: 1.0,     supplierItemName: "SOLVENENT" },
  { itemCode: "1000361", supplierName: "RAWABI",             purchaseUom: "CRT",  purchasePrice: 100.0, baseUom: "KG",   conv: 20.0,    supplierItemName: "STRAWBERRY FILLING ( 5Kg X4)" },
  { itemCode: "1000363", supplierName: "BRADMA",             purchaseUom: "BAG",  purchasePrice: 110.0, baseUom: "KG",   conv: 50.0,    supplierItemName: "SUGAR (50Kg )" },
  { itemCode: "1000363", supplierName: "RAWABI",             purchaseUom: "BAG",  purchasePrice: 110.0, baseUom: "KG",   conv: 50.0,    supplierItemName: "SUGAR (50Kg )" },
  { itemCode: "1000363", supplierName: "QFM",                purchaseUom: "BAG",  purchasePrice: 108.0, baseUom: "KG",   conv: 50.0,    supplierItemName: "SUGAR (50Kg )" },
  { itemCode: "1000364", supplierName: "RAWABI",             purchaseUom: "BAG",  purchasePrice: 131.0, baseUom: "KG",   conv: 50.0,    supplierItemName: "SUGAR POWDER (50Kg )" },
  { itemCode: "1000367", supplierName: "RAWABI",             purchaseUom: "KG",   purchasePrice: 32.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "VANILLA POWDER" },
  { itemCode: "1000368", supplierName: "AMOUDI",             purchaseUom: "KG",   purchasePrice: 14.0,  baseUom: "KG",   conv: 1.0,     supplierItemName: "VANILLA SLICE CAKE 65G (7x4)" },
  { itemCode: "1000369", supplierName: "RAWABI",             purchaseUom: "CRT",  purchasePrice: 72.0,  baseUom: "PCS",  conv: 1000.0,  supplierItemName: "VINYL GLOVES (10X100P) L" },
  { itemCode: "1000370", supplierName: "HOLLANDI",           purchaseUom: "BAG",  purchasePrice: 350.0, baseUom: "KG",   conv: 25.0,    supplierItemName: "ZEDO PLUS (25Kg )" },
  // 3 new items from April not in WH list — added to items table as well
  { itemCode: "APR-001", supplierName: "VALENCIA",           purchaseUom: "BAG",  purchasePrice: 185.0, baseUom: "KG",   conv: 10.0,    supplierItemName: "BAKE XL ECO IMPROVER 10KG" },
  { itemCode: "APR-002", supplierName: "RAWABI",             purchaseUom: "BAG",  purchasePrice: 65.0,  baseUom: "KG",   conv: 25.0,    supplierItemName: "Detergent supper Excel 25 kg" },
  { itemCode: "APR-003", supplierName: "REALPACK",           purchaseUom: "CRT",  purchasePrice: 60.0,  baseUom: "PCS",  conv: 1000.0,  supplierItemName: "KITCHEN APRON (10X100PCS)" },
];

// 20 suppliers from April 2026 purchases
const APRIL_SUPPLIERS: Array<{ code: string; nameEn: string; nameAr: string }> = [
  { code: "SUP-001", nameEn: "BRADMA",            nameAr: "برادما" },
  { code: "SUP-002", nameEn: "RAWABI",             nameAr: "الروابي" },
  { code: "SUP-003", nameEn: "QFM",               nameAr: "مطاحن قطر" },
  { code: "SUP-004", nameEn: "VALENCIA",           nameAr: "فالنسيا" },
  { code: "SUP-005", nameEn: "HOLLANDI",           nameAr: "هولاندي" },
  { code: "SUP-006", nameEn: "QNITED",             nameAr: "كيونايتد" },
  { code: "SUP-007", nameEn: "Al Ajmera",          nameAr: "العجمية" },
  { code: "SUP-008", nameEn: "AMOUDI",             nameAr: "العمودي" },
  { code: "SUP-009", nameEn: "AL WAJBA",           nameAr: "الوجبة" },
  { code: "SUP-010", nameEn: "GULF STREAM",        nameAr: "جلف ستريم" },
  { code: "SUP-011", nameEn: "HOTPACK",            nameAr: "هوتباك" },
  { code: "SUP-012", nameEn: "WEST BAY",           nameAr: "ويست باي" },
  { code: "SUP-013", nameEn: "REALPACK",           nameAr: "ريلباك" },
  { code: "SUP-014", nameEn: "PRINT CARE",         nameAr: "برينت كير" },
  { code: "SUP-015", nameEn: "CASH/ROBBY",         nameAr: "كاش/روبي" },
  { code: "SUP-016", nameEn: "Cash/delta",         nameAr: "كاش/دلتا" },
  { code: "SUP-017", nameEn: "Abdul Rahman/Cash",  nameAr: "عبد الرحمن/كاش" },
  { code: "SUP-018", nameEn: "RAMELIE",            nameAr: "راميلي" },
  { code: "SUP-019", nameEn: "CASH",               nameAr: "كاش" },
  { code: "SUP-020", nameEn: "Cash",               nameAr: "كاش (متنوع)" },
];

export const seedSupplierLinks = mutation({
  args: {},
  handler: async (ctx: any) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found");

    // ── Find Accounts Payable account (code 2101) ──────────────────────────
    const apAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q: any) => q.eq("companyId", company._id).eq("code", "2101"))
      .first();
    if (!apAccount) throw new Error("Account 2101 (Accounts Payable) not found");

    const now = Date.now();

    // ── Upsert suppliers (match by normalizedName) ─────────────────────────
    const supplierIdMap = new Map<string, any>(); // nameEn -> _id
    let suppCreated = 0, suppExisting = 0;

    for (const s of APRIL_SUPPLIERS) {
      const normalized = s.nameEn.toUpperCase().trim();
      const existing = await ctx.db
        .query("suppliers")
        .withIndex("by_company_normalized", (q: any) =>
          q.eq("companyId", company._id).eq("normalizedName", normalized)
        )
        .first();

      if (existing) {
        supplierIdMap.set(s.nameEn, existing._id);
        suppExisting++;
      } else {
        const id = await ctx.db.insert("suppliers", {
          companyId: company._id,
          code: s.code,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          normalizedName: normalized,
          accountId: apAccount._id,
          isActive: true,
          createdAt: now,
          lastPurchaseDate: "2026-04-01",
          purchaseRows: 0,
          totalPurchases: 0,
        });
        supplierIdMap.set(s.nameEn, id);
        suppCreated++;
      }
    }

    // ── Ensure the 3 new April items exist in items table ─────────────────
    // Get or create UOMs (same approach as seedWHItems)
    const allUoms = await ctx.db.query("unitOfMeasure").collect();
    const uomByCode = new Map<string, any>();
    for (const u of allUoms) uomByCode.set(u.code, u._id);

    async function getOrCreateUomSL(code: string, nameAr: string, nameEn: string) {
      if (uomByCode.has(code)) return uomByCode.get(code)!;
      const id = await ctx.db.insert("unitOfMeasure", {
        companyId: company._id, code, nameAr, nameEn, isActive: true, createdAt: now,
        isBase: true, conversionFactor: 1,
      });
      uomByCode.set(code, id);
      return id;
    }

    const uomKG  = await getOrCreateUomSL("KG",  "كيلو جرام", "Kilogram");
    const uomPC  = await getOrCreateUomSL("PC",  "قطعة",      "Piece");
    const uomPCS = await getOrCreateUomSL("PCS", "قطعة",      "Piece");

    const getUom = (code: string) =>
      uomByCode.get(code) ?? uomPC;

    const newItems = [
      { code: "APR-001", nameEn: "BAKE XL ECO IMPROVER 10KG",  uom: "KG",  price: 18.5, purchaseType: "RM",     mgroup: "RM Dry" },
      { code: "APR-002", nameEn: "Detergent supper Excel 25 kg", uom: "KG", price: 2.6,  purchaseType: "OTHERS", mgroup: "Others" },
      { code: "APR-003", nameEn: "KITCHEN APRON (10X100PCS)",   uom: "PCS", price: 0.06, purchaseType: "OTHERS", mgroup: "Others" },
    ];
    let newItemsAdded = 0;
    for (const ni of newItems) {
      const ex = await ctx.db
        .query("items")
        .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
        .filter((q: any) => q.eq(q.field("code"), ni.code))
        .first();
      if (!ex) {
        await ctx.db.insert("items", {
          companyId: company._id,
          code: ni.code,
          nameAr: ni.nameEn,
          nameEn: ni.nameEn,
          itemType: "raw_material",
          baseUomId: getUom(ni.uom),
          costingMethod: "weighted_average",
          lastCost: ni.price,
          standardCost: ni.price,
          allowNegativeStock: false,
          isActive: true,
          createdAt: now,
          normalizedName: ni.nameEn.toUpperCase().trim(),
          purchaseType: ni.purchaseType as any,
          purchaseCategory: ni.mgroup,
          externalSource: "april_2026",
        });
        newItemsAdded++;
      }
    }

    // ── Build item code -> _id map ─────────────────────────────────────────
    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    const itemByCode = new Map<string, any>();
    for (const i of allItems) itemByCode.set(i.code, i._id);

    // ── Delete existing supplierItems for this company (fresh seed) ────────
    const existingLinks = await ctx.db
      .query("supplierItems")
      .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
      .collect();
    for (const link of existingLinks) await ctx.db.delete(link._id);

    // ── Insert supplierItems ───────────────────────────────────────────────
    let linked = 0, skipped = 0;
    for (const row of APRIL_SUPPLIER_LINKS) {
      const suppId = supplierIdMap.get(row.supplierName);
      const itemId = itemByCode.get(row.itemCode);
      if (!suppId) { skipped++; continue; }

      const basePrice = row.purchasePrice / row.conv;
      await ctx.db.insert("supplierItems", {
        companyId: company._id,
        supplierId: suppId,
        itemId: itemId ?? undefined,
        supplierItemName: row.supplierItemName,
        normalizedItemName: row.supplierItemName.toUpperCase().trim(),
        purchaseUom: row.purchaseUom,
        stockUom: row.baseUom,
        lastPrice: row.purchasePrice,
        avgPrice: row.purchasePrice,
        isUnresolved: itemId ? false : true,
        purchaseCount: 1,
        lastPurchaseDate: "2026-04-01",
        createdAt: now,
        notes: `conv:${row.conv} ${row.baseUom}/${row.purchaseUom} base:${basePrice.toFixed(4)} QAR/${row.baseUom}`,
      });
      linked++;
    }

    return { suppCreated, suppExisting, newItemsAdded, supplierLinksCreated: linked, skipped };
  },
});
