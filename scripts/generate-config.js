const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config.js");
const registrationApiUrl = process.env.REGISTRATION_API_URL || "/api/register";

const configContent = `window.WINGS_ENV = {
  REGISTRATION_API_URL: ${JSON.stringify(registrationApiUrl)}
};
`;

fs.writeFileSync(configPath, configContent, "utf8");
console.log(`Generated config.js with REGISTRATION_API_URL=${registrationApiUrl}`);
