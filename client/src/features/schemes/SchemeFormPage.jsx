import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useScheme, useCreateScheme, useUpdateScheme } from './schemeApi';

const SCHEME_TYPES = ['Life', 'Health', 'Vehicle', 'Property', 'Travel', 'Other'];

const PREMIUM_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const schemeSchema = z.object({
  name: z.string().min(1, 'Scheme name is required'),
  type: z.string().min(1, 'Type is required'),
  company: z.string().min(1, 'Company is required'),
  description: z.string().optional(),
  premiumFrequencies: z.array(z.string()).optional(),
  coverageRange: z.object({
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
  }).optional(),
  maturityPeriod: z.object({
    minYears: z.coerce.number().optional(),
    maxYears: z.coerce.number().optional(),
  }).optional(),
  entryAge: z.object({
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
  }).optional(),
  features: z.array(z.string()).optional(),
});

export default function SchemeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: schemeData, isLoading: isLoadingScheme } = useScheme(id);
  const createMutation = useCreateScheme();
  const updateMutation = useUpdateScheme();

  const [featureInput, setFeatureInput] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schemeSchema),
    defaultValues: {
      name: '',
      type: '',
      company: '',
      description: '',
      premiumFrequencies: [],
      coverageRange: { min: '', max: '' },
      maturityPeriod: { minYears: '', maxYears: '' },
      entryAge: { min: '', max: '' },
      features: [],
    },
  });

  const features = watch('features') || [];
  const premiumFrequencies = watch('premiumFrequencies') || [];

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEdit && schemeData?.data) {
      const s = schemeData.data;
      reset({
        name: s.name || '',
        type: s.type || '',
        company: s.company || '',
        description: s.description || '',
        premiumFrequencies: s.premiumFrequencies || [],
        coverageRange: {
          min: s.coverageRange?.min ?? '',
          max: s.coverageRange?.max ?? '',
        },
        maturityPeriod: {
          minYears: s.maturityPeriod?.minYears ?? '',
          maxYears: s.maturityPeriod?.maxYears ?? '',
        },
        entryAge: {
          min: s.entryAge?.min ?? '',
          max: s.entryAge?.max ?? '',
        },
        features: s.features || [],
      });
    }
  }, [isEdit, schemeData, reset]);

  const handleFrequencyToggle = (freq) => {
    const current = premiumFrequencies;
    if (current.includes(freq)) {
      setValue(
        'premiumFrequencies',
        current.filter((f) => f !== freq),
      );
    } else {
      setValue('premiumFrequencies', [...current, freq]);
    }
  };

  const handleAddFeature = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = featureInput.trim();
      if (trimmed && !features.includes(trimmed)) {
        setValue('features', [...features, trimmed]);
      }
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (featureToRemove) => {
    setValue(
      'features',
      features.filter((f) => f !== featureToRemove),
    );
  };

  const onSubmit = async (formData) => {
    try {
      // Clean up empty numeric fields so they don't send 0
      if (!formData.coverageRange?.min && formData.coverageRange?.min !== 0) {
        delete formData.coverageRange.min;
      }
      if (!formData.coverageRange?.max && formData.coverageRange?.max !== 0) {
        delete formData.coverageRange.max;
      }
      if (!formData.maturityPeriod?.minYears && formData.maturityPeriod?.minYears !== 0) {
        delete formData.maturityPeriod.minYears;
      }
      if (!formData.maturityPeriod?.maxYears && formData.maturityPeriod?.maxYears !== 0) {
        delete formData.maturityPeriod.maxYears;
      }
      if (!formData.entryAge?.min && formData.entryAge?.min !== 0) {
        delete formData.entryAge.min;
      }
      if (!formData.entryAge?.max && formData.entryAge?.max !== 0) {
        delete formData.entryAge.max;
      }

      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: formData });
        toast.success('Scheme updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Scheme created successfully');
      }
      navigate('/schemes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  if (isEdit && isLoadingScheme) {
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
          {isEdit ? 'Edit Scheme' : 'Add Scheme'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Scheme Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="e.g., LIC Jeevan Anand"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('type')}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.type
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Select type</option>
                {SCHEME_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('company')}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.company
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="e.g., LIC of India"
              />
              {errors.company && (
                <p className="mt-1 text-xs text-red-600">{errors.company.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Brief description of the scheme..."
              />
            </div>
          </div>
        </section>

        {/* Premium Frequencies */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Premium Frequencies</h2>
          <div className="flex flex-wrap gap-3">
            {PREMIUM_FREQUENCIES.map(({ value, label }) => (
              <label
                key={value}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  premiumFrequencies.includes(value)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={premiumFrequencies.includes(value)}
                  onChange={() => handleFrequencyToggle(value)}
                  className="sr-only"
                />
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    premiumFrequencies.includes(value)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}
                >
                  {premiumFrequencies.includes(value) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {label}
              </label>
            ))}
          </div>
        </section>

        {/* Coverage Range */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Coverage Range</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Minimum Coverage</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">&#8377;</span>
                <input
                  type="number"
                  {...register('coverageRange.min')}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., 100000"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Maximum Coverage</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">&#8377;</span>
                <input
                  type="number"
                  {...register('coverageRange.max')}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., 5000000"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Maturity Period */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Maturity Period</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Min Years</label>
              <input
                type="number"
                {...register('maturityPeriod.minYears')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Max Years</label>
              <input
                type="number"
                {...register('maturityPeriod.maxYears')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 30"
              />
            </div>
          </div>
        </section>

        {/* Entry Age */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Entry Age</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Min Age</label>
              <input
                type="number"
                {...register('entryAge.min')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 18"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Max Age</label>
              <input
                type="number"
                {...register('entryAge.max')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 65"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Features</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Add features (press Enter to add)
            </label>
            <input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={handleAddFeature}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type a feature and press Enter..."
            />
          </div>

          {features.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {features.map((feature, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(feature)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {features.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              No features added yet. Type above and press Enter.
            </p>
          )}
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
            {isEdit ? 'Update Scheme' : 'Create Scheme'}
          </button>
        </div>
      </form>
    </div>
  );
}
