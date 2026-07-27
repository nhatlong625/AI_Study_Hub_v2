function Modal({ isOpen, title, children, onClose, contentClassName = "" }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 grid place-items-center p-5 bg-[rgba(35,24,58,0.36)] backdrop-blur-[10px] z-[100]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-[min(560px,100%)] bg-white rounded-[28px] p-6 shadow-[0_18px_50px_rgba(71,46,123,0.12)] ${contentClassName}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 mb-[18px]">
          <h3 className="m-0 text-[1.05rem] font-bold">{title}</h3>
          <button
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl font-bold cursor-pointer transition-all text-sm bg-white hover:bg-gray-50 text-gray-800 border border-[#e7def8]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
