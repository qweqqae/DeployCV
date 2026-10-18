import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function CustomCheckbox({ checked, onChange, disabled, id }: CustomCheckboxProps) {
  return (
    <label className={`custom-checkbox${disabled ? ' custom-checkbox--disabled' : ''}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="custom-checkbox__box" aria-hidden="true">
        <Check size={12} strokeWidth={3} />
      </span>
    </label>
  );
}
