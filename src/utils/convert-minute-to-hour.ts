export default (minutesInput: number): string => {
  const hours = Math.floor(minutesInput / 60);
  const minutes = minutesInput - hours * 60;
  return `${hours}:${minutes}`;
};
