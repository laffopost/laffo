/**
 * Post Service
 * Handles all post-related Firebase operations
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirestore } from "../firebase/config";

const db = getFirestore();
const postsCollection = collection(db, "images");

/**
 * Save a new post
 */
export const createPost = async (postData) => {
  try {
    const docRef = await addDoc(postsCollection, {
      ...postData,
      createdAt: new Date(),
    });
    return { id: docRef.id, ...postData };
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

/**
 * Update an existing post
 */
export const updatePost = async (postId, updates) => {
  try {
    const docRef = doc(db, "images", postId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    return { id: postId, ...updates };
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
};

/**
 * Delete a post
 */
export const deletePost = async (postId) => {
  try {
    const docRef = doc(db, "images", postId);
    await deleteDoc(docRef);
    return postId;
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};

/**
 * Get posts with pagination
 */
export const getPosts = async (limitCount = 15) => {
  try {
    const q = query(
      postsCollection,
      orderBy("createdAt", "desc"),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
};

export default {
  createPost,
  updatePost,
  deletePost,
  getPosts,
};
