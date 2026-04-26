import { createPortal } from 'react-dom'

export default function ConfirmModal({ message, onConfirm, onCancel, danger = false }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-gray-800 text-sm leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-800 hover:bg-gray-900'}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
