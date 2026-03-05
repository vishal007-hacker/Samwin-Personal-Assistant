import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Loader2,
  User,
  MapPin,
  FileText,
  Users,
  Shield,
} from 'lucide-react';
import api from '../../lib/axios';
import { formatDate, formatCurrency, maskAadhaar, statusColors } from '../../lib/utils';
import { useCustomer } from './customerApi';

function useCustomerPolicies(customerId) {
  return useQuery({
    queryKey: ['policies', { customer: customerId }],
    queryFn: async () => {
      const { data } = await api.get('/policies', { params: { customer: customerId } });
      return data;
    },
    enabled: !!customerId,
  });
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2">
      <dt className="min-w-[140px] text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 sm:mt-0">{value || '-'}</dd>
    </div>
  );
}

export default function CustomerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customerData, isLoading: isLoadingCustomer } = useCustomer(id);
  const { data: policiesData, isLoading: isLoadingPolicies } = useCustomerPolicies(id);

  const customer = customerData?.data;
  const policies = policiesData?.data || [];

  if (isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">Customer not found</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">Customer Profile</p>
          </div>
        </div>
        <Link
          to={`/customers/${id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </div>

      {/* Personal Details */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <User className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
        </div>
        <div className="divide-y divide-gray-100 px-6 py-2">
          <InfoRow label="Name" value={customer.name} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Date of Birth" value={formatDate(customer.dateOfBirth)} />
        </div>
      </section>

      {/* Address */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <MapPin className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Address</h2>
        </div>
        <div className="divide-y divide-gray-100 px-6 py-2">
          <InfoRow label="Street" value={customer.address?.street} />
          <InfoRow label="City" value={customer.address?.city} />
          <InfoRow label="State" value={customer.address?.state} />
          <InfoRow label="Pincode" value={customer.address?.pincode} />
        </div>
      </section>

      {/* ID Documents */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <FileText className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">ID Documents</h2>
        </div>
        <div className="divide-y divide-gray-100 px-6 py-2">
          <InfoRow label="Aadhaar" value={maskAadhaar(customer.aadhaar)} />
          <InfoRow label="PAN" value={customer.pan?.toUpperCase()} />
        </div>
      </section>

      {/* Nominees */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <Users className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Nominees</h2>
        </div>
        <div className="p-6">
          {!customer.nominees || customer.nominees.length === 0 ? (
            <p className="text-sm text-gray-500">No nominees added.</p>
          ) : (
            <div className="space-y-3">
              {customer.nominees.map((nominee, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                    <div>
                      <span className="block text-xs font-medium text-gray-500">Name</span>
                      <span className="text-sm text-gray-900">{nominee.name}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500">Relationship</span>
                      <span className="text-sm text-gray-900">{nominee.relationship}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500">Phone</span>
                      <span className="text-sm text-gray-900">{nominee.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500">Aadhaar</span>
                      <span className="text-sm text-gray-900">{maskAadhaar(nominee.aadhaar)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Policies */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Policies</h2>
        </div>
        <div className="p-6">
          {isLoadingPolicies ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : policies.length === 0 ? (
            <p className="text-sm text-gray-500">No policies found for this customer.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Policy Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Scheme
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Premium
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Next Due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {policies.map((policy) => (
                    <tr key={policy._id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          to={`/policies/${policy._id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {policy.policyNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {policy.scheme?.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            statusColors[policy.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {policy.status?.charAt(0).toUpperCase() + policy.status?.slice(1)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(policy.premiumAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {formatDate(policy.nextDueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
