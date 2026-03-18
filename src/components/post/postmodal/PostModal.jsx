import { useState, useMemo, memo, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { usePosts } from "../../../context/PostContext";
import PostModalImageSection from "./PostModalImageSection";
import PostModalCommentsSection from "./PostModalCommentsSection";
import PostModalHeader from "./PostModalHeader";
import AddPostModal from "../AddPostModal";
import MediaPlayer from "../MediaPlayer";
import toast from "react-hot-toast";
import "./PostModal.css";

import logger from "../../../utils/logger";
const PostModal = memo(
  function PostModal({
    image,
    onClose,
    onPrev,
    onNext,
    onRandom,
    onDelete,
    onEdit,
  }) {
    logger.log("🎬 PostModal rendered for:", image?.id);
    logger.log("🎬 PostModal - Image type:", image?.type);
    logger.log("🎬 PostModal - Is media?:", image?.type === "media");
    logger.log("🎬 PostModal - Full image object:", image);

    const { deletePost, editPost } = usePosts();
    const { firebaseUser, userProfile } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
      if (image?.type === "media") {
        logger.log("🎥 MEDIA POST DETECTED!");
        logger.log("🎥 Media Type:", image.mediaType);
        logger.log("🎥 Embed URL:", image.embedUrl);
        logger.log("🎥 Media URL:", image.mediaUrl);
      }
    }, [image]);

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
      if (!firebaseUser || !image) return false;
      return (
        image.uploadedBy === firebaseUser.uid ||
        image.author?.toLowerCase() === userProfile?.username?.toLowerCase()
      );
    }, [firebaseUser, userProfile, image]);

    const canEdit = useMemo(() => {
      if (!firebaseUser || !image) return false;
      return (
        image.uploadedBy === firebaseUser.uid ||
        image.author?.toLowerCase() === userProfile?.username?.toLowerCase()
      );
    }, [firebaseUser, userProfile, image]);

    const handleDelete = async () => {
      if (!canDelete || isDeleting) return;

      setIsDeleting(true);
      try {
        await deletePost(image.id);
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
      editPost(image.id, newPost)
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
                  image={image}
                  isMediaPost={image.type === "media"}
                  canDelete={canDelete}
                  canEdit={canEdit}
                  onDeleteRequest={() => setShowDeleteConfirm(true)}
                  onEditRequest={() => setShowEditModal(true)}
                  onRandom={onRandom || null}
                />
              </div>
              <PostModalCommentsSection image={image} />
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
            editPostData={image}
            editPost={handleEditSubmit}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.image?.id === nextProps.image?.id;
  },
);

export default PostModal;
