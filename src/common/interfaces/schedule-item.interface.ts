export interface IScheduleItem {
  dayOfWeek: number; // 2: Thứ 2, 3: Thứ 3, 4: Thứ 4, 5: Thứ 5, 6: Thứ 6, 7: Thứ 7, 8: Chủ nhật
  startTime: string; // "18:00"
  endTime: string;   // "19:30"
  room?: string;     // "Phòng 201" hoặc "Zoom Online"
}
