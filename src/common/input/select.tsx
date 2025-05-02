import React, { useState } from "react";
import { Select } from "@radix-ui/themes";

interface SelectComponentProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  options: { label: string; value: string; id?: string; [key: string]: any }[]; // Allow additional properties
  onChange: (value: string, id?: string, rest?: any) => void; // Modified to include id and rest
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  fullWidth?: boolean;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  isLoading?: boolean;
}

const SelectComponent: React.FC<SelectComponentProps> = ({
  label,
  value,
  defaultValue,
  options,
  onChange,
  className = "",
  disabled = false,
  required = false,
  error,
  fullWidth = false,
  placeholder,
  leftIcon,
  isLoading = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Handler to find and return value, id, and additional data
  const handleChange = (selectedValue: string) => {
    const selectedOption = options.find((opt) => opt.value === selectedValue);
    if (selectedOption) {
      const { id, ...rest } = selectedOption; // Destructure id and rest of the properties
      onChange(selectedValue, id, rest); // Pass value, id, and additional data
    }
  };

  const containerStyles = {
    position: "relative" as const,
    width: fullWidth ? "100%" : "auto",
  };

  const selectWrapperStyles = {
    display: "flex",
    alignItems: "center",
    position: "relative" as const,
    width: "100%",
    borderColor: error ? "#ef4444" : isFocused ? "#2C7743" : "#CBD5E1",
    borderRadius: "6px",
    transition: "all 0.2s ease-in-out",
    backgroundColor: disabled ? "#f3f4f6" : "white",
    marginBottom: "10px",
  };

  const triggerStyles = {
    padding: "0.75rem 1rem",
    paddingLeft: leftIcon ? "2.5rem" : "1rem",
    paddingRight: "1rem",
    fontSize: "1rem",
    width: "100%",
    border: "none",
    outline: "none",
    borderRadius: "6px",
    backgroundColor: "transparent",
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    fontWeight: 300,
    height: "40px",
    color: value ? "#000" : "#64748b",
    opacity: isLoading ? 0.7 : 1,
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

  // const rightIconStyles = {
  //   ...iconStyles,
  //   right: "0.75rem",
  //   pointerEvents: "none" as const,
  // };

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

  const contentStyles = {
    backgroundColor: "white",
    borderRadius: "6px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    maxHeight: "300px",
    overflow: "auto",
  };

  const itemStyles = {
    padding: "0.5rem 1rem",
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "#374151",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#F3F4F6",
    },
    "&[data-highlighted]": {
      backgroundColor: "#F3F4F6",
    },
  };

  const loadingOverlayStyles = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: "6px",
    pointerEvents: "none" as const,
  };

  return (
    <div style={containerStyles} className={className}>
      {label && (
        <label style={labelStyles}>
          {label}
          {required && <span style={{ color: "#ef4444" }}> *</span>}
        </label>
      )}

      <div style={selectWrapperStyles}>
        {leftIcon && <span style={leftIconStyles}>{leftIcon}</span>}

        <Select.Root
          onValueChange={handleChange}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled || isLoading}
        >
          <Select.Trigger
            placeholder={placeholder}
            style={triggerStyles}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            {/* <Select.Value placeholder={placeholder || "Select option"} /> */}
          </Select.Trigger>

          <Select.Content style={contentStyles} position="popper">
            <Select.Group>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} style={itemStyles}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>

        {isLoading && (
          <div style={loadingOverlayStyles}>
            <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Loading...</span>
          </div>
        )}
      </div>

      {error && <div style={errorStyles}>{error}</div>}
    </div>
  );
};

export default SelectComponent;
