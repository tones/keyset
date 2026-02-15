/*
  Warnings:

  - You are about to drop the column `name` on the `KeySet` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeySet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "songId" INTEGER NOT NULL,
    CONSTRAINT "KeySet_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KeySet" ("createdAt", "id", "position", "songId", "updatedAt") SELECT "createdAt", "id", "position", "songId", "updatedAt" FROM "KeySet";
DROP TABLE "KeySet";
ALTER TABLE "new_KeySet" RENAME TO "KeySet";
CREATE UNIQUE INDEX "KeySet_songId_position_key" ON "KeySet"("songId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
