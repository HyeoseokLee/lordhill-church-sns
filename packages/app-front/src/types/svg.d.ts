// SVG를 React 컴포넌트로 import하기 위한 타입 선언 (vite-plugin-svgr)
declare module '*.svg?react' {
  import React from 'react';
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
