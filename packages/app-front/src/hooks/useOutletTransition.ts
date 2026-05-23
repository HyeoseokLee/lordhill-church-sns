import { useEffect, useRef, useState } from 'react';
import { useOutlet } from 'react-router-dom';

const TRANSITION_MS = 200;

// 네이티브 푸시 트랜지션을 위한 outlet 상태 관리 훅
export default function useOutletTransition() {
  const outlet = useOutlet();
  const [displayOutlet, setDisplayOutlet] = useState(outlet);
  const [isExiting, setIsExiting] = useState(false);
  // 자식이 완전히 덮은 후 부모가 원위치로 돌아왔는지 여부
  const [isSettled, setIsSettled] = useState(false);
  const prevOutletRef = useRef(outlet);

  useEffect(() => {
    if (outlet) {
      // 자식 페이지 진입
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayOutlet(outlet);
      setIsExiting(false);
      setIsSettled(false);
      // 슬라이드 인 완료 후 부모를 몰래 원위치
      const settleTimer = setTimeout(() => {
        setIsSettled(true);
      }, TRANSITION_MS);
      prevOutletRef.current = outlet;
      return () => clearTimeout(settleTimer);
    } else if (prevOutletRef.current) {
      // 자식 페이지 퇴장 — 애니메이션 후 언마운트
      setIsExiting(true);
      const timer = setTimeout(() => {
        setDisplayOutlet(null);
        setIsExiting(false);
        setIsSettled(false);
      }, TRANSITION_MS);
      prevOutletRef.current = outlet;
      return () => clearTimeout(timer);
    }
    prevOutletRef.current = outlet;
  }, [outlet]);

  return {
    outlet,
    displayOutlet,
    isExiting,
    isSettled,
    hasOutlet: !!outlet,
    showOverlay: !!outlet || isExiting,
    transitionMs: TRANSITION_MS,
  };
}
