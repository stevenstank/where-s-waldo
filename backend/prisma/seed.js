require("dotenv").config();

const prisma = require("../config/prisma");

const levels = [
  {
    slug: "harbor-crowd",
    name: "Harbor Crowd",
    imageUrl:
      "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=2600&q=80",
    imageWidth: 2600,
    imageHeight: 1733,
    orderIndex: 1,
    targets: [
      {
        name: "Waldo",
        x: 1830,
        y: 960,
        width: 120,
        height: 210,
        positions: [
          { label: "A", x: 1830, y: 960, width: 120, height: 210 },
          { label: "B", x: 1660, y: 890, width: 120, height: 210 },
          { label: "C", x: 2010, y: 1020, width: 120, height: 210 },
        ],
      },
      { name: "Wizard", x: 720, y: 835, width: 105, height: 198 },
      { name: "Wilma", x: 2250, y: 690, width: 104, height: 190 },
    ],
  },
  {
    slug: "festival-square",
    name: "Festival Square",
    imageUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=2800&q=80",
    imageWidth: 2800,
    imageHeight: 1867,
    orderIndex: 2,
    targets: [
      {
        name: "Waldo",
        x: 1410,
        y: 1110,
        width: 126,
        height: 220,
        positions: [
          { label: "A", x: 1410, y: 1110, width: 126, height: 220 },
          { label: "B", x: 1220, y: 1030, width: 126, height: 220 },
          { label: "C", x: 1595, y: 1180, width: 126, height: 220 },
        ],
      },
      { name: "Wizard", x: 520, y: 970, width: 110, height: 205 },
    ],
  },
  {
    slug: "city-parade",
    name: "City Parade",
    imageUrl:
      "https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?auto=format&fit=crop&w=3000&q=80",
    imageWidth: 3000,
    imageHeight: 2000,
    orderIndex: 3,
    targets: [
      {
        name: "Waldo",
        x: 2130,
        y: 1035,
        width: 132,
        height: 230,
        positions: [
          { label: "A", x: 2130, y: 1035, width: 132, height: 230 },
          { label: "B", x: 1950, y: 980, width: 132, height: 230 },
          { label: "C", x: 2290, y: 1120, width: 132, height: 230 },
        ],
      },
      { name: "Wizard", x: 940, y: 945, width: 108, height: 200 },
      { name: "Wilma", x: 590, y: 885, width: 104, height: 190 },
    ],
  },
];

const seed = async () => {
  await prisma.$transaction(async (tx) => {
    for (const level of levels) {
      const upsertedLevel = await tx.level.upsert({
        where: { slug: level.slug },
        update: {
          name: level.name,
          imageUrl: level.imageUrl,
          imageWidth: level.imageWidth,
          imageHeight: level.imageHeight,
          orderIndex: level.orderIndex,
        },
        create: {
          slug: level.slug,
          name: level.name,
          imageUrl: level.imageUrl,
          imageWidth: level.imageWidth,
          imageHeight: level.imageHeight,
          orderIndex: level.orderIndex,
        },
      });

      for (const target of level.targets) {
        const upsertedTarget = await tx.target.upsert({
          where: {
            levelId_name: {
              levelId: upsertedLevel.id,
              name: target.name,
            },
          },
          update: {
            x: target.x,
            y: target.y,
            width: target.width,
            height: target.height,
          },
          create: {
            levelId: upsertedLevel.id,
            name: target.name,
            x: target.x,
            y: target.y,
            width: target.width,
            height: target.height,
          },
        });

        if (target.name === "Waldo") {
          const waldoPositions = Array.isArray(target.positions) && target.positions.length > 0
            ? target.positions
            : [
                {
                  label: "A",
                  x: target.x,
                  y: target.y,
                  width: target.width,
                  height: target.height,
                },
              ];

          for (const position of waldoPositions) {
            await tx.targetPosition.upsert({
              where: {
                targetId_label: {
                  targetId: upsertedTarget.id,
                  label: position.label,
                },
              },
              update: {
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
              },
              create: {
                targetId: upsertedTarget.id,
                label: position.label,
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
              },
            });
          }
        }
      }
    }
  });

  const levelCount = await prisma.level.count();
  const targetCount = await prisma.target.count();
  const targetPositionCount = await prisma.targetPosition.count();
  console.log(`Seed complete: ${levelCount} levels, ${targetCount} targets, ${targetPositionCount} target positions`);
};

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
