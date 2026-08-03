import type { CSSProperties } from 'react';
import type { AppointmentStatus } from '@prisma/client';

const COLORS: Record<AppointmentStatus, CSSProperties> = {
  PENDING: { background: '#fef9c3', color: '#854d0e' },
  CONFIRMED: { background: '#dbeafe', color: '#1e40af' },
  IN_PROGRESS: { background: '#e0e7ff', color: '#3730a3' },
  COMPLETED: { background: '#dcfce7', color: '#166534' },
  CANCELLED: { background: '#fee2e2', color: '#991b1b' },
  NO_SHOW: { background: '#f1f5f9', color: '#475569' }
};

export default function StatusBadge({
  status,
  label
}: {
  status: AppointmentStatus;
  label: string;
}) {
  return (
    <span className="badge" style={COLORS[status]}>
      {label}
    </span>
  );
}
