import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

const FONT_FAMILY = [
  'Pretendard Variable',
  'Pretendard',
  '-apple-system',
  'BlinkMacSystemFont',
  'system-ui',
  'Roboto',
  '"Helvetica Neue"',
  '"Segoe UI"',
  '"Apple SD Gothic Neo"',
  '"Noto Sans KR"',
  '"Malgun Gothic"',
  'sans-serif',
].join(',');

const theme = createTheme({
  typography: {
    fontFamily: FONT_FAMILY,
  },
  palette: {
    primary: {
      main: '#4A7C59',
      100: '#E8F0EB',
      200: '#C5DBCC',
      300: '#A1C5AC',
      400: '#6B9E7A',
      500: '#4A7C59',
      600: '#3D6A4A',
      700: '#2E5E3E',
      800: '#1F4A2E',
      900: '#12361F',
    },
    secondary: {
      main: '#8B6914',
      100: '#FFF5E0',
      200: '#FFE5A8',
      300: '#C49A2A',
      400: '#A67F1A',
      500: '#8B6914',
      600: '#6B4F0E',
    },
    error: {
      main: '#DE3730',
    },
    success: {
      main: '#2E7D32',
    },
    grayscale: {
      50: '#F5F5F5',
      100: '#DCDCDC',
      200: '#C3C3C3',
      300: '#AAAAAA',
      400: '#919191',
      500: '#787878',
      600: '#5F5F5F',
      700: '#464646',
      800: '#2D2D2D',
      900: '#141414',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY,
        },
      },
      variants: [
        {
          props: { variant: 'bold24' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 24, lineHeight: 'normal' },
        },
        {
          props: { variant: 'bold20' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 20, lineHeight: 'normal' },
        },
        {
          props: { variant: 'bold18' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 18, lineHeight: 'normal' },
        },
        {
          props: { variant: 'bold16' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 16, lineHeight: 1.5 },
        },
        {
          props: { variant: 'bold14' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 14, lineHeight: 'normal' },
        },
        {
          props: { variant: 'bold12' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 12, lineHeight: 'normal' },
        },
        {
          props: { variant: 'regular16' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 16, lineHeight: 'normal' },
        },
        {
          props: { variant: 'regular14' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 14, lineHeight: 'normal' },
        },
        {
          props: { variant: 'regular12' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 12, lineHeight: 'normal' },
        },
        {
          props: { variant: 'semibold16' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 16, lineHeight: 'normal' },
        },
        {
          props: { variant: 'semibold14' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 14, lineHeight: 'normal' },
        },
        {
          props: { variant: 'medium14' },
          style: { fontFamily: FONT_FAMILY, fontWeight: 500, fontSize: 14, lineHeight: 'normal' },
        },
      ],
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          color: '#fff',
          padding: '12px 20px',
          border: 'none',
          borderRadius: '8px',
          boxShadow: 'none',
          fontSize: '16px',
          fontWeight: '700',
          lineHeight: '24px',
          textTransform: 'initial' as const,
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

interface Props {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: Props) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
