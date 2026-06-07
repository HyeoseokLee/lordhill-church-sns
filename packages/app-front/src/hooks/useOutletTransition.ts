import { useEffect, useRef, useState } from 'react';
import { useOutlet } from 'react-router-dom';

const TRANSITION_MS = 250;

// 네이티브 푸시 트랜지션을 위한 outlet 상태 관리 훅
export default function useOutletTransition() {
  const outlet = useOutlet();
  const [displayOutlet, setDisplayOutlet] = useState(outlet);
  const [isExiting, setIsExiting] = useState(false);
  // 자식이 완전히 덮은 후 부모가 원위치로 돌아왔는지 여부
  const [isSettled, setIsSettled] = useState(false);
  // 자식→자식 전환 시 애니메이션 스킵 여부
  const [skipAnimation, setSkipAnimation] = useState(false);
  const prevOutletRef = useRef(outlet);

  useEffect(() => {
    if (outlet) {
      const wasChildToChild = !!prevOutletRef.current;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayOutlet(outlet);
      setIsExiting(false);

      if (wasChildToChild) {
        // 자식→자식 전환 — 애니메이션 스킵
        setSkipAnimation(true);
        setIsSettled(true);
      } else {
        // null→자식 진입 — 슬라이드 인 애니메이션
        setSkipAnimation(false);
        setIsSettled(false);
        const settleTimer = setTimeout(() => {
          setIsSettled(true);
        }, TRANSITION_MS);
        prevOutletRef.current = outlet;
        return () => clearTimeout(settleTimer);
      }
      prevOutletRef.current = outlet;
    } else if (prevOutletRef.current) {
      // 자식 페이지 퇴장 — 애니메이션 후 언마운트
      setSkipAnimation(false);
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
    skipAnimation,
    hasOutlet: !!outlet,
    showOverlay: !!outlet || isExiting,
    transitionMs: TRANSITION_MS,
  };
}
