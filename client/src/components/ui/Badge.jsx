const variantClasses = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  default: 'bg-gray-100 text-gray-700',
};

export default function Badge({ variant = 'default', children }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant] || variantClasses.default}`}
    >
      {children}
    </span>
  );
}
