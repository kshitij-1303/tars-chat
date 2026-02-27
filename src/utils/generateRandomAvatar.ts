export const generateRandomAvatar = () => {
  const seed = Math.floor(Math.random() * 1000);
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}`;
}