import { defineConfig } from "vitepress";

export default defineConfig({
  title: "RINK Docs",
  description:
    "Documentation for RINK Global Services — time-series forecasting platform.",
  cleanUrls: true,
  lastUpdated: true,
  appearance: "dark",

  head: [
    ["meta", { name: "theme-color", content: "#3b82f6" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "RINK Docs" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Guides, API reference, and deployment notes for the RINK forecasting platform.",
      },
    ],
    ["meta", { property: "og:url", content: "https://docs.rinkglobal.com" }],
  ],

  themeConfig: {
    logo: { src: "/rink-logo.png", alt: "RINK Global Services" },
    logoLink: "https://rinkglobal.com",
    siteTitle: "RINK Global Services",
    outline: { level: [2, 3], label: "On this page" },

    nav: [
      { text: "Guides", link: "/guides/", activeMatch: "^/guides/" },
      { text: "Security", link: "/security", activeMatch: "^/security" },
      { text: "API", link: "/api/", activeMatch: "^/api/" },
      { text: "Deploy", link: "/deployment", activeMatch: "^/deployment" },
      {
        text: "Links",
        items: [
          { text: "Open the app", link: "https://rinkglobal.com" },
          { text: "Status", link: "https://status.rinkglobal.com" },
          { text: "Contact", link: "https://rinkglobal.com/contact" },
        ],
      },
    ],

    sidebar: {
      "/": [
        {
          text: "Introduction",
          collapsed: false,
          items: [
            { text: "Welcome", link: "/" },
            { text: "Getting Started", link: "/getting-started" },
            { text: "Architecture", link: "/architecture" },
            { text: "Security & data protection", link: "/security" },
          ],
        },
        {
          text: "Guides",
          collapsed: false,
          items: [
            { text: "Overview", link: "/guides/" },
            { text: "Accounts & sign-in", link: "/guides/account" },
            { text: "Uploading data", link: "/guides/uploading" },
            { text: "Training models", link: "/guides/training" },
            { text: "Generating forecasts", link: "/guides/forecasting" },
            { text: "AI Assistant", link: "/guides/ai-assistant" },
          ],
        },
        {
          text: "Tools",
          collapsed: false,
          items: [
            { text: "Overview", link: "/guides/tools" },
            { text: "Anomaly Detection", link: "/guides/anomaly" },
            { text: "Churn Prediction", link: "/guides/churn" },
            { text: "Customer Segmentation", link: "/guides/segmentation" },
            { text: "A/B Test Analyzer", link: "/guides/abtest" },
            { text: "TSP", link: "/guides/tsp" },
            { text: "Vehicle Routing", link: "/guides/vrp" },
          ],
        },
        {
          text: "API Reference",
          collapsed: false,
          items: [
            { text: "Overview", link: "/api/" },
            { text: "Authentication", link: "/api/authentication" },
            { text: "Gateway endpoints", link: "/api/gateway" },
            { text: "ML service endpoints", link: "/api/ml-service" },
          ],
        },
        {
          text: "Operations",
          collapsed: false,
          items: [
            { text: "Deployment", link: "/deployment" },
            { text: "FAQ & Troubleshooting", link: "/faq" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/" },
      { icon: "linkedin", link: "https://linkedin.com/" },
      { icon: "x", link: "https://x.com/" },
    ],

    search: {
      provider: "local",
      options: {
        placeholder: "Search docs",
      },
    },

    editLink: {
      pattern:
        "https://github.com/rinkglobal/rink-saas-v3-ml/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message:
        "Made with ❤︎ by the RINK team · <a href=\"https://rinkglobal.com\">rinkglobal.com</a>",
      copyright: `© ${new Date().getFullYear()} RINK Global Services`,
    },
  },

  sitemap: {
    hostname: "https://docs.rinkglobal.com",
  },
});
