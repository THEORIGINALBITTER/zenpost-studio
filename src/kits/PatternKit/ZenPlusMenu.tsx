import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

export interface ZenPlusMenuItem {
  id: string;
  label: string;
  icon: any;
  description?: string;
  action?: () => void;
  shortcut?: string;
  submenu?: ZenPlusSubmenuItem[]; // Support for submenus
}

export interface ZenPlusSubmenuItem {
  id: string;
  label: string;
  action: () => void;
}

interface ZenPlusMenuProps {
  items: ZenPlusMenuItem[];
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size?: 'small' | 'medium' | 'large';
  variant?: 'floating' | 'inline';
}

export const ZenPlusMenu = ({
  items,
  position = 'top-right',
  size = 'medium',
  variant = 'floating',
}: ZenPlusMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null); // Track active submenu
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(filter.toLowerCase()) ||
    item.description?.toLowerCase().includes(filter.toLowerCase())
  );

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFilter('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus input when menu opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            const item = filteredItems[selectedIndex];
            if (item.submenu) {
              // If item has submenu, toggle it
              setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
            } else if (item.action) {
              item.action();
              setIsOpen(false);
              setFilter('');
              setActiveSubmenu(null);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (activeSubmenu) {
            // Close submenu first
            setActiveSubmenu(null);
          } else {
            setIsOpen(false);
            setFilter('');
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedIndex, filteredItems]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  const sizeStyles = {
    small: { width: 48, height: 48, iconSize: 14 },
    medium: { width: 56, height: 56, iconSize: 16 },
    large: { width: 64, height: 64, iconSize: 20 },
  };

  const positionStyles = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  };

  const currentSize = sizeStyles[size];
  const currentPosition = variant === 'floating' ? positionStyles[position] : {};

  return (
    <div
      ref={menuRef}
      style={{
        position: variant === 'floating' ? 'fixed' : 'relative',
        ...currentPosition,
        zIndex: 1000,
        backgroundColor: 'rgba(18, 18, 18, 0.5)',
        borderRadius: '50%',
        border: '0.5px solid #121212',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        padding: 3,
      }}
    >
      {/* Plus Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: currentSize.width,
          height: currentSize.height,
          borderRadius: '50%',
          backgroundColor: isOpen ? '#151515' : '#171717',
          border: isOpen ? '1px solid #AC8E66' : '1px solid #2E2E2E',
          color: '#AC8E66',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          boxShadow: 'none',
        }}
      >
        <FontAwesomeIcon
          icon={isOpen ? faTimes : faPlus}
          style={{
            fontSize: currentSize.iconSize,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: variant === 'floating' ? currentSize.height + 8 : '100%',
            right: position.includes('right') ? 0 : 'auto',
            left: position.includes('left') ? 0 : 'auto',
            marginTop: variant === 'inline' ? 8 : 0,
            width: 320,
            maxHeight: 400,
            color: '#555',
            backgroundColor: '#151515',
            backdropFilter: 'blur(8px)',
            border: '1px solid #AC8E66',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Input */}
          <div style={{ padding: 12, borderBottom: '1px solid #3a3a3a' }}>
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Suchen..."
              style={{
                width: '91%',
                padding: '8px 12px',
                backgroundColor: '#d9d4c5',
                border: '1px solid #3a3a3a',
                borderRadius: 4,
                color: '#151515',
                fontSize: 12,
                fontFamily: 'monospace',
                outline: 'none',
              }}
              className="focus:border-[#AC8E66]"
            />
          </div>

          {/* Menu Items */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 8,
            }}
          >
            {filteredItems.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  color: '#AC8E66',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              >
                Keine Ergebnisse gefunden
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (item.submenu) {
                        setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
                      } else if (item.action) {
                        item.action();
                        setIsOpen(false);
                        setFilter('');
                        setActiveSubmenu(null);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor:
                        index === selectedIndex ? '#AC8E66' : 'transparent',
                      color: index === selectedIndex ? '#1E1E1E' : '#e5e5e5',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: activeSubmenu === item.id ? 0 : 4,
                      transition: 'all 0.15s ease',
                    }}
                    className="hover:bg-[#AC8E66] hover:text-[#151515]"
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      style={{ fontSize: 10, width: 16, color: '#d9d4c5' }}
                    />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 10, color: '#d9d4c5', fontFamily: 'monospace', fontWeight: 500 }}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: 'monospace',
                            opacity: 0.7,
                            marginTop: 2,
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: 'monospace',
                          opacity: 0.5,
                          padding: '2px 6px',
                          backgroundColor:
                            index === selectedIndex ? '#d9d4c5' : '#2A2A2A',
                          borderRadius: 3,
                        }}
                      >
                        {item.shortcut}
                      </div>
                    )}
                    {item.submenu && (
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: 'monospace',
                          opacity: 0.7,
                        }}
                      >
                        {activeSubmenu === item.id ? '▼' : '▶'}
                      </div>
                    )}
                  </button>

                  {/* Submenu */}
                  {item.submenu && activeSubmenu === item.id && (
                    <div
                      style={{
                        paddingLeft: 28,
                        marginBottom: 4,
                        backgroundColor: '#2A2A2A',
                        borderRadius: 4,
                        padding: '8px 8px 8px 28px',
                      }}
                    >
                      {item.submenu.map((subitem) => (
                        <button
                          key={subitem.id}
                          onClick={() => {
                            subitem.action();
                            setIsOpen(false);
                            setFilter('');
                            setActiveSubmenu(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            color: '#e5e5e5',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            display: 'block',
                            textAlign: 'left',
                            fontSize: 11,
                            fontFamily: 'monospace',
                            marginBottom: 4,
                            transition: 'all 0.15s ease',
                          }}
                          className="hover:bg-[#3a3a3a] hover:text-[#AC8E66]"
                        >
                          {subitem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
