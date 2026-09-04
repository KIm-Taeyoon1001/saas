import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { google } from "googleapis";
import { z } from "zod";
import { createAuth } from "./auth.js";

function normalizePropertyId(propertyId) {
  return propertyId.startsWith("properties/") ? propertyId : `properties/${propertyId}`;
}

function textResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err) {
  const message = err?.response?.data?.error?.message || err?.message || String(err);
  return { content: [{ type: "text", text: `오류: ${message}` }], isError: true };
}

export function createServer() {
  const auth = createAuth();
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });
  const searchConsole = google.searchconsole({ version: "v1", auth });

  const server = new McpServer({ name: "analytics-gsc-mcp", version: "1.0.0" });

  server.tool(
    "ga4_run_report",
    "GA4(Google Analytics 4) 속성에서 기간별 리포트를 조회합니다. 트래픽, 페이지뷰, 사용자 수 등을 확인할 때 사용하세요.",
    {
      propertyId: z.string().describe("GA4 속성 ID. 숫자만(예: 123456789) 또는 'properties/123456789' 형식"),
      startDate: z.string().describe("시작일 (YYYY-MM-DD 또는 'NdaysAgo', 'yesterday', 'today')"),
      endDate: z.string().describe("종료일 (YYYY-MM-DD 또는 'NdaysAgo', 'yesterday', 'today')"),
      dimensions: z.array(z.string()).optional().describe("예: ['date','pagePath','sessionDefaultChannelGroup']. 기본값 ['date']"),
      metrics: z.array(z.string()).optional().describe("예: ['activeUsers','screenPageViews','sessions']. 기본값 ['activeUsers','screenPageViews']"),
      limit: z.number().int().positive().max(1000).optional().describe("최대 행 수 (기본 50)"),
    },
    async ({ propertyId, startDate, endDate, dimensions, metrics, limit }) => {
      try {
        const res = await analyticsData.properties.runReport({
          property: normalizePropertyId(propertyId),
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: (dimensions?.length ? dimensions : ["date"]).map((name) => ({ name })),
            metrics: (metrics?.length ? metrics : ["activeUsers", "screenPageViews"]).map((name) => ({ name })),
            limit: String(limit ?? 50),
          },
        });
        return textResult(res.data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.tool(
    "ga4_realtime_report",
    "GA4 속성의 실시간(현재 접속자 기준) 데이터를 조회합니다.",
    {
      propertyId: z.string().describe("GA4 속성 ID. 숫자만 또는 'properties/...' 형식"),
      dimensions: z.array(z.string()).optional().describe("예: ['country','deviceCategory']. 기본값 없음(전체 합계)"),
      metrics: z.array(z.string()).optional().describe("기본값 ['activeUsers']"),
    },
    async ({ propertyId, dimensions, metrics }) => {
      try {
        const res = await analyticsData.properties.runRealtimeReport({
          property: normalizePropertyId(propertyId),
          requestBody: {
            dimensions: (dimensions ?? []).map((name) => ({ name })),
            metrics: (metrics?.length ? metrics : ["activeUsers"]).map((name) => ({ name })),
          },
        });
        return textResult(res.data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.tool(
    "gsc_list_sites",
    "이 서비스 계정에 연결(권한 부여)된 Search Console 속성 목록을 조회합니다.",
    {},
    async () => {
      try {
        const res = await searchConsole.sites.list({});
        return textResult(res.data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.tool(
    "gsc_search_analytics",
    "Search Console 검색 트래픽 데이터를 조회합니다. 검색어, 페이지, 국가, 기기별 클릭수/노출수/CTR/순위를 확인할 때 사용하세요.",
    {
      siteUrl: z.string().describe("Search Console에 등록된 속성 URL. 예: 'https://kim-taeyoon1001.github.io/saas/' 또는 'sc-domain:example.com'"),
      startDate: z.string().describe("시작일 YYYY-MM-DD"),
      endDate: z.string().describe("종료일 YYYY-MM-DD"),
      dimensions: z.array(z.enum(["query", "page", "country", "device", "date", "searchAppearance"])).optional()
        .describe("기본값 ['query']"),
      rowLimit: z.number().int().positive().max(1000).optional().describe("최대 행 수 (기본 25)"),
    },
    async ({ siteUrl, startDate, endDate, dimensions, rowLimit }) => {
      try {
        const res = await searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: dimensions?.length ? dimensions : ["query"],
            rowLimit: rowLimit ?? 25,
          },
        });
        return textResult(res.data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.tool(
    "gsc_list_sitemaps",
    "Search Console 속성에 제출된 sitemap 목록과 상태를 조회합니다.",
    {
      siteUrl: z.string().describe("Search Console에 등록된 속성 URL"),
    },
    async ({ siteUrl }) => {
      try {
        const res = await searchConsole.sitemaps.list({ siteUrl });
        return textResult(res.data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  return server;
}
