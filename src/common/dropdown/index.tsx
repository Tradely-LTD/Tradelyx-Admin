import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, X } from "lucide-react";

type DropdownItem = {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
};

interface TableDropdownProps {
  items?: DropdownItem[];
}

export default function TableDropdown({ items = [] }: TableDropdownProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsModalOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close on ESC key
  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    }

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isModalOpen]);

  // Toggle modal
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  return (
    <div className="relative inline-block m-auto w-full text-center">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center p-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-sm w-12 shadow-sm hover:bg-gray-50 cursor-pointer"
        onClick={toggleModal}
        aria-expanded={isModalOpen}
        aria-haspopup="dialog"
      >
        <MoreHorizontal size={18} />
      </button>

      {/* Mini-modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center">
          {" "}
          <div
            ref={modalRef}
            className="bg-white rounded-lg shadow-lg w-64 max-w-sm z-50 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Actions</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-2">
              {items.map((item, index) => (
                <button
                  key={index}
                  className="block w-full px-4 py-3 text-sm text-left text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  onClick={() => {
                    item.action();
                    setIsModalOpen(false);
                  }}
                >
                  <div className="flex items-center">
                    {item.icon && <span className="mr-3">{item.icon}</span>}
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
