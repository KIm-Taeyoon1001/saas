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

## 7. (선택) Vercel에 상시 배포하기

로컬 실행(위 5번) 대신, 컴퓨터를 꺼도 항상 켜져 있는 원격 MCP 서버로 쓰고 싶다면 Vercel에 배포할 수 있습니다. `api/mcp.js`가 그 진입점이며, HTTP 방식(Streamable HTTP)으로 동작합니다.

**주의**: 배포하면 인터넷에 공개된 URL이 생기므로 반드시 인증 토큰(`MCP_AUTH_TOKEN`)을 설정해야 합니다. 토큰이 없으면 서버가 모든 요청을 401로 거부하도록 만들어뒀습니다.

### 7-1. Vercel 프로젝트 생성
1. https://vercel.com 에서 GitHub 계정으로 로그인
2. "Add New" → "Project" → 이 저장소(`KIm-Taeyoon1001/saas`) 선택
3. **Root Directory**를 `tools/analytics-gsc-mcp`로 설정 (중요: 이거 안 하면 세금 계산기 사이트를 빌드하려고 시도해서 실패함)
4. Framework Preset은 "Other"로 두고 Deploy

### 7-2. 환경변수 설정
Vercel 프로젝트 → Settings → Environment Variables에 2개 추가:

| 이름 | 값 |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 다운로드한 서비스계정 JSON 파일의 **전체 내용**을 그대로 붙여넣기 (한 줄이어도 됨) |
| `MCP_AUTH_TOKEN` | 아무 랜덤 문자열. 터미널에서 `openssl rand -hex 32` 실행해서 생성하면 편함 |

설정 후 "Redeploy" 한 번 눌러줘야 반영됩니다.

### 7-3. 배포 URL 확인
배포 완료되면 `https://<프로젝트이름>.vercel.app/api/mcp` 형태의 URL이 생깁니다.

### 7-4. Claude Code에 원격으로 등록 (선택 A: 고정 토큰)
```bash
claude mcp add analytics-gsc-remote --transport http https://<프로젝트이름>.vercel.app/api/mcp --header "Authorization: Bearer <MCP_AUTH_TOKEN 값>"
```
(정확한 옵션명은 Claude Code 버전에 따라 다를 수 있어 `claude mcp add --help`로 확인 후 조정하세요.)

로컬용(`analytics-gsc`)과 원격용(`analytics-gsc-remote`)을 동시에 등록해두고 필요에 따라 골라 써도 됩니다.

## 8. claude.ai 앱에 "커넥터"로 등록하기 (선택 B: OAuth)

Claude Code CLI 없이 claude.ai 웹/모바일 앱에서 바로 쓰려면, 이 서버는 자체 OAuth 인증 서버 역할도 겸하도록 만들어져 있습니다 (`/authorize`, `/token`, `/register`, `/.well-known/oauth-*`). 별도 회원 시스템 없이, `MCP_AUTH_TOKEN` 값을 로그인 비밀번호처럼 한 번 입력하는 방식입니다.

1. claude.ai → 설정 → Connectors → "Add custom connector"
2. URL에 `https://<프로젝트이름>.vercel.app/api/mcp` 입력
3. 승인 화면이 뜨면 `MCP_AUTH_TOKEN` 값을 비밀번호 칸에 입력 → 허용
4. 이후 claude.ai 어디서든 (컴퓨터 없이, 모바일 앱 포함) 이 도구들을 바로 사용 가능

**보안 참고**: 발급된 접속 토큰은 90일간 유효합니다(자동 갱신 없음, 개인용 단순화). `MCP_AUTH_TOKEN` 값을 아는 사람만 승인 화면을 통과할 수 있으므로, 이 값을 아무에게나 공유하지 마세요.

## 참고
- 이 서버는 **읽기 전용(readonly)** 스코프만 사용합니다.
- AdSense는 공식 커넥터/MCP가 없어 별도 확장이 필요합니다. 필요해지면 `adsense.readonly` 스코프와 AdSense Management API를 추가해 같은 방식으로 붙일 수 있습니다.
- `GOOGLE_SERVICE_ACCOUNT_KEY`(Vercel 환경변수)와 `GOOGLE_APPLICATION_CREDENTIALS`(로컬 키 파일 경로)는 서로 다른 인증 방식입니다. 로컬 실행 시엔 후자만, Vercel 배포 시엔 전자만 사용하면 됩니다.
