export const BIO_THEME_PRESETS = {
  default: {
    label: "Default",
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    buttonColor: "#8fff00",
    buttonTextColor: "#0a0a0a",
    buttonStyle: "filled",
  },
  dark: {
    label: "Dark",
    bgColor: "#111111",
    textColor: "#e0e0e0",
    buttonColor: "#333333",
    buttonTextColor: "#ffffff",
    buttonStyle: "filled",
  },
  ocean: {
    label: "Ocean",
    bgColor: "linear-gradient(135deg, #0c2340, #1a4a7a)",
    textColor: "#e8f4fd",
    buttonColor: "#2196f3",
    buttonTextColor: "#ffffff",
    buttonStyle: "rounded",
  },
  sunset: {
    label: "Sunset",
    bgColor: "linear-gradient(135deg, #2d1b3d, #4a1942)",
    textColor: "#f5e6ff",
    buttonColor: "#ff6b6b",
    buttonTextColor: "#ffffff",
    buttonStyle: "rounded",
  },
  forest: {
    label: "Forest",
    bgColor: "linear-gradient(135deg, #0d1f0d, #1a3a1a)",
    textColor: "#d4edda",
    buttonColor: "#28a745",
    buttonTextColor: "#ffffff",
    buttonStyle: "filled",
  },
  minimal: {
    label: "Minimal",
    bgColor: "#fafafa",
    textColor: "#1a1a1a",
    buttonColor: "#1a1a1a",
    buttonTextColor: "#ffffff",
    buttonStyle: "outline",
  },
};

export const BUTTON_STYLES = ["filled", "outline", "rounded", "shadow"];

export function getThemeStyles(theme) {
  const preset = BIO_THEME_PRESETS[theme?.preset] || BIO_THEME_PRESETS.default;
  const bgColor = theme?.bgColor || preset.bgColor;
  const textColor = theme?.textColor || preset.textColor;
  const buttonColor = theme?.buttonColor || preset.buttonColor;
  const buttonTextColor = theme?.buttonTextColor || preset.buttonTextColor;
  const buttonStyle = theme?.buttonStyle || preset.buttonStyle;

  const isGradient = bgColor.startsWith("linear-gradient");

  return {
    containerStyle: {
      ...(isGradient
        ? { background: bgColor }
        : { backgroundColor: bgColor }),
      color: textColor,
    },
    cssVars: {
      "--bio-bg": isGradient ? "transparent" : bgColor,
      "--bio-text": textColor,
      "--bio-btn": buttonColor,
      "--bio-btn-text": buttonTextColor,
    },
    buttonStyle,
  };
}
