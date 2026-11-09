# Palmer의 웹 도감

> 부사수들의 질문과 직접 겪은 시행착오를 눌러 담은 **경험 노하우 웹 도감** — UX·UI부터 기획까지, 직접 만져보며 배워요

모든 카드에는 실제로 동작하는 데모가 있어요. 버튼을 누르고, 끌고, 길게 누르며 차이를 몸으로 느껴보세요.
1920×1080 데스크톱을 기준으로, 태블릿·모바일까지 반응형으로 볼 수 있어요.

## 구성

### 디자인
- **디자인 시스템** — 타이포그래피 · 컬러(토큰 3계층, 60:30:10) · 그리드 · 간격(4/8pt, 오토 레이아웃↔Flexbox) · 상태·모션 · 구조(아토믹, F/Z, 폴드) · 접근성·성능 · 원칙 · 컴포넌트 사전.
  조절한 값을 CSS 변수 · W3C 디자인 토큰 JSON · Tailwind 설정으로 내보낼 수 있어요.
- **가이드**

| 그룹 | 가이드 |
|---|---|
| 컴포넌트 | 닮은꼴 컴포넌트 · 평점·평가 · 메뉴 아이콘 · 알림과 피드백 |
| 모션 | 화면 전환 방식 · 움직임·이징 · 제스처 |
| 스타일 | 디자인 스타일 (플랫부터 리퀴드 글래스까지 13종) |
| 패턴 | 빈 화면 · 앱 화면 구성 · 로딩 패턴 |
| 심리·윤리 | 심리 편향 · 다크 패턴 |
| 원칙 | UX 법칙 · 타이포그래피 · 색상 대비 |
| 플랫폼 | 머티리얼 디자인 · 애플 HIG · 머티리얼 vs HIG |

### 기획
- **기획 노트** — 산출물 지도 · 문제 정의·PRD · 구조·동선 · 화면설계서 · 정책·예외 · 우선순위 · 지표·데이터 · 백오피스·연동 · 협업·소통 · QA·출시.
  예시 서비스 '오늘반찬'으로 설명하고, PRD·화면설계서·권한표·이벤트 명세 등 팀 표준 템플릿(.md / .csv)을 내려받을 수 있어요.

## 기능

- 카드가 화면에 들어오면 데모가 자동으로 한 번 재생되고, ‘다시 보기’로 다시 볼 수 있어요.
- 모션 가이드에서는 슬로우 모션(4배 느리게)으로 움직임을 자세히 볼 수 있어요.
- 라이트·다크 테마를 지원해요.
- 스크롤 위치에 따라 목차 칩이 따라오고, 상단에 읽기 진행 막대가 보여요.
- ⌘K(또는 /)로 가이드·카드·디자인 시스템·기획 노트를 검색하고, `#/가이드/카드` 주소로 카드 하나를 바로 공유할 수 있어요.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 에 정적 파일 생성
```

`main` 브랜치에 푸시하면 GitHub Actions가 빌드해서 GitHub Pages에 배포해요.

## 구조

```
src/
  App.tsx                 사이드바 · 상단 바 · 라우팅(#/가이드-id)
  components/Card.tsx     카드 · 데모 자동 재생(useDemo)
  components/ui.tsx       세그먼트 · 폰 프레임 · 슬라이더 · 타이머
  lib/motion.tsx          이징 · 슬로우 모션 · 애니메이션 헬퍼
  guides/NN-id/           가이드 하나 = 폴더 하나 (meta.ts · index.tsx · css · cards/)
```

새 가이드는 `src/guides/` 아래에 폴더를 하나 만들면 사이드바에 자동으로 추가돼요.

## 만든 기술

React 19 · TypeScript · Vite. 외부 UI 라이브러리 없이 CSS와 Web Animations API로 만들었어요.

## 참고 · 라이선스

- 서체: [Pretendard](https://github.com/orioncactus/pretendard) — SIL Open Font License 1.1 (`src/styles/fonts/LICENSE-Pretendard.txt`)
- UX 법칙 참고: [Laws of UX](https://lawsofux.com) (Jon Yablonski)
- 디자인 점검: 디자인 마감 점검에 [unslop](https://github.com/heydamir/unslop)(Damir Sokolovsky, @heydamir, CC BY 4.0)을 참고했어요.
- 화면 속 브랜드·상품·사람 이름은 모두 예시용 가상 데이터예요.
