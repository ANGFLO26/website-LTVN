import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorBg: string;
  colorIcon: string;
}

export const StatCard: React.FC<Props> = ({
  label,
  value,
  icon: Icon,
  colorBg,
  colorIcon,
}) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: colorBg, color: colorIcon }}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
};
