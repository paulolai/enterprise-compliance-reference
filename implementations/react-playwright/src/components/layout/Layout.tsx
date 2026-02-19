import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShoppingCart, User, Home, Package } from 'lucide-react'
import { CartBadge } from '../cart/CartBadge'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/products', label: 'Products', icon: Package },
]

export function Layout() {
  const location = useLocation()
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <Package className="h-6 w-6 text-primary" />
            <span>TechHome Direct</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.to || 
                (link.to !== '/' && location.pathname.startsWith(link.to))
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
            
            <Link
              to="/cart"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <CartBadge />
              </div>
            </Link>
            
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
            >
              <User className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="container py-6">
        <Outlet />
      </main>
      
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 TechHome Direct - Executable Specs Demo</p>
        </div>
      </footer>
    </div>
  )
}
