-- CreateTable
CREATE TABLE `Feedback` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `brandName` VARCHAR(191) NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `howDidYouHear` VARCHAR(191) NULL,
    `associatedWithAdbuffs` VARCHAR(191) NULL,
    `feedback` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Feedback_shop_createdAt_idx`(`shop`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_shop_fkey` FOREIGN KEY (`shop`) REFERENCES `Shop`(`shopDomain`) ON DELETE CASCADE ON UPDATE CASCADE;