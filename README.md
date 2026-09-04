# 프리택스 (FreeTax)

프리랜서·1인사업자를 위한 무료 세금 계산기 및 정보 사이트. 순수 정적 HTML/CSS/JS (빌드 과정 없음).

## 페이지 구성
- `index.html` — 홈
- `withholding.html` — 3.3% 원천징수 계산기
- `income-tax.html` — 종합소득세 예상 계산기 (누진세율표 기반)
- `guide.html` — 프리랜서 세금 신고 가이드 (SEO/콘텐츠용)
- `about.html`, `privacy.html` — 소개 및 개인정보처리방침 (AdSense 심사 필수 페이지)

## 로컬 확인
빌드 도구 없이 정적 파일이라 그냥 브라우저로 `index.html`을 열거나, 아래처럼 로컬 서버로 확인:

```bash
python3 -m http.server 8080
```

## 배포 (GitHub Pages)
`.github/workflows/deploy-pages.yml`이 이 브랜치(및 main) push 시 자동으로 GitHub Pages에 배포합니다.

**최초 1회 수동 설정 필요**: 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 변경해야 워크플로우가 실제로 배포를 실행합니다. (Claude Code에서는 저장소 설정을 변경할 권한이 없어 이 부분은 직접 해주셔야 합니다.)

설정 후 배포 URL: `https://kim-taeyoon1001.github.io/saas/`

## AdSense 신청 전 체크리스트
- [ ] 개인정보처리방침(`privacy.html`) 게시 완료
- [ ] 실제 도메인 연결 여부 결정 (GitHub Pages 서브도메인도 가능하나 커스텀 도메인이 심사에 더 유리)
- [ ] 콘텐츠 추가 축적 (가이드 페이지 등 정보성 글 확충 권장)
- [ ] `assets/adsense.js` 또는 각 `.html`의 `ad-slot`에 발급받은 게시자 ID(`ca-pub-...`) 삽입

## 다음 확장 아이디어
- 4대보험 지역가입자 예상 계산기
- 부가가치세 간이과세자 계산기
- 업종별 경비율 조회 검색 기능
