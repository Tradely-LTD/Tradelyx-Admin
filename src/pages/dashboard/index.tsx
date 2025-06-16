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
import { isCountryAdmin } from "@/utils/helper";
import { useUserSlice } from "../auth/authSlice";

export default function AdminDashboard() {
  const { data, isLoading: statsLoading } = useGetStatsQuery({});
  const { data: chartData, isLoading: chartLoading } = useGetStatsChartQuery({});

  const { loginResponse } = useUserSlice();
  const isSuperAdmin = loginResponse?.user.roles === "admin";
  const isCountryAdmin = loginResponse?.user.roles === "country_admin";

  console.log(isCountryAdmin);
  return (
    <div className="h-screen  ">
      <div className="flex-1 flex  flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto ">
          <div
            className="grid grid-cols-1 mt-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-6 lg:gap-8 max-w-7xl mx-auto px-2 sm:px-3 lg:px-2 transition-all duration-300"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}
          >
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
            {isSuperAdmin && (
              <DashboardCard
                title="Total RFQs"
                value={data?.data?.totalRFQs || "0"}
                icon={<ShoppingCart size={24} />}
                color="#2196F3"
                description="All Request for Quotations"
                loading={statsLoading}
              />
            )}
            {isSuperAdmin && (
              <DashboardCard
                title="Total RFFs"
                value={data?.data?.totalRFFs || "0"}
                icon={<Truck size={24} />}
                color="#607D8B"
                description="All Request for Freight"
                loading={statsLoading}
              />
            )}

            <DashboardCard
              title="Agent Users"
              value={data?.data?.usersByRole?.agent || "0"}
              icon={<User size={24} />}
              color="#F44336"
              description="Users with agent role"
              loading={statsLoading}
            />
            {isSuperAdmin && (
              <DashboardCard
                title="Admin"
                value={data?.data?.usersByRole?.admin || "0"}
                icon={<Users size={24} />}
                color="#F44336"
                description="Users with admin role"
                loading={statsLoading}
              />
            )}
            {isSuperAdmin && (
              <DashboardCard
                title="Unassigned Users"
                value={data?.data?.usersByRole?.null || "0"}
                icon={<ShieldCheck size={24} />}
                color="#F44336"
                description="Users without role"
                loading={statsLoading}
              />
            )}
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
                {isSuperAdmin && <Bar dataKey="rfqs" fill="#82ca9d" name="RFQs" />}
                {isSuperAdmin && <Bar dataKey="rffs" fill="#ffc658" name="RFFs" />}
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
  return loading ? (
    <Skeleton className="w-[250px] min-h-[120px]" />
  ) : (
    <div
      className="bg-white rounded-xl shadow-sm p-5 w-[250px] min-h-[120px] 
                 hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-200 
                 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 
                 outline-none cursor-pointer relative overflow-hidden"
      tabIndex={0}
      role="region"
      aria-label={`${title} card`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600 tracking-tight truncate">{title}</p>
          <h4 className="text-3xl font-extrabold mt-1.5 text-gray-900 tracking-tight">{value}</h4>
          {description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{description}</p>}
        </div>
        <div
          className="p-3 rounded-full transform transition-transform duration-200 
                     hover:scale-110 flex-shrink-0"
          style={{
            background: loading
              ? "linear-gradient(135deg, #f3f4f6, #e5e7eb)"
              : `linear-gradient(135deg, ${color}20, ${color}10)`,
            color: color,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent 
                   opacity-0 hover:opacity-100 transition-opacity duration-200"
      />
    </div>
  );
}
