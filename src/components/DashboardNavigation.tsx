import React from "react";
import {
  Home,
  Users,
  Trophy,
  Activity,
  TrendingUp,
  Calendar,
  BarChart2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import clsx from "clsx";

export type DashboardView =
  | "overview"
  | "athletes"
  | "leaderboard"
  | "records"
  | "insights"
  | "metrics";

export const DASHBOARD_VIEWS = {
  overview: {
    id: "overview" as const,
    name: "Overview",
    icon: Home,
    description: "Dashboard overview and stats",
    color: "from-blue-500 to-blue-600",
  },
  athletes: {
    id: "athletes" as const,
    name: "Athletes",
    icon: Users,
    description: "Manage your athletes and groups",
    color: "from-green-500 to-green-600",
  },
  leaderboard: {
    id: "leaderboard" as const,
    name: "Leaderboard",
    icon: Trophy,
    description: "Team performance rankings",
    color: "from-yellow-500 to-yellow-600",
  },
  records: {
    id: "records" as const,
    name: "Records",
    icon: Activity,
    description: "Personal records and achievements",
    color: "from-purple-500 to-purple-600",
  },
  insights: {
    id: "insights" as const,
    name: "Insights",
    icon: TrendingUp,
    description: "Performance analytics and reports",
    color: "from-indigo-500 to-indigo-600",
  },
  metrics: {
    id: "metrics" as const,
    name: "Daily Metrics",
    icon: Calendar,
    description: "Daily form responses and metrics",
    color: "from-pink-500 to-pink-600",
  },
} as const;

interface NavigationItemProps {
  view: DashboardView;
  isActive: boolean;
  onClick: () => void;
  theme: string;
  showText?: boolean;
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  view,
  isActive,
  onClick,
  theme,
  showText = true,
}) => {
  const viewConfig = DASHBOARD_VIEWS[view];
  const Icon = viewConfig.icon;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        showText ? "w-full justify-start" : "justify-center",
        isActive
          ? theme === "dark"
            ? "bg-white/10 text-white shadow-lg shadow-black/20"
            : "bg-white/90 text-gray-900 shadow-lg shadow-black/10"
          : theme === "dark"
          ? "text-white/70 hover:text-white hover:bg-white/5"
          : "text-white/80 hover:text-white hover:bg-white/10"
      )}
      title={
        showText ? undefined : `${viewConfig.name} - ${viewConfig.description}`
      }
    >
      <div
        className={clsx(
          "p-2 rounded-lg transition-all duration-200",
          isActive
            ? `bg-gradient-to-br ${viewConfig.color} text-white shadow-md`
            : theme === "dark"
            ? "bg-white/5 group-hover:bg-white/10"
            : "bg-white/10 group-hover:bg-white/20"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      {showText && (
        <div className="flex-1 text-left">
          <div className="font-medium text-sm">{viewConfig.name}</div>
          <div
            className={clsx(
              "text-xs mt-0.5 leading-tight",
              isActive
                ? theme === "dark"
                  ? "text-white/80"
                  : "text-gray-600"
                : theme === "dark"
                ? "text-white/50"
                : "text-white/60"
            )}
          >
            {viewConfig.description}
          </div>
        </div>
      )}
      {isActive && (
        <div
          className={clsx(
            "absolute inset-0 rounded-xl ring-2 pointer-events-none",
            `ring-gradient-to-br ${viewConfig.color} ring-opacity-50`
          )}
        />
      )}
    </button>
  );
};

interface DashboardNavigationProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  theme: string;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

export const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  currentView,
  onViewChange,
  theme,
  isMobile = false,
  onMobileClose,
}) => {
  const navigationItems = Object.keys(DASHBOARD_VIEWS) as DashboardView[];

  if (isMobile) {
    return (
      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between mb-6">
          <h3
            className={clsx(
              "text-lg font-semibold",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Navigation
          </h3>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                theme === "dark"
                  ? "text-white/70 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {navigationItems.map((view) => (
          <NavigationItem
            key={view}
            view={view}
            isActive={currentView === view}
            onClick={() => {
              onViewChange(view);
              onMobileClose?.();
            }}
            theme={theme}
            showText={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center space-x-1">
      {navigationItems.map((view) => (
        <NavigationItem
          key={view}
          view={view}
          isActive={currentView === view}
          onClick={() => onViewChange(view)}
          theme={theme}
          showText={false}
        />
      ))}
    </div>
  );
};

interface CompactNavigationProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  theme: string;
}

export const CompactNavigation: React.FC<CompactNavigationProps> = ({
  currentView,
  onViewChange,
  theme,
}) => {
  const navigationItems = Object.keys(DASHBOARD_VIEWS) as DashboardView[];

  return (
    <div className="flex lg:hidden overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex space-x-2 min-w-max px-4">
        {navigationItems.map((view) => {
          const viewConfig = DASHBOARD_VIEWS[view];
          const Icon = viewConfig.icon;

          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={clsx(
                "flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 min-w-[80px]",
                currentView === view
                  ? theme === "dark"
                    ? "bg-white/10 text-white"
                    : "bg-white/90 text-gray-900 shadow-lg"
                  : theme === "dark"
                  ? "text-white/70 hover:text-white hover:bg-white/5"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <div
                className={clsx(
                  "p-2 rounded-lg transition-all duration-200",
                  currentView === view
                    ? `bg-gradient-to-br ${viewConfig.color} text-white shadow-md`
                    : theme === "dark"
                    ? "bg-white/5"
                    : "bg-white/10"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">{viewConfig.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardNavigation;
