export function formatAge(birthday: string, now = new Date()) {
  const born = new Date(`${birthday}T00:00:00`);

  let months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth());
  if (now.getDate() < born.getDate()) months--;

  if (months < 1) return 'Brand new';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}
