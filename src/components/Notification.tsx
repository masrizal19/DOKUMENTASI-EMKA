import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface NotificationProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Notification({ message, type, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-24 right-4 md:right-8 z-50 max-w-sm w-full"
      >
        <div className="glass-panel p-4 rounded-lg flex items-start gap-3 shadow-xl">
          {type === "success" ? (
            <CheckCircle className="w-5 h-5 text-[#f6c374] shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-body font-medium text-[#eae1d8]">
            {message}
          </div>
          <button
            onClick={onClose}
            className="text-[#d3c4b3] hover:text-[#eae1d8] transition-colors p-0.5 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
