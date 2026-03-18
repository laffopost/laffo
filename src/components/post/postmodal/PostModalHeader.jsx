import { CloseIcon } from "../../../utils/icons";

export default function PostModalHeader({ onClose }) {
  return (
    <button className="image-modal-close" onClick={onClose}>
      <CloseIcon size={18} />
    </button>
  );
}
