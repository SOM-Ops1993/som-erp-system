import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Please set it in backend/.env or your environment variables.",
  );
}

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

export async function connectDb() {
  console.log("Connecting to database...");
  await prisma.$connect();
  console.log("Database connected.");
  return prisma;
}

export async function disconnectDb() {
  await prisma.$disconnect();
  console.log("Database disconnected.");
}

export default prisma;
