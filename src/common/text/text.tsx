interface TextProps {
  children: React.ReactNode;
  h1?: boolean;
  h2?: boolean;
  h3?: boolean;
  style?: React.CSSProperties;
  block?: boolean;
  color?: string;
  secondaryColor?: boolean;
  className?: string;
}

const Text = ({
  children,
  color,
  block,
  h1,
  h2,
  h3,
  className,
  style,
  secondaryColor,
}: TextProps) => {
  const baseStyle = {
    color: color ? color : secondaryColor ? "#64748B " : "#15191E",
    fontSize: h1 ? "24px" : h2 ? "18px" : h3 ? "16px" : "14px",
    fontWeight: h1 ? "600" : h2 ? "800" : h3 ? "600" : "400",
    display: block ? "block" : "inline",
    // fontFamily: h1 || h2 || h3 ? "Poppins" : "Poppins",
  };

  const combinedStyle = { ...baseStyle, ...style };

  return (
    <span className={className} style={combinedStyle}>
      {children}
    </span>
  );
};

export default Text;
