import React from "react";
import { Profile, AthleteGroup } from "../lib/database.types";
import DashboardStats from "./DashboardStats";
import ManagerLeaderboard from "./ManagerLeaderboard";
import PersonalRecordsTable from "./PersonalRecordsTable";
import GroupsManagement from "./GroupsManagement";
import InviteAthleteModal from "./InviteAthleteModal";
import AthletesInsights from "./AthletesInsights";
import { DashboardView } from "./DashboardNavigation";
import { Skeleton, CardSkeleton } from "./ui/skeleton";
import clsx from "clsx";
import {
  Users,
  Trophy,
  Activity,
  TrendingUp,
  Calendar,
  Home,
  UserPlus,
  BarChart2,
} from "lucide-react";

interface DashboardViewRendererProps {
  currentView: DashboardView;
  theme: string;
  loading: boolean;

  // Data props
  profile: Profile;
  athletes: Profile[];
  groups: AthleteGroup[];
  totalRecords: number;
  totalMetrics: number;

  // State and handlers
  refreshKey: number;
  groupsRefreshKey: number;
  prRefreshKey: number;
  onGroupsUpdate: () => void;
  onPRUpdate: () => void;
  onRefresh: () => void;

  // Modal states
  showInviteModal: boolean;
  onShowInviteModal: (show: boolean) => void;
  onInviteSuccess: () => void;

  athleteTab: "athletes" | "invite" | "groups";
  onAthleteTabChange: (tab: "athletes" | "invite" | "groups") => void;
}

const ViewHeader: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  theme: string;
  action?: React.ReactNode;
}> = ({ title, description, icon: Icon, gradient, theme, action }) => (
  <div className="flex items-center justify-between mb-8">
    <div className="flex items-center gap-4">
      <div
        className={clsx(
          "p-4 rounded-2xl",
          theme === "dark"
            ? "bg-white/5 text-white"
            : `bg-gradient-to-br ${gradient} text-white shadow-lg`
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h1
          className={clsx(
            "text-2xl font-bold",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          {title}
        </h1>
        <p
          className={clsx(
            "text-sm mt-1",
            theme === "dark" ? "text-white/70" : "text-gray-600"
          )}
        >
          {description}
        </p>
      </div>
    </div>
    {action}
  </div>
);

const OverviewView: React.FC<
  Pick<
    DashboardViewRendererProps,
    | "theme"
    | "loading"
    | "athletes"
    | "totalRecords"
    | "totalMetrics"
    | "groups"
  >
> = ({ theme, loading, athletes, totalRecords, totalMetrics, groups }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Dashboard Overview"
        description="Get a quick overview of your team's performance and activity"
        icon={Home}
        gradient="from-blue-500 to-blue-600"
        theme={theme}
      />

      {/* Stats Grid */}
      <DashboardStats
        totalAthletes={athletes.length}
        totalGroups={groups.length}
        totalRecords={totalRecords}
        activeMetrics={totalMetrics}
        loading={loading}
      />

      {/* Quick Actions */}
      <div
        className={clsx(
          "rounded-2xl p-6",
          theme === "dark"
            ? "bg-slate-800/50 ring-1 ring-slate-700/50"
            : "bg-white shadow-xl shadow-blue-900/5"
        )}
      >
        <h3
          className={clsx(
            "text-lg font-semibold mb-4",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            className={clsx(
              "p-4 rounded-xl text-left transition-all duration-200 hover:scale-105",
              theme === "dark"
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-blue-50 hover:bg-blue-100 text-blue-900"
            )}
          >
            <UserPlus className="w-6 h-6 mb-2" />
            <div className="font-medium">Invite Athlete</div>
            <div className="text-xs opacity-70">Add new team members</div>
          </button>
          <button
            className={clsx(
              "p-4 rounded-xl text-left transition-all duration-200 hover:scale-105",
              theme === "dark"
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-green-50 hover:bg-green-100 text-green-900"
            )}
          >
            <Activity className="w-6 h-6 mb-2" />
            <div className="font-medium">Add Record</div>
            <div className="text-xs opacity-70">Log new personal best</div>
          </button>
          <button
            className={clsx(
              "p-4 rounded-xl text-left transition-all duration-200 hover:scale-105",
              theme === "dark"
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-yellow-50 hover:bg-yellow-100 text-yellow-900"
            )}
          >
            <BarChart2 className="w-6 h-6 mb-2" />
            <div className="font-medium">View Analytics</div>
            <div className="text-xs opacity-70">Performance insights</div>
          </button>
          <button
            className={clsx(
              "p-4 rounded-xl text-left transition-all duration-200 hover:scale-105",
              theme === "dark"
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-purple-50 hover:bg-purple-100 text-purple-900"
            )}
          >
            <Users className="w-6 h-6 mb-2" />
            <div className="font-medium">Manage Groups</div>
            <div className="text-xs opacity-70">Organize your team</div>
          </button>
        </div>
      </div>
    </div>
  );
};

const AthletesView: React.FC<
  Pick<
    DashboardViewRendererProps,
    | "theme"
    | "loading"
    | "profile"
    | "athletes"
    | "showInviteModal"
    | "onShowInviteModal"
    | "onInviteSuccess"
    | "athleteTab"
    | "onAthleteTabChange"
    | "onGroupsUpdate"
  >
> = ({
  theme,
  loading,
  profile,
  athletes,
  showInviteModal,
  onShowInviteModal,
  onInviteSuccess,
  athleteTab,
  onAthleteTabChange,
  onGroupsUpdate,
}) => (
  <div className="space-y-8">
    <ViewHeader
      title="Athletes Management"
      description="Manage your team members, groups, and invitations"
      icon={Users}
      gradient="from-green-500 to-green-600"
      theme={theme}
      action={
        <button
          onClick={() => onShowInviteModal(true)}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
            theme === "dark"
              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-1 ring-green-500/30"
              : "bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-xl"
          )}
        >
          <UserPlus className="w-5 h-5" />
          Invite Athlete
        </button>
      }
    />

    {/* Athletes content would go here - simplified for now */}
    <div
      className={clsx(
        "rounded-2xl p-6",
        theme === "dark"
          ? "bg-slate-800/50 ring-1 ring-slate-700/50"
          : "bg-white shadow-xl shadow-blue-900/5"
      )}
    >
      <div className="text-center py-8">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">
          Athletes Management
        </h3>
        <p className="text-gray-400">Detailed athletes view coming soon...</p>
      </div>
    </div>

    {/* Invite Modal */}
    {showInviteModal && (
      <InviteAthleteModal
        onClose={() => onShowInviteModal(false)}
        onInviteSuccess={onInviteSuccess}
        managerId={profile.id}
      />
    )}
  </div>
);

export const DashboardViewRenderer: React.FC<DashboardViewRendererProps> = (
  props
) => {
  const { currentView, theme, loading } = props;

  // Loading state for entire view
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  switch (currentView) {
    case "overview":
      return <OverviewView {...props} />;

    case "athletes":
      return <AthletesView {...props} />;

    case "leaderboard":
      return (
        <div className="space-y-8">
          <ViewHeader
            title="Team Leaderboard"
            description="View your team's performance rankings and achievements"
            icon={Trophy}
            gradient="from-yellow-500 to-yellow-600"
            theme={theme}
          />
          <ManagerLeaderboard
            managerId={props.profile.id}
            refreshKey={props.groupsRefreshKey}
          />
        </div>
      );

    case "records":
      return (
        <div className="space-y-8">
          <ViewHeader
            title="Personal Records"
            description="Track and manage personal bests across all exercises"
            icon={Activity}
            gradient="from-purple-500 to-purple-600"
            theme={theme}
          />
          <PersonalRecordsTable
            managerId={props.profile.id}
            refreshKey={props.prRefreshKey}
          />
        </div>
      );

    case "insights":
      return (
        <div className="space-y-8">
          <ViewHeader
            title="Performance Insights"
            description="AI-powered analytics and performance reports"
            icon={TrendingUp}
            gradient="from-indigo-500 to-indigo-600"
            theme={theme}
          />
          <div
            className={clsx(
              "rounded-2xl p-8",
              theme === "dark"
                ? "bg-slate-800/50 ring-1 ring-slate-700/50"
                : "bg-white shadow-xl shadow-blue-900/5"
            )}
          >
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 mx-auto mb-6 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-500 mb-3">
                Advanced Insights Coming Soon
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                We're working on powerful AI-driven insights to help you
                understand your team's performance patterns and optimize
                training programs.
              </p>
            </div>
          </div>
        </div>
      );

    case "metrics":
      return (
        <div className="space-y-8">
          <ViewHeader
            title="Daily Metrics"
            description="Manage daily forms and view athlete responses"
            icon={Calendar}
            gradient="from-pink-500 to-pink-600"
            theme={theme}
          />
          <div
            className={clsx(
              "rounded-2xl p-8",
              theme === "dark"
                ? "bg-slate-800/50 ring-1 ring-slate-700/50"
                : "bg-white shadow-xl shadow-blue-900/5"
            )}
          >
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-6 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-500 mb-3">
                Daily Metrics Dashboard
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Enhanced daily metrics management interface is being developed
                to provide better insights into your athletes' daily feedback.
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return <OverviewView {...props} />;
  }
};

export default DashboardViewRenderer;
