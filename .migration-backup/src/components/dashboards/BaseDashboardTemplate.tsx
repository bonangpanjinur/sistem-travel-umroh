/**
 * BaseDashboardTemplate.tsx
 * 
 * Base template untuk semua dashboard berbasis peran.
 * Menyediakan struktur umum, styling, dan komponen reusable.
 * 
 * Fitur:
 * - Header dengan title, subtitle, dan status indicator
 * - Filter panel yang dapat dikustomisasi
 * - Quick actions section
 * - Stats cards grid
 * - Content area untuk custom dashboard content
 * - Responsive layout
 */

import { ReactNode, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, Filter, X, RefreshCw, ArrowRight, TrendingUp, TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export interface DashboardStatsCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  trend?: string;
  trendUp?: boolean;
  sparklineData?: Array<{ value: number }>;
  color?: 'primary' | 'blue' | 'emerald' | 'amber';
  loading?: boolean;
}

export interface DashboardQuickAction {
  id: string;
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  description?: string;
  color?: string;
  hoverBg?: string;
}

export interface DashboardAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    to: string;
  };
}

interface BaseDashboardTemplateProps {
  title: string;
  subtitle?: string;
  statusIndicator?: boolean;
  statusText?: string;
  showFilters?: boolean;
  filterContent?: ReactNode;
  onFilterChange?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  quickActions?: DashboardQuickAction[];
  alerts?: DashboardAlert[];
  statsCards?: DashboardStatsCard[];
  children?: ReactNode;
  className?: string;
}

// Enhanced Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, loading, highlight, trend, trendUp, sparklineData, color }: any) => {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
      highlight ? "border-primary/50 bg-primary/5" : "border-muted/60"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
        <CardTitle className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", colorMap[color] || colorMap.primary)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <div className={cn(
                  "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                  trendUp ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                )}>
                  {trendUp ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {trend}
                </div>
              )}
              {subtitle && <p className="text-[10px] text-muted-foreground font-medium">{subtitle}</p>}
            </div>
            
            {/* Mini Sparkline for visual trend */}
            {sparklineData && (
              <div className="h-10 w-full mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={trendUp ? "#10b981" : "#ef4444"} 
                      fill={trendUp ? "#10b981" : "#ef4444"} 
                      fillOpacity={0.1} 
                      strokeWidth={2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ to, icon: Icon, label, color, hoverBg, description }: any) => (
  <a href={to} className="block group">
    <Card className={cn("h-full transition-all duration-300 border-muted/60 group-hover:border-primary/30 group-hover:shadow-md overflow-hidden")}>
      <CardContent className={cn("p-2 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4", hoverBg)}>
        <div className={cn("p-2 sm:p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm bg-white border flex-shrink-0", color)}>
          <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-xs sm:text-sm font-bold group-hover:text-primary transition-colors truncate">{label}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{description || "Klik untuk akses cepat"}</p>
        </div>
        <ArrowRight className="h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 flex-shrink-0" />
      </CardContent>
    </Card>
  </a>
);

// Alert Component
const AlertCard = ({ type, title, message, action }: any) => {
  const typeConfig = {
    critical: { bg: 'bg-red-50/30', border: 'border-red-100', icon: 'text-red-600', title: 'text-red-800', bg_icon: 'bg-red-100' },
    warning: { bg: 'bg-amber-50/30', border: 'border-amber-100', icon: 'text-amber-600', title: 'text-amber-800', bg_icon: 'bg-amber-100' },
    info: { bg: 'bg-blue-50/30', border: 'border-blue-100', icon: 'text-blue-600', title: 'text-blue-800', bg_icon: 'bg-blue-100' },
    success: { bg: 'bg-emerald-50/30', border: 'border-emerald-100', icon: 'text-emerald-600', title: 'text-emerald-800', bg_icon: 'bg-emerald-100' },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <Card className={cn(config.border, config.bg)}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-2 rounded-lg", config.bg_icon)}>
          <Activity className={cn("h-5 w-5", config.icon)} />
        </div>
        <div className="flex-1">
          <p className={cn("text-xs font-bold uppercase", config.title)}>{title}</p>
          <p className="text-sm font-medium text-muted-foreground">{message}</p>
        </div>
        {action && (
          <Button variant="ghost" size="sm" asChild className={cn(config.icon, "hover:bg-opacity-20")}>
            <a href={action.to}>{action.label} <ArrowRight className="ml-1 h-3 w-3" /></a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const BaseDashboardTemplate = ({
  title,
  subtitle,
  statusIndicator = true,
  statusText = "Sistem Berjalan Normal",
  showFilters = false,
  filterContent,
  onFilterChange,
  onRefresh,
  isRefreshing = false,
  quickActions = [],
  alerts = [],
  statsCards = [],
  children,
  className,
}: BaseDashboardTemplateProps) => {
  const [filtersOpen, setFiltersOpen] = useState(showFilters);

  const handleFilterToggle = useCallback(() => {
    setFiltersOpen(!filtersOpen);
    onFilterChange?.();
  }, [filtersOpen, onFilterChange]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  return (
    <div className={cn("space-y-8 pb-10 animate-fade-in", className)}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {statusIndicator && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-sm font-medium">{statusText}</p>
                </div>
              )}
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-card p-2 sm:p-2.5 rounded-xl border shadow-sm">
          {filterContent && (
            <Button 
              variant={filtersOpen ? "secondary" : "outline"} 
              onClick={handleFilterToggle}
              className="h-10 relative"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          )}
          
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={handleRefresh} className="h-10 w-10" title="Refresh Data">
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {filtersOpen && filterContent && (
        <Card className="bg-muted/30 border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="pt-6">
            {filterContent}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Section */}
      {quickActions.length > 0 && (
        <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {quickActions.map(action => (
            <QuickActionButton 
              key={action.id}
              to={action.to}
              icon={action.icon}
              label={action.label}
              color={action.color}
              hoverBg={action.hoverBg}
              description={action.description}
            />
          ))}
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {alerts.map(alert => (
            <AlertCard 
              key={alert.id}
              type={alert.type}
              title={alert.title}
              message={alert.message}
              action={alert.action}
            />
          ))}
        </div>
      )}

      {/* Stats Cards */}
      {statsCards.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map(card => (
            <StatsCard
              key={card.id}
              title={card.title}
              value={card.value}
              icon={card.icon}
              loading={card.loading}
              trend={card.trend}
              trendUp={card.trendUp}
              sparklineData={card.sparklineData}
              color={card.color}
              subtitle={card.subtitle}
            />
          ))}
        </div>
      )}

      {/* Custom Content Area */}
      {children}
    </div>
  );
};

export default BaseDashboardTemplate;
