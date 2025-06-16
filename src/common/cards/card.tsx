//@ts-nocheck

import Skeleton from "react-loading-skeleton";

function Card({ title, value, icon, color, description, loading }) {
  return loading ? (
    <Skeleton className="w-[250px] min-h-[120px]" />
  ) : (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="w-full">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h4 className="text-2xl font-bold mt-1">{value}</h4>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
        <div
          className="p-3 rounded-full"
          style={{
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default Card;
