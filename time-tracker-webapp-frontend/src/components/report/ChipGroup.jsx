// Tap-to-toggle chips; selection shows instantly (saving happens behind)
const ChipGroup = ({ items, selectedIds, onToggle, variant = 'task', label }) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-2">
    {items.map(item => {
      const selected = selectedIds.includes(String(item._id));
      return (
        <button
          key={item._id}
          type="button"
          aria-pressed={selected}
          onClick={() => onToggle(String(item._id))}
          className={`chip tap ${variant === 'issue' ? 'chip-issue' : ''}`}
        >
          {selected && (
            <svg className="h-4 w-4 -ml-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42l2.79 2.8 6.79-6.8a1 1 0 011.42 0z" clipRule="evenodd" />
            </svg>
          )}
          {item.label}
        </button>
      );
    })}
  </div>
);

export default ChipGroup;
