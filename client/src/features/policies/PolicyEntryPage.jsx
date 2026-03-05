import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  User,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Check,
  Shield,
  FileText,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, frequencyLabel } from '../../lib/utils';
import { useSearchCustomers } from '../customers/customerApi';
import { useSchemes } from '../schemes/schemeApi';
import { useCreatePolicy } from './policyApi';

const STEPS = [
  { number: 1, label: 'Customer', icon: User },
  { number: 2, label: 'Scheme', icon: Shield },
  { number: 3, label: 'Details', icon: FileText },
  { number: 4, label: 'Review', icon: ClipboardList },
];

// ─── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const Icon = step.icon;
        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.number}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Select Customer ────────────────────────────────────────────────

function StepSelectCustomer({ selectedCustomer, onSelect, onNext }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading } = useSearchCustomers(debouncedSearch);
  const customers = data?.data || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Select Customer</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Search Results */}
      {debouncedSearch && !selectedCustomer && (
        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">No customers found</div>
          ) : (
            customers.map((customer) => (
              <button
                key={customer._id}
                onClick={() => onSelect(customer)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <p className="font-medium text-gray-800">{customer.name}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {customer.email}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected Customer Card */}
      {selectedCustomer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">{selectedCustomer.name}</h3>
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                </p>
                {selectedCustomer.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Change
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!selectedCustomer}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Select Scheme ──────────────────────────────────────────────────

function StepSelectScheme({ selectedScheme, onSelect, onNext, onBack }) {
  const [typeFilter, setTypeFilter] = useState('');
  const { data, isLoading } = useSchemes({ type: typeFilter || undefined });
  const schemes = data?.data || [];

  const schemeTypes = ['life', 'health', 'vehicle', 'property', 'other'];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Select Scheme</h2>

      <div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-64 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Types</option>
          {schemeTypes.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : schemes.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No schemes found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemes.map((scheme) => {
            const isSelected = selectedScheme?._id === scheme._id;
            return (
              <button
                key={scheme._id}
                onClick={() => onSelect(scheme)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <h3 className="font-semibold text-gray-800">{scheme.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{scheme.company}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    {scheme.type?.charAt(0).toUpperCase() + scheme.type?.slice(1)}
                  </span>
                </div>
                {scheme.premiumFrequencies && (
                  <p className="text-xs text-gray-400 mt-2">
                    Frequencies:{' '}
                    {scheme.premiumFrequencies.map((f) => frequencyLabel[f] || f).join(', ')}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedScheme}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Policy Details ─────────────────────────────────────────────────

function StepPolicyDetails({ selectedScheme, selectedCustomer, policyData, onChange, onNext, onBack }) {
  const availableFrequencies = selectedScheme?.premiumFrequencies || [
    'monthly',
    'quarterly',
    'half-yearly',
    'yearly',
  ];

  const handleFieldChange = (field, value) => {
    onChange({ ...policyData, [field]: value });
  };

  const handleNomineeChange = (field, value) => {
    onChange({
      ...policyData,
      nominee: { ...policyData.nominee, [field]: value },
    });
  };

  // Pre-fill nominee from customer if not already set
  const initNominee = () => {
    if (
      !policyData.nominee?.name &&
      selectedCustomer?.nominees &&
      selectedCustomer.nominees.length > 0
    ) {
      const firstNominee = selectedCustomer.nominees[0];
      onChange({
        ...policyData,
        nominee: {
          name: firstNominee.name || '',
          relationship: firstNominee.relationship || '',
          phone: firstNominee.phone || '',
        },
      });
    }
  };

  useState(() => {
    initNominee();
  });

  const isValid =
    policyData.policyNumber &&
    policyData.startDate &&
    policyData.premiumAmount &&
    policyData.premiumFrequency;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Policy Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number *</label>
          <input
            type="text"
            value={policyData.policyNumber || ''}
            onChange={(e) => handleFieldChange('policyNumber', e.target.value)}
            placeholder="e.g. POL-2024-001"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Premium Frequency *
          </label>
          <select
            value={policyData.premiumFrequency || ''}
            onChange={(e) => handleFieldChange('premiumFrequency', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Select frequency</option>
            {availableFrequencies.map((f) => (
              <option key={f} value={f}>
                {frequencyLabel[f] || f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            type="date"
            value={policyData.startDate || ''}
            onChange={(e) => handleFieldChange('startDate', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Maturity Date</label>
          <input
            type="date"
            value={policyData.maturityDate || ''}
            onChange={(e) => handleFieldChange('maturityDate', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Premium Amount *</label>
          <input
            type="number"
            value={policyData.premiumAmount || ''}
            onChange={(e) => handleFieldChange('premiumAmount', e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sum Assured</label>
          <input
            type="number"
            value={policyData.sumAssured || ''}
            onChange={(e) => handleFieldChange('sumAssured', e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Nominee Section */}
      <div>
        <h3 className="text-md font-semibold text-gray-700 mb-3">Nominee Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nominee Name</label>
            <input
              type="text"
              value={policyData.nominee?.name || ''}
              onChange={(e) => handleNomineeChange('name', e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
            <input
              type="text"
              value={policyData.nominee?.relationship || ''}
              onChange={(e) => handleNomineeChange('relationship', e.target.value)}
              placeholder="e.g. Spouse, Child"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={policyData.nominee?.phone || ''}
              onChange={(e) => handleNomineeChange('phone', e.target.value)}
              placeholder="Phone number"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={policyData.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          placeholder="Any additional notes..."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Submit ────────────────────────────────────────────────

function StepReview({ selectedCustomer, selectedScheme, policyData, onEdit, onSubmit, isSubmitting }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Review & Submit</h2>

      {/* Customer Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Customer Information</h3>
          <button
            onClick={() => onEdit(1)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Name</span>
            <p className="font-medium text-gray-800">{selectedCustomer?.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Phone</span>
            <p className="font-medium text-gray-800">{selectedCustomer?.phone}</p>
          </div>
          <div>
            <span className="text-gray-500">Email</span>
            <p className="font-medium text-gray-800">{selectedCustomer?.email || '-'}</p>
          </div>
        </div>
      </div>

      {/* Scheme Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Scheme Information</h3>
          <button
            onClick={() => onEdit(2)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Scheme Name</span>
            <p className="font-medium text-gray-800">{selectedScheme?.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Type</span>
            <p className="font-medium text-gray-800 capitalize">{selectedScheme?.type}</p>
          </div>
          <div>
            <span className="text-gray-500">Company</span>
            <p className="font-medium text-gray-800">{selectedScheme?.company}</p>
          </div>
        </div>
      </div>

      {/* Policy Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Policy Details</h3>
          <button
            onClick={() => onEdit(3)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Policy Number</span>
            <p className="font-medium text-gray-800">{policyData.policyNumber}</p>
          </div>
          <div>
            <span className="text-gray-500">Start Date</span>
            <p className="font-medium text-gray-800">{policyData.startDate}</p>
          </div>
          <div>
            <span className="text-gray-500">Maturity Date</span>
            <p className="font-medium text-gray-800">{policyData.maturityDate || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Premium Amount</span>
            <p className="font-medium text-gray-800">{formatCurrency(policyData.premiumAmount)}</p>
          </div>
          <div>
            <span className="text-gray-500">Frequency</span>
            <p className="font-medium text-gray-800">
              {frequencyLabel[policyData.premiumFrequency] || policyData.premiumFrequency}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Sum Assured</span>
            <p className="font-medium text-gray-800">
              {policyData.sumAssured ? formatCurrency(policyData.sumAssured) : '-'}
            </p>
          </div>
        </div>

        {policyData.nominee?.name && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Nominee</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium text-gray-800">{policyData.nominee.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Relationship</span>
                <p className="font-medium text-gray-800">{policyData.nominee.relationship || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone</span>
                <p className="font-medium text-gray-800">{policyData.nominee.phone || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {policyData.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Notes</span>
            <p className="text-sm font-medium text-gray-800 mt-1">{policyData.notes}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={() => onEdit(3)}
          className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> Submit Policy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard Component ──────────────────────────────────────────────────

export default function PolicyEntryPage() {
  const navigate = useNavigate();
  const createPolicyMutation = useCreatePolicy();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [policyData, setPolicyData] = useState({
    policyNumber: '',
    startDate: '',
    maturityDate: '',
    premiumAmount: '',
    premiumFrequency: '',
    sumAssured: '',
    nominee: { name: '', relationship: '', phone: '' },
    notes: '',
  });

  const handleSubmit = async () => {
    try {
      const payload = {
        customer: selectedCustomer._id,
        scheme: selectedScheme._id,
        policyNumber: policyData.policyNumber,
        startDate: policyData.startDate,
        maturityDate: policyData.maturityDate || undefined,
        premiumAmount: Number(policyData.premiumAmount),
        premiumFrequency: policyData.premiumFrequency,
        sumAssured: policyData.sumAssured ? Number(policyData.sumAssured) : undefined,
        nominee: policyData.nominee?.name ? policyData.nominee : undefined,
        notes: policyData.notes || undefined,
      };

      await createPolicyMutation.mutateAsync(payload);
      toast.success('Policy created successfully!');
      navigate('/policies');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create policy');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Policy</h1>

      <StepIndicator currentStep={currentStep} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {currentStep === 1 && (
          <StepSelectCustomer
            selectedCustomer={selectedCustomer}
            onSelect={setSelectedCustomer}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <StepSelectScheme
            selectedScheme={selectedScheme}
            onSelect={setSelectedScheme}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <StepPolicyDetails
            selectedScheme={selectedScheme}
            selectedCustomer={selectedCustomer}
            policyData={policyData}
            onChange={setPolicyData}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <StepReview
            selectedCustomer={selectedCustomer}
            selectedScheme={selectedScheme}
            policyData={policyData}
            onEdit={setCurrentStep}
            onSubmit={handleSubmit}
            isSubmitting={createPolicyMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
