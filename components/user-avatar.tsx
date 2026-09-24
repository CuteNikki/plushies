/**
 * Someone's profile picture, or the first letter of their name without one.
 * Fills its parent, which sets the size and shape.
 */
export function UserAvatar({
  user,
}: {
  user: { name: string; image?: string | null };
}) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element -- Loaded straight from Discord, as the privacy policy says, not through our server.
    return <img src={user.image} alt='' className='size-full object-cover' />;
  }
  return (
    <span className='font-heading'>{user.name.charAt(0).toUpperCase()}</span>
  );
}
