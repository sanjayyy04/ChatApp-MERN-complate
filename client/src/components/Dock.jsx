import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import {
  FiHome,
  FiLogIn,
  FiMessageCircle,
  FiSearch,
  FiUser,
} from "react-icons/fi";

function DockItem({
  children,
  className = "",
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  active,
}) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    };
    return value - rect.x - baseItemSize / 2;
  });

  const targetScale = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [1, magnification, 1],
  );
  const scale = useSpring(targetScale, spring);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{
        width: baseItemSize,
        height: baseItemSize,
        scale,
        transformOrigin: "50% 100%",
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item${active ? " dock-item--active" : ""}${className ? ` ${className}` : ""}`}
      tabIndex={0}
      role="button"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {Children.map(children, (child) =>
        isValidElement(child) ? cloneElement(child, { isHovered }) : child,
      )}
    </motion.div>
  );
}

function DockLabel({ children, className = "", isHovered }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return undefined;
    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label${className ? ` ${className}` : ""}`}
          role="tooltip"
          style={{ x: "-50%", left: "50%", bottom: "calc(100% + 0.45rem)", top: "auto" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = "" }) {
  return (
    <div className={`dock-icon${className ? ` ${className}` : ""}`}>{children}</div>
  );
}

function DockBrand({ compact, onClick }) {
  return (
    <button type="button" className="dock-brand" onClick={onClick} aria-label="Chat App home">
      <span className="logo-mark dock-brand__mark" aria-hidden="true">
        <span className="logo-mark__bubble logo-mark__bubble--front" />
        <span className="logo-mark__bubble logo-mark__bubble--back" />
      </span>
      {!compact && (
        <span className="dock-brand__wordmark logo-wordmark">
          Chat <strong>App</strong>
        </span>
      )}
    </button>
  );
}

function Dock({
  items,
  center,
  className = "",
  spring = { mass: 0.12, stiffness: 260, damping: 26 },
  magnification = 1.1,
  distance = 120,
  panelHeight = 64,
  baseItemSize = 46,
}) {
  const mouseX = useMotionValue(Infinity);

  const renderItem = (item) => (
    <DockItem
      key={item.label}
      onClick={item.onClick}
      className={item.className}
      mouseX={mouseX}
      spring={spring}
      distance={distance}
      magnification={magnification}
      baseItemSize={baseItemSize}
      label={item.label}
      active={item.active}
    >
      <DockIcon>{item.icon}</DockIcon>
      <DockLabel>{item.label}</DockLabel>
    </DockItem>
  );

  return (
    <div className="dock-outer" style={{ height: panelHeight }}>
      <motion.div
        onPointerMove={({ pageX }) => {
          mouseX.set(pageX);
        }}
        onPointerLeave={() => {
          mouseX.set(Infinity);
        }}
        className={`dock-panel dock-panel--wide${className ? ` ${className}` : ""}`}
        style={{ minHeight: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        <div className="dock-panel__brand">{center}</div>
        <div className="dock-panel__icons">{items.map(renderItem)}</div>
      </motion.div>
    </div>
  );
}

const HIDE_DELAY = 2200;

const AppDock = ({ user, authLoading }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [compact, setCompact] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  const hoveredRef = useRef(false);
  const hideTimer = useRef(null);

  const reveal = () => {
    setVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!hoveredRef.current) setVisible(false);
    }, HIDE_DELAY);
  };

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 640);
    const events = ["mousemove", "scroll", "click", "touchstart", "keydown", "wheel"];
    events.forEach((eventName) =>
      window.addEventListener(eventName, reveal, { passive: true }),
    );
    window.addEventListener("resize", onResize);
    reveal();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, reveal));
      window.removeEventListener("resize", onResize);
      window.clearTimeout(hideTimer.current);
    };
  }, []);

  const metrics = compact
    ? { baseItemSize: 40, magnification: 1.06, panelHeight: 56, distance: 90 }
    : { baseItemSize: 46, magnification: 1.1, panelHeight: 64, distance: 110 };

  const items = [
    {
      icon: <FiHome size={compact ? 18 : 20} />,
      label: "Home",
      onClick: () => navigate("/"),
      active: location.pathname === "/",
    },
    {
      icon: <FiSearch size={compact ? 18 : 20} />,
      label: "Search",
      onClick: () => navigate("/users"),
      active: location.pathname === "/users",
    },
    {
      icon: <FiMessageCircle size={compact ? 18 : 20} />,
      label: "Chats",
      onClick: () => navigate("/chat"),
      active: location.pathname === "/chat",
    },
    {
      icon: authLoading ? <FiUser size={compact ? 18 : 20} /> : user ? <FiUser size={compact ? 18 : 20} /> : <FiLogIn size={compact ? 18 : 20} />,
      label: authLoading ? "Account" : user ? "Profile" : "Sign in",
      onClick: () => navigate(user ? "/profile" : "/reg"),
      active: location.pathname === "/profile" || location.pathname === "/reg",
    },
  ];

  return (
    <div
      className={`app-dock${visible ? " app-dock--visible" : ""}`}
      onMouseEnter={() => {
        hoveredRef.current = true;
        setVisible(true);
        window.clearTimeout(hideTimer.current);
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        reveal();
      }}
    >
      <Dock
        items={items}
        center={<DockBrand compact={compact} onClick={() => navigate("/")} />}
        {...metrics}
      />
    </div>
  );
};

export default AppDock;
