export const VENDORS = ["Vendor A", "Vendor B", "Vendor C"];

export const DEVICE_TYPES = ["MacBook", "iPad", "Mobile Phone", "Mouse", "USB Dock", "Keyboard", "Windows Laptop"];

export const STATUSES = ["Available", "Assigned", "In Repair", "Retired"];

export const STATUS_COLORS = {
  Available: "bg-green-500/10 text-green-400 border-green-500/20",
  Assigned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "In Repair": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Retired: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export const COMPLAINT_PRIORITIES = ["Low", "Medium", "High"];
export const COMPLAINT_STATUSES = ["Open", "In Progress", "Resolved"];

export const BLOOD_TYPES_OPTIONS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export const RAM_SIZES = ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB"];
export const RAM_TYPES = ["DDR4", "DDR5", "LPDDR4X", "LPDDR5", "LPDDR5X", "Unified Memory"];
export const STORAGE_SIZES = ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB"];
export const STORAGE_TYPES = ["SSD", "NVMe SSD", "HDD", "eMMC"];
export const DISPLAY_TYPES = ["IPS", "OLED", "Retina", "Liquid Retina", "Liquid Retina XDR", "TN", "VA"];
export const GPU_TYPES = ["Integrated", "Dedicated"];
export const WIFI_STANDARDS = ["WiFi 5", "WiFi 6", "WiFi 6E", "WiFi 7"];
export const BT_VERSIONS = ["4.0", "4.2", "5.0", "5.1", "5.2", "5.3"];
export const CONNECTION_TYPES = ["USB-A", "USB-C", "Bluetooth", "2.4GHz Wireless", "USB-A + Bluetooth", "USB-C + Bluetooth"];
export const COMPATIBILITY = ["Windows", "macOS", "Universal", "Windows + macOS", "Chrome OS"];

export function isLaptop(type) {
  return type === "MacBook" || type === "Windows Laptop";
}

export function isMobileOrTablet(type) {
  return type === "iPad" || type === "Mobile Phone";
}

export function isPeripheral(type) {
  return type === "Mouse" || type === "Keyboard" || type === "USB Dock";
}
