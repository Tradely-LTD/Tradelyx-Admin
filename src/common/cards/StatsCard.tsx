import { thousandFormatter } from "@/utils/helper";
import { LineChart, Line, ResponsiveContainer } from "recharts";
interface cardProps {
  title: string;
  value: number;
  change: string;
  data: any;
}
function StatsCard({ title, value, change, data }: cardProps) {
  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm max-w-[300px] h-[130px]">
        <div className="p-4">
          <div className="flex flex-row   justify-between">
            <div className="w-[70%]  flex h-auto flex-col gap-[2px]">
              <h3 className="text-gray-500 font-medium">{title}</h3>
              <span className="text-3xl font-semibold">{thousandFormatter(value)}</span>
              <span className="text-green-500 text-sm">{change}</span>
            </div>
            <div className="flex-1 flex justify-end items-center w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#0EA5E9"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsCard;
