-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Song" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "youtubeUrl" TEXT,
    "analysis" TEXT,
    "analysisUpdatedAt" DATETIME,
    "compactView" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Song" ("analysis", "analysisUpdatedAt", "createdAt", "id", "imageUrl", "title", "updatedAt", "youtubeUrl") SELECT "analysis", "analysisUpdatedAt", "createdAt", "id", "imageUrl", "title", "updatedAt", "youtubeUrl" FROM "Song";
DROP TABLE "Song";
ALTER TABLE "new_Song" RENAME TO "Song";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
