import { FC, ReactNode } from "react";

import { Modal as KitModal } from "@/common/ui/kit";

/**
 * The older modal API (isOpen, className for the width), kept so existing
 * screens work unchanged, drawn with the kit's Modal so every window in the
 * admin looks and behaves the same. New code uses Modal from common/ui/kit.
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/** Callers' width class (e.g. "!max-w-[860px]"), passed as written so Tailwind has generated it */
const widthFrom = (className?: string) => className?.split(/\s+/).find((c) => /max-w-/.test(c));

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => (
  <KitModal open={isOpen} onClose={onClose} title={title} width={widthFrom(className) ?? "max-w-lg"}>
    {children}
  </KitModal>
);

export default Modal;
