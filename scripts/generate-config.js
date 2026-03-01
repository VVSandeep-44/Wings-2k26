const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config.js");
const registrationApiUrl = process.env.REGISTRATION_API_URL || "/api/register";
const sentryBrowserDsn = process.env.SENTRY_BROWSER_DSN || "";

const configContent = `window.WINGS_ENV = {
  REGISTRATION_API_URL: ${JSON.stringify(registrationApiUrl)},
  SENTRY_BROWSER_DSN: ${JSON.stringify(sentryBrowserDsn)}
};
`;

fs.writeFileSync(configPath, configContent, "utf8");
console.log(
  `Generated config.js with REGISTRATION_API_URL=${registrationApiUrl} and SENTRY_BROWSER_DSN=${
    sentryBrowserDsn ? "set" : "not-set"
  }`
);
