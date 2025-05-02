import React, { useState } from "react";
import { ArrowDown } from "iconsax-react";

interface SelectProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  classNameWrapper?: string;
  error?: string;
  label?: string;
  fullWidth?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  leftIcon?: React.ReactNode;
  rest?: any;
}

function Select({
  placeholder = "",
  value,
  classNameWrapper,
  onChange,
  name,
  disabled = false,
  required = false,
  className = "",
  error,
  label,
  fullWidth = false,
  onBlur,
  onFocus,
  options,
  leftIcon,
  rest,
}: SelectProps) {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyles = {
    position: "relative" as const,
    width: fullWidth ? "100%" : "auto",
  };

  const selectWrapperStyles = {
    display: "flex",
    alignItems: "center",
    position: "relative" as const,
    width: "100%",
    border: "1px solid",
    borderColor: error ? "#ef4444" : isFocused ? "#2C7743" : "#CBD5E1",
    borderRadius: "6px",
    transition: "all 0.2s ease-in-out",
    backgroundColor: disabled ? "#f3f4f6" : "white",
    marginBottom: "10px",
  };

  const selectStyles = {
    padding: "0.75rem 1rem",
    paddingLeft: leftIcon ? "2.5rem" : "1rem",
    paddingRight: "2.5rem",
    fontSize: "1rem",
    width: "100%",
    border: "none",
    outline: "none",
    borderRadius: "30px",
    backgroundColor: "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 300,
    height: "40px",
    appearance: "none" as const,
    color: value ? "#000" : "#64748b",
  };

  const iconStyles = {
    position: "absolute" as const,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.5rem",
    height: "1.5rem",
  };

  const leftIconStyles = {
    ...iconStyles,
    left: "0.75rem",
  };

  const rightIconStyles = {
    ...iconStyles,
    right: "0.75rem",
    // pointerEvents: 'none',
  };

  const labelStyles = {
    display: "block",
    marginBottom: "0.2rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#374151",
  };

  const errorStyles = {
    fontSize: "0.75rem",
    color: "#ef4444",
    marginTop: "0.25rem",
    fontWeight: 500,
  };

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div>
      {label && (
        <label style={labelStyles}>
          {label}
          {required && <span style={{ color: "#ef4444" }}> *</span>}
        </label>
      )}
      <div style={containerStyles}>
        <div style={selectWrapperStyles} className={classNameWrapper}>
          {leftIcon && <span style={leftIconStyles}>{leftIcon}</span>}
          <select
            value={value}
            onChange={onChange}
            name={name}
            disabled={disabled}
            required={required}
            className={className}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={selectStyles}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span style={rightIconStyles}>
            <ArrowDown size="20" color="#64748b" />
          </span>
        </div>
      </div>
      {error && <div style={errorStyles}>{error}</div>}
    </div>
  );
}

export default Select;
