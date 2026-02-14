-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "chordType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Chord" ("chordType", "createdAt", "id", "name", "notes") SELECT "chordType", "createdAt", "id", "name", "notes" FROM "Chord";
DROP TABLE "Chord";
ALTER TABLE "new_Chord" RENAME TO "Chord";
CREATE TABLE "new_ChordProgression" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "chords" TEXT NOT NULL,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChordProgression" ("chords", "createdAt", "description", "id", "key", "tags", "title", "updatedAt") SELECT "chords", "createdAt", "description", "id", "key", "tags", "title", "updatedAt" FROM "ChordProgression";
DROP TABLE "ChordProgression";
ALTER TABLE "new_ChordProgression" RENAME TO "ChordProgression";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
