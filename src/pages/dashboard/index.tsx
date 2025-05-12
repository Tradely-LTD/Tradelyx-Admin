//@ts-nocheck
import Skeleton from "react-loading-skeleton";
import { Users, Package, ShoppingCart, Truck, ShieldCheck, User } from "lucide-react";
import { useGetStatsChartQuery, useGetStatsQuery } from "./stats-api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const { data, isLoading: statsLoading } = useGetStatsQuery({});
  const { data: chartData, isLoading: chartLoading } = useGetStatsChartQuery({});

  return (
    <div className="h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <DashboardCard
              title="Total Users"
              value={data?.data?.totalUsers || "0"}
              icon={<Users size={24} />}
              color="#143085"
              description="All registered users"
              loading={statsLoading}
            />

            <DashboardCard
              title="Buyers"
              value={data?.data?.usersByRole?.buyer || "0"}
              icon={<ShoppingCart size={24} />}
              color="#4CAF50"
              description="Users with buyer role"
              loading={statsLoading}
            />

            <DashboardCard
              title="Sellers"
              value={data?.data?.usersByRole?.seller || "0"}
              icon={<Package size={24} />}
              color="#FF9800"
              description="Users with seller role"
              loading={statsLoading}
            />

            <DashboardCard
              title="Active Sell Offers"
              value={data?.data?.activeSellOffers || "0"}
              icon={<Package size={24} />}
              color="#9C27B0"
              description="Currently active offers"
              loading={statsLoading}
            />

            <DashboardCard
              title="Total RFQs"
              value={data?.data?.totalRFQs || "0"}
              icon={<ShoppingCart size={24} />}
              color="#2196F3"
              description="All Request for Quotations"
              loading={statsLoading}
            />

            <DashboardCard
              title="Total RFFs"
              value={data?.data?.totalRFFs || "0"}
              icon={<Truck size={24} />}
              color="#607D8B"
              description="All Request for Freight"
              loading={statsLoading}
            />

            <DashboardCard
              title="Agent Users"
              value={data?.data?.usersByRole?.agent || "0"}
              icon={<User size={24} />}
              color="#F44336"
              description="Users with agent role"
              loading={statsLoading}
            />

            <DashboardCard
              title="Admin"
              value={data?.data?.usersByRole?.admin || "0"}
              icon={<Users size={24} />}
              color="#F44336"
              description="Users with admin role"
              loading={statsLoading}
            />
            <DashboardCard
              title="Unassigned Users"
              value={data?.data?.usersByRole?.null || "0"}
              icon={<ShieldCheck size={24} />}
              color="#F44336"
              description="Users without role"
              loading={statsLoading}
            />
          </div>
        </main>
      </div>

      <section className="p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4">Chart</h3>
        <div style={{ width: "100%", height: 400 }}>
          {chartLoading ? (
            <Skeleton height={400} />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={chartData?.data || []}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) =>
                    new Date(date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  }
                />
                <Legend />
                <Bar dataKey="sellOffers" fill="#8884d8" name="Sell Offers" />
                <Bar dataKey="rfqs" fill="#82ca9d" name="RFQs" />
                <Bar dataKey="rffs" fill="#ffc658" name="RFFs" />
                <Bar dataKey="users" fill="#ff8042" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardCard({ title, value, icon, color, description, loading }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="w-full">
          <p className="text-sm font-medium text-gray-500">
            {loading ? <Skeleton width={100} /> : title}
          </p>
          <h4 className="text-2xl font-bold mt-1">{loading ? <Skeleton width={60} /> : value}</h4>
          {description && (
            <p className="text-xs text-gray-400 mt-1">
              {loading ? <Skeleton width={150} /> : description}
            </p>
          )}
        </div>
        <div
          className="p-3 rounded-full"
          style={{
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {loading ? <Skeleton circle width={24} height={24} /> : icon}
        </div>
      </div>
    </div>
  );
}
