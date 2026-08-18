const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await db.activityLog.deleteMany();
  await db.expense.deleteMany();
  await db.payment.deleteMany();
  await db.invoice.deleteMany();
  await db.admission.deleteMany();
  await db.bed.deleteMany();
  await db.room.deleteMany();
  await db.floor.deleteMany();
  await db.building.deleteMany();
  await db.document.deleteMany();
  await db.student.deleteMany();
  await db.permission.deleteMany();
  await db.user.deleteMany();
  await db.hostelSettings.deleteMany();

  console.log('Seeding settings...');
  const settings = await db.hostelSettings.create({
    data: {
      id: 'GLOBAL',
      hostelName: 'Home Stay Hostel',
      address: 'Plot 42, Tech Park Avenue, Block 3, Bengaluru, KA - 560103',
      phone: '+91 98765 43210',
      email: 'care@homestayhostel.com',
      website: 'www.homestayhostel.com',
      gstNumber: '29AAAAA1111A1Z1',
      defaultRent: 7500,
      defaultDueDateDay: 5,
      defaultLateFee: 250,
      invoicePrefix: 'HST-'
    }
  });

  console.log('Seeding users & permissions...');
  // Hashed passwords
  const ownerHash = await bcrypt.hash('owner123', 10);
  const wardenHash = await bcrypt.hash('warden123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const recepHash = await bcrypt.hash('recep123', 10);
  const studHash = await bcrypt.hash('student123', 10);

  // 1. Owner
  const owner = await db.user.create({
    data: {
      name: 'Aditya Vardhan',
      email: 'owner@homestayhostel.com',
      phone: '9988776655',
      password: ownerHash,
      role: 'OWNER',
      status: 'ACTIVE'
    }
  });

  // 2. Warden
  const warden = await db.user.create({
    data: {
      name: 'Ramesh Kumar',
      email: 'warden@homestayhostel.com',
      phone: '8877665544',
      password: wardenHash,
      role: 'WARDEN',
      status: 'ACTIVE'
    }
  });

  await db.permission.createMany({
    data: [
      { userId: warden.id, module: 'students', action: 'view' },
      { userId: warden.id, module: 'rooms', action: 'view' },
      { userId: warden.id, module: 'reports', action: 'view' }
    ]
  });

  // 3. Manager
  const manager = await db.user.create({
    data: {
      name: 'Sneha Reddy',
      email: 'manager@homestayhostel.com',
      phone: '7766554433',
      password: managerHash,
      role: 'MANAGER',
      status: 'ACTIVE'
    }
  });

  const managerPerms = [];
  const modules = ['students', 'rooms', 'payments', 'expenses', 'invoices', 'reports'];
  const actions = ['view', 'create', 'edit', 'delete'];
  modules.forEach(m => {
    actions.forEach(a => {
      managerPerms.push({ userId: manager.id, module: m, action: a });
    });
  });
  await db.permission.createMany({ data: managerPerms });

  // 4. Receptionist
  const receptionist = await db.user.create({
    data: {
      name: 'Pooja Sharma',
      email: 'recep@homestayhostel.com',
      phone: '6655443322',
      password: recepHash,
      role: 'RECEPTIONIST',
      status: 'ACTIVE'
    }
  });

  await db.permission.createMany({
    data: [
      { userId: receptionist.id, module: 'students', action: 'view' },
      { userId: receptionist.id, module: 'students', action: 'create' },
      { userId: receptionist.id, module: 'students', action: 'edit' },
      { userId: receptionist.id, module: 'rooms', action: 'view' },
      { userId: receptionist.id, module: 'payments', action: 'view' },
      { userId: receptionist.id, module: 'payments', action: 'create' },
      { userId: receptionist.id, module: 'invoices', action: 'view' },
      { userId: receptionist.id, module: 'invoices', action: 'create' }
    ]
  });

  console.log('Seeding hostel structure (Buildings, Floors, Rooms, Beds)...');
  
  // Building A
  const bA = await db.building.create({ data: { name: 'Block A (Boys Wing)' } });
  // Building B
  const bB = await db.building.create({ data: { name: 'Block B (Girls Wing)' } });

  // Floors
  const bA_f1 = await db.floor.create({ data: { number: 1, buildingId: bA.id } });
  const bA_f2 = await db.floor.create({ data: { number: 2, buildingId: bA.id } });
  const bA_f3 = await db.floor.create({ data: { number: 3, buildingId: bA.id } });

  const bB_f1 = await db.floor.create({ data: { number: 1, buildingId: bB.id } });
  const bB_f2 = await db.floor.create({ data: { number: 2, buildingId: bB.id } });

  // Rooms Data helper
  const roomsData = [
    // Block A, Floor 1
    { number: '101', type: 'AC Single', capacity: 1, rent: 14000, floorId: bA_f1.id, buildingId: bA.id, facilities: 'AC, Wifi, Private Washroom, Wardrobe' },
    { number: '102', type: 'Non-AC Double', capacity: 2, rent: 8000, floorId: bA_f1.id, buildingId: bA.id, facilities: 'Wifi, Shared Washroom, Balcony' },
    // Block A, Floor 2
    { number: '201', type: 'AC Double', capacity: 2, rent: 10000, floorId: bA_f2.id, buildingId: bA.id, facilities: 'AC, Wifi, Fridge, Private Washroom' },
    { number: '202', type: 'Non-AC Double', capacity: 2, rent: 8000, floorId: bA_f2.id, buildingId: bA.id, facilities: 'Wifi, Balcony' },
    { number: '203', type: 'AC Triple', capacity: 3, rent: 7500, floorId: bA_f2.id, buildingId: bA.id, facilities: 'AC, Wifi, Wardrobe' },
    // Block A, Floor 3
    { number: '301', type: 'Non-AC Triple', capacity: 3, rent: 6500, floorId: bA_f3.id, buildingId: bA.id, facilities: 'Wifi, Study Table' },
    { number: '302', type: 'Non-AC Quad', capacity: 4, rent: 5000, floorId: bA_f3.id, buildingId: bA.id, facilities: 'Wifi, Attached Balcony' },
    
    // Block B, Floor 1
    { number: 'G101', type: 'AC Single', capacity: 1, rent: 15000, floorId: bB_f1.id, buildingId: bB.id, facilities: 'AC, Wifi, Geyser, TV, Private Bath' },
    { number: 'G102', type: 'Non-AC Double', capacity: 2, rent: 8500, floorId: bB_f1.id, buildingId: bB.id, facilities: 'Wifi, Attached Bath' },
    // Block B, Floor 2
    { number: 'G201', type: 'AC Double', capacity: 2, rent: 11000, floorId: bB_f2.id, buildingId: bB.id, facilities: 'AC, Wifi, Geyser, Fridge' },
    { number: 'G202', type: 'Non-AC Triple', capacity: 3, rent: 7000, floorId: bB_f2.id, buildingId: bB.id, facilities: 'Wifi, Wardrobe' }
  ];

  const dbRooms = [];
  for (const r of roomsData) {
    const room = await db.room.create({
      data: {
        number: r.number,
        type: r.type,
        capacity: r.capacity,
        rent: r.rent,
        status: 'AVAILABLE',
        facilities: r.facilities,
        floorId: r.floorId,
        buildingId: r.buildingId
      }
    });
    dbRooms.push(room);

    // Create Beds
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < r.capacity; i++) {
      await db.bed.create({
        data: {
          name: `Bed ${alphabet[i]}`,
          status: 'AVAILABLE',
          roomId: room.id,
          buildingId: r.buildingId
        }
      });
    }
  }

  console.log('Seeding 35 students profiles (active, checked out, inactive)...');
  const rawStudents = [
    { name: 'Aarav Mehta', phone: '9000000001', email: 'aarav@gmail.com', dob: '2002-05-15', gender: 'MALE', address: 'Mumbai', collegeOrCompany: 'PES University', courseOrDept: 'CSE', idNumber: 'AADH1001', securityDeposit: 15000 },
    { name: 'Kabir Malhotra', phone: '9000000002', email: 'kabir@gmail.com', dob: '2001-10-20', gender: 'MALE', address: 'Delhi', collegeOrCompany: 'PES University', courseOrDept: 'ECE', idNumber: 'AADH1002', securityDeposit: 10000 },
    { name: 'Arjun Sen', phone: '9000000003', email: 'arjun@gmail.com', dob: '2003-02-12', gender: 'MALE', address: 'Kolkata', collegeOrCompany: 'PES University', courseOrDept: 'Mech', idNumber: 'AADH1003', securityDeposit: 10000 },
    { name: 'Rohan Joshi', phone: '9000000004', email: 'rohan@gmail.com', dob: '2000-08-05', gender: 'MALE', address: 'Pune', collegeOrCompany: 'TCS', courseOrDept: 'IT Support', idNumber: 'AADH1004', securityDeposit: 10000 },
    { name: 'Dhruv Nair', phone: '9000000005', email: 'dhruv@gmail.com', dob: '2002-11-30', gender: 'MALE', address: 'Kochi', collegeOrCompany: 'RV College', courseOrDept: 'CSE', idNumber: 'AADH1005', securityDeposit: 7500 },
    { name: 'Ishaan Verma', phone: '9000000006', email: 'ishaan@gmail.com', dob: '2001-04-25', gender: 'MALE', address: 'Lucknow', collegeOrCompany: 'Infosys', courseOrDept: 'Developer', idNumber: 'AADH1006', securityDeposit: 7500 },
    { name: 'Dev Sharma', phone: '9000000007', email: 'dev@gmail.com', dob: '2002-09-18', gender: 'MALE', address: 'Jaipur', collegeOrCompany: 'RV College', courseOrDept: 'ISE', idNumber: 'AADH1007', securityDeposit: 7500 },
    { name: 'Aditya Gupta', phone: '9000000008', email: 'aditya@gmail.com', dob: '2001-03-05', gender: 'MALE', address: 'Bhopal', collegeOrCompany: 'PES University', courseOrDept: 'MCA', idNumber: 'AADH1008', securityDeposit: 6500 },
    { name: 'Yash Vardhan', phone: '9000000009', email: 'yash@gmail.com', dob: '2002-07-22', gender: 'MALE', address: 'Patna', collegeOrCompany: 'PES University', courseOrDept: 'BBA', idNumber: 'AADH1009', securityDeposit: 6500 },
    { name: 'Rudra Singh', phone: '9000000010', email: 'rudra@gmail.com', dob: '2001-12-11', gender: 'MALE', address: 'Ranchi', collegeOrCompany: 'Cognizant', courseOrDept: 'Analyst', idNumber: 'AADH1010', securityDeposit: 6500 },
    { name: 'Ananya Iyer', phone: '9000000011', email: 'ananya@gmail.com', dob: '2002-01-19', gender: 'FEMALE', address: 'Chennai', collegeOrCompany: 'Mount Carmel', courseOrDept: 'BCom', idNumber: 'AADH1011', securityDeposit: 15000 },
    { name: 'Diya Murthy', phone: '9000000012', email: 'diya@gmail.com', dob: '2003-06-29', gender: 'FEMALE', address: 'Mysuru', collegeOrCompany: 'Mount Carmel', courseOrDept: 'BSc', idNumber: 'AADH1012', securityDeposit: 10000 },
    { name: 'Meera Rao', phone: '9000000013', email: 'meera@gmail.com', dob: '2001-08-14', gender: 'FEMALE', address: 'Mangaluru', collegeOrCompany: 'Accenture', courseOrDept: 'HR', idNumber: 'AADH1013', securityDeposit: 11000 },
    { name: 'Riya Banerjee', phone: '9000000014', email: 'riya@gmail.com', dob: '2002-03-08', gender: 'FEMALE', address: 'Kolkata', collegeOrCompany: 'Christ University', courseOrDept: 'Law', idNumber: 'AADH1014', securityDeposit: 11000 },
    { name: 'Sneha Paul', phone: '9000000015', email: 'sneha@gmail.com', dob: '2001-11-23', gender: 'FEMALE', address: 'Guwahati', collegeOrCompany: 'Christ University', courseOrDept: 'MA', idNumber: 'AADH1015', securityDeposit: 7000 },
    { name: 'Kavya Krishnan', phone: '9000000016', email: 'kavya@gmail.com', dob: '2002-04-03', gender: 'FEMALE', address: 'Thrissur', collegeOrCompany: 'Wipro', courseOrDept: 'QA', idNumber: 'AADH1016', securityDeposit: 7000 },
    { name: 'Zara Khan', phone: '9000000017', email: 'zara@gmail.com', dob: '2000-10-10', gender: 'FEMALE', address: 'Hyderabad', collegeOrCompany: 'Google', courseOrDept: 'Recruiter', idNumber: 'AADH1017', securityDeposit: 7000 },
    { name: 'Nisha Patil', phone: '9000000018', email: 'nisha@gmail.com', dob: '2002-09-02', gender: 'FEMALE', address: 'Hubli', collegeOrCompany: 'Christ University', courseOrDept: 'Psychology', idNumber: 'AADH1018', securityDeposit: 10000 },
    
    // Checked out students (Historical Data)
    { name: 'Tushar Sen', phone: '9000000019', email: 'tushar@gmail.com', dob: '1999-04-18', gender: 'MALE', address: 'Indore', collegeOrCompany: 'Capgemini', courseOrDept: 'Support', idNumber: 'AADH1019', securityDeposit: 0 },
    { name: 'Priya Das', phone: '9000000020', email: 'priya@gmail.com', dob: '2000-02-14', gender: 'FEMALE', address: 'Bhubaneswar', collegeOrCompany: 'IBM', courseOrDept: 'Consultant', idNumber: 'AADH1020', securityDeposit: 0 },
    { name: 'Rahul Roy', phone: '9000000021', email: 'rahul@gmail.com', dob: '1998-09-09', gender: 'MALE', address: 'Jamshedpur', collegeOrCompany: 'Oracle', courseOrDept: 'DBA', idNumber: 'AADH1021', securityDeposit: 0 },
    { name: 'Aditi Deshmukh', phone: '9000000022', email: 'aditi@gmail.com', dob: '1999-12-25', gender: 'FEMALE', address: 'Nagpur', collegeOrCompany: 'Microsoft', courseOrDept: 'Intern', idNumber: 'AADH1022', securityDeposit: 0 },

    // Inactive registered students
    { name: 'Manish Pandey', phone: '9000000023', email: 'manish@gmail.com', dob: '2003-01-05', gender: 'MALE', address: 'Dehradun', collegeOrCompany: 'PES University', courseOrDept: 'BTech', idNumber: 'AADH1023', securityDeposit: 0 },
    { name: 'Shruti Hegde', phone: '9000000024', email: 'shruti@gmail.com', dob: '2002-06-17', gender: 'FEMALE', address: 'Sirsi', collegeOrCompany: 'Mount Carmel', courseOrDept: 'BA', idNumber: 'AADH1024', securityDeposit: 0 },
    { name: 'Alok Mishra', phone: '9000000025', email: 'alok@gmail.com', dob: '2001-05-20', gender: 'MALE', address: 'Varanasi', collegeOrCompany: 'Infosys', courseOrDept: 'Trainee', idNumber: 'AADH1025', securityDeposit: 0 },
    
    // More active students to reach 30+ total registered
    { name: 'Siddharth Shah', phone: '9000000026', email: 'sid@gmail.com', dob: '2002-08-11', gender: 'MALE', address: 'Ahmedabad', collegeOrCompany: 'PES University', courseOrDept: 'CSE', idNumber: 'AADH1026', securityDeposit: 5000 },
    { name: 'Vikram Malhotra', phone: '9000000027', email: 'vikram@gmail.com', dob: '2001-07-04', gender: 'MALE', address: 'Chandigarh', collegeOrCompany: 'RV College', courseOrDept: 'CIVIL', idNumber: 'AADH1027', securityDeposit: 5000 },
    { name: 'Kunal Kapoor', phone: '9000000028', email: 'kunal@gmail.com', dob: '2003-03-23', gender: 'MALE', address: 'Ludhiana', collegeOrCompany: 'PES University', courseOrDept: 'BCA', idNumber: 'AADH1028', securityDeposit: 5000 },
    { name: 'Varun Dhawan', phone: '9000000029', email: 'varun@gmail.com', dob: '2002-12-12', gender: 'MALE', address: 'Mumbai', collegeOrCompany: 'NIFT', courseOrDept: 'Design', idNumber: 'AADH1029', securityDeposit: 5000 },
    { name: 'Tanvi Shah', phone: '9000000030', email: 'tanvi@gmail.com', dob: '2003-01-20', gender: 'FEMALE', address: 'Surat', collegeOrCompany: 'Mount Carmel', courseOrDept: 'BCA', idNumber: 'AADH1030', securityDeposit: 10000 },
    { name: 'Shreya Ghoshal', phone: '9000000031', email: 'shreya@gmail.com', dob: '2001-03-12', gender: 'FEMALE', address: 'Kolkata', collegeOrCompany: 'Christ University', courseOrDept: 'Music', idNumber: 'AADH1031', securityDeposit: 10000 },
    { name: 'Alia Bhatt', phone: '9000000032', email: 'alia@gmail.com', dob: '2002-03-15', gender: 'FEMALE', address: 'Mumbai', collegeOrCompany: 'St. Josephs', courseOrDept: 'BA', idNumber: 'AADH1032', securityDeposit: 8000 },
    { name: 'Kriti Sanon', phone: '9000000033', email: 'kriti@gmail.com', dob: '2001-07-27', gender: 'FEMALE', address: 'Noida', collegeOrCompany: 'Wipro', courseOrDept: 'Developer', idNumber: 'AADH1033', securityDeposit: 8500 },
    { name: 'Kiara Advani', phone: '9000000034', email: 'kiara@gmail.com', dob: '2002-07-31', gender: 'FEMALE', address: 'Mumbai', collegeOrCompany: 'Accenture', courseOrDept: 'Analyst', idNumber: 'AADH1034', securityDeposit: 8500 },
    { name: 'Shraddha Kapoor', phone: '9000000035', email: 'shraddha@gmail.com', dob: '2001-03-03', gender: 'FEMALE', address: 'Mumbai', collegeOrCompany: 'PES University', courseOrDept: 'MBA', idNumber: 'AADH1035', securityDeposit: 8500 }
  ];

  const dbStudents = [];
  for (const s of rawStudents) {
    // Determine status
    let status = 'ACTIVE';
    if (s.phone === '9000000023' || s.phone === '9000000024' || s.phone === '9000000025') {
      status = 'INACTIVE';
    } else if (s.phone === '9000000019' || s.phone === '9000000020' || s.phone === '9000000021' || s.phone === '9000000022') {
      status = 'CHECKED_OUT';
    }

    const studentId = 'stu' + (rawStudents.indexOf(s) + 1001);
    const student = await db.student.create({
      data: {
        id: studentId,
        name: s.name,
        phone: s.phone,
        email: s.email,
        dob: s.dob,
        gender: s.gender,
        address: s.address,
        emergencyContact: '9900990099',
        guardianName: 'Guardian ' + s.name.split(' ')[1],
        guardianPhone: '9900990098',
        collegeOrCompany: s.collegeOrCompany,
        courseOrDept: s.courseOrDept,
        idNumber: studentId.toUpperCase(),
        idProofType: 'Aadhaar Card',
        monthlyRent: 0, // Will be set on allocation
        securityDeposit: s.securityDeposit,
        status: status
      }
    });
    dbStudents.push(student);

    // Create user login record for student
    await db.user.create({
      data: {
        name: s.name,
        email: s.email,
        phone: s.phone,
        password: studHash,
        role: 'STUDENT',
        status: 'ACTIVE'
      }
    });
  }

  console.log('Allocating beds and setting up admissions, invoices, and payments...');
  
  // Fetch available beds
  const availableBedsList = await db.bed.findMany({
    include: {
      room: {
        include: {
          building: true,
          floor: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  let bedIndex = 0;
  const activeStudents = dbStudents.filter(s => s.status === 'ACTIVE');

  // Allocate beds for active students
  for (const s of activeStudents) {
    const bed = availableBedsList[bedIndex];
    if (!bed) break;

    // Set rent amount
    const rent = bed.room.rent;

    // Update student with bed rent
    await db.student.update({
      where: { id: s.id },
      data: {
        monthlyRent: rent,
        expectedCheckout: new Date('2027-05-30')
      }
    });

    // Update bed to occupied
    await db.bed.update({
      where: { id: bed.id },
      data: {
        status: 'OCCUPIED',
        studentId: s.id
      }
    });

    // Create active admission record
    const joiningDate = new Date('2026-06-01');
    await db.admission.create({
      data: {
        studentId: s.id,
        bedId: bed.id,
        bedName: bed.name,
        roomNumber: bed.room.number,
        buildingName: bed.room.building.name,
        floorNumber: bed.room.floor.number,
        rentAtAdmission: rent,
        joiningDate: joiningDate,
        status: 'ACTIVE'
      }
    });

    // Create invoices & payments historical data for the last 3 months
    // Months: June, July, August (current month)
    const billingMonths = [
      { start: new Date('2026-06-01'), end: new Date('2026-06-30'), due: new Date('2026-06-05'), payDate: new Date('2026-06-04'), status: 'PAID' },
      { start: new Date('2026-07-01'), end: new Date('2026-07-30'), due: new Date('2026-07-05'), payDate: new Date('2026-07-04'), status: 'PAID' },
      { start: new Date('2026-08-01'), end: new Date('2026-08-30'), due: new Date('2026-08-05'), payDate: null, status: 'PENDING' }
    ];

    // Seed historical invoices & payments
    for (let m = 0; m < billingMonths.length; m++) {
      const bMonth = billingMonths[m];
      
      // Some students can have overdue rent for August, some paid, some partially paid
      let invStatus = bMonth.status;
      let paidAmt = invStatus === 'PAID' ? rent : 0;
      
      if (m === 2) { // August (current month)
        const randVal = Math.random();
        if (randVal < 0.4) {
          invStatus = 'PAID';
          paidAmt = rent;
        } else if (randVal < 0.6) {
          invStatus = 'PARTIALLY_PAID';
          paidAmt = rent / 2;
        } else if (randVal < 0.9) {
          invStatus = 'PENDING';
          paidAmt = 0;
        } else {
          invStatus = 'OVERDUE'; // Overdue if unpaid and due date has passed (current date is Aug 15, due date was Aug 5)
          paidAmt = 0;
        }
      }

      const invNo = `PIN-20260${m + 6}-${s.phone.slice(-4)}-${m}`;
      const balance = rent - paidAmt;

      const invoice = await db.invoice.create({
        data: {
          invoiceNumber: invNo,
          studentId: s.id,
          studentName: s.name,
          roomNumber: bed.room.number,
          bedName: bed.name,
          billingPeriodStart: bMonth.start,
          billingPeriodEnd: bMonth.end,
          dueDate: bMonth.due,
          subtotal: rent,
          total: rent,
          paidAmount: paidAmt,
          balance: balance,
          status: invStatus,
          createdAt: bMonth.start
        }
      });

      if (paidAmt > 0) {
        const payDate = bMonth.payDate || new Date(`2026-08-${Math.floor(1 + Math.random() * 10)}`);
        const payRef = `PAY-20260${m + 6}${s.phone.slice(-4)}-${m}`;
        await db.payment.create({
          data: {
            paymentId: payRef,
            studentId: s.id,
            invoiceId: invoice.id,
            amount: paidAmt,
            date: payDate,
            method: m === 0 ? 'CASH' : 'UPI',
            notes: `Rent payment for ${bMonth.start.toLocaleString('default', { month: 'long' })}`,
            recordedBy: 'Sneha Reddy',
            createdAt: payDate
          }
        });
      }
    }

    bedIndex++;
  }

  // Update room status for all rooms
  const allRooms = await db.room.findMany({
    include: { beds: true }
  });
  for (const r of allRooms) {
    const totalBedsCount = r.beds.length;
    const occupiedCount = r.beds.filter(b => b.status === 'OCCUPIED').length;
    let roomStatus = 'AVAILABLE';
    if (occupiedCount === totalBedsCount) {
      roomStatus = 'FULL';
    } else if (occupiedCount > 0) {
      roomStatus = 'PARTIALLY_OCCUPIED';
    }
    await db.room.update({
      where: { id: r.id },
      data: { status: roomStatus }
    });
  }

  // Seed checked out student historical records
  const checkedOutStudents = dbStudents.filter(s => s.status === 'CHECKED_OUT');
  let checkoutIndex = 0;
  for (const s of checkedOutStudents) {
    const testBed = availableBedsList[bedIndex + checkoutIndex];
    if (!testBed) break;

    const rent = testBed.room.rent;
    
    // Create completed admission
    await db.admission.create({
      data: {
        studentId: s.id,
        bedId: testBed.id,
        bedName: testBed.name,
        roomNumber: testBed.room.number,
        buildingName: testBed.room.building.name,
        floorNumber: testBed.room.floor.number,
        rentAtAdmission: rent,
        joiningDate: new Date('2025-06-01'),
        checkoutDate: new Date('2026-05-15'),
        status: 'COMPLETED'
      }
    });

    // Create old invoices (all paid)
    await db.invoice.create({
      data: {
        invoiceNumber: `PIN-202506-HIST-${checkoutIndex}`,
        studentId: s.id,
        studentName: s.name,
        roomNumber: testBed.room.number,
        bedName: testBed.name,
        billingPeriodStart: new Date('2025-06-01'),
        billingPeriodEnd: new Date('2025-06-30'),
        dueDate: new Date('2025-06-05'),
        subtotal: rent,
        total: rent,
        paidAmount: rent,
        balance: 0,
        status: 'PAID'
      }
    });

    checkoutIndex++;
  }

  console.log('Seeding expenses...');
  const expensesList = [
    { amount: 15000, category: 'ELECTRICITY', date: new Date('2026-06-10'), description: 'Electricity bill for June - Block A & B' },
    { amount: 16500, category: 'ELECTRICITY', date: new Date('2026-07-12'), description: 'Electricity bill for July - Block A & B' },
    { amount: 14000, category: 'ELECTRICITY', date: new Date('2026-08-10'), description: 'Electricity bill for August advance' },
    { amount: 3500, category: 'WATER', date: new Date('2026-06-05'), description: 'Water tanker charges' },
    { amount: 3500, category: 'WATER', date: new Date('2026-07-06'), description: 'Water tanker charges' },
    { amount: 4000, category: 'INTERNET', date: new Date('2026-06-01'), description: 'High-speed broadband charges Block A & B' },
    { amount: 4000, category: 'INTERNET', date: new Date('2026-07-01'), description: 'High-speed broadband charges Block A & B' },
    { amount: 4000, category: 'INTERNET', date: new Date('2026-08-01'), description: 'High-speed broadband charges Block A & B' },
    { amount: 25000, category: 'SALARY', date: new Date('2026-06-30'), description: 'Salary payment to Warden Ramesh Kumar' },
    { amount: 25000, category: 'SALARY', date: new Date('2026-07-31'), description: 'Salary payment to Warden Ramesh Kumar' },
    { amount: 35000, category: 'SALARY', date: new Date('2026-06-30'), description: 'Salary payment to Manager Sneha Reddy' },
    { amount: 35000, category: 'SALARY', date: new Date('2026-07-31'), description: 'Salary payment to Manager Sneha Reddy' },
    { amount: 5000, category: 'MAINTENANCE', date: new Date('2026-06-15'), description: 'Repairs for elevator in Block A' },
    { amount: 8500, category: 'FOOD', date: new Date('2026-06-25'), description: 'Mess groceries and gas cylinder supply' },
    { amount: 9200, category: 'FOOD', date: new Date('2026-07-25'), description: 'Mess groceries and supplies' },
    { amount: 12000, category: 'CLEANING', date: new Date('2026-07-05'), description: 'Deep cleaning services for lobby and common areas' },
    { amount: 2300, category: 'REPAIRS', date: new Date('2026-08-05'), description: 'Geyser repair in Room 201 Block A' }
  ];

  for (const e of expensesList) {
    await db.expense.create({
      data: {
        amount: e.amount,
        category: e.category,
        date: e.date,
        description: e.description,
        addedBy: 'Aditya Vardhan'
      }
    });
  }

  console.log('Seeding activity logs...');
  const logsList = [
    { userName: 'Aditya Vardhan', action: 'LOGIN', module: 'AUTH', description: 'Logged in successfully as owner' },
    { userName: 'Aditya Vardhan', action: 'UPDATE_SETTINGS', module: 'SETTINGS', description: 'Updated PG name to Home Stay Hostel' },
    { userName: 'Aditya Vardhan', action: 'CREATE_STAFF', module: 'STAFF', description: 'Created staff account for Manager Sneha Reddy' },
    { userName: 'Sneha Reddy', action: 'REGISTER_STUDENT', module: 'STUDENTS', description: 'Registered student Aarav Mehta' },
    { userName: 'Sneha Reddy', action: 'ALLOCATE_BED', module: 'STUDENTS', description: 'Allocated Bed A in Room 101 to student Aarav Mehta' },
    { userName: 'Ramesh Kumar', action: 'UPDATE_BED_STATUS', module: 'ROOMS', description: 'Marked Bed B in Room G201 as under maintenance' },
    { userName: 'Sneha Reddy', action: 'RECORD_PAYMENT', module: 'PAYMENTS', description: 'Recorded payment of 10000 for invoice HST-202607-0011' }
  ];

  for (const l of logsList) {
    await db.activityLog.create({
      data: {
        userName: l.userName,
        action: l.action,
        module: l.module,
        description: l.description
      }
    });
  }

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
