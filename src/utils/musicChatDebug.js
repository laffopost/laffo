import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";

export const debugMusicChat = async (user) => {
  console.log("🔍 [MusicChat Debug] Starting comprehensive diagnostic...");

  try {
    // Test 1: Check if we can read existing messages
    console.log("🔍 [MusicChat Debug] Testing read access...");
    const readQuery = query(
      collection(db, "music-chat"),
      orderBy("timestamp", "desc"),
      limit(10),
    );

    const readSnapshot = await getDocs(readQuery);
    console.log("🔍 [MusicChat Debug] Read test result:", {
      size: readSnapshot.size,
      empty: readSnapshot.empty,
      messages: [],
    });

    const existingMessages = [];
    readSnapshot.forEach((doc) => {
      const data = doc.data();
      existingMessages.push({
        id: doc.id,
        text: data.text,
        userName: data.userName,
        userId: data.userId,
        timestamp: data.timestamp?.toDate?.() || "no timestamp",
      });
      console.log("🔍 [MusicChat Debug] Existing message:", {
        id: doc.id,
        text: data.text,
        userName: data.userName,
        userId: data.userId,
        timestamp: data.timestamp?.toDate?.() || "no timestamp",
      });
    });

    // Test 2: Check if user is authenticated and valid
    console.log("🔍 [MusicChat Debug] User authentication check:", {
      hasUser: !!user,
      uid: user?.uid,
      name: user?.name,
      userType: typeof user,
    });

    if (!user) {
      console.log(
        "🔍 [MusicChat Debug] ❌ No user provided - skipping write and subscription tests",
      );
      return;
    }

    // Test 3: Test real-time subscription (same as app uses)
    console.log("🔍 [MusicChat Debug] Testing real-time subscription...");
    const subscriptionQuery = query(
      collection(db, "music-chat"),
      orderBy("timestamp", "desc"),
      limit(50),
    );

    let subscriptionMessageCount = 0;
    const unsubscribeTest = onSnapshot(
      subscriptionQuery,
      (snap) => {
        subscriptionMessageCount++;
        console.log(
          `🔍 [MusicChat Debug] 📡 Subscription callback #${subscriptionMessageCount}:`,
          {
            size: snap.size,
            empty: snap.empty,
            hasPendingWrites: snap.metadata.hasPendingWrites,
            fromCache: snap.metadata.fromCache,
            docChanges: snap.docChanges().length,
          },
        );

        snap.docChanges().forEach((change) => {
          console.log(`🔍 [MusicChat Debug] 📡 Document change:`, {
            type: change.type,
            docId: change.doc.id,
            data: {
              text: change.doc.data().text,
              userName: change.doc.data().userName,
              userId: change.doc.data().userId,
            },
          });
        });
      },
      (error) => {
        console.error("🔍 [MusicChat Debug] ❌ Subscription error:", error);
      },
    );

    // Wait a moment for subscription to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 4: Attempt to write a test message and verify subscription receives it
    console.log(
      "🔍 [MusicChat Debug] Testing write access with subscription monitoring...",
    );
    const testMessageText = `🔍 Debug test ${Date.now()}`;
    const testMessage = {
      text: testMessageText,
      userId: user.uid,
      userName: user.name,
      timestamp: serverTimestamp(),
    };

    console.log("🔍 [MusicChat Debug] Sending test message:", testMessage);
    const writeResult = await addDoc(collection(db, "music-chat"), testMessage);
    console.log("🔍 [MusicChat Debug] ✅ Write test success:", {
      docId: writeResult.id,
      messageData: testMessage,
    });

    // Wait for subscription to potentially receive the new message
    console.log(
      "🔍 [MusicChat Debug] Waiting 3 seconds to see if subscription receives new message...",
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Test 5: Check if the message appears in a fresh read
    const freshReadSnapshot = await getDocs(readQuery);
    let foundTestMessage = false;
    freshReadSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.text === testMessageText) {
        foundTestMessage = true;
        console.log(
          "🔍 [MusicChat Debug] ✅ Test message found in fresh read:",
          {
            id: doc.id,
            text: data.text,
            userName: data.userName,
          },
        );
      }
    });

    if (!foundTestMessage) {
      console.log(
        "🔍 [MusicChat Debug] ❌ Test message NOT found in fresh read - possible rule issue",
      );
    }

    // Clean up subscription
    unsubscribeTest();

    // Summary
    console.log("🔍 [MusicChat Debug] === SUMMARY ===");
    console.log(
      `🔍 [MusicChat Debug] Read access: ✅ Working (found ${existingMessages.length} existing messages)`,
    );
    console.log(
      `🔍 [MusicChat Debug] Write access: ✅ Working (test message sent successfully)`,
    );
    console.log(
      `🔍 [MusicChat Debug] Subscription callbacks: ${subscriptionMessageCount} received`,
    );
    console.log(
      `🔍 [MusicChat Debug] Fresh read verification: ${foundTestMessage ? "✅" : "❌"}`,
    );

    if (subscriptionMessageCount === 0) {
      console.log(
        "🔍 [MusicChat Debug] ⚠️ WARNING: No subscription callbacks received - this is likely the issue!",
      );
    }
  } catch (error) {
    console.error("🔍 [MusicChat Debug] ❌ Error during diagnostic:", error);

    // Analyze the error
    if (error.code === "permission-denied") {
      console.error(
        "🔍 [MusicChat Debug] ❌ Permission denied - check Firestore rules",
      );
    } else if (error.code === "unauthenticated") {
      console.error("🔍 [MusicChat Debug] ❌ User not authenticated");
    } else if (error.code === "failed-precondition") {
      console.error(
        "🔍 [MusicChat Debug] ❌ Firestore precondition failed - check network/connection",
      );
    } else {
      console.error(
        "🔍 [MusicChat Debug] ❌ Unknown error:",
        error.code,
        error.message,
      );
    }
  }
};
