import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomer, useCreateCustomer, useUpdateCustomer } from './customerApi';

const nomineeSchema = z.object({
  name: z.string().min(1, 'Nominee name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().optional(),
  aadhaarNumber: z.string().optional(),
});

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
  nominees: z.array(nomineeSchema).optional(),
});

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Other',
];

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: customerData, isLoading: isLoadingCustomer } = useCustomer(id);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      dateOfBirth: '',
      address: { street: '', city: '', state: '', pincode: '' },
      aadhaarNumber: '',
      panNumber: '',
      nominees: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'nominees',
  });

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEdit && customerData?.data) {
      const c = customerData.data;
      reset({
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        dateOfBirth: c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '',
        address: {
          street: c.address?.street || '',
          city: c.address?.city || '',
          state: c.address?.state || '',
          pincode: c.address?.pincode || '',
        },
        aadhaarNumber: c.aadhaarNumber || '',
        panNumber: c.panNumber || '',
        nominees: c.nominees || [],
      });
    }
  }, [isEdit, customerData, reset]);

  const onSubmit = async (formData) => {
    try {
      // Clean up empty optional fields
      if (!formData.email) delete formData.email;
      if (!formData.dateOfBirth) delete formData.dateOfBirth;
      if (!formData.aadhaarNumber) delete formData.aadhaarNumber;
      if (!formData.panNumber) delete formData.panNumber;

      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: formData });
        toast.success('Customer updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Customer created successfully');
      }
      navigate('/customers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  if (isEdit && isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Customer' : 'Add Customer'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="Full name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('phone')}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.phone
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="10-digit mobile number"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                {...register('email')}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                {...register('dateOfBirth')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Address</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Street</label>
              <input
                type="text"
                {...register('address.street')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                {...register('address.city')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="City"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
              <input
                type="text"
                {...register('address.state')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="State"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pincode</label>
              <input
                type="text"
                {...register('address.pincode')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="6-digit pincode"
              />
            </div>
          </div>
        </section>

        {/* ID Documents */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">ID Documents</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Aadhaar Number</label>
              <input
                type="text"
                {...register('aadhaarNumber')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="12-digit Aadhaar number"
                maxLength={12}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">PAN Number</label>
              <input
                type="text"
                {...register('panNumber')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>
          </div>
        </section>

        {/* Nominees */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Nominees</h2>
            <button
              type="button"
              onClick={() => append({ name: '', relationship: '', phone: '', aadhaarNumber: '' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Nominee
            </button>
          </div>

          {fields.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              No nominees added yet. Click "Add Nominee" to add one.
            </p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Nominee {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register(`nominees.${index}.name`)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        errors.nominees?.[index]?.name
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                      placeholder="Nominee name"
                    />
                    {errors.nominees?.[index]?.name && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.nominees[index].name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register(`nominees.${index}.relationship`)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        errors.nominees?.[index]?.relationship
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Select relationship</option>
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                    {errors.nominees?.[index]?.relationship && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.nominees[index].relationship.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                    <input
                      type="tel"
                      {...register(`nominees.${index}.phone`)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Aadhaar</label>
                    <input
                      type="text"
                      {...register(`nominees.${index}.aadhaarNumber`)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Aadhaar number"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
