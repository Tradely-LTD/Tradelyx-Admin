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
import { useUserSlice } from "../auth/authSlice";

export default function AdminDashboard() {
  const { data, isLoading: statsLoading } = useGetStatsQuery({});
  const { data: chartData, isLoading: chartLoading } = useGetStatsChartQuery({});
  const { loginResponse } = useUserSlice();
  const isSuperAdmin = loginResponse?.user.roles === "admin";

  return (
    <div className="min-h-screen py-5 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Overview of platform statistics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 my-3">
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
          color="#187c53"
          description="Users with buyer role"
          loading={statsLoading}
        />
        <DashboardCard
          title="Sellers"
          value={data?.data?.usersByRole?.seller || "0"}
          icon={<Package size={24} />}
          color="#c38555"
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

      <section className="mt-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Statistics Chart</h3>
        <div className="bg-white rounded-md shadow p-4" style={{ height: 400 }}>
          {chartLoading ? (
            <Skeleton height={360} />
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

function DashboardCard({
  title,
  value,
  icon,
  color,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description?: string;
  loading?: boolean;
}) {
  return loading ? (
    <Skeleton className="w-full h-[140px] rounded-md" />
  ) : (
    <div
      className="bg-white rounded-md shadow p-5 hover:shadow-lg 
                 transform transition-all duration-200 hover:-translate-y-0.5 
                 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 
                 outline-none cursor-pointer relative overflow-hidden"
      tabIndex={0}
      role="region"
      aria-label={`${title} card`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 tracking-tight truncate">{title}</p>
          <h4 className="text-2xl font-bold text-gray-800 mt-1">{value}</h4>
          {description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{description}</p>}
        </div>
        <div
          className="p-3 rounded-md flex-shrink-0 transform transition-transform duration-200 
                     hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${color}10, ${color}05)`,
            color: color,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
