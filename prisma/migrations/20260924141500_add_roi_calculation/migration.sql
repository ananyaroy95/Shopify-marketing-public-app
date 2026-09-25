-- CreateTable
CREATE TABLE `RoiCalculation` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `periodDays` INTEGER NOT NULL,
    `grossSales` DOUBLE NOT NULL,
    `orders` DOUBLE NOT NULL,
    `newCustomers` DOUBLE NOT NULL,
    `totalSessions` DOUBLE NOT NULL,
    `spends` DOUBLE NOT NULL,
    `roi` DOUBLE NOT NULL,
    `costPerOrder` DOUBLE NOT NULL,
    `ncac` DOUBLE NOT NULL,
    `costPerSession` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RoiCalculation_shop_createdAt_idx`(`shop`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RoiCalculation` ADD CONSTRAINT `RoiCalculation_shop_fkey` FOREIGN KEY (`shop`) REFERENCES `Shop`(`shopDomain`) ON DELETE CASCADE ON UPDATE CASCADE;
