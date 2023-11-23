-- CreateEnum
CREATE TYPE "Status" AS ENUM ('CREATED', 'RUNNING', 'STOPPED');

-- CreateTable
CREATE TABLE "EcsTask" (
    "taskArn" TEXT NOT NULL,
    "taskDefinitionArn" TEXT NOT NULL,
    "cpu" TEXT NOT NULL,
    "memory" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "taskCreatedAt" TIMESTAMP(3) NOT NULL,
    "taskStartedAt" TIMESTAMP(3),
    "taskStoppedAt" TIMESTAMP(3),
    "durationLimit" INTEGER NOT NULL,
    "publicIpAddresses" TEXT[],
    "networkInterfaceIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "extData" JSONB,

    CONSTRAINT "EcsTask_pkey" PRIMARY KEY ("taskArn")
);

-- CreateTable
CREATE TABLE "counters" (
    "count" INTEGER
);
