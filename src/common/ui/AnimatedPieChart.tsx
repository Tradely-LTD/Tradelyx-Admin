import { useEffect, useState } from "react";

const AnimatedPieChart = ({ data, size: propSize = 200 }) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [chartSize, setChartSize] = useState(propSize);

  // Responsive size calculation
  useEffect(() => {
    const updateSize = () => {
      // Get the smallest of viewport width/height or provided size
      const viewportSize = Math.min(window.innerWidth, window.innerHeight);
      const maxSize = Math.min(propSize, viewportSize * 0.8); // 80% of viewport
      const minSize = 120; // Minimum size for legibility

      // Responsive size calculation
      if (window.innerWidth < 640) {
        // Mobile
        setChartSize(Math.max(minSize, viewportSize * 0.6));
      } else if (window.innerWidth < 1024) {
        // Tablet
        setChartSize(Math.max(minSize, Math.min(maxSize, viewportSize * 0.4)));
      } else {
        // Desktop
        setChartSize(Math.max(minSize, maxSize));
      }
    };

    // Initial size calculation
    updateSize();

    // Add resize listener
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [propSize]);

  // Animation effect
  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setAnimationProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const radius = chartSize / 2;
  const centerX = radius;
  const centerY = radius;
  const innerRadius = radius * 0.65;
  const strokeWidth = Math.max(1, chartSize / 100); // Responsive stroke width

  let startAngle = -90;
  let totalValue = 0;

  // Calculate responsive text sizes
  const totalFontSize = `${Math.max(16, chartSize / 8)}px`;
  const labelFontSize = `${Math.max(12, chartSize / 16)}px`;

  return (
    <div className="relative w-full flex justify-center items-center">
      <svg
        width={chartSize}
        height={chartSize}
        viewBox={`0 0 ${chartSize} ${chartSize}`}
        className="transform transition-transform duration-500 hover:scale-105"
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - strokeWidth}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />

        {/* Animated segments */}
        {data.map((item, index) => {
          const segmentPercentage = item.percentage * animationProgress;
          const angle = (segmentPercentage / 100) * 360;
          const dashArray = 2 * Math.PI * (radius - strokeWidth);
          const dashOffset = dashArray * (1 - segmentPercentage / 100);

          const currentStartAngle = startAngle;
          startAngle += angle;
          totalValue += segmentPercentage;

          const startX =
            centerX + Math.cos((currentStartAngle * Math.PI) / 180) * (radius - strokeWidth);
          const startY =
            centerY + Math.sin((currentStartAngle * Math.PI) / 180) * (radius - strokeWidth);
          const endX =
            centerX +
            Math.cos(((currentStartAngle + angle) * Math.PI) / 180) * (radius - strokeWidth);
          const endY =
            centerY +
            Math.sin(((currentStartAngle + angle) * Math.PI) / 180) * (radius - strokeWidth);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = `
            M ${centerX + innerRadius * Math.cos((currentStartAngle * Math.PI) / 180)} ${
            centerY + innerRadius * Math.sin((currentStartAngle * Math.PI) / 180)
          }
            L ${startX} ${startY}
            A ${radius - strokeWidth} ${radius - strokeWidth} 0 ${largeArcFlag} 1 ${endX} ${endY}
            L ${centerX + innerRadius * Math.cos(((currentStartAngle + angle) * Math.PI) / 180)} ${
            centerY + innerRadius * Math.sin(((currentStartAngle + angle) * Math.PI) / 180)
          }
            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${
            centerX + innerRadius * Math.cos((currentStartAngle * Math.PI) / 180)
          } ${centerY + innerRadius * Math.sin((currentStartAngle * Math.PI) / 180)}
          `;

          return (
            <g key={index}>
              <path
                d={pathData}
                fill={item.color}
                className="transition-opacity duration-300 hover:opacity-90"
                style={{
                  filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))",
                }}
              >
                <title>{`${item.status}: ${item.percentage}%`}</title>
              </path>
            </g>
          );
        })}

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius - strokeWidth}
          fill="white"
          className="transition-transform duration-300"
        />
      </svg>

      {/* Centered text */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div style={{ fontSize: 18 }} className="font-bold">
          {Math.round(totalValue)}%
        </div>
        <div style={{ fontSize: labelFontSize }} className="text-gray-500">
          Total
        </div>
      </div>
    </div>
  );
};

export default AnimatedPieChart;
