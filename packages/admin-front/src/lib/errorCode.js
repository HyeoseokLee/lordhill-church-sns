// 서버 에러 코드 (packages/server/src/err.js의 ErrInfo와 값을 맞출 것)
export const ErrorCode = {
  BalanceChainBroken: 80,
  BalanceDiscontinuous: 81,
};

// 관리자가 내용을 확인한 뒤 그대로 저장할 수 있는 에러.
// 계좌 연속성 불일치는 과거분 보완 등 정당한 사유가 있을 수 있어 강제 진행을 허용한다.
// 반면 파일 내부 잔액이 깨진 경우(BalanceChainBroken)는 파일 자체가 잘못된 것이므로 제외한다.
export const isForcibleBalanceError = code =>
  code === ErrorCode.BalanceDiscontinuous;
