interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// Shown after the server flags a shift over the length limit; ticking it
// re-sends the save with allowLong so genuine long shifts can be recorded
const LongShiftConfirm = ({ checked, onChange }: Props) => (
  <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 cursor-pointer">
    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-600" checked={checked}
      onChange={e => onChange(e.target.checked)} />
    The dates are correct, this shift really was this long
  </label>
);

export default LongShiftConfirm;
