export default (time: string): number => {
  const [hour, minutes] = time.split(':');
  return Number(minutes) + Number(hour) * 60;
};
