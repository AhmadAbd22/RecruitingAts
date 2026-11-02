import { NavLink } from 'react-router-dom'

export type NavItemProps = {
  to: string
  label: string
  end?: boolean
}

/** Owner: Tayyab — shell nav link. */
export function NavItem({ to, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
    >
      {label}
    </NavLink>
  )
}
