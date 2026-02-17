import NavIcon from "./NavIcon";

const SEO_SUBITEMS = [
  {
    label: "Bulk Scan",
    href: "/dashboard/seo/bulk-scan",
    visibilityKey: "page_bulk_scan",
    icon: (
      <NavIcon>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </NavIcon>
    ),
  },
  {
    label: "Full Scan",
    href: "/dashboard/seo/full-scan",
    visibilityKey: "page_full_scan",
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </NavIcon>
    ),
  },
  {
    label: "Sitemap Creator",
    href: "/dashboard/seo/sitemap-creator",
    visibilityKey: "page_sitemap_creator",
    icon: (
      <NavIcon>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </NavIcon>
    ),
  },
  {
    label: "Broken Links",
    href: "/dashboard/seo/broken-links",
    visibilityKey: "page_broken_links",
    icon: (
      <NavIcon>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        <line x1="4" y1="4" x2="20" y2="20" />
      </NavIcon>
    ),
  },
  {
    label: "Sitemap Visualizer",
    href: "/dashboard/seo/sitemap-visualizer",
    visibilityKey: "page_sitemap_visualizer",
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
        <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
        <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
        <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
      </NavIcon>
    ),
  },
  {
    label: "Domain Monitor",
    href: "/dashboard/seo/domain-monitor",
    visibilityKey: "page_domain_monitor",
    icon: (
      <NavIcon>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </NavIcon>
    ),
  },
  {
    label: "URL Shortener",
    href: "/dashboard/seo/url-shortener",
    visibilityKey: "page_url_shortener",
    icon: (
      <NavIcon>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </NavIcon>
    ),
  },
  {
    label: "Content Briefs",
    href: "/dashboard/seo/content-briefs",
    visibilityKey: "page_content_briefs",
    icon: (
      <NavIcon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </NavIcon>
    ),
  },
  {
    label: "llms.txt",
    href: "/dashboard/seo/llms-txt",
    visibilityKey: "page_llms_txt",
    icon: (
      <NavIcon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </NavIcon>
    ),
  },
];

const INSTAGRAM_SUBITEMS = [
  {
    label: "Overview",
    href: "/dashboard/instagram",
    icon: (
      <NavIcon>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </NavIcon>
    ),
  },
  {
    label: "Analytics",
    href: "/dashboard/instagram/analytics",
    icon: (
      <NavIcon>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </NavIcon>
    ),
  },
];

const QR_SUBITEMS = [
  {
    label: "Generator",
    href: "/dashboard/qr-codes",
    icon: (
      <NavIcon>
        <rect x="2" y="2" width="8" height="8" rx="1" />
        <rect x="14" y="2" width="8" height="8" rx="1" />
        <rect x="2" y="14" width="8" height="8" rx="1" />
        <rect x="14" y="14" width="4" height="4" />
        <rect x="20" y="14" width="2" height="2" />
        <rect x="14" y="20" width="2" height="2" />
        <rect x="20" y="20" width="2" height="2" />
      </NavIcon>
    ),
  },
  {
    label: "All Codes",
    href: "/dashboard/qr-codes/all",
    icon: (
      <NavIcon>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </NavIcon>
    ),
  },
  {
    label: "Analytics",
    href: "/dashboard/qr-codes/analytics",
    icon: (
      <NavIcon>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </NavIcon>
    ),
  },
];

const CALENDAR_SUBITEMS = [
  {
    label: "Content Calendar",
    href: "/dashboard/content-calendar",
    visibilityKey: "page_calendar",
    icon: (
      <NavIcon>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </NavIcon>
    ),
  },
  {
    label: "eCommerce Calendar",
    href: "/dashboard/ecommerce/calendar",
    visibilityKey: "page_calendar",
    icon: (
      <NavIcon>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </NavIcon>
    ),
  },
  {
    label: "Employee Calendar",
    href: "/dashboard/employees/calendar",
    visibilityKey: "page_calendar",
    icon: (
      <NavIcon>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <rect x="14" y="1" width="8" height="8" rx="1" />
        <line x1="18" y1="1" x2="18" y2="3" />
        <line x1="16" y1="1" x2="16" y2="3" />
        <line x1="14" y1="5" x2="22" y2="5" />
      </NavIcon>
    ),
  },
];

const GOOGLE_SUBITEMS = [
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <NavIcon>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </NavIcon>
    ),
  },
];

const ECOMMERCE_SUBITEMS = [
  {
    label: "Products",
    href: "/dashboard/ecommerce/products",
    icon: (
      <NavIcon>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </NavIcon>
    ),
  },
  {
    label: "Reviews",
    href: "/dashboard/ecommerce/reviews",
    icon: (
      <NavIcon>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </NavIcon>
    ),
  },
  {
    label: "Inventory Alerts",
    href: "/dashboard/ecommerce/inventory-alerts",
    icon: (
      <NavIcon>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </NavIcon>
    ),
  },
  {
    label: "Collections",
    href: "/dashboard/ecommerce/collections",
    icon: (
      <NavIcon>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </NavIcon>
    ),
  },
  {
    label: "Carts",
    href: "/dashboard/ecommerce/carts",
    icon: (
      <NavIcon>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </NavIcon>
    ),
  },
  {
    label: "Checkouts",
    href: "/dashboard/ecommerce/checkouts",
    icon: (
      <NavIcon>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </NavIcon>
    ),
  },
  {
    label: "Orders",
    href: "/dashboard/ecommerce/orders",
    icon: (
      <NavIcon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </NavIcon>
    ),
  },
  {
    label: "Customers",
    href: "/dashboard/ecommerce/customers",
    icon: (
      <NavIcon>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </NavIcon>
    ),
  },
  {
    label: "Webhooks",
    href: "/dashboard/ecommerce/webhooks",
    icon: (
      <NavIcon>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </NavIcon>
    ),
  },
];

const TRANSFERS_SUBITEMS = [
  {
    label: "All Transfers",
    href: "/dashboard/transfers",
    icon: (
      <NavIcon>
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polyline points="16 8 20 8 23 11 23 16 19 16 19 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </NavIcon>
    ),
  },
  {
    label: "Products",
    href: "/dashboard/transfers/products",
    icon: (
      <NavIcon>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </NavIcon>
    ),
  },
  {
    label: "Locations",
    href: "/dashboard/transfers/locations",
    icon: (
      <NavIcon>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </NavIcon>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/transfers/settings",
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </NavIcon>
    ),
  },
];

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <NavIcon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </NavIcon>
    ),
  },
  {
    label: "Website",
    href: "/dashboard/website",
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </NavIcon>
    ),
  },
  {
    label: "SEO",
    isMenu: true,
    visibilityKey: "page_seo",
    icon: (
      <NavIcon>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </NavIcon>
    ),
    subItems: SEO_SUBITEMS,
  },
  {
    label: "QR Codes",
    isMenu: true,
    visibilityKey: "page_qr_codes",
    icon: (
      <NavIcon>
        <rect x="2" y="2" width="8" height="8" rx="1" />
        <rect x="14" y="2" width="8" height="8" rx="1" />
        <rect x="2" y="14" width="8" height="8" rx="1" />
        <rect x="14" y="14" width="4" height="4" />
        <rect x="20" y="14" width="2" height="2" />
        <rect x="14" y="20" width="2" height="2" />
        <rect x="20" y="20" width="2" height="2" />
      </NavIcon>
    ),
    subItems: QR_SUBITEMS,
  },
  {
    label: "Bio Links",
    href: "/dashboard/bio-links",
    visibilityKey: "page_bio_links",
    icon: (
      <NavIcon>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        <line x1="12" y1="17" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </NavIcon>
    ),
  },
  {
    label: "Calendar",
    isMenu: true,
    visibilityKey: "page_calendar",
    icon: (
      <NavIcon>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </NavIcon>
    ),
    subItems: CALENDAR_SUBITEMS,
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    visibilityKey: "page_calendar",
    icon: (
      <NavIcon>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </NavIcon>
    ),
  },
  {
    label: "eCommerce",
    isMenu: true,
    visibilityKey: "page_ecommerce",
    icon: (
      <NavIcon>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </NavIcon>
    ),
    subItems: ECOMMERCE_SUBITEMS,
  },
  {
    label: "Google Reviews",
    href: "/dashboard/reviews",
    visibilityKey: "page_google_reviews",
    icon: (
      <NavIcon>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </NavIcon>
    ),
  },
  {
    label: "Instagram",
    isMenu: true,
    visibilityKey: "page_instagram",
    icon: (
      <NavIcon>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </NavIcon>
    ),
    subItems: INSTAGRAM_SUBITEMS,
  },
  {
    label: "Google",
    isMenu: true,
    visibilityKey: "page_google_analytics",
    icon: (
      <NavIcon>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </NavIcon>
    ),
    subItems: GOOGLE_SUBITEMS,
  },
  {
    label: "Teams",
    href: "/dashboard/teams",
    visibilityKey: "page_teams",
    icon: (
      <NavIcon>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </NavIcon>
    ),
  },
  {
    label: "Employees",
    href: "/dashboard/employees",
    visibilityKey: "page_employees",
    icon: (
      <NavIcon>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </NavIcon>
    ),
  },
  {
    label: "Devices",
    isMenu: true,
    visibilityKey: "page_devices",
    icon: (
      <NavIcon>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </NavIcon>
    ),
    subItems: [
      {
        label: "All Devices",
        href: "/dashboard/devices",
        icon: (
          <NavIcon>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="2" y1="20" x2="22" y2="20" />
          </NavIcon>
        ),
      },
      {
        label: "Catalog & Pricing",
        href: "/dashboard/devices/catalog",
        icon: (
          <NavIcon>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </NavIcon>
        ),
      },
    ],
  },
  {
    label: "Transfers",
    isMenu: true,
    visibilityKey: "page_transfers",
    icon: (
      <NavIcon>
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polyline points="16 8 20 8 23 11 23 16 19 16 19 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </NavIcon>
    ),
    subItems: TRANSFERS_SUBITEMS,
  },
  {
    label: "RecruitSmart",
    href: "/dashboard/recruitsmart",
    visibilityKey: "page_recruitsmart",
    icon: (
      <NavIcon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </NavIcon>
    ),
  },
  {
    label: "Software",
    href: "/dashboard/software-renewals",
    visibilityKey: "page_software",
    icon: (
      <NavIcon>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </NavIcon>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </NavIcon>
    ),
  },
];

export const ADMIN_ITEM = {
  label: "Admin",
  href: "/dashboard/admin",
  icon: (
    <NavIcon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </NavIcon>
  ),
};
