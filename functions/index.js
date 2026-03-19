const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

/**
 * Runs every hour — deletes posts whose `endsAt` timestamp has passed.
 * Only affects posts that actually have an `endsAt` field (polls, timed posts).
 */
exports.cleanupExpiredPosts = onSchedule("every 60 minutes", async () => {
  const db = getFirestore();
  const now = Date.now();

  const snap = await db
    .collection("images")
    .where("endsAt", "<=", now)
    .limit(200)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Deleted ${snap.size} expired posts`);
});
