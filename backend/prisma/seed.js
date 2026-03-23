require("dotenv").config();

const prisma = require("../config/prisma");

const characters = [
  { name: "Waldo", x: 45.2, y: 60.1, tolerance: 5.0 },
  { name: "Wizard", x: 30.4, y: 22.8, tolerance: 5.0 },
  { name: "Wilma", x: 67.9, y: 48.3, tolerance: 5.0 },
];

const seedCharacters = async () => {
  for (const character of characters) {
    await prisma.character.upsert({
      where: { name: character.name },
      update: {
        x: character.x,
        y: character.y,
        tolerance: character.tolerance,
      },
      create: character,
    });
  }

  console.log("Character seed complete");
};

seedCharacters()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
