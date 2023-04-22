export default (minutesInput: number): string => {
  let hours = Math.floor(minutesInput / 60).toString();
  hours = hours.length < 2 ? `0${hours}` : hours;
  let minutes = (minutesInput - parseFloat(hours) * 60).toString();
  minutes = minutes.length < 2 ? `0${minutes}` : minutes;
  return `${hours}:${minutes}`;
};
