const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('Connecting to database...');

  // 1. Get first building
  const building = await db.building.findFirst();
  if (!building) {
    console.error('No building found in database.');
    return;
  }
  console.log(`Found building: "${building.name}"`);

  // 2. Get first student
  const student = await db.student.findFirst();
  if (!student) {
    console.error('No student found in database.');
    return;
  }
  console.log(`Found student: "${student.name}" (ID: ${student.id})`);

  // 3. Create building-specific announcement
  const announcementBuilding = await db.announcement.create({
    data: {
      title: `Notice for ${building.name} Residents`,
      content: 'Maintenance work is scheduled for this block on Friday.',
      targetGroup: building.name,
      createdBy: 'System Tester'
    }
  });
  console.log(`Created building announcement: ID = ${announcementBuilding.id}, Target = ${announcementBuilding.targetGroup}`);

  // 4. Create student-specific announcement
  const announcementStudent = await db.announcement.create({
    data: {
      title: 'Individual Security Verification Required',
      content: 'Dear resident, please visit the warden office to confirm your Aadhaar photo upload.',
      targetGroup: `STUDENT_${student.id}`,
      createdBy: 'System Tester'
    }
  });
  console.log(`Created student announcement: ID = ${announcementStudent.id}, Target = ${announcementStudent.targetGroup}`);

  console.log('Seeding complete successfully.');
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
