export const QR_TYPES = [
  {
    value: "link",
    label: "Link",
    icon: "🔗",
    fields: [
      { name: "url", label: "URL", type: "url", placeholder: "https://example.com", required: true },
    ],
    encode: (d) => {
      if (!d.url) return "";
      if (d.url.startsWith("https://")) return d.url;
      if (d.url.startsWith("http://")) return d.url.replace("http://", "https://");
      return `https://${d.url}`;
    },
  },
  {
    value: "text",
    label: "Text",
    icon: "📝",
    fields: [
      { name: "text", label: "Text Content", type: "textarea", placeholder: "Enter any text...", required: true },
    ],
    encode: (d) => d.text,
  },
  {
    value: "email",
    label: "E-mail",
    icon: "✉️",
    fields: [
      { name: "email", label: "Email Address", type: "email", placeholder: "name@example.com", required: true },
      { name: "subject", label: "Subject", type: "text", placeholder: "Email subject" },
      { name: "body", label: "Body", type: "textarea", placeholder: "Email body text" },
    ],
    encode: (d) => `mailto:${d.email}?subject=${encodeURIComponent(d.subject || "")}&body=${encodeURIComponent(d.body || "")}`,
  },
  {
    value: "call",
    label: "Call",
    icon: "📞",
    fields: [
      { name: "phone", label: "Phone Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    encode: (d) => `tel:${d.phone}`,
  },
  {
    value: "sms",
    label: "SMS",
    icon: "💬",
    fields: [
      { name: "phone", label: "Phone Number", type: "tel", placeholder: "+1234567890", required: true },
      { name: "message", label: "Message", type: "textarea", placeholder: "SMS message text" },
    ],
    encode: (d) => `sms:${d.phone}${d.message ? `?body=${encodeURIComponent(d.message)}` : ""}`,
  },
  {
    value: "vcard",
    label: "V-Card",
    icon: "👤",
    fields: [
      { name: "firstName", label: "First Name", type: "text", placeholder: "John", required: true },
      { name: "lastName", label: "Last Name", type: "text", placeholder: "Doe" },
      { name: "phone", label: "Phone", type: "tel", placeholder: "+1234567890" },
      { name: "email", label: "Email", type: "email", placeholder: "john@example.com" },
      { name: "company", label: "Company", type: "text", placeholder: "Acme Inc." },
      { name: "title", label: "Job Title", type: "text", placeholder: "Software Engineer" },
      { name: "website", label: "Website", type: "url", placeholder: "https://example.com" },
      { name: "address", label: "Address", type: "text", placeholder: "123 Main St, City, State" },
      { name: "note", label: "Note", type: "textarea", placeholder: "Any additional info..." },
    ],
    encode: (d) =>
      `BEGIN:VCARD\nVERSION:3.0\nN:${d.lastName || ""};${d.firstName || ""}\nFN:${d.firstName || ""} ${d.lastName || ""}\n${d.company ? `ORG:${d.company}\n` : ""}${d.title ? `TITLE:${d.title}\n` : ""}${d.phone ? `TEL:${d.phone}\n` : ""}${d.email ? `EMAIL:${d.email}\n` : ""}${d.website ? `URL:${d.website}\n` : ""}${d.address ? `ADR:;;${d.address}\n` : ""}${d.note ? `NOTE:${d.note}\n` : ""}END:VCARD`,
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: "📲",
    fields: [
      { name: "phone", label: "Phone Number (with country code)", type: "tel", placeholder: "1234567890", required: true },
      { name: "message", label: "Message", type: "textarea", placeholder: "Pre-filled message" },
    ],
    encode: (d) => `https://wa.me/${d.phone.replace(/[^0-9]/g, "")}${d.message ? `?text=${encodeURIComponent(d.message)}` : ""}`,
  },
  {
    value: "wifi",
    label: "Wi-Fi",
    icon: "📶",
    fields: [
      { name: "ssid", label: "Network Name (SSID)", type: "text", placeholder: "MyWiFi", required: true },
      { name: "password", label: "Password", type: "text", placeholder: "password123" },
      { name: "encryption", label: "Encryption", type: "select", options: ["WPA", "WEP", "nopass"], placeholder: "WPA" },
      { name: "hidden", label: "Hidden Network", type: "checkbox" },
    ],
    encode: (d) => `WIFI:T:${d.encryption || "WPA"};S:${d.ssid};P:${d.password || ""};H:${d.hidden ? "true" : "false"};;`,
  },
  {
    value: "pdf",
    label: "PDF",
    icon: "📄",
    fields: [
      { name: "url", label: "PDF URL", type: "url", placeholder: "https://example.com/file.pdf", required: true },
    ],
    encode: (d) => d.url,
  },
  {
    value: "app",
    label: "App",
    icon: "📱",
    fields: [
      { name: "appStore", label: "App Store URL", type: "url", placeholder: "https://apps.apple.com/..." },
      { name: "playStore", label: "Play Store URL", type: "url", placeholder: "https://play.google.com/store/..." },
    ],
    encode: (d) => d.appStore || d.playStore || "",
  },
  {
    value: "image",
    label: "Image",
    icon: "🖼️",
    fields: [
      { name: "url", label: "Image URL", type: "url", placeholder: "https://example.com/image.jpg", required: true },
    ],
    encode: (d) => d.url,
  },
  {
    value: "video",
    label: "Video",
    icon: "🎬",
    fields: [
      { name: "url", label: "Video URL", type: "url", placeholder: "https://youtube.com/watch?v=...", required: true },
    ],
    encode: (d) => d.url,
  },
  {
    value: "social",
    label: "Social Media",
    icon: "🌐",
    fields: [
      { name: "platform", label: "Platform", type: "select", options: ["Instagram", "Twitter/X", "LinkedIn", "Facebook", "TikTok", "YouTube", "GitHub", "Other"] },
      { name: "url", label: "Profile URL", type: "url", placeholder: "https://instagram.com/username", required: true },
    ],
    encode: (d) => d.url,
  },
  {
    value: "event",
    label: "Event",
    icon: "📅",
    fields: [
      { name: "title", label: "Event Title", type: "text", placeholder: "Team Meeting", required: true },
      { name: "location", label: "Location", type: "text", placeholder: "Conference Room A" },
      { name: "startDate", label: "Start Date & Time", type: "datetime-local", required: true },
      { name: "endDate", label: "End Date & Time", type: "datetime-local" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Event details..." },
    ],
    encode: (d) => {
      const fmt = (dt) => dt ? dt.replace(/[-:]/g, "").replace("T", "T") + "00" : "";
      return `BEGIN:VEVENT\nSUMMARY:${d.title}\n${d.location ? `LOCATION:${d.location}\n` : ""}DTSTART:${fmt(d.startDate)}\n${d.endDate ? `DTEND:${fmt(d.endDate)}\n` : ""}${d.description ? `DESCRIPTION:${d.description}\n` : ""}END:VEVENT`;
    },
  },
];

export const PRESETS = [
  {
    name: "Business Card",
    type: "vcard",
    data: { firstName: "John", lastName: "Doe", photo: "", company: "Acme Inc.", title: "CEO", email: "john@acme.com", phone: "+1234567890" },
  },
  {
    name: "Wi-Fi Guest",
    type: "wifi",
    data: { ssid: "Guest-WiFi", password: "welcome123", encryption: "WPA", hidden: false },
  },
  {
    name: "Event Invite",
    type: "event",
    data: { title: "Team Meeting", location: "Office", description: "Weekly standup" },
  },
];
