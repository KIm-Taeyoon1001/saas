# analytics-gsc-mcp

GA4(Google Analytics 4)와 Google Search Console 데이터를 조회하는 MCP 서버. 서비스 계정(Service Account) 방식으로 인증하므로 브라우저 로그인 없이 동작합니다.

## 제공 도구
- `ga4_run_report` — 기간별 트래픽/페이지뷰 등 리포트 조회
- `ga4_realtime_report` — 실시간 접속자 조회
- `gsc_list_sites` — 서비스 계정에 연결된 Search Console 속성 목록
- `gsc_search_analytics` — 검색어/페이지/국가/기기별 클릭수·노출수·CTR·순위 조회
- `gsc_list_sitemaps` — 제출된 sitemap 상태 조회

## 1. Google Cloud 준비 (최초 1회, 직접 하셔야 함)

1. https://console.cloud.google.com 에서 프로젝트 생성 (기존 프로젝트 있으면 재사용)
2. API 라이브러리에서 아래 2개 활성화
   - **Google Analytics Data API**
   - **Google Search Console API**
3. IAM 및 관리자 → 서비스 계정 → 서비스 계정 만들기
   - 이름은 자유롭게 (예: `analytics-mcp`)
   - 역할 부여는 생략해도 됩니다 (GA4/GSC 권한은 각 서비스에서 별도로 부여)
4. 생성된 서비스 계정 → 키 → 키 추가 → JSON → 다운로드
   - 이 JSON 파일이 인증에 사용되는 유일한 비밀키입니다. **절대 커밋하지 마세요.**

## 2. GA4에 서비스 계정 권한 부여

1. Google Analytics → 관리 → 속성 액세스 관리
2. `+` → 사용자 추가 → 서비스 계정 이메일 입력 (JSON 파일의 `client_email` 값, `...@...iam.gserviceaccount.com` 형식)
3. 역할: **뷰어(Viewer)** 로 충분

## 3. Search Console에 서비스 계정 권한 부여

1. Search Console → 설정 → 사용자 및 권한
2. 사용자 추가 → 서비스 계정 이메일 입력
3. 권한: **전체(Full)** 또는 **제한됨(Restricted)** (조회만 할 거면 제한됨으로 충분)

## 4. 설치

```bash
cd tools/analytics-gsc-mcp
npm install
```

다운로드한 JSON 키 파일을 이 폴더 밖(저장소 바깥)의 안전한 위치에 두고 경로를 기억해두세요.

## 5. Claude Code에 MCP 서버 등록

```bash
claude mcp add analytics-gsc \
  --env GOOGLE_APPLICATION_CREDENTIALS=/절대/경로/service-account-key.json \
  -- node /절대/경로/tools/analytics-gsc-mcp/src/index.js
```

또는 `.mcp.json` / Claude Desktop 설정에 직접 추가:

```json
{
  "mcpServers": {
    "analytics-gsc": {
      "command": "node",
      "args": ["/절대/경로/tools/analytics-gsc-mcp/src/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/절대/경로/service-account-key.json"
      }
    }
  }
}
```

## 6. 확인

등록 후 새 세션에서 "GA4 속성 123456789의 최근 7일 리포트 보여줘" 처럼 요청하면 `ga4_run_report` 도구가 호출됩니다.

## 참고
- 이 서버는 **읽기 전용(readonly)** 스코프만 사용합니다.
- AdSense는 공식 커넥터/MCP가 없어 별도 확장이 필요합니다. 필요해지면 `adsense.readonly` 스코프와 AdSense Management API를 추가해 같은 방식으로 붙일 수 있습니다.
