import { CircleHelp, X } from "lucide-react";
import { t } from "../lib/i18n";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return message ? (
    <div className="toast" role="status">
      <CircleHelp size={18} />
      <span>{message}</span>
      <button onClick={onClose} aria-label={t("Close")}>
        <X size={15} />
      </button>
    </div>
  ) : null;
}
