import { useState } from "react";
import { createPortal } from "react-dom";
import { ShareIcon } from "../../utils/icons";
import { ShareMenu } from "../features/utilities";

export default function PostShareButton({ post, variant = "card" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={variant === "modal" ? "reaction-share-btn" : "image-action-btn small-share"}
        title="Share"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <ShareIcon size={variant === "modal" ? 16 : 15} />
      </button>

      {open && createPortal(
        <ShareMenu sharePost={post} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}
