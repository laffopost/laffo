import { useState } from "react";
import toast from "react-hot-toast";

export default function EditImageForm({
  post,
  onSave,
  onCancel,
  isSubmitting,
}) {
  const [title, setTitle] = useState(post.title || "");
  const [description, setDescription] = useState(post.description || "");
  const [newImage, setNewImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setNewImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const updateData = {
      title: title.trim(),
      description: description.trim(),
    };

    if (newImage) {
      updateData.newImage = newImage;
    }

    onSave(updateData);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      <div className="edit-form-group">
        <label className="edit-form-label">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter post title"
          className="edit-form-input"
          maxLength={100}
          required
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter post description (optional)"
          className="edit-form-textarea"
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Current Image</label>
        <img
          src={previewUrl || post.image || post.imageUrl}
          alt="Current post"
          className="edit-image-preview"
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Change Image (optional)</label>
        <div className="edit-file-input">
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>
      </div>

      <div className="edit-form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="edit-form-btn edit-form-btn-cancel"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="edit-form-btn edit-form-btn-save"
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
