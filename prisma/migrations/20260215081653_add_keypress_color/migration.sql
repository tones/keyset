-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeyPress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "midiNote" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'red',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keySetId" INTEGER NOT NULL,
    CONSTRAINT "KeyPress_keySetId_fkey" FOREIGN KEY ("keySetId") REFERENCES "KeySet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KeyPress" ("createdAt", "id", "keySetId", "midiNote") SELECT "createdAt", "id", "keySetId", "midiNote" FROM "KeyPress";
DROP TABLE "KeyPress";
ALTER TABLE "new_KeyPress" RENAME TO "KeyPress";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
