import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  POST_COOLDOWN_MS,
  COMMENT_COOLDOWN_MS,
  INITIAL_LOAD_LIMIT,
  PAGINATION_INCREMENT,
  MAX_TOTAL_LOAD,
  DEFAULT_REACTIONS,
} from "../constants/posts";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  getDoc,
  deleteDoc,
  getDocs,
  startAfter,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import {
  createNotificationForPost,
  notifyFollowersOfNewPost,
} from "../utils/notificationUtils";
import { getPostExpiryService } from "../utils/postExpiry";


// Two separate contexts:
// - PostDataContext  → reactive data (images, loading, etc.) — changes on every update
// - PostActionsContext → stable mutation functions — only change on auth/db change
const PostDataContext = createContext();
const PostActionsContext = createContext();

// Disable console logs in production
const isDev = import.meta.env.DEV;
const log = isDev ? console.log : () => {};
const logError = console.error; // Keep errors always

/** Combined hook – same API as before, works for all consumers */
export const usePosts = () => {
  const data = useContext(PostDataContext);
  const actions = useContext(PostActionsContext);
  if (!data || !actions) {
    throw new Error("usePosts must be used within an ImageProvider");
  }
  return { ...data, ...actions };
};

/** Action-only hook – won't re-render when post data changes */
export const usePostActions = () => {
  const actions = useContext(PostActionsContext);
  if (!actions) {
    throw new Error("usePostActions must be used within an ImageProvider");
  }
  return actions;
};

/** Data-only hook – for components that only read post state */
export const usePostData = () => {
  const data = useContext(PostDataContext);
  if (!data) {
    throw new Error("usePostData must be used within an ImageProvider");
  }
  return data;
};

export const ImageProvider = ({ children }) => {
  log("🟢 ImageProvider rendered");

  const [images, setImages] = useState([]);
  const [userImages, setUserImages] = useState([]);
  const [userReactions, setUserReactions] = useState({});
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const db = getFirestore();
  const { firebaseUser, userProfile } = useAuth();
  const userId = firebaseUser?.uid || null;

  const reactionTimeoutRef = useRef({});
  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);
  const lastPostTimeRef = useRef(0);
  const lastCommentTimeRef = useRef(0);
  const expiryServiceRef = useRef(null);
  const lastDocSnapshotRef = useRef(null); // Cursor for pagination
  const hasMoreRef = useRef(true);

  // Ref snapshots — keep current values accessible in stable callbacks
  // without adding them as useCallback deps (avoids function recreation on every data change)
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const userReactionsRef = useRef(userReactions);
  userReactionsRef.current = userReactions;
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const userNameRef = useRef(userName);
  userNameRef.current = userName;

  // Initialize expiry service
  useEffect(() => {
    if (db && !expiryServiceRef.current) {
      expiryServiceRef.current = getPostExpiryService(db);
      // Start automatic cleanup with 5-minute intervals
      expiryServiceRef.current.startCleanup(300000);
    }

    return () => {
      if (expiryServiceRef.current) {
        expiryServiceRef.current.stopCleanup();
      }
    };
  }, [db]);

  // Helper function to filter out expired posts
  const filterExpiredPosts = useCallback((posts) => {
    const now = Date.now();
    return posts.filter((post) => {
      if (!post.endsAt) return true; // No expiry, keep post
      return post.endsAt > now; // Keep only non-expired posts
    });
  }, []);

  // Periodic client-side cleanup of expired posts from UI state
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      setImages((prev) => {
        const filtered = prev.filter(
          (post) => !post.endsAt || post.endsAt > now,
        );
        return filtered.length !== prev.length ? filtered : prev;
      });

      setUserImages((prev) => {
        const filtered = prev.filter(
          (post) => !post.endsAt || post.endsAt > now,
        );
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    if (!userId) return;
    log("🔧 Initializing user data for", userId);

    const storedName = localStorage.getItem(`user_name_${userId}`);
    if (storedName) {
      setUserName(storedName);
    } else {
      const randomName = `User${Math.floor(Math.random() * 10000)}`;
      localStorage.setItem(`user_name_${userId}`, randomName);
      setUserName(randomName);
    }

    const savedReactions = localStorage.getItem(`user_reactions_${userId}`);
    if (savedReactions) {
      setUserReactions(JSON.parse(savedReactions));
    }
  }, [userId]);

  // Keep userName in sync with the real profile username
  useEffect(() => {
    if (!userId) return;
    const profileName =
      userProfile?.username?.trim() || firebaseUser?.displayName?.trim();
    if (profileName) {
      setUserName(profileName);
      localStorage.setItem(`user_name_${userId}`, profileName);
    }
  }, [userProfile, firebaseUser, userId]);

  useEffect(() => {
    if (!userId) {
      log("⚠️ No userId, skipping Firestore subscription");
      return;
    }

    log("📡 Setting up Firestore listener with lazy loading");
    setLoading(true);
    mountedRef.current = true;

    // Initial query loads only 15 posts for faster page load
    const imagesRef = collection(db, "images");
    const q = query(
      imagesRef,
      orderBy("createdAt", "desc"),
      limit(INITIAL_LOAD_LIMIT),
    );

    unsubscribeRef.current = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snapshot) => {
        if (!mountedRef.current) return;

        log(
          `📦 Firestore snapshot received: ${snapshot.size} docs, ${
            snapshot.docChanges().length
          } changes`,
        );

        const isInitialLoad =
          snapshot.docChanges().length === snapshot.docs.length;

        if (isInitialLoad) {
          log("📥 Initial load");
          // Save last doc for cursor-based pagination
          if (snapshot.docs.length > 0) {
            lastDocSnapshotRef.current = snapshot.docs[snapshot.docs.length - 1];
            hasMoreRef.current = snapshot.docs.length >= INITIAL_LOAD_LIMIT;
          }
          const allDocs = [];
          const userDocs = [];

          snapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            allDocs.push(data);
            if (data.uploadedBy === userId) {
              userDocs.push(data);
            }
          });

          // Filter out expired posts
          const filteredAllDocs = filterExpiredPosts(allDocs);
          const filteredUserDocs = filterExpiredPosts(userDocs);

          setImages(filteredAllDocs);
          setUserImages(filteredUserDocs);
        } else {
          log("🔄 Incremental update");

          setImages((prev) => {
            const updated = [...prev];
            let changed = false;

            snapshot.docChanges().forEach((change) => {
              const data = { id: change.doc.id, ...change.doc.data() };
              const isExpired = data.endsAt && data.endsAt <= Date.now();

              if (change.type === "added") {
                if (!isExpired && !updated.find((img) => img.id === data.id)) {
                  updated.unshift(data);
                  changed = true;
                }
              } else if (change.type === "modified") {
                const index = updated.findIndex((i) => i.id === data.id);
                if (index >= 0) {
                  if (!isExpired) {
                    updated[index] = data;
                  } else {
                    // Post expired, remove it
                    updated.splice(index, 1);
                  }
                  changed = true;
                }
              } else if (change.type === "removed") {
                const index = updated.findIndex((i) => i.id === data.id);
                if (index >= 0) {
                  updated.splice(index, 1);
                  changed = true;
                }
              }
            });

            return changed ? updated : prev;
          });

          setUserImages((prev) => {
            const updated = [...prev];
            let changed = false;

            snapshot.docChanges().forEach((change) => {
              const data = { id: change.doc.id, ...change.doc.data() };

              if (data.uploadedBy !== userId) return;

              const isExpired = data.endsAt && data.endsAt <= Date.now();

              if (change.type === "added") {
                if (!isExpired && !updated.find((img) => img.id === data.id)) {
                  updated.unshift(data);
                  changed = true;
                }
              } else if (change.type === "modified") {
                const index = updated.findIndex((i) => i.id === data.id);
                if (index >= 0) {
                  if (!isExpired) {
                    updated[index] = data;
                  } else {
                    // Post expired, remove it
                    updated.splice(index, 1);
                  }
                  changed = true;
                }
              } else if (change.type === "removed") {
                const index = updated.findIndex((i) => i.id === data.id);
                if (index >= 0) {
                  updated.splice(index, 1);
                  changed = true;
                }
              }
            });

            return changed ? updated : prev;
          });
        }

        setLoading(false);
      },
      (err) => {
        logError("❌ Firestore error:", err);
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      log("🔌 Unsubscribing from Firestore");
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      Object.values(reactionTimeoutRef.current).forEach(clearTimeout);
    };
  }, [db, userId]);

  const fetchImageById = useCallback(
    async (imageId) => {
      log(`🔍 Fetching post ${imageId}`);
      try {
        const imageRef = doc(db, "images", imageId);
        const docSnap = await getDoc(imageRef);

        if (docSnap.exists()) {
          const imageData = { id: docSnap.id, ...docSnap.data() };
          setImages((prev) => {
            if (prev.find((img) => img.id === imageId)) {
              return prev;
            }
            return [imageData, ...prev];
          });
          return imageData;
        }
        return null;
      } catch (error) {
        logError("❌ Error fetching post:", error);
        return null;
      }
    },
    [db],
  );

  const addPost = useCallback(
    async (postData) => {
      log(
        "🔥 addPost ENTER — firebaseUser:",
        firebaseUser?.uid,
        "isAnonymous:",
        firebaseUser?.isAnonymous,
      );
      // Auth check: block anonymous users
      if (!firebaseUser || firebaseUser.isAnonymous) {
        log("🔥 addPost BLOCKED — not logged in");
        throw new Error("You must be logged in to create a post");
      }

      // Rate limiting: prevent spam posting
      const now = Date.now();
      const elapsed = now - lastPostTimeRef.current;
      log(
        "🔥 addPost rate limit check — elapsed:",
        elapsed,
        "cooldown:",
        POST_COOLDOWN_MS,
      );
      if (elapsed < POST_COOLDOWN_MS) {
        const waitSec = Math.ceil((POST_COOLDOWN_MS - elapsed) / 1000);
        log("🔥 addPost BLOCKED — rate limit, wait:", waitSec);
        throw new Error(`Please wait ${waitSec}s before posting again`);
      }

      try {
        log("🔥 PostContext - addPost called with:", postData);
        log("🔥 PostContext - Post type:", postData.type);

        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const username = userDoc.exists()
          ? userDoc.data().username
          : firebaseUser.displayName || "Anonymous";

        // --- Use compressed base64 image directly (no Storage needed) ---
        let imageUrl = null;
        if (postData.type !== "status" && postData.type !== "poll") {
          if (postData.imageFile instanceof File) {
            // Convert file to base64 via the already-compressed previewUrl
            imageUrl = postData.image || null;
            log("✅ Using compressed base64 image, size:", imageUrl?.length);
          } else if (postData.image) {
            imageUrl = postData.image;
            log("✅ Using canvas base64 image, size:", imageUrl?.length);
          }
        }

        const newPost = {
          title: postData.title || "",
          description: postData.description || "",
          author: postData.author || username,
          authorAvatar: postData.authorAvatar || null,
          image: imageUrl,
          type: postData.type || "user",
          uploadedBy: firebaseUser.uid,
          createdAt: serverTimestamp(),
          reactions: postData.reactions || DEFAULT_REACTIONS,
          commentCount: 0,
          endsAt: postData.endsAt || null,
        };

        if (postData.type === "user-profile" || postData.type === "user") {
          newPost.socials = postData.socials || "";
          newPost.webpage = postData.webpage || "";
          newPost.extraLinks = postData.extraLinks || [];
        }

        if (postData.type === "media") {
          log("🎥 PostContext - Adding media fields");
          newPost.mediaType = postData.mediaType;
          newPost.embedUrl = postData.embedUrl;
        }

        if (postData.type === "status") {
          log("👀 PostContext - Adding status fields");
          newPost.status = postData.status;
          newPost.bgColor = postData.bgColor;
          newPost.textColor = postData.textColor;
        }

        if (postData.type === "poll") {
          log("🎮 PostContext - Adding poll fields");
          newPost.question = postData.question;
          newPost.options = postData.options;
          newPost.bgColor = postData.bgColor || "#1a1a2e";
          newPost.description = postData.description || null;
          newPost.endsAt = postData.endsAt || null;
          newPost.voteCounts =
            postData.voteCounts || postData.options.map(() => 0);
          newPost.votes = postData.votes || {};
        }

        log("🔥 PostContext - Final post object being saved:", newPost);

        const docRef = await addDoc(collection(db, "images"), newPost);
        const newPostWithId = { id: docRef.id, ...newPost };

        log("✅ PostContext - Post saved successfully with ID:", docRef.id);

        if (newPost.endsAt && expiryServiceRef.current) {
          expiryServiceRef.current.schedulePostDeletion(
            docRef.id,
            newPost.endsAt,
          );
        }

        lastPostTimeRef.current = Date.now();
        setImages((prev) => [newPostWithId, ...prev]);
        setUserImages((prev) => [newPostWithId, ...prev]);

        // Notify followers about the new post (fire and forget)
        notifyFollowersOfNewPost({
          authorId: firebaseUser.uid,
          authorUsername: username,
          postId: docRef.id,
          postTitle: newPost.title || newPost.question || "New post",
        });

        return docRef.id;
      } catch (err) {
        logError("❌ PostContext - Error adding post:", err);
        throw err;
      }
    },
    [db, firebaseUser, userProfile],
  );

  const deletePost = useCallback(
    async (postId) => {
      log(`🗑️ Deleting post ${postId}`);
      try {
        // Ownership check: only the post author can delete
        const postRef = doc(db, "images", postId);
        const postDoc = await getDoc(postRef);
        if (!postDoc.exists()) {
          throw new Error("Post not found");
        }
        if (postDoc.data().uploadedBy !== userId) {
          throw new Error("You can only delete your own posts");
        }
        await deleteDoc(postRef);
        setImages((prev) => prev.filter((img) => img.id !== postId));
        setUserImages((prev) => prev.filter((img) => img.id !== postId));
        return true;
      } catch (error) {
        logError("❌ Error deleting:", error);
        throw error;
      }
    },
    [db, userId],
  );

  const editPost = useCallback(
    async (postId, updateData) => {
      log(`✏️ Editing post ${postId}`, updateData);
      try {
        // Ownership check: only the post author can edit
        const postRef = doc(db, "images", postId);
        const postDoc = await getDoc(postRef);
        if (!postDoc.exists()) {
          throw new Error("Post not found");
        }
        if (postDoc.data().uploadedBy !== userId) {
          throw new Error("You can only edit your own posts");
        }

        // Prepare update data
        const editData = {
          ...updateData,
          updatedAt: serverTimestamp(),
          edited: true,
        };

        // Handle image update if new image is provided (base64)
        if (updateData.newImage) {
          editData.image = updateData.newImage;
          editData.imageUrl = updateData.newImage;
          delete editData.newImage;
        }

        await updateDoc(postRef, editData);

        // Update local state
        const updatedPost = { ...postDoc.data(), ...editData, id: postId };
        setImages((prev) =>
          prev.map((img) => (img.id === postId ? updatedPost : img)),
        );
        setUserImages((prev) =>
          prev.map((img) => (img.id === postId ? updatedPost : img)),
        );

        log(`✅ Post ${postId} edited successfully`);
        return updatedPost;
      } catch (error) {
        logError("❌ Error editing post:", error);
        throw error;
      }
    },
    [db, userId],
  );

  const toggleReaction = useCallback(
    (imageId, emoji) => {
      if (!userId) return;
      if (firebaseUser?.isAnonymous) return;
      // Block reacting to own post — use ref to avoid depending on images array
      const ownPost = imagesRef.current.find((img) => img.id === imageId);
      if (ownPost && (ownPost.uploadedBy === userId || ownPost.userId === userId)) return;
      log(`👍 Toggling reaction ${emoji} on ${imageId}`);

      // Use ref snapshot so this callback doesn't need userReactions in deps
      const currentReaction = userReactionsRef.current[imageId];
      const newReactions = { ...userReactionsRef.current };

      if (currentReaction === emoji) {
        delete newReactions[imageId];
      } else {
        newReactions[imageId] = emoji;
      }

      setUserReactions(newReactions);
      localStorage.setItem(
        `user_reactions_${userId}`,
        JSON.stringify(newReactions),
      );

      if (reactionTimeoutRef.current[imageId]) {
        clearTimeout(reactionTimeoutRef.current[imageId]);
      }

      reactionTimeoutRef.current[imageId] = setTimeout(async () => {
        try {
          const imageRef = doc(db, "images", imageId);
          let shouldCreateNotification = false;
          let postData = null;

          // Get post data for notification (use ref to avoid stale closure)
          if (!currentReaction && emoji && userProfileRef.current?.username) {
            const postDoc = await getDoc(imageRef);
            if (postDoc.exists()) {
              postData = postDoc.data();
              shouldCreateNotification = true;
            }
          }

          if (currentReaction === emoji) {
            await updateDoc(imageRef, {
              [`reactions.${emoji}`]: increment(-1),
            });
          } else {
            if (currentReaction) {
              await updateDoc(imageRef, {
                [`reactions.${currentReaction}`]: increment(-1),
              });
            }
            await updateDoc(imageRef, { [`reactions.${emoji}`]: increment(1) });

            // Create notification for new like (not when changing reaction)
            if (shouldCreateNotification && postData && !currentReaction) {
              const username =
                userProfileRef.current?.username ||
                userNameRef.current ||
                "Anonymous";
              log("🔔 About to create like notification:", {
                postData,
                userId,
                username,
              });
              await createNotificationForPost({
                type: "like",
                postId: imageId,
                postAuthorId: postData.uploadedBy || postData.userId,
                postTitle: postData.title || postData.text,
                currentUserId: userId,
                currentUsername: username,
              });
            }
          }

          delete reactionTimeoutRef.current[imageId];
        } catch (err) {
          logError("❌ Reaction error:", err);
          setUserReactions((prev) => ({ ...prev, [imageId]: currentReaction }));
        }
      }, 2000);
    },
    // userReactions & images removed from deps — accessed via refs
    [db, userId, firebaseUser],
  );

  const votePoll = useCallback(
    async (postId, optionIndex) => {
      if (!userId) return;
      if (firebaseUser?.isAnonymous) return;
      // Use ref snapshot so this doesn't need `images` in deps
      const post = imagesRef.current.find((img) => img.id === postId);
      if (!post || post.type !== "poll") return;

      // Prevent double voting
      if (post.votes && post.votes[userId] !== undefined) return;

      const currentCounts = post.voteCounts || post.options.map(() => 0);
      const newCounts = [...currentCounts];
      newCounts[optionIndex] = (newCounts[optionIndex] || 0) + 1;

      // Optimistic update
      setImages((prev) =>
        prev.map((img) =>
          img.id === postId
            ? {
                ...img,
                voteCounts: newCounts,
                votes: { ...img.votes, [userId]: optionIndex },
              }
            : img,
        ),
      );

      try {
        const postRef = doc(db, "images", postId);
        await updateDoc(postRef, {
          voteCounts: newCounts,
          [`votes.${userId}`]: optionIndex,
        });
        log(`✅ Poll vote recorded: option ${optionIndex} on post ${postId}`);
      } catch (err) {
        logError("❌ Poll vote error:", err);
        // Rollback
        setImages((prev) =>
          prev.map((img) => (img.id === postId ? post : img)),
        );
      }
    },
    // images removed from deps — accessed via imagesRef.current
    [db, userId, firebaseUser],
  );

  const getUserPollVote = useCallback(
    (postId) => {
      if (!userId) return null;
      const post = images.find((img) => img.id === postId);
      return post?.votes?.[userId] ?? null;
    },
    [images, userId],
  );

  // ── Comments subcollection helpers ──────────────────────────────────
  // Comments now live in images/{postId}/comments as individual docs.
  // PostModalCommentsSection subscribes to them in real-time.
  // PostContext only manages commentCount on the parent post doc.

  const addComment = useCallback(
    async (imageId, commentText, avatar) => {
      if (!userId) return;
      if (firebaseUser?.isAnonymous) {
        throw new Error("You must be logged in to comment");
      }

      const now = Date.now();
      const elapsed = now - lastCommentTimeRef.current;
      if (elapsed < COMMENT_COOLDOWN_MS) {
        const waitSec = Math.ceil((COMMENT_COOLDOWN_MS - elapsed) / 1000);
        throw new Error(`Please wait ${waitSec}s before commenting again`);
      }

      log(`💬 Adding comment to ${imageId}`);

      const author =
        userProfileRef.current?.username?.trim() ||
        firebaseUser?.displayName?.trim() ||
        userNameRef.current ||
        "Anonymous";

      const commentData = {
        author,
        avatar: avatar || "",
        text: commentText,
        userId: userId,
        reactions: {},
        createdAt: serverTimestamp(),
      };

      // Optimistic: bump local commentCount
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, commentCount: (img.commentCount || 0) + 1 }
            : img,
        ),
      );

      try {
        // Write comment to subcollection
        await addDoc(collection(db, "images", imageId, "comments"), commentData);

        // Increment commentCount on the parent post doc
        const imageRef = doc(db, "images", imageId);
        await updateDoc(imageRef, { commentCount: increment(1) });

        lastCommentTimeRef.current = Date.now();

        // Notification (fire and forget)
        const postDoc = await getDoc(doc(db, "images", imageId));
        const postData = postDoc.exists() ? postDoc.data() : null;
        if (postData) {
          const username =
            userProfileRef.current?.username || userNameRef.current || "Anonymous";
          createNotificationForPost({
            type: "comment",
            postId: imageId,
            postAuthorId: postData.uploadedBy || postData.userId,
            postTitle: postData.title || postData.text,
            currentUserId: userId,
            currentUsername: username,
            commentText,
          });
        }

        log("✅ Comment added to subcollection");
      } catch (err) {
        logError("❌ Comment error:", err);
        // Rollback optimistic count
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, commentCount: Math.max(0, (img.commentCount || 0) - 1) }
              : img,
          ),
        );
        throw err;
      }
    },
    [db, userId, firebaseUser],
  );

  const deleteComment = useCallback(
    async (imageId, commentId) => {
      if (!userId) return;
      log(`🗑️ Deleting comment ${commentId} from post ${imageId}`);

      // Optimistic count decrement
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, commentCount: Math.max(0, (img.commentCount || 0) - 1) }
            : img,
        ),
      );

      try {
        await deleteDoc(doc(db, "images", imageId, "comments", commentId));
        await updateDoc(doc(db, "images", imageId), { commentCount: increment(-1) });
      } catch (err) {
        logError("❌ Delete comment error:", err);
        // Rollback
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, commentCount: (img.commentCount || 0) + 1 }
              : img,
          ),
        );
      }
    },
    [db, userId],
  );

  const toggleCommentReaction = useCallback(
    async (imageId, commentId, emoji) => {
      if (!userId) return;
      if (firebaseUser?.isAnonymous) return;
      log(`❤️ Toggling comment reaction`);

      try {
        const commentRef = doc(db, "images", imageId, "comments", commentId);
        const commentSnap = await getDoc(commentRef);
        if (!commentSnap.exists()) return;

        const commentData = commentSnap.data();
        if (commentData.userId === userId) return; // Can't react to own comment

        const reactions = { ...(commentData.reactions || {}) };
        const currentReaction = reactions[userId];

        if (currentReaction) {
          delete reactions[userId];
        }
        if (currentReaction !== emoji) {
          reactions[userId] = emoji;
        }

        await updateDoc(commentRef, { reactions });
      } catch (error) {
        logError("❌ Comment reaction error:", error);
      }
    },
    [db, userId, firebaseUser],
  );

  const getReactions = useCallback(
    (imageId) => {
      const image = images.find((img) => img.id === imageId);
      return image?.reactions || {};
    },
    [images],
  );

  const getUserReaction = useCallback(
    (imageId) => userReactions[imageId] || null,
    [userReactions],
  );

  // getCommentReactions / getUserCommentReaction removed — comments are now
  // in a subcollection and reaction data lives on each comment doc.
  // PostModalCommentsSection reads them directly from its own subscription.

  const getImageById = useCallback(
    (id) => {
      return images.find((img) => img.id === id) || null;
    },
    [images],
  );

  const getImagesByType = useCallback(
    (type) => {
      if (type === "all") return images;
      return images.filter((img) => img.type === type);
    },
    [images],
  );

  const stats = useMemo(() => {
    log("📊 Calculating stats");
    const totalPosts = images.length;
    const totalUsers = new Set(
      images.map((img) => (img.author || "Anonymous").trim()).filter(Boolean),
    ).size;
    const totalReacts = images.reduce((sum, img) => {
      if (!img.reactions) return sum;
      return sum + Object.values(img.reactions).reduce((a, b) => a + b, 0);
    }, 0);

    return { totalPosts, totalUsers, totalReacts };
  }, [images]);

  // Load more posts (cursor-based pagination using startAfter)
  // Only fetches the NEXT page instead of re-downloading everything from the top.
  const loadMorePosts = useCallback(async () => {
    if (!db) return;
    if (!hasMoreRef.current) {
      log("⚠️ No more posts to load");
      return;
    }
    if (imagesRef.current.length >= MAX_TOTAL_LOAD) {
      log("⚠️ Reached maximum post limit");
      return;
    }

    const cursor = lastDocSnapshotRef.current;
    if (!cursor) return;

    log(`📥 Loading more posts after cursor`);

    const imgCollection = collection(db, "images");
    const q = query(
      imgCollection,
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(PAGINATION_INCREMENT),
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        hasMoreRef.current = false;
        log("📭 No more posts available");
        return;
      }

      const newDocs = [];
      snapshot.forEach((doc) => {
        newDocs.push({ id: doc.id, ...doc.data() });
      });

      // Update cursor to last doc of this page
      lastDocSnapshotRef.current = snapshot.docs[snapshot.docs.length - 1];
      hasMoreRef.current = snapshot.docs.length >= PAGINATION_INCREMENT;

      const filteredNew = filterExpiredPosts(newDocs);
      // Append to existing images (deduplicated)
      setImages((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = filteredNew.filter((p) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });

      log(`✅ Loaded ${filteredNew.length} more posts`);
    } catch (err) {
      logError("❌ Error loading more posts:", err);
    }
  }, [db, filterExpiredPosts]);

  // PostDataContext value — updates whenever reactive data changes
  // Consumers re-render only when images/reactions/loading change
  const dataValue = useMemo(() => {
    log("🎯 Creating data context value");
    return {
      images,
      userImages,
      userReactions,
      loading,
      error,
      userId,
      userName,
      getAllImages: images,
      ...stats,
      // Selector functions that depend on reactive data
      getUserPollVote,
      getReactions,
      getUserReaction,
      getImageById,
      getImagesByType,
    };
  }, [
    images,
    userImages,
    userReactions,
    loading,
    error,
    userId,
    userName,
    stats,
    getUserPollVote,
    getReactions,
    getUserReaction,
    getImageById,
    getImagesByType,
  ]);

  // PostActionsContext value — stable mutation functions.
  // Only recreated when auth/db changes (login/logout), not on every post update.
  const actionsValue = useMemo(() => {
    log("🎯 Creating actions context value");
    return {
      addPost,
      deletePost,
      editPost,
      toggleReaction,
      votePoll,
      addComment,
      deleteComment,
      toggleCommentReaction,
      fetchImageById,
      loadMorePosts,
    };
  }, [
    addPost,
    deletePost,
    editPost,
    toggleReaction,
    votePoll,
    addComment,
    deleteComment,
    toggleCommentReaction,
    fetchImageById,
    loadMorePosts,
  ]);

  return (
    <PostActionsContext.Provider value={actionsValue}>
      <PostDataContext.Provider value={dataValue}>
        {children}
      </PostDataContext.Provider>
    </PostActionsContext.Provider>
  );
};
