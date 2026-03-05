import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Loader2, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '../../hooks/useDebounce';
import { frequencyLabel } from '../../lib/utils';
import { useAuth } from '../auth/AuthContext';
import { useSchemes, useSchemeTypes, useDeleteScheme } from './schemeApi';

const TYPE_BADGE_COLORS = {
  Life: 'bg-emerald-100 text-emerald-800',
  Health: 'bg-rose-100 text-rose-800',
  Vehicle: 'bg-sky-100 text-sky-800',
  Property: 'bg-amber-100 text-amber-800',
  Travel: 'bg-violet-100 text-violet-800',
  Other: 'bg-gray-100 text-gray-800',
};

export default function SchemeListPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: typesData } = useSchemeTypes();
  const { data, isLoading } = useSchemes({
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
    company: companyFilter || undefined,
    activeOnly: true,
  });

  const deleteMutation = useDeleteScheme();

  const schemes = data?.data || [];
  const schemeTypes = typesData?.data?.types || [];
  const companies = typesData?.data?.companies || [];

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Scheme deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete scheme');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Schemes</h1>
        {isAdmin && (
          <Link
            to="/schemes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Scheme
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {schemeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search schemes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : schemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-20 text-gray-500">
          <LayoutGrid className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium">No schemes found</p>
          <p className="mt-1 text-sm">
            {debouncedSearch || typeFilter || companyFilter
              ? 'Try adjusting your filters.'
              : 'Get started by adding your first insurance scheme.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schemes.map((scheme) => (
            <div
              key={scheme._id}
              onClick={() => navigate(`/schemes/${scheme._id}/edit`)}
              className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
            >
              {/* Card header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {scheme.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">{scheme.company}</p>
                </div>
                <span
                  className={`ml-2 shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    TYPE_BADGE_COLORS[scheme.type] || TYPE_BADGE_COLORS.Other
                  }`}
                >
                  {scheme.type}
                </span>
              </div>

              {/* Description */}
              {scheme.description && (
                <p className="mb-3 text-sm leading-relaxed text-gray-600 line-clamp-2">
                  {scheme.description}
                </p>
              )}

              {/* Premium frequencies */}
              {scheme.premiumFrequencies && scheme.premiumFrequencies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {scheme.premiumFrequencies.map((freq) => (
                    <span
                      key={freq}
                      className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {frequencyLabel[freq] || freq}
                    </span>
                  ))}
                </div>
              )}

              {/* Delete button (admin only) */}
              {isAdmin && (
                <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(scheme._id);
                    }}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete scheme"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Scheme</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this scheme? Existing policies linked to this
              scheme may be affected.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
