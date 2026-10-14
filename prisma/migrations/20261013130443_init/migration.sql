-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT '',
    "purchasePrice" INTEGER NOT NULL,
    "residualValue" INTEGER NOT NULL DEFAULT 0,
    "lifetimeHours" REAL NOT NULL,
    "monthlyProductiveHours" REAL NOT NULL,
    "averagePowerWatts" REAL NOT NULL,
    "electricityRatePerKwh" INTEGER NOT NULL,
    "maintenanceMethod" TEXT NOT NULL DEFAULT 'per_hour',
    "maintenancePerHour" INTEGER NOT NULL DEFAULT 0,
    "maintenanceMonthly" INTEGER NOT NULL DEFAULT 0,
    "nozzleCost" INTEGER NOT NULL DEFAULT 0,
    "nozzleLifeHours" REAL NOT NULL DEFAULT 0,
    "otherConsumablesPerHour" INTEGER NOT NULL DEFAULT 0,
    "failureRate" REAL NOT NULL DEFAULT 0,
    "additionalOverheadMonthly" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'PLA',
    "color" TEXT NOT NULL DEFAULT '',
    "supplier" TEXT NOT NULL DEFAULT '',
    "purchasePrice" INTEGER NOT NULL,
    "spoolWeightGrams" REAL NOT NULL,
    "netUsableGrams" REAL,
    "handlingCostPerSpool" INTEGER NOT NULL DEFAULT 0,
    "failureRate" REAL NOT NULL DEFAULT 0,
    "wasteAllowancePct" REAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "material" TEXT NOT NULL DEFAULT 'PLA',
    "dimensions" TEXT NOT NULL DEFAULT '',
    "basePrice" INTEGER NOT NULL,
    "minUnitPrice" INTEGER NOT NULL DEFAULT 0,
    "sizeOptions" JSONB NOT NULL,
    "materialOptions" JSONB NOT NULL,
    "colors" JSONB NOT NULL,
    "personalization" JSONB NOT NULL,
    "images" JSONB NOT NULL,
    "leadTimeMinDays" INTEGER NOT NULL DEFAULT 3,
    "leadTimeMaxDays" INTEGER NOT NULL DEFAULT 5,
    "availability" TEXT NOT NULL DEFAULT 'made_to_order',
    "allowQuantityDiscount" BOOLEAN NOT NULL DEFAULT true,
    "maxQuantity" INTEGER NOT NULL DEFAULT 200,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostCalculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "productId" TEXT,
    "printerId" TEXT,
    "materialId" TEXT,
    "input" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalBatchCost" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "minimumPrice" INTEGER NOT NULL,
    "standardPrice" INTEGER NOT NULL,
    "premiumPrice" INTEGER NOT NULL,
    "chosenTier" TEXT NOT NULL DEFAULT 'standard',
    "chosenPrice" INTEGER NOT NULL,
    "profitPerItem" INTEGER NOT NULL,
    "margin" REAL NOT NULL,
    "markup" REAL NOT NULL,
    "totalGrams" REAL NOT NULL,
    "machineHours" REAL NOT NULL,
    "laborHours" REAL NOT NULL,
    "expectedMonthlyUnits" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostCalculation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostCalculation_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostCalculation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calculationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "formula" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "CostComponent_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "CostCalculation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimateLow" INTEGER,
    "estimateHigh" INTEGER,
    "estimateTotal" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT,
    "fileStoredName" TEXT,
    "fileSize" INTEGER,
    "fileMime" TEXT,
    "finalPrice" INTEGER,
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "CostCalculation_productId_idx" ON "CostCalculation"("productId");

-- CreateIndex
CREATE INDEX "CostCalculation_createdAt_idx" ON "CostCalculation"("createdAt");

-- CreateIndex
CREATE INDEX "CostComponent_calculationId_idx" ON "CostComponent"("calculationId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_reference_key" ON "QuoteRequest"("reference");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_idx" ON "QuoteRequest"("status");

-- CreateIndex
CREATE INDEX "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");
