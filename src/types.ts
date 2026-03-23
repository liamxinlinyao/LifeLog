export type Priority = 'low' | 'medium' | 'high';

export interface Schedule {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  isCompleted: boolean;
  priority: Priority;
  reminderTime: string; // ISO string for the reminder
  notified?: boolean;
}

export type ViewType = 'schedule' | 'calendar' | 'history';
export type CalendarViewMode = 'month' | 'week';
