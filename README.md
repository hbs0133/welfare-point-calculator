# AsooSoft Welfare Points

AsooSoft 사내 복지 포인트 사용 내역을 기록하고, 전체 잔여 포인트와 항목별 잔여 한도를 한눈에 확인하는 프론트엔드 대시보드입니다.

## 배포 주소

https://welfare-point-calculator.vercel.app

## 주요 기능

- 복지 포인트 사용 내역 추가
- 사용 내역 수정 및 삭제
- 삭제 전 확인창
- 전체 사용 금액과 잔여 포인트 요약
- 동호회, 운동, 도서대여/교육/사무용품 항목별 한도 관리
- 항목 카드 클릭 시 상세 모달 표시
- 기간 필터: 전체, 최근 1주, 이번 달, 최근 3개월
- 항목별 필터
- CSV 내려받기와 CSV 불러오기
- localStorage 저장으로 새로고침/브라우저 재실행 후에도 데이터 유지
- 모바일 대응 반응형 UI
- OG 태그와 공유 이미지 지원

## 포인트 정책

| 구분 | 한도 |
| --- | ---: |
| 연간 전체 복지 포인트 | 1,200,000원 |
| 항목별 최대 사용 가능 금액 | 600,000원 |

관리 항목:

- 동호회
- 운동
- 도서대여/교육/사무용품

## 기술 스택

- React
- TypeScript
- Vite
- CSS
- Vercel

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell 실행 정책 때문에 `npm`이 막히는 환경에서는 아래처럼 실행할 수 있습니다.

```powershell
npm.cmd install
npm.cmd run dev
```

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

## 데이터 저장 방식

별도 백엔드 없이 브라우저 `localStorage`에 데이터를 저장합니다.

유지되는 경우:

- 새로고침
- 브라우저 창 닫기/다시 열기
- 일반적인 PC 재부팅

데이터가 사라질 수 있는 경우:

- 브라우저 사이트 데이터 삭제
- 시크릿 모드 사용
- 다른 브라우저/다른 도메인 접속
- 회사 보안 정책으로 브라우저 저장소가 정리되는 경우

중요한 사용 내역은 CSV로 내려받아 백업하는 것을 권장합니다.

## CSV 백업/복원

앱의 `CSV 내려받기` 버튼으로 현재 사용 내역을 백업할 수 있습니다.

내려받은 CSV는 `CSV 불러오기`로 다시 업로드할 수 있으며, 업로드 시 현재 사용 내역을 CSV 내용으로 교체합니다.

## 프로젝트 구조

```text
src/
  App.tsx
  constants.ts
  types.ts
  styles.css
  assets/
    asoosoft-logo.svg
  components/
    CategoryCard.tsx
    CategoryDetail.tsx
    DatePicker.tsx
    ExpenseForm.tsx
    ExpenseList.tsx
    SummaryCard.tsx
  utils/
    calculations.ts
    csv.ts
    expenseId.ts
    format.ts
```

## 배포

Vercel에 배포되어 있습니다.

```bash
npx vercel --prod
```

공유 시에는 generated deployment URL이 아니라 아래 production alias URL을 사용합니다.

```text
https://welfare-point-calculator.vercel.app
```
