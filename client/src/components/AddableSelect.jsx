import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * A <select> with a small + button next to it. Clicking + swaps the row into
 * an inline "type a new name + save" mode. On save we call onCreate(name),
 * which is expected to either:
 *  - return the newly-created option `{ value, label }` (we'll auto-select it),
 *  - or return null/undefined (no auto-select), or
 *  - throw to indicate failure (we surface the message via toast).
 *
 * Props:
 *  - value, onChange — standard controlled-select props
 *  - options: [{ value, label }]
 *  - onCreate(name) async — create on the server, return new option
 *  - placeholder: empty-option label, e.g. "Select category"
 *  - entityLabel: noun shown in the inline input placeholder, e.g. "category"
 *  - required, disabled, className — passthroughs for the <select>
 */
export default function AddableSelect({
  value,
  onChange,
  options = [],
  onCreate,
  placeholder = 'Select…',
  entityLabel = 'option',
  required,
  disabled,
  className = '',
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const inputCls = 'flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white ' + className;

  const cancel = () => {
    setAdding(false);
    setNewName('');
  };

  const save = async () => {
    const name = newName.trim();
    if (!name) return toast.error(`Enter a ${entityLabel} name`);
    if (!onCreate) return toast.error('Create handler missing');
    try {
      setBusy(true);
      const created = await onCreate(name);
      toast.success(`Added "${name}"`);
      if (created?.value) {
        onChange({ target: { value: created.value } });
      }
      cancel();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add');
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            if (e.key === 'Escape') cancel();
          }}
          placeholder={`New ${entityLabel} name…`}
          className={inputCls}
          autoFocus
          disabled={busy}
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          title="Save"
          className="shrink-0 p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          title="Cancel"
          className="shrink-0 p-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={inputCls}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setAdding(true)}
        title={`Add new ${entityLabel}`}
        disabled={disabled}
        className="shrink-0 p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
