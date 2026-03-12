// Notification system database structure for Firebase Firestore

/* 
Collection: notifications
Document ID: auto-generated
Fields:
{
  id: string,                    // Auto-generated document ID
  userId: string,                // ID of user receiving the notification
  fromUserId: string,            // ID of user who triggered the notification
  fromUsername: string,          // Username of user who triggered the notification
  type: 'like' | 'comment',      // Type of notification
  postId: string,                // ID of the post that was liked/commented on
  postTitle?: string,            // Title of the post (optional)
  commentText?: string,          // Text of the comment (only for comment notifications)
  message: string,               // Display message for the notification
  read: boolean,                 // Whether user has read the notification
  createdAt: timestamp,          // When the notification was created
}

// Example documents:
{
  id: "notification_123",
  userId: "user456",
  fromUserId: "user789", 
  fromUsername: "JohnDoe",
  type: "like",
  postId: "post123",
  postTitle: "Funny meme about crypto",
  message: "JohnDoe liked your post",
  read: false,
  createdAt: serverTimestamp()
}

{
  id: "notification_124",
  userId: "user456",
  fromUserId: "user789",
  fromUsername: "JohnDoe", 
  type: "comment",
  postId: "post123",
  postTitle: "Funny meme about crypto",
  commentText: "This is hilarious!",
  message: "JohnDoe commented on your post",
  read: false,
  createdAt: serverTimestamp()
}
*/
