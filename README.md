# AsooSoft Welfare Points

AsooSoft 사내 복지 포인트 사용 내역을 기록하고, 전체 잔여 포인트와 항목별 잔여 한도를 빠르게 확인하는 웹앱입니다.

## 배포 주소

https://welfare-point-calculator.vercel.app

## 주요 기능

- 회사 이메일/비밀번호 기반 로그인
- 회원가입 시 이름 등록
- 기존 가입자의 이름 등록 안내
- 회사 이메일 기반 비밀번호 재설정
- Supabase DB 저장 및 사용자별 데이터 분리
- 복지 포인트 사용 내역 추가, 수정, 삭제
- 사용 내역 추가 전 확인 모달
- 삭제 전 확인창
- 동료 이름, 아이디, 이메일로 1/N 차감 요청 보내기
- 가입된 동료 목록에서 체크박스로 1/N 대상 선택
- 받은 1/N 요청 실시간 확인 및 수락/거절
- 보낸 1/N 요청 상태 확인 및 취소
- 받은 요청과 보낸 요청을 묶은 접기/펼치기 요청 센터
- 전체 사용 금액과 잔여 포인트 요약
- 동호회, 운동, 도서대여/교육/사무용품 항목별 한도 관리
- 항목 카드 클릭 시 상세 모달
- 기간 필터: 전체, 최근 1주, 이번 달, 최근 3개월
- 항목별 필터
- CSV 내려받기와 CSV 불러오기
- 기존 localStorage 데이터 계정으로 가져오기
- 모바일 대응 반응형 UI
- AsooSoft 브랜드 로고와 OG 태그

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
- Supabase Auth / Database
- Vercel

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell에서 실행할 때 `npm`이 막히는 환경이라면 아래처럼 실행할 수 있습니다.

```powershell
npm.cmd install
npm.cmd run dev
```

## 환경 변수

`.env.example`을 참고해 `.env.local`을 만듭니다.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`VITE_`로 시작하는 값은 프론트엔드 번들에 포함되는 공개 키입니다. Supabase의 `service_role` 키는 절대 넣지 않습니다.

## Supabase 설정

Supabase 프로젝트에서 `SQL Editor`를 열고 [supabase/schema.sql](supabase/schema.sql)의 내용을 실행합니다.

이 스크립트는 다음을 만듭니다.

- `public.expenses` 테이블
- `public.profiles` 테이블
- `public.split_requests` 테이블
- `public.split_request_recipients` 테이블
- 사용자별 접근을 제한하는 RLS 정책
- 수정일 자동 갱신 트리거
- 사용자/날짜/요청 상태 기준 인덱스
- 1/N 요청 수신용 Supabase Realtime 설정

화면에서는 이름, 회사 이메일, 비밀번호를 받습니다. 가입/로그인은 `@asoosoft.net` 회사 이메일만 허용합니다.

기존 가입자는 로그인 후 이름이 비어 있거나 예전 기본값으로 남아 있으면 이름 등록 모달이 표시됩니다. 이 이름은 1/N 요청 대상 검색에 사용됩니다.

Supabase Dashboard의 Authentication 설정에서 이메일 인증을 켜두면, 회원가입 후 회사 메일함으로 전송된 인증 링크를 눌러야 로그인할 수 있습니다.

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

## CSV 백업/복원

`CSV 내려받기` 버튼으로 현재 사용 내역을 백업할 수 있습니다.

내려받은 CSV는 `CSV 불러오기`로 다시 업로드할 수 있으며, 업로드 시 현재 계정의 사용 내역을 CSV 내용으로 교체합니다.

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
    AuthPanel.tsx
    CategoryCard.tsx
    CategoryDetail.tsx
    DatePicker.tsx
    ExpenseForm.tsx
    ExpenseList.tsx
    PasswordUpdatePanel.tsx
    ProfileNameDialog.tsx
    SplitRequestCenter.tsx
    SummaryCard.tsx
  lib/
    supabase.ts
  utils/
    calculations.ts
    companyEmail.ts
    csv.ts
    expenseId.ts
    format.ts
supabase/
  schema.sql
```

## 배포

Vercel 프로젝트 환경 변수에 아래 두 값을 등록한 뒤 배포합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

```bash
npx vercel --prod
```

동료에게 공유할 때는 generated deployment URL 대신 production alias URL을 사용합니다.

```text
https://welfare-point-calculator.vercel.app
```
