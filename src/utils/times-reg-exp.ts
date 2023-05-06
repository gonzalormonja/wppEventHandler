export default [
  {
    regExp: '^[0-9]$',
    luxonFormat: 'H',
  },
  {
    regExp: '^([0-1][0-9]|2[0-3])$',
    luxonFormat: 'HH',
  },
  {
    regExp: '^([0-1][0-9]|2[0-3]):([0-5][0-9])$',
    luxonFormat: 'HH:mm',
  },
  {
    regExp: '^[0-9]:([0-5][0-9])$',
    luxonFormat: 'H:mm',
  },
  {
    regExp: '^([0-1][0-9]|2[0-3]):([0-9])$',
    luxonFormat: 'HH:m',
  },
  {
    regExp: '^[0-9]:([0-9])$',
    luxonFormat: 'H:m',
  },
];
