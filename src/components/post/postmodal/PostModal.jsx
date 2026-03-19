import { useState, useMemo, memo, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { usePosts } from "../../../context/PostContext";
import PostModalImageSection from "./PostModalImageSection";
import PostModalCommentsSection from "./PostModalCommentsSection";
import PostModalHeader from "./PostModalHeader";
import AddPostModal from "../AddPostModal";
import toast from "react-hot-toast";
import "./PostModal.css";

import logger from "../../../utils/logger";
const PostModal = memo(
  function PostModal({
    post,
    onClose,
    onPrev,
    onNext,
    onRandom,
    onDelete,
    onEdit,
  }) {
    logger.log("🎬 PostModal rendered for:", post?.id);
    logger.log("🎬 PostModal - Image type:", post?.type);
    logger.log("🎬 PostModal - Is media?:", post?.type === "media");
    logger.log("🎬 PostModal - Full post object:", post);

    const { deletePost, editPost } = usePosts();
    const { firebaseUser, userProfile } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
      if (post?.type === "media") {
        logger.log("🎥 MEDIA POST DETECTED!");
        logger.log("🎥 Media Type:", post.mediaType);
        logger.log("🎥 Embed URL:", post.embedUrl);
        logger.log("🎥 Media URL:", post.mediaUrl);
      }
    }, [post]);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          if (showDeleteConfirm) {
            setShowDeleteConfirm(false);
          } else if (showEditModal) {
            setShowEditModal(false);
          } else {
            onClose();
          }
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, showDeleteConfirm, showEditModal]);

    const canDelete = useMemo(() => {
      if (!firebaseUser || !post) return false;
      return (
        post.uploadedBy === firebaseUser.uid ||
        post.author?.toLowerCase() === userProfile?.username?.toLowerCase()
      );
    }, [firebaseUser, userProfile, post]);

    const canEdit = useMemo(() => {
      if (!firebaseUser || !post) return false;
      return (
        post.uploadedBy === firebaseUser.uid ||
        post.author?.toLowerCase() === userProfile?.username?.toLowerCase()
      );
    }, [firebaseUser, userProfile, post]);

    const handleDelete = async () => {
      if (!canDelete || isDeleting) return;

      setIsDeleting(true);
      try {
        await deletePost(post.id);
        setShowDeleteConfirm(false);
        onClose();
        if (onDelete) {
          onDelete();
        }
      } catch (error) {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
        if (onDelete) {
          onDelete(error);
        }
      }
    };

    const handleEditSubmit = (newPost) => {
      const toastId = toast.loading("Saving post...");
      editPost(post.id, newPost)
        .then(() => {
          toast.success("Post updated successfully!", { id: toastId });
          setShowEditModal(false);
          if (onEdit) {
            onEdit();
          }
        })
        .catch((err) => {
          toast.error(err.message || "Failed to update post", { id: toastId });
        });
    };

    return (
      <>
        <div className="image-modal-overlay" onClick={onClose}>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <PostModalHeader onClose={onClose} />
            <div className="image-modal-layout">
              <div className="image-modal-main">
                <button
                  className="image-modal-nav image-modal-nav-left"
                  onClick={onPrev}
                >
                  ‹
                </button>
                <button
                  className="image-modal-nav image-modal-nav-right"
                  onClick={onNext}
                >
                  ›
                </button>
                <PostModalImageSection
                  post={post}
                  isMediaPost={post.type === "media"}
                  canDelete={canDelete}
                  canEdit={canEdit}
                  onDeleteRequest={() => setShowDeleteConfirm(true)}
                  onEditRequest={() => setShowEditModal(true)}
                  onRandom={onRandom || null}
                />
              </div>
              <PostModalCommentsSection post={post} />
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div
            className="delete-confirm-overlay"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="delete-confirm-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Delete Post?</h3>
              <p>
                Are you sure you want to delete this post? This action cannot be
                undone.
              </p>
              <div className="delete-confirm-actions">
                <button
                  className="btn-cancel-delete"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm-delete"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && (
          <AddPostModal
            onClose={() => setShowEditModal(false)}
            onSubmit={handleEditSubmit}
            editMode
            editPostData={post}
            editPost={handleEditSubmit}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.post?.id === nextProps.post?.id;
  },
);

export default PostModal;
