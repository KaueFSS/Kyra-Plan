export interface Alarm {
  id: string;
  label: string;
  time: string;
  days: number[];
  sound: string;
  enabled: boolean;
  notify: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlarmInput {
  label?: string;
  time: string;
  days: number[];
  sound?: string;
  enabled?: boolean;
  notify?: boolean;
}

export interface UpdateAlarmInput {
  id: string;
  label: string;
  time: string;
  days: number[];
  sound: string;
  enabled: boolean;
  notify: boolean;
}
