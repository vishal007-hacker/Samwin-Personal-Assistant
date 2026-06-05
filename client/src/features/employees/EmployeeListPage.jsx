import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Loader2, X, Edit3, Trash2, Users, Phone, MapPin, IndianRupee, Calendar, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from './employeeApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDate, exportCSV } from '../../lib/utils';

// ── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Employee Form Modal ─────────────────────────────────────────────────────

function EmployeeFormModal({ employee, onClose }) {
  const isEdit = !!employee;
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const [form, setForm] = useState({
    name: employee?.name || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    designation: employee?.designation || '',
    address: employee?.address || '',
    aadhaarNumber: employee?.aadhaarNumber || '',
    dateOfJoining: employee?.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : '',
    salary: employee?.salary || '',
    defaultInTime: employee?.defaultInTime || '09:00',
    defaultOutTime: employee?.defaultOutTime || '18:00',
    bankAccount: {
      accountNumber: employee?.bankAccount?.accountNumber || '',
      ifsc: employee?.bankAccount?.ifsc || '',
      bankName: employee?.bankAccount?.bankName || '',
    },
    notes: employee?.notes || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setBank = (key) => (e) => setForm((f) => ({ ...f, bankAccount: { ...f.bankAccount, [key]: e.target.value } }));

  const mutation = isEdit ? updateMutation : createMutation;
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone are required');
    try {
      const payload = { ...form, salary: Number(form.salary) || 0 };
      if (isEdit) {
        await mutation.mutateAsync({ id: employee._id, ...payload });
        toast.success('Employee updated!');
      } else {
        await mutation.mutateAsync(payload);
        toast.success('Employee added!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={set('name')} required placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
            <input type="tel" value={form.phone} onChange={set('phone')} required placeholder="Mobile number" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="Email" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <input type="text" value={form.designation} onChange={set('designation')} placeholder="e.g. Technician, Sales" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
            <input type="date" value={form.dateOfJoining} onChange={set('dateOfJoining')} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
            <input type="number" value={form.salary} onChange={set('salary')} min="0" placeholder="0" className={inputCls} />
          </div>
          <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-2">Work Schedule (for late-arrival tracking)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expected In Time</label>
                <input type="time" value={form.defaultInTime} onChange={set('defaultInTime')} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expected Out Time</label>
                <input type="time" value={form.defaultOutTime} onChange={set('defaultOutTime')} className={inputCls} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Used to calculate late arrivals and early exits on the attendance page.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={form.address} onChange={set('address')} rows={2} placeholder="Full address" className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
            <input type="text" value={form.aadhaarNumber} onChange={set('aadhaarNumber')} placeholder="12-digit" maxLength={12} className={inputCls} />
          </div>
        </div>

        {/* Bank Details */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Bank Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account No.</label>
              <input type="text" value={form.bankAccount.accountNumber} onChange={setBank('accountNumber')} placeholder="Account number" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC</label>
              <input type="text" value={form.bankAccount.ifsc} onChange={setBank('ifsc')} placeholder="IFSC code" className={inputCls + ' uppercase'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input type="text" value={form.bankAccount.bankName} onChange={setBank('bankName')} placeholder="Bank name" className={inputCls} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any notes..." className={inputCls + ' resize-none'} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function EmployeeListPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useEmployees(debouncedSearch || undefined);
  const deleteMutation = useDeleteEmployee();

  const employees = data?.data || [];
  const [formModal, setFormModal] = useState(null);

  const handleDelete = async (emp) => {
    if (!confirm(`Delete employee "${emp.name}" and all their attendance records?`)) return;
    try {
      await deleteMutation.mutateAsync(emp._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleExport = () => {
    if (employees.length === 0) return toast.error('No data to export');
    const headers = ['Name', 'Phone', 'Email', 'Designation', 'Address', 'Aadhaar', 'Date of Joining', 'Salary', 'Bank Account', 'IFSC', 'Bank Name', 'Active'];
    const rows = employees.map((e) => [
      e.name,
      e.phone,
      e.email,
      e.designation,
      e.address,
      e.aadhaarNumber,
      formatDate(e.dateOfJoining),
      e.salary,
      e.bankAccount?.accountNumber,
      e.bankAccount?.ifsc,
      e.bankAccount?.bankName,
      e.isActive ? 'Yes' : 'No',
    ]);
    exportCSV('employees.csv', headers, rows);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage staff and track attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
      </div>

      {/* Employee Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="p-4 bg-gray-100 rounded-full mb-4"><Users className="w-12 h-12 text-gray-300" /></div>
          <p className="text-lg font-medium text-gray-500">No employees yet</p>
          <button onClick={() => setFormModal('create')} className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {employees.map((emp) => (
            <div key={emp._id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{emp.name}</h3>
                    {emp.designation && <p className="text-sm text-white/70">{emp.designation}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => setFormModal(emp)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(emp)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" /> {emp.phone}
                </div>
                {emp.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> <span className="line-clamp-2">{emp.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <IndianRupee className="w-4 h-4 text-gray-400" /> Salary: <span className="font-semibold text-gray-900">{formatCurrency(emp.salary || 0)}</span>/month
                </div>
                {emp.dateOfJoining && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" /> Joined: {formatDate(emp.dateOfJoining)}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-5 py-3">
                <Link to={`/employees/${emp._id}/attendance`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                  View Attendance & Salary
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {formModal && <EmployeeFormModal employee={formModal === 'create' ? null : formModal} onClose={() => setFormModal(null)} />}
    </div>
  );
}
