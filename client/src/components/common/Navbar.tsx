import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Heart, User, Menu, X, ArrowRight, LogOut, Shield } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleCart, getTotalItemsCount, wishlist } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const totalCartCount = getTotalItemsCount();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const navLinks = [
    { name: 'Collections', href: '/shop' },
    { name: 'Loafers', href: '/shop?category=Loafers' },
    { name: 'Sneakers', href: '/shop?category=Sneakers' },
    { name: 'Oxfords', href: '/shop?category=Oxfords' },
    { name: 'Boots', href: '/shop?category=Boots' },
    { name: 'Heritage Edit', href: '/shop?badge=Artisan+Heritage' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-ivory-100/95 backdrop-blur-md shadow-subtle border-b border-ivory-300/80 py-3.5'
          : 'bg-ivory-100/90 backdrop-blur-sm border-b border-ivory-200 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Mobile hamburger menu toggle */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-charcoal-800 hover:text-charcoal-950 focus:outline-none"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex flex-col items-center group">
              <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-widest text-charcoal-900 group-hover:text-sand-600 transition-colors uppercase">
                FOOTZI
              </span>
              <span className="text-[9px] tracking-ultra text-charcoal-500 uppercase -mt-1 font-light">
                Agra • Atelier
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive = location.pathname + location.search === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`text-xs uppercase tracking-widest font-medium transition-all duration-200 relative py-1 ${
                    isActive
                      ? 'text-charcoal-950 font-semibold'
                      : 'text-charcoal-700 hover:text-charcoal-950'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-charcoal-900" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1.5 text-charcoal-700 hover:text-charcoal-950 transition-colors"
              aria-label="Search footwear"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Wishlist Icon */}
            <Link
              to="/wishlist"
              className="p-1.5 text-charcoal-700 hover:text-charcoal-950 transition-colors relative"
              aria-label="View Wishlist"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-sand-400 text-charcoal-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Account Popover / Login Link */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 p-1 text-charcoal-700 hover:text-charcoal-950 focus:outline-none"
                  aria-label="User profile menu"
                >
                  <div className="w-7 h-7 rounded-full bg-sand-200 text-charcoal-900 border border-sand-400/50 flex items-center justify-center text-[11px] font-bold">
                    {user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white border border-ivory-300 rounded-xs shadow-xl py-1 z-50 animate-fade-in"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-ivory-200">
                      <p className="text-xs font-semibold text-charcoal-900 truncate">{user.name}</p>
                      <p className="text-[10px] text-charcoal-500 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-3 py-2 text-xs text-charcoal-700 hover:bg-ivory-100 hover:text-charcoal-950"
                    >
                      Account & Orders
                    </Link>

                    {(user.role === 'admin' || user.role === 'demo_admin') && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2 text-xs text-sand-700 font-semibold hover:bg-sand-50"
                      >
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Admin Control Deck
                        </span>
                      </Link>
                    )}

                    <div className="border-t border-ivory-200">
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="p-1.5 text-charcoal-700 hover:text-charcoal-950 transition-colors"
                aria-label="Sign In"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            )}

            {/* Cart Drawer Toggle */}
            <button
              onClick={toggleCart}
              className="p-1.5 text-charcoal-900 hover:text-sand-600 transition-colors relative flex items-center gap-2 group"
              aria-label="Shopping Bag"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-charcoal-900 group-hover:text-sand-600 transition-colors" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-charcoal-900 text-ivory-50 text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline-block text-xs uppercase tracking-widest font-medium text-charcoal-700">
                Bag
              </span>
            </button>
          </div>
        </div>

        {/* Quick Search Slide-Down Bar */}
        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="mt-3 pt-3 border-t border-ivory-300 flex items-center gap-2 animate-fade-in"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by model, style (e.g. Penny Loafer, Chelsea, Minimalist Court)..."
                autoFocus
                className="w-full bg-white border border-ivory-300 px-4 py-2.5 pl-10 text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal-800 rounded-xs"
              />
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-charcoal-900 text-ivory-50 text-xs uppercase tracking-wider font-medium rounded-xs hover:bg-charcoal-800"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-2 text-charcoal-500 hover:text-charcoal-800"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-full bg-ivory-100 border-b border-ivory-300 px-6 py-6 shadow-xl animate-fade-in">
          <div className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium uppercase tracking-widest text-charcoal-800 hover:text-charcoal-950 flex items-center justify-between py-2 border-b border-ivory-200"
              >
                <span>{link.name}</span>
                <ArrowRight className="w-4 h-4 text-charcoal-400" />
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/account"
                className="text-xs uppercase tracking-wider font-semibold text-charcoal-800 py-2 flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Account & Orders
              </Link>
              <Link
                to="/admin"
                className="text-xs uppercase tracking-wider font-semibold text-sand-600 py-2 flex items-center gap-2"
              >
                Admin Control Panel
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
