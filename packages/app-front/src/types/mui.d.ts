import '@mui/material/styles';
import '@mui/material/Typography';

declare module '@mui/material/styles' {
  interface Palette {
    grayscale: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  }

  interface PaletteOptions {
    grayscale?: {
      50?: string;
      100?: string;
      200?: string;
      300?: string;
      400?: string;
      500?: string;
      600?: string;
      700?: string;
      800?: string;
      900?: string;
    };
  }

  interface TypographyVariants {
    bold24: React.CSSProperties;
    bold20: React.CSSProperties;
    bold18: React.CSSProperties;
    bold16: React.CSSProperties;
    bold14: React.CSSProperties;
    bold12: React.CSSProperties;
    regular16: React.CSSProperties;
    regular14: React.CSSProperties;
    regular12: React.CSSProperties;
    semibold16: React.CSSProperties;
    semibold14: React.CSSProperties;
    medium14: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    bold24?: React.CSSProperties;
    bold20?: React.CSSProperties;
    bold18?: React.CSSProperties;
    bold16?: React.CSSProperties;
    bold14?: React.CSSProperties;
    bold12?: React.CSSProperties;
    regular16?: React.CSSProperties;
    regular14?: React.CSSProperties;
    regular12?: React.CSSProperties;
    semibold16?: React.CSSProperties;
    semibold14?: React.CSSProperties;
    medium14?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    bold24: true;
    bold20: true;
    bold18: true;
    bold16: true;
    bold14: true;
    bold12: true;
    regular16: true;
    regular14: true;
    regular12: true;
    semibold16: true;
    semibold14: true;
    medium14: true;
  }
}
