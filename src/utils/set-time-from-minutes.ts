import { DateTime } from 'luxon';

export default (date: DateTime, time: number): DateTime => {
  return date.startOf('day').set({ minute: time });
};
