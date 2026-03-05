import Modal from './Modal';

const variantStyles = {
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  variant = 'primary',
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${variantStyles[variant] || variantStyles.primary}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
