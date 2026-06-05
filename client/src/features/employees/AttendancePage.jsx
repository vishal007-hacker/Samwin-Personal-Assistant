import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Loader2, X, Edit3, Trash2, Clock, MapPin, Briefcase,
  IndianRupee, Calendar, FileText, ChevronLeft, ChevronRight, Sun, Moon, Coffee, Sunset,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useEmployee, useSalaryReport } from './employeeApi';
import { useAttendance, useCreateAttendance, useUpdateAttendance, useDeleteAttendance } from './attendanceApi';
import { formatCurrency, formatDate } from '../../lib/utils';

// ── Time math helpers ───────────────────────────────────────────────────────

// Parse "HH:MM" -> minutes since midnight. Returns null if invalid/empty.
function timeToMin(t) {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function diffMin(start, end) {
  const s = timeToMin(start);
  const e = timeToMin(end);
  if (s == null || e == null || e < s) return 0;
  return e - s;
}

function minToHM(mins) {
  if (!mins || mins <= 0) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Compute working / late / early-exit / effective hours for one attendance row.
function computeAttendanceMetrics(att, employee) {
  // Morning block + afternoon block
  const morningMin = diffMin(att.morningIn, att.afternoonOut);
  const afternoonMin = diffMin(att.afterLunchIn, att.nightOut);
  const workedMin = morningMin + afternoonMin;

  // Permission in minutes (user enters hours)
  const permissionMin = Math.round((Number(att.permissionHours) || 0) * 60);

  // Effective worked = worked - permission (permission means away from work)
  const effectiveMin = Math.max(0, workedMin - permissionMin);

  // Late arrival = morningIn - expectedIn (positive only)
  const expectedIn = timeToMin(employee?.defaultInTime || '09:00');
  const actualIn = timeToMin(att.morningIn);
  let lateMin = 0;
  if (actualIn != null && expectedIn != null && actualIn > expectedIn) {
    lateMin = actualIn - expectedIn;
  }

  // Early exit = expectedOut - nightOut (positive only)
  const expectedOut = timeToMin(employee?.defaultOutTime || '18:00');
  const actualOut = timeToMin(att.nightOut);
  let earlyExitMin = 0;
  if (actualOut != null && expectedOut != null && actualOut < expectedOut) {
    earlyExitMin = expectedOut - actualOut;
  }

  return { workedMin, effectiveMin, permissionMin, lateMin, earlyExitMin };
}

// ── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  present: { label: 'Present', bg: 'bg-green-100', text: 'text-green-700' },
  absent: { label: 'Absent', bg: 'bg-red-100', text: 'text-red-700' },
  'half-day': { label: 'Half Day', bg: 'bg-amber-100', text: 'text-amber-700' },
  leave: { label: 'Leave', bg: 'bg-blue-100', text: 'text-blue-700' },
};

// ── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Attendance Form Modal ───────────────────────────────────────────────────

function AttendanceFormModal({ employeeId, entry, onClose }) {
  const isEdit = !!entry;
  const createMutation = useCreateAttendance();
  const updateMutation = useUpdateAttendance();

  const [form, setForm] = useState({
    date: entry?.date ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    morningIn: entry?.morningIn || '',
    afternoonOut: entry?.afternoonOut || '',
    afterLunchIn: entry?.afterLunchIn || '',
    nightOut: entry?.nightOut || '',
    workDetails: entry?.workDetails || '',
    location: entry?.location || '',
    expenses: entry?.expenses || '',
    expenseNotes: entry?.expenseNotes || '',
    permissionHours: entry?.permissionHours ?? '',
    permissionReason: entry?.permissionReason || '',
    status: entry?.status || 'present',
    notes: entry?.notes || '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const mutation = isEdit ? updateMutation : createMutation;
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        expenses: Number(form.expenses) || 0,
        permissionHours: Number(form.permissionHours) || 0,
      };
      if (isEdit) {
        await mutation.mutateAsync({ id: entry._id, ...payload });
        toast.success('Attendance updated!');
      } else {
        await mutation.mutateAsync({ employee: employeeId, ...payload });
        toast.success('Attendance marked!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Attendance' : 'Mark Attendance'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} onChange={set('date')} required disabled={isEdit} className={inputCls + (isEdit ? ' bg-gray-50' : '')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')} className={inputCls + ' bg-white'}>
              <option value="present">Present</option>
              <option value="half-day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
            </select>
          </div>
        </div>

        {/* Time Entries */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> Time Entries</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Sun className="w-3 h-3 text-amber-500" /> Morning In</label>
              <input type="time" value={form.morningIn} onChange={set('morningIn')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Coffee className="w-3 h-3 text-orange-500" /> Afternoon Out</label>
              <input type="time" value={form.afternoonOut} onChange={set('afternoonOut')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Sunset className="w-3 h-3 text-orange-400" /> After Lunch In</label>
              <input type="time" value={form.afterLunchIn} onChange={set('afterLunchIn')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Moon className="w-3 h-3 text-indigo-500" /> Night Out</label>
              <input type="time" value={form.nightOut} onChange={set('nightOut')} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Work Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Details</label>
          <textarea value={form.workDetails} onChange={set('workDetails')} rows={2} placeholder="What work was done today..." className={inputCls + ' resize-none'} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input type="text" value={form.location} onChange={set('location')} placeholder="e.g. Office, Client site, Field" className={inputCls} />
        </div>

        {/* Permission Hours */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-2">Permission / Authorized Absence</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Permission Hours</label>
              <input type="number" step="0.25" min="0" value={form.permissionHours} onChange={set('permissionHours')} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
              <input type="text" value={form.permissionReason} onChange={set('permissionReason')} placeholder="e.g. Doctor visit, family event" className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-1.5">These hours are deducted from working hours when calculating attendance.</p>
        </div>

        {/* Expenses */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expenses</label>
            <input type="number" value={form.expenses} onChange={set('expenses')} min="0" placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Notes</label>
            <input type="text" value={form.expenseNotes} onChange={set('expenseNotes')} placeholder="Travel, food..." className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input type="text" value={form.notes} onChange={set('notes')} placeholder="Any additional notes" className={inputCls} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Mark Attendance'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { id } = useParams();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: empData, isLoading: empLoading } = useEmployee(id);
  const { data: salaryData, isLoading: salaryLoading } = useSalaryReport(id, month, year);
  const deleteMutation = useDeleteAttendance();

  const employee = empData?.data;
  const report = salaryData?.data || {};
  const attendance = report.attendance || [];

  const [formModal, setFormModal] = useState(null);

  const handleDelete = async (att) => {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await deleteMutation.mutateAsync(att._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed');
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (empLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (!employee) return <div className="text-center py-20 text-gray-500">Employee not found. <Link to="/employees" className="text-blue-600 hover:underline">Go back</Link></div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
            <p className="text-sm text-gray-500">{employee.designation || 'Employee'} &middot; Salary: {formatCurrency(employee.salary || 0)}/month</p>
          </div>
          <button onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Mark Attendance
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Salary Summary Cards */}
      {salaryLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500 font-medium">Present</span></div>
            <p className="text-xl font-bold text-green-600">{report.presentDays || 0} <span className="text-sm font-normal text-gray-400">days</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-red-500" /><span className="text-xs text-gray-500 font-medium">Absent / Leave</span></div>
            <p className="text-xl font-bold text-red-600">{(report.absentDays || 0) + (report.leaveDays || 0)} <span className="text-sm font-normal text-gray-400">days</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500 font-medium">Earned Salary</span></div>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(report.earnedSalary || 0)}</p>
            <p className="text-xs text-gray-400">{report.workingDays || 0}/{report.daysInMonth || 0} working days</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-purple-500" /><span className="text-xs text-gray-500 font-medium">Net Payable</span></div>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(report.netPayable || 0)}</p>
            <p className="text-xs text-gray-400">Salary + Expenses ({formatCurrency(report.totalExpenses || 0)})</p>
          </div>
        </div>
      )}

      {/* Monthly Hours Summary */}
      {attendance.length > 0 && (() => {
        let workedTotal = 0, lateTotal = 0, permissionTotal = 0, earlyExitTotal = 0;
        for (const att of attendance) {
          const m = computeAttendanceMetrics(att, employee);
          workedTotal += m.effectiveMin;
          lateTotal += m.lateMin;
          permissionTotal += m.permissionMin;
          earlyExitTotal += m.earlyExitMin;
        }
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Worked Hours</span></div>
              <p className="text-xl font-bold text-green-600">{minToHM(workedTotal)}</p>
              <p className="text-xs text-gray-400">Effective (after permission)</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-red-500" /><span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Late In</span></div>
              <p className="text-xl font-bold text-red-600">{minToHM(lateTotal)}</p>
              <p className="text-xs text-gray-400">Past expected {employee.defaultInTime || '09:00'}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Permission</span></div>
              <p className="text-xl font-bold text-amber-600">{minToHM(permissionTotal)}</p>
              <p className="text-xs text-gray-400">Authorized absence</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-orange-500" /><span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Early Exit</span></div>
              <p className="text-xl font-bold text-orange-600">{minToHM(earlyExitTotal)}</p>
              <p className="text-xs text-gray-400">Before expected {employee.defaultOutTime || '18:00'}</p>
            </div>
          </div>
        );
      })()}

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {attendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Calendar className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No attendance records for {monthName}</p>
            <button onClick={() => setFormModal('create')} className="mt-3 text-sm text-indigo-600 hover:underline">Mark attendance</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Date</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs"><Sun className="w-3.5 h-3.5 mx-auto text-amber-500" /></th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs"><Coffee className="w-3.5 h-3.5 mx-auto text-orange-500" /></th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs"><Sunset className="w-3.5 h-3.5 mx-auto text-orange-400" /></th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs"><Moon className="w-3.5 h-3.5 mx-auto text-indigo-500" /></th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Worked</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Late</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Permission</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Work / Location</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Expenses</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.map((att) => {
                  const cfg = STATUS_CONFIG[att.status] || STATUS_CONFIG.present;
                  const m = computeAttendanceMetrics(att, employee);
                  return (
                    <tr key={att._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatDate(att.date)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-700 font-mono">{att.morningIn || '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 font-mono">{att.afternoonOut || '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 font-mono">{att.afterLunchIn || '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 font-mono">{att.nightOut || '-'}</td>
                      <td className="px-3 py-3 text-center">
                        {m.workedMin > 0 ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700" title={`Effective: ${minToHM(m.effectiveMin)}`}>
                            {minToHM(m.effectiveMin)}
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.lateMin > 0 ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700" title="Late arrival vs expected in-time">
                            {minToHM(m.lateMin)}
                          </span>
                        ) : m.earlyExitMin > 0 ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-700" title="Left early vs expected out-time">
                            -{minToHM(m.earlyExitMin)}
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.permissionMin > 0 ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-700" title={att.permissionReason || ''}>
                            {minToHM(m.permissionMin)}
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {att.workDetails && <p className="text-gray-700 truncate max-w-[200px]" title={att.workDetails}>{att.workDetails}</p>}
                        {att.location && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{att.location}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {att.expenses > 0 ? (
                          <div>
                            <span className="font-semibold text-gray-900">{formatCurrency(att.expenses)}</span>
                            {att.expenseNotes && <p className="text-xs text-gray-400 truncate max-w-[100px]">{att.expenseNotes}</p>}
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setFormModal(att)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(att)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {formModal && <AttendanceFormModal employeeId={id} entry={formModal === 'create' ? null : formModal} onClose={() => setFormModal(null)} />}
    </div>
  );
}
