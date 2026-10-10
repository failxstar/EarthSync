const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding EarthSync database with rich realistic data...');
  
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users for all roles
  const admin = await prisma.user.upsert({
    where: { email: 'admin@earthsync.local' },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      email: 'admin@earthsync.local',
      name: 'System Administrator',
      phone: '+1 (555) 000-0001',
      passwordHash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    },
  });

  const citizen = await prisma.user.upsert({
    where: { email: 'citizen@earthsync.local' },
    update: { passwordHash, role: 'CITIZEN' },
    create: {
      email: 'citizen@earthsync.local',
      name: 'Elena Rostova',
      phone: '+1 (555) 123-4567',
      passwordHash,
      role: 'CITIZEN',
      accountStatus: 'ACTIVE',
    },
  });

  const donor = await prisma.user.upsert({
    where: { email: 'donor@earthsync.local' },
    update: { passwordHash, role: 'DONOR' },
    create: {
      email: 'donor@earthsync.local',
      name: 'Marcus Vance',
      phone: '+1 (555) 234-5678',
      passwordHash,
      role: 'DONOR',
      accountStatus: 'ACTIVE',
    },
  });

  const recipient = await prisma.user.upsert({
    where: { email: 'recipient@earthsync.local' },
    update: { passwordHash, role: 'RECIPIENT' },
    create: {
      email: 'recipient@earthsync.local',
      name: 'Community Hope Center',
      phone: '+1 (555) 345-6789',
      passwordHash,
      role: 'RECIPIENT',
      accountStatus: 'ACTIVE',
    },
  });

  const provider = await prisma.user.upsert({
    where: { email: 'provider@earthsync.local' },
    update: { passwordHash, role: 'PROVIDER' },
    create: {
      email: 'provider@earthsync.local',
      name: 'EcoClean Municipal Services',
      phone: '+1 (555) 456-7890',
      passwordHash,
      role: 'PROVIDER',
      accountStatus: 'ACTIVE',
    },
  });

  const provider2 = await prisma.user.upsert({
    where: { email: 'greenworks@earthsync.local' },
    update: { passwordHash, role: 'PROVIDER' },
    create: {
      email: 'greenworks@earthsync.local',
      name: 'GreenWorks Water & Waste',
      phone: '+1 (555) 567-8901',
      passwordHash,
      role: 'PROVIDER',
      accountStatus: 'ACTIVE',
    },
  });

  console.log('Users initialized:', [admin.email, citizen.email, donor.email, recipient.email, provider.email, provider2.email]);

  // Clean existing dependent data for a clean idempotency run
  await prisma.auditLog.deleteMany({});
  await prisma.impactRecord.deleteMany({});
  await prisma.matchRecommendation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.reportAssignment.deleteMany({});
  await prisma.resourceRequest.deleteMany({});
  await prisma.environmentalReport.deleteMany({});
  await prisma.resource.deleteMany({});

  // 2. Create Sample Resources
  const r1 = await prisma.resource.create({
    data: {
      ownerId: donor.id,
      title: 'Fresh Organic Produce & Bakery Crates',
      description: '5 crates of fresh apples, kale, sourdough loaves, and tomatoes harvested yesterday from community garden.',
      category: 'FOOD',
      quantity: 50,
      unit: 'kg',
      condition: 'Excellent / Fresh',
      location: 'Green Market Hub, 742 Evergreen Terrace',
      latitude: 37.7749,
      longitude: -122.4194,
      imageUrls: ['https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80'],
      status: 'AVAILABLE',
      expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  });

  const r2 = await prisma.resource.create({
    data: {
      ownerId: donor.id,
      title: 'Refurbished Lenovo ThinkPad Laptops (x5)',
      description: 'Fully inspected and wiped business laptops with chargers. Intel i5, 16GB RAM, ready for educational centers or job training.',
      category: 'ELECTRONICS',
      quantity: 5,
      unit: 'units',
      condition: 'Refurbished / Working',
      location: 'Civic Innovation Lab, 450 Mission St',
      latitude: 37.7915,
      longitude: -122.3995,
      imageUrls: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'],
      status: 'AVAILABLE',
    },
  });

  const r3 = await prisma.resource.create({
    data: {
      ownerId: citizen.id,
      title: 'Winter Coats & Thermal Apparel Collection',
      description: '30 warm winter jackets, scarves, and insulated gloves in adult and children sizes. Clean and freshly laundered.',
      category: 'CLOTHING',
      quantity: 30,
      unit: 'items',
      condition: 'Gently Used',
      location: 'Community Center East, 1200 4th St',
      latitude: 37.7699,
      longitude: -122.4469,
      imageUrls: ['https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80'],
      status: 'AVAILABLE',
    },
  });

  const r4 = await prisma.resource.create({
    data: {
      ownerId: donor.id,
      title: 'Commercial Office Desks & Ergonomic Chairs',
      description: '8 modular bamboo work desks and 8 high-grade ergonomic mesh chairs from office downsizing.',
      category: 'FURNITURE',
      quantity: 8,
      unit: 'sets',
      condition: 'Good Condition',
      location: 'Bayview Logistics Yard, 2200 Jerrold Ave',
      latitude: 37.7420,
      longitude: -122.3970,
      imageUrls: ['https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'],
      status: 'AVAILABLE',
    },
  });

  const r5 = await prisma.resource.create({
    data: {
      ownerId: citizen.id,
      title: 'Clean Cardboard Boxes & Packing Supplies',
      description: 'Over 100 flattened corrugated moving boxes and bubble cushioning. Ideal for local packing or recycling programs.',
      category: 'RECYCLABLES',
      quantity: 120,
      unit: 'boxes',
      condition: 'Re-usable',
      location: 'South Park Depot, 55 2nd St',
      latitude: 37.7850,
      longitude: -122.4000,
      imageUrls: ['https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80'],
      status: 'COMPLETED',
    },
  });

  // 3. Create Resource Requests
  const req1 = await prisma.resourceRequest.create({
    data: {
      resourceId: r1.id,
      requesterId: recipient.id,
      quantityRequested: 25,
      message: 'We serve hot meals every evening to 80 families in our shelter. This produce will make an immediate impact.',
      status: 'PENDING',
    },
  });

  const req2 = await prisma.resourceRequest.create({
    data: {
      resourceId: r2.id,
      requesterId: recipient.id,
      quantityRequested: 2,
      message: 'Requesting 2 laptops for our computer literacy and resume building classes.',
      status: 'APPROVED',
    },
  });

  // 4. Create Environmental Reports
  const rep1 = await prisma.environmentalReport.create({
    data: {
      reporterId: citizen.id,
      title: 'Illegal Industrial Dumping near Creek Pathway',
      description: 'Observed approximately 15 paint barrels and construction chemical canisters discarded along the creek bank, presenting immediate water contamination risk.',
      category: 'ILLEGAL_DUMPING',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      location: 'Glen Canyon Park Creek Trail, South Ridge',
      latitude: 37.7380,
      longitude: -122.4410,
      imageUrls: ['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80'],
      aiClassificationResult: JSON.stringify({
        suggestedCategory: 'ILLEGAL_DUMPING',
        confidence: 0.96,
        priority: 'CRITICAL',
        riskFactors: ['Toxicity risk', 'Waterway proximity', 'Hazardous runoff'],
        recommendedAction: 'Immediate containment and HAZMAT retrieval',
      }),
    },
  });

  const rep2 = await prisma.environmentalReport.create({
    data: {
      reporterId: citizen.id,
      title: 'High-Volume Main Water Pipe Leak',
      description: 'Potable water main leaking continuously onto the road, flooding bicycle lane and wasting thousands of gallons per hour.',
      category: 'WATER_LEAKAGE',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      location: 'Corner of 16th St & Valencia St',
      latitude: 37.7648,
      longitude: -122.4214,
      imageUrls: ['https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80'],
      aiClassificationResult: JSON.stringify({
        suggestedCategory: 'WATER_LEAKAGE',
        confidence: 0.94,
        priority: 'HIGH',
        riskFactors: ['Substantial resource loss', 'Roadway hazard'],
        recommendedAction: 'Dispatch municipal plumbing utility for valve shutoff',
      }),
    },
  });

  const rep3 = await prisma.environmentalReport.create({
    data: {
      reporterId: citizen.id,
      title: 'Overflowing Public Recycling Bins & Scatter Waste',
      description: 'Multiple street bins have overflowed over the weekend and loose plastic/paper is blowing into adjacent stormwater drains.',
      category: 'WASTE',
      priority: 'MEDIUM',
      status: 'SUBMITTED',
      location: 'Mission Dolores Park Plaza',
      latitude: 37.7596,
      longitude: -122.4269,
      imageUrls: ['https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80'],
    },
  });

  const rep4 = await prisma.environmentalReport.create({
    data: {
      reporterId: citizen.id,
      title: 'Defective Streetlight Grid Causing Energy Surge',
      description: 'Cluster of 6 high-output streetlights cycling on and off continuously in daylight hours indicating sensor malfunction.',
      category: 'ENERGY',
      priority: 'LOW',
      status: 'RESOLVED',
      location: 'Sunset Blvd & Pacheco St',
      latitude: 37.7510,
      longitude: -122.4930,
      imageUrls: ['https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=800&q=80'],
    },
  });

  // 5. Create Report Assignments
  const asgn1 = await prisma.reportAssignment.create({
    data: {
      reportId: rep1.id,
      providerId: provider.id,
      assignedById: admin.id,
      status: 'IN_PROGRESS',
      notes: 'Dispatched rapid response HAZMAT containment unit with absorbent booms.',
    },
  });

  const asgn2 = await prisma.reportAssignment.create({
    data: {
      reportId: rep2.id,
      providerId: provider2.id,
      assignedById: admin.id,
      status: 'IN_PROGRESS',
      notes: 'Water crew en route with heavy replacement clamp and pipe section.',
    },
  });

  const asgn3 = await prisma.reportAssignment.create({
    data: {
      reportId: rep4.id,
      providerId: provider.id,
      assignedById: admin.id,
      status: 'COMPLETED',
      notes: 'Photo-eye sensors replaced on all 6 luminaires. Verified standard nighttime schedule.',
    },
  });

  // 6. Create Match Recommendation
  await prisma.matchRecommendation.create({
    data: {
      resourceId: r1.id,
      recipientId: recipient.id,
      matchScore: 0.94,
      explanation: 'Recipient organization Community Hope Center frequently requests food supplies and is located 1.2 miles away.',
      status: 'ACCEPTED',
    },
  });

  // 7. Create Impact Records
  await prisma.impactRecord.createMany({
    data: [
      {
        userId: donor.id,
        resourceId: r5.id,
        impactType: 'WASTE_DIVERTED',
        quantity: 120,
        unit: 'kg',
        calculationMethod: 'MATERIAL_WEIGHT',
        originalMeasurement: 120,
        originalUnit: 'boxes',
        conversionFactor: 1.0,
        isEstimated: false,
        verificationStatus: 'VERIFIED',
      },
      {
        userId: donor.id,
        resourceId: r5.id,
        impactType: 'CO2_SAVED',
        quantity: 240,
        unit: 'kg CO2e',
        calculationMethod: 'EPA_WARM_FACTOR',
        originalMeasurement: 120,
        originalUnit: 'kg',
        conversionFactor: 2.0,
        isEstimated: true,
        verificationStatus: 'VERIFIED',
      },
      {
        userId: provider.id,
        reportId: rep4.id,
        impactType: 'ENERGY_CONSERVED',
        quantity: 48,
        unit: 'kWh/day',
        calculationMethod: 'FIXTURE_WATTAGE_DELTA',
        originalMeasurement: 6,
        originalUnit: 'fixtures',
        conversionFactor: 8.0,
        isEstimated: false,
        verificationStatus: 'VERIFIED',
      },
      {
        userId: citizen.id,
        reportId: rep4.id,
        impactType: 'ISSUES_RESOLVED',
        quantity: 1,
        unit: 'issue',
        calculationMethod: 'COUNT',
        isEstimated: false,
        verificationStatus: 'VERIFIED',
      },
    ],
  });

  // 8. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: donor.id,
        title: 'New Resource Request',
        message: 'Community Hope Center has requested 25 kg of "Fresh Organic Produce & Bakery Crates".',
        type: 'RESOURCE_UPDATE',
        referenceId: req1.id,
        referenceType: 'REQUEST',
        isRead: false,
      },
      {
        userId: recipient.id,
        title: 'Request Approved!',
        message: 'Your request for "Refurbished Lenovo ThinkPad Laptops (x5)" was approved by the donor.',
        type: 'RESOURCE_UPDATE',
        referenceId: req2.id,
        referenceType: 'REQUEST',
        isRead: false,
      },
      {
        userId: provider.id,
        title: 'New Incident Assigned',
        message: 'You have been assigned to: "Illegal Industrial Dumping near Creek Pathway". Priority: CRITICAL.',
        type: 'REPORT_UPDATE',
        referenceId: rep1.id,
        referenceType: 'REPORT',
        isRead: false,
      },
      {
        userId: citizen.id,
        title: 'Report Update: In Progress',
        message: 'Your report "High-Volume Main Water Pipe Leak" is currently being worked on by GreenWorks Water & Waste.',
        type: 'REPORT_UPDATE',
        referenceId: rep2.id,
        referenceType: 'REPORT',
        isRead: true,
      },
      {
        userId: admin.id,
        title: 'New High Priority Incident',
        message: 'A critical environmental hazard has been reported: "Illegal Industrial Dumping near Creek Pathway".',
        type: 'SYSTEM',
        referenceId: rep1.id,
        referenceType: 'REPORT',
        isRead: false,
      },
    ],
  });

  // 9. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: 'ASSIGN_PROVIDER',
        entityType: 'REPORT',
        entityId: rep1.id,
        metadata: JSON.stringify({ providerId: provider.id, priority: 'CRITICAL' }),
      },
      {
        actorId: donor.id,
        action: 'APPROVE_REQUEST',
        entityType: 'RESOURCE_REQUEST',
        entityId: req2.id,
        metadata: JSON.stringify({ requesterId: recipient.id, quantity: 2 }),
      },
      {
        actorId: provider.id,
        action: 'RESOLVE_REPORT',
        entityType: 'REPORT',
        entityId: rep4.id,
        metadata: JSON.stringify({ resolutionTimeHours: 4.2 }),
      },
    ],
  });

  console.log('EarthSync database successfully seeded with all mock entities!');
}

main()
  .catch((e) => {
    console.error('Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
