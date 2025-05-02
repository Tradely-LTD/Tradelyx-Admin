import React from "react";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "filled" | "outlined" | "ghost";
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
}

const Spinner = () => (
  <div
    style={{
      width: "1em",
      height: "1em",
      border: "2px solid currentColor",
      borderBottomColor: "transparent",
      borderRadius: "5px",
      display: "inline-block",
      animation: "rotation 1s linear infinite",
    }}
  />
);

const keyframes = `
  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

function Button({
  children,
  onClick,
  disabled = false,
  type = "button",
  size = "medium",
  fullWidth = false,
  leftIcon,
  rightIcon,
  variant = "filled",
  className = "",
  style,
  loading = false,
}: ButtonProps) {
  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case "small":
        return {
          padding: "0.3rem 1rem",
          fontSize: "0.875rem",
        };
      case "large":
        return {
          padding: "0.65rem 1.5rem",
          fontSize: "1.125rem",
        };
      default: // medium
        return {
          padding: "0.5rem 1rem",
          fontSize: "0.980rem",
        };
    }
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case "outlined":
        return {
          backgroundColor: "transparent",
          border: "1.5px solid #eeeeee",
          color: "#143085",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          border: "none",
          color: "#143085",
        };
      default: // filled
        return {
          backgroundColor: "#143085",
          border: "1px solid #143085",
          color: "white",
        };
    }
  };

  const buttonStyles: React.CSSProperties = {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    borderRadius: "5px",
    height: "42px",
    fontWeight: 500,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    width: fullWidth ? "100%" : "auto",
    opacity: disabled || loading ? 0.6 : 1,
    transition: "all 0.2s ease-in-out",
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style,
  };

  return (
    <>
      <style>{keyframes}</style>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={className}
        style={buttonStyles}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {leftIcon && (
              <span
                style={{
                  display: "block",
                  margin: "3px 0px 0px 0px",
                  padding: "0px",
                }}
              >
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span
                style={{
                  display: "block",
                  margin: "3px 0px 0px 0px",
                  padding: "0px",
                }}
              >
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}

export default Button;
