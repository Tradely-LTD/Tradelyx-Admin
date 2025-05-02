//@ts-nocheck
import { Eye, EyeClosed } from "lucide-react";
import React, { useState } from "react";
import Select, { ActionMeta, MultiValue, SingleValue } from "react-select";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface InputProps {
  type?:
    | "text"
    | "password"
    | "email"
    | "number"
    | "tel"
    | "url"
    | "search"
    | "date"
    | "select"
    | "textarea";
  placeholder?: string;
  value?: string | number | SelectOption | SelectOption[] | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange?: (
    newValue: SingleValue<SelectOption> | MultiValue<SelectOption>,
    actionMeta: ActionMeta<SelectOption>
  ) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  classNameWrapper?: string;
  error?: any;
  label?: string;
  fullWidth?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  preLabel?: string | React.ReactNode;
  preLabelWidth?: string;
  preLabelClassName?: string;
  options?: SelectOption[];
  isMulti?: boolean;
  isLoading?: boolean;
  rest?: any;
  step?: string;
  rows?: number;
}

function Input({
  type = "text",
  placeholder = "",
  value,
  classNameWrapper,
  onChange,
  onSelectChange,
  name,
  disabled = false,
  required = false,
  className = "",
  error,
  label,
  fullWidth = false,
  onBlur,
  onFocus,
  maxLength,
  min,
  max,
  leftIcon,
  rightIcon,
  preLabel,
  preLabelWidth = "4rem",
  preLabelClassName = "",
  options = [],
  isMulti = false,
  isLoading,
  step,
  rows = 3,
  rest,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const containerStyles = {
    position: "relative" as const,
    width: fullWidth ? "100%" : "auto",
  };

  const inputWrapperStyles = {
    display: "flex",
    alignItems: "center",
    position: "relative" as const,
    width: "100%",
    borderRadius: "5px",
    backgroundColor: disabled ? "#f3f4f6" : "white",
  };

  const baseInputStyles = {
    padding: "0.55rem 1rem",
    paddingLeft: leftIcon ? "2.5rem" : "1rem",
    paddingRight: type === "password" || rightIcon ? "2.5rem" : "1rem",
    fontSize: "1rem",
    width: "100%",
    border: "1px solid",
    borderColor: error ? "#ef4444" : isFocused ? "#335CFF" : "#CBD5E1",
    outline: "none",
    borderRadius: preLabel ? "0 5px 5px 0" : "5px",
    backgroundColor: "transparent",
    cursor: disabled ? "not-allowed" : "text",
    fontWeight: 300,
    transition: "all 0.2s ease-in-out",
  };

  const inputStyles = {
    ...baseInputStyles,
  };

  const textareaStyles = {
    ...baseInputStyles,
    minHeight: `${rows * 1.5}rem`,
    resize: "vertical" as const,
    padding: "0.75rem 1rem",
    paddingLeft: leftIcon ? "2.5rem" : "1rem",
    lineHeight: "1.5",
    fontFamily: "inherit",
  };

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: error ? "#ef4444" : state.isFocused ? "#335CFF" : "#CBD5E1",
      boxShadow: state.isFocused ? `0 0 0 1px ${error ? "#ef4444" : "#335CFF"}` : "none",
      "&:hover": {
        borderColor: error ? "#ef4444" : "#335CFF",
      },
      paddingLeft: leftIcon ? "2.5rem" : "0.5rem",
      paddingRight: "0.5rem",
      borderRadius: preLabel ? "0 5px 5px 0" : "5px",
      backgroundColor: disabled ? "#f3f4f6" : "white",
      cursor: disabled ? "not-allowed" : "pointer",
      minHeight: "42px",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? "#335CFF" : state.isFocused ? "#EFF6FF" : "white",
      color: state.isSelected ? "white" : "#1F2937",
      cursor: "pointer",
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  const preLabelStyles = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    border: "1px solid #CBD5E1",
    borderRight: "none",
    borderRadius: "5px 0 0 5px",
    padding: "0.65rem 1rem",
    color: "#64748b",
    fontSize: "0.875rem",
    width: preLabelWidth,
    height: "100%",
    whiteSpace: "nowrap" as const,
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
    zIndex: 1,
  };

  const leftIconStyles = {
    ...iconStyles,
    left: "0.75rem",
  };

  const rightIconStyles = {
    ...iconStyles,
    right: "0.75rem",
    cursor: "pointer",
  };

  const labelStyles = {
    display: "block",
    marginBottom: "0.5rem",
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSelectChange = (
    newValue: SingleValue<SelectOption> | MultiValue<SelectOption>,
    actionMeta: ActionMeta<SelectOption>
  ) => {
    onSelectChange?.(newValue, actionMeta);
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
        <div style={inputWrapperStyles} className={classNameWrapper}>
          {preLabel && (
            <div style={preLabelStyles} className={preLabelClassName}>
              {preLabel}
            </div>
          )}
          <div style={{ position: "relative", width: "100%" }}>
            {leftIcon && <span style={leftIconStyles}>{leftIcon}</span>}

            {type === "select" ? (
              <Select
                options={options}
                value={value as SelectOption | SelectOption[] | undefined}
                onChange={handleSelectChange}
                isDisabled={disabled}
                placeholder={placeholder}
                isMulti={isMulti}
                styles={selectStyles}
                classNamePrefix="react-select"
                className={`react-select-container  min-w-[150px] ${className}`}
                name={name}
                required={required}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                isLoading={isLoading}
                {...rest}
              />
            ) : type === "textarea" ? (
              <textarea
                placeholder={placeholder}
                value={value as string | undefined}
                onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
                name={name}
                disabled={disabled}
                required={required}
                className={className}
                onFocus={handleFocus}
                onBlur={handleBlur}
                maxLength={maxLength}
                style={textareaStyles}
                rows={rows}
                {...rest}
              />
            ) : (
              <>
                <input
                  type={type === "password" ? (showPassword ? "text" : "password") : type}
                  placeholder={placeholder}
                  value={value as string | number | undefined}
                  onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
                  name={name}
                  disabled={disabled}
                  required={required}
                  className={className}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  maxLength={maxLength}
                  min={min}
                  max={max}
                  step={step}
                  style={inputStyles}
                  {...rest}
                />
                {type === "password" ? (
                  <span
                    style={rightIconStyles}
                    onClick={!disabled ? togglePasswordVisibility : undefined}
                  >
                    {showPassword ? (
                      <EyeClosed size="20" color="#64748b" />
                    ) : (
                      <Eye size="20" color="#64748b" />
                    )}
                  </span>
                ) : (
                  rightIcon && <span style={rightIconStyles}>{rightIcon}</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {error && <div style={errorStyles}>{error}</div>}
    </div>
  );
}

export default Input;
