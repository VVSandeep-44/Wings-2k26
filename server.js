require("dotenv").config();

const NEW_RELIC_ENABLED =
  String(process.env.NEW_RELIC_ENABLED || "true").toLowerCase() !== "false" &&
  Boolean(process.env.NEW_RELIC_LICENSE_KEY);

if (NEW_RELIC_ENABLED) {
  process.env.NEW_RELIC_NO_CONFIG_FILE = process.env.NEW_RELIC_NO_CONFIG_FILE || "true";
  process.env.NEW_RELIC_APP_NAME =
    process.env.NEW_RELIC_APP_NAME || "WINGS 2k26 API";

  try {
    require("newrelic");
    console.log("New Relic agent initialized.");
  } catch (error) {
    console.warn(`New Relic initialization skipped: ${error.message}`);
  }
}

const path = require("path");
const https = require("https");
const crypto = require("crypto");
const dns = require("dns").promises;
const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const validator = require("validator");
const { buildInvitationEmailHtml } = require("./templates/invitationEmailTemplate");
const {
  initDatabase,
  createRegistration,
  updateRegistrationById,
  updateRegistrationByRegId,
  listRegistrations,
  getRegistrationByRegId,
  deleteRegistrationById,
  deleteRegistrationByRegId,
  softDeleteRegistrationByRegId,
  restoreRegistrationByRegId,
  getRegistrationControl,
  setRegistrationControl,
} = require("./db");
const nodeHtmlToImage = require('node-html-to-image');
const buildAdmitCardHtml = require('./templates/admitCardTemplate');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ADMIN_PASSWORD = String(
  process.env.ADMIN_PASSWORD || "WingsAdmin@2026"
).trim();
const ADMIN_PASSWORD_LEGACY = String(process.env.ADMIN_PASSWORD_LEGACY || "").trim();
const ADMIN_SESSION_TOKEN = String(
  process.env.ADMIN_SESSION_TOKEN || "wings_secure_admin_session_token_2026"
).trim();
const ADMIN_SESSION_COOKIE = "wings_admin_session";
const MAX_PORT_RETRIES = 10;
const TEMP_INVITE_FROM_EMAIL = "226t1a0544sandeep@pydah.edu.in";
const INVITE_FROM_EMAIL =
  process.env.INVITE_FROM_EMAIL || TEMP_INVITE_FROM_EMAIL;
const BREVO_API_KEY =
  process.env.BREVO_API_KEY ||
  process.env.BREVO_SMTP_KEY ||
  process.env.SMTP_PASS ||
  process.env.SMTP_PASSWORD ||
  "";
const normalizeOrigin = (origin) =>
  String(origin || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();

const parseOriginFromUrl = (value) => {
  try {
    return normalizeOrigin(new URL(String(value || "").trim()).origin);
  } catch (_error) {
    return "";
  }
};

const configuredCorsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const registerUrlOrigin = parseOriginFromUrl(process.env.EVENT_REGISTER_URL || "");

const CORS_ORIGINS = Array.from(
  new Set([
    ...configuredCorsOrigins,
    ...(registerUrlOrigin ? [registerUrlOrigin] : []),
  ])
);
const EVENT_NAME = "WINGS 2k26";
const EVENT_DATE_TEXT = "March 13-14, 2026";
const EVENT_VENUE_TEXT = "Pydah College of Engineering";
const EVENT_REGISTER_URL =
  process.env.EVENT_REGISTER_URL || "https://wings-2k26.onrender.com/#register";
const DEFAULT_PUBLIC_ORIGIN = "https://wings-2k26.onrender.com";
const PUBLIC_APP_BASE_URL =
  parseOriginFromUrl(process.env.PUBLIC_APP_BASE_URL || "") ||
  parseOriginFromUrl(EVENT_REGISTER_URL) ||
  DEFAULT_PUBLIC_ORIGIN;
const REGISTRATION_VIEW_BASE_URL =
  String(process.env.REGISTRATION_VIEW_BASE_URL || `${PUBLIC_APP_BASE_URL}/registration`)
    .trim()
    .replace(/\/+$/, "");
const REGISTRATION_VIEW_SECRET = String(
  process.env.REGISTRATION_VIEW_SECRET || ADMIN_SESSION_TOKEN
).trim();
const SENTRY_DSN = process.env.SENTRY_DSN || "";
const SENTRY_ENVIRONMENT =
  process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
const SENTRY_TRACES_SAMPLE_RATE = Number(
  process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1
);
const SENTRY_ENABLED = Boolean(SENTRY_DSN);

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE)
      ? SENTRY_TRACES_SAMPLE_RATE
      : 0.1,
  });

  console.log("Sentry initialized.");
}

const reportError = (error, context = {}) => {
  if (!SENTRY_ENABLED || !error) {
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    Sentry.captureException(error);
  });
};

const buildAdminCookie = (value, maxAge) => {
  const secureFlag = IS_PRODUCTION ? "; Secure" : "";
  const sameSite = IS_PRODUCTION ? "None" : "Strict";
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; SameSite=${sameSite}${secureFlag}; Max-Age=${maxAge}`;
};

if (!process.env.ADMIN_PASSWORD) {
  console.warn("ADMIN_PASSWORD is not set. Using fallback value; set env var in production.");
}

if (!process.env.ADMIN_SESSION_TOKEN) {
  console.warn(
    "ADMIN_SESSION_TOKEN is not set. Using fallback value; set env var in production."
  );
}

if (!BREVO_API_KEY) {
  console.warn(
    "Brevo API key is not configured. Invitation emails will fail until BREVO_API_KEY (or BREVO_SMTP_KEY) is set."
  );
}

if (!process.env.REGISTRATION_VIEW_SECRET) {
  console.warn(
    "REGISTRATION_VIEW_SECRET is not set. Falling back to ADMIN_SESSION_TOKEN for QR view links."
  );
}

const buildRegistrationViewToken = ({ regId, email }) => {
  const normalizedRegId = String(regId || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const payload = `${normalizedRegId}|${normalizedEmail}`;
  return crypto
    .createHmac("sha256", REGISTRATION_VIEW_SECRET)
    .update(payload)
    .digest("hex");
};

const isValidRegistrationViewToken = ({ regId, email, token }) => {
  const expected = buildRegistrationViewToken({ regId, email });
  const provided = String(token || "").trim();

  if (!provided || expected.length !== provided.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(provided, "utf8")
    );
  } catch (_error) {
    return false;
  }
};

const requestJson = (method, url, payload, headers = {}) =>
  new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const hasBody = payload !== undefined && payload !== null;
    const requestBody = hasBody ? JSON.stringify(payload) : "";
    const requestHeaders = {
      ...headers,
    };

    if (hasBody) {
      requestHeaders["Content-Type"] = "application/json";
      requestHeaders["Content-Length"] = Buffer.byteLength(requestBody);
    }

    const request = https.request(
      {
        protocol: requestUrl.protocol,
        hostname: requestUrl.hostname,
        port: requestUrl.port || undefined,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method,
        headers: requestHeaders,
      },
      (response) => {
        let responseBody = "";

        response.on("data", (chunk) => {
          responseBody += chunk;
        });

        response.on("end", () => {
          let parsedData = null;

          if (responseBody) {
            try {
              parsedData = JSON.parse(responseBody);
            } catch (_parseError) {
              parsedData = null;
            }
          }

          resolve({
            ok: Number(response.statusCode) >= 200 && Number(response.statusCode) < 300,
            statusCode: Number(response.statusCode) || 0,
            statusText: response.statusMessage || "",
            data: parsedData,
            rawBody: responseBody,
          });
        });
      }
    );

    request.on("error", reject);

    if (hasBody) {
      request.write(requestBody);
    }

    request.end();
  });

const postJson = (url, payload, headers = {}) =>
  requestJson("POST", url, payload, headers);

const getJson = (url, headers = {}) => requestJson("GET", url, null, headers);

app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!normalizedOrigin) {
        return callback(null, true);
      }

      const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
        normalizedOrigin
      );

      if (
        CORS_ORIGINS.length === 0 ||
        CORS_ORIGINS.includes(normalizedOrigin) ||
        (!IS_PRODUCTION && isLocalDevOrigin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "x-admin-password"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "client", "dist")));

const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split("=");
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
};

const hasValidAdminSession = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[ADMIN_SESSION_COOKIE] === ADMIN_SESSION_TOKEN;
};

const isValidAdminPassword = (value) => {
  const input = String(value || "").trim();

  if (!input) {
    return false;
  }

  return input === ADMIN_PASSWORD || (ADMIN_PASSWORD_LEGACY && input === ADMIN_PASSWORD_LEGACY);
};

const requireAdminAuth = (req, res, next) => {
  const providedPassword =
    req.headers["x-admin-password"] || req.query.password || "";

  if (hasValidAdminSession(req) || isValidAdminPassword(providedPassword)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "Unauthorized admin access",
  });
};

const requireAdminSession = (req, res, next) => {
  if (hasValidAdminSession(req)) {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized admin access",
    });
  }

  return res.redirect("/admin-login");
};

const requiredFields = [
  "name",
  "email",
  "phone",
  "college",
  "department",
  "year",
  "events",
  "participationType",
  "paymentReference",
  "regId",
  "createdAt",
];

const TECHNICAL_EVENTS = new Set([
  "project-expo",
  "circuitry",
  "robotics",
  "web-planting-ai",
  "techno-quiz",
  "debugging",
  "startup-pitching",
  "paper-presentations",
]);

const TECHNICAL_EVENTS_REQUIRING_DETAILS = new Set([
  "project-expo",
  "startup-pitching",
  "paper-presentations",
]);

const normalizeEventDetails = (rawDetails, selectedEvents) => {
  if (!rawDetails || typeof rawDetails !== "object" || Array.isArray(rawDetails)) {
    return {};
  }

  const normalized = {};
  selectedEvents.forEach((event) => {
    if (!TECHNICAL_EVENTS.has(event)) {
      return;
    }

    const details = rawDetails[event];
    if (!details || typeof details !== "object" || Array.isArray(details)) {
      return;
    }

    const topic = String(details.topic || "").trim();
    const abstract = String(details.abstract || "").trim();
    const abstractPdfName = String(details.abstractPdfName || "").trim();
    const abstractPdfDataUrl = String(details.abstractPdfDataUrl || "").trim();
    const hasPdfData = abstractPdfDataUrl.startsWith("data:application/pdf;base64,");

    if (topic || abstract || abstractPdfName || hasPdfData) {
      normalized[event] = {
        topic,
        abstract,
        abstractPdfName,
        abstractPdfDataUrl: hasPdfData ? abstractPdfDataUrl : "",
      };
    }
  });

  return normalized;
};

const normalizePhone = (phone) => String(phone || "").replace(/[\s-]/g, "").trim();

const validateEmailInBackground = async (email) => {
  if (!validator.isEmail(email)) {
    return { valid: false, reason: "Email format is invalid" };
  }

  const domain = email.split("@")[1];

  if (!domain) {
    return { valid: false, reason: "Email domain is missing" };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: "Email domain does not accept mail" };
    }
  } catch (_error) {
    return { valid: false, reason: "Email domain verification failed" };
  }

  return { valid: true, reason: "Email verified" };
};

// Helper to generate admit card image as buffer
async function generateAdmitCardImage({ name, regId, college, department, year, events, detailsViewUrl }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(detailsViewUrl)}`;
  const html = buildAdmitCardHtml({
    name,
    regId,
    college,
    department,
    year,
    events: Array.isArray(events) ? events.join(', ') : events,
    qrUrl
  });
  const [image] = await nodeHtmlToImage({ html, type: 'png', quality: 100, encoding: 'buffer' });
  return image;
}

// Modified sendInvitationEmail to attach admit card image
async function sendInvitationEmailWithAdmitCard({
  name,
  email,
  phone,
  college,
  department,
  year,
  regId,
  events,
  participationType,
  teamName,
  teamMembers,
  paymentReference,
}) {
  if (!BREVO_API_KEY) {
    return {
      sent: false,
      reason:
        "Brevo is not configured (set BREVO_API_KEY or BREVO_SMTP_KEY in environment)",
    };
  }

  const viewToken = buildRegistrationViewToken({ regId, email });
  const detailsViewUrl = `${REGISTRATION_VIEW_BASE_URL}/${encodeURIComponent(
    String(regId || "").trim()
  )}?token=${encodeURIComponent(viewToken)}`;

  // Generate admit card image
  let admitCardImageBuffer;
  try {
    admitCardImageBuffer = await generateAdmitCardImage({
      name,
      regId,
      college,
      department,
      year,
      events,
      detailsViewUrl
    });
  } catch (err) {
    return { sent: false, reason: 'Failed to generate admit card image: ' + err.message };
  }

  const htmlContent = `<div style='font-family:Segoe UI,Arial,sans-serif;font-size:16px;color:#1f2940;'>
    <p>Dear <b>${name}</b>,</p>
    <p>Congratulations! Please find your WINGS 2k26 admit card attached below. We look forward to seeing you at the event.</p>
    <p>Regards,<br/>WINGS 2k26 Organizing Team</p>
  </div>`;

  try {
    const response = await postJson(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { email: INVITE_FROM_EMAIL, name: EVENT_NAME },
        to: [{ email }],
        subject: `Your Admit Card - ${EVENT_NAME}`,
        htmlContent,
        attachment: [
          {
            name: `WINGS-2k26-AdmitCard-${regId}.png`,
            content: admitCardImageBuffer.toString('base64'),
            contentType: 'image/png',
          },
        ],
      },
      {
        "api-key": BREVO_API_KEY,
      }
    );

    if (!response.ok) {
      const brevoError =
        response.data?.message ||
        response.data?.code ||
        response.statusText ||
        response.rawBody ||
        "Invitation mail failed";

      return {
        sent: false,
        reason: brevoError,
      };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error.message || "Invitation mail failed",
    };
  }
}

const runRegistrationValidationWorkflow = async ({
  id,
  name,
  email,
  phone,
  college,
  department,
  year,
  regId,
  events,
  participationType,
  teamName,
  teamMembers,
  paymentReference,
}) => {
  const syncRegistrationStatus = async (updates) => {
    const byId = await updateRegistrationById(id, updates);

    if (byId?.changes) {
      return byId;
    }

    if (regId) {
      return updateRegistrationByRegId(regId, updates);
    }

    return byId;
  };

  try {
    const emailResult = await validateEmailInBackground(email);

    if (!emailResult.valid) {
      const reasons = [emailResult.reason].filter(Boolean).join("; ");

      await syncRegistrationStatus({
        validationStatus: "failed",
        validationMessage: reasons,
        invitationStatus: "skipped",
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    await syncRegistrationStatus({
      validationStatus: "verified",
      validationMessage: "Email verified",
      updatedAt: new Date().toISOString(),
    });

    const invitation = await sendInvitationEmailWithAdmitCard({
      name,
      email,
      phone,
      college,
      department,
      year,
      regId,
      events,
      participationType,
      teamName,
      teamMembers,
      paymentReference,
    });

    await syncRegistrationStatus({
      invitationStatus: invitation.sent ? "sent" : "failed",
      invitationSentAt: invitation.sent ? new Date().toISOString() : null,
      validationMessage: invitation.sent
        ? "Email verified; invitation sent"
        : `Email verified; invitation failed: ${invitation.reason}`,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    reportError(error, {
      step: "runRegistrationValidationWorkflow",
      registrationId: id,
      email,
    });

    await syncRegistrationStatus({
      validationStatus: "failed",
      validationMessage: `Background verification failed: ${error.message}`,
      invitationStatus: "failed",
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "WINGS 2k26 API" });
});

app.get("/api/health/mail", async (_req, res) => {
  const hasApiKey = Boolean(BREVO_API_KEY);
  const hasFromEmail = Boolean(INVITE_FROM_EMAIL);
  const usingFallbackFromEmail = !process.env.INVITE_FROM_EMAIL;

  if (!hasApiKey || !hasFromEmail) {
    return res.status(503).json({
      status: "error",
      provider: "brevo",
      configured: false,
      details: {
        hasApiKey,
        hasFromEmail,
        usingFallbackFromEmail,
      },
      message:
        "Mail is not fully configured. Set BREVO_API_KEY (or BREVO_SMTP_KEY) and INVITE_FROM_EMAIL.",
    });
  }

  try {
    const accountCheck = await getJson("https://api.brevo.com/v3/account", {
      "api-key": BREVO_API_KEY,
      Accept: "application/json",
    });

    if (!accountCheck.ok) {
      return res.status(502).json({
        status: "error",
        provider: "brevo",
        configured: true,
        details: {
          hasApiKey,
          hasFromEmail,
          usingFallbackFromEmail,
        },
        message:
          accountCheck.data?.message ||
          accountCheck.data?.code ||
          accountCheck.statusText ||
          "Brevo API check failed",
      });
    }

    return res.json({
      status: "ok",
      provider: "brevo",
      configured: true,
      details: {
        hasApiKey,
        hasFromEmail,
        usingFallbackFromEmail,
      },
      accountEmail: accountCheck.data?.email || null,
      message: "Brevo configuration is valid",
    });
  } catch (error) {
    reportError(error, { route: "/api/health/mail", method: "GET" });

    return res.status(502).json({
      status: "error",
      provider: "brevo",
      configured: true,
      details: {
        hasApiKey,
        hasFromEmail,
        usingFallbackFromEmail,
      },
      message: error.message || "Brevo API check failed",
    });
  }
});

app.post("/api/admin-login", (req, res) => {
  const password = String(req.body?.password || "").trim();

  if (!isValidAdminPassword(password)) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin password",
    });
  }

  res.setHeader(
    "Set-Cookie",
    buildAdminCookie(ADMIN_SESSION_TOKEN, 14400)
  );

  return res.json({ success: true, message: "Admin session started" });
});

app.post("/api/admin-logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    buildAdminCookie("", 0)
  );

  return res.json({ success: true, message: "Logged out" });
});

app.get("/api/admin-session", (req, res) => {
  if (!hasValidAdminSession(req)) {
    return res.status(401).json({
      success: false,
      message: "No active admin session",
    });
  }

  return res.json({ success: true, authenticated: true });
});

app.get("/api/registration-status", async (_req, res) => {
  try {
    const status = await getRegistrationControl();
    return res.json({
      success: true,
      isOpen: status.isOpen !== false,
      reason: status.reason || "",
      updatedAt: status.updatedAt || null,
      updatedBy: status.updatedBy || "system",
    });
  } catch (error) {
    reportError(error, { route: "/api/registration-status", method: "GET" });
    return res.status(500).json({
      success: false,
      message: "Could not fetch registration status",
      error: error.message,
    });
  }
});

app.get("/api/admin/registration-status", requireAdminAuth, async (_req, res) => {
  try {
    const status = await getRegistrationControl();
    return res.json({
      success: true,
      isOpen: status.isOpen !== false,
      reason: status.reason || "",
      updatedAt: status.updatedAt || null,
      updatedBy: status.updatedBy || "system",
    });
  } catch (error) {
    reportError(error, { route: "/api/admin/registration-status", method: "GET" });
    return res.status(500).json({
      success: false,
      message: "Could not fetch admin registration status",
      error: error.message,
    });
  }
});

app.patch("/api/admin/registration-status", requireAdminAuth, async (req, res) => {
  const requestedIsOpen = req.body?.isOpen;

  if (typeof requestedIsOpen !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isOpen must be a boolean",
    });
  }

  const requestedReason = String(req.body?.reason || "").trim();
  const requestedBy = String(req.body?.updatedBy || "admin").trim() || "admin";

  try {
    const updated = await setRegistrationControl({
      isOpen: requestedIsOpen,
      reason: requestedIsOpen ? "" : requestedReason,
      updatedBy: requestedBy,
    });

    return res.json({
      success: true,
      message: updated.isOpen
        ? "Registrations are now open"
        : "Registrations are now closed",
      ...updated,
    });
  } catch (error) {
    reportError(error, { route: "/api/admin/registration-status", method: "PATCH" });
    return res.status(500).json({
      success: false,
      message: "Could not update registration status",
      error: error.message,
    });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const registrationStatus = await getRegistrationControl();
    if (registrationStatus.isOpen === false) {
      return res.status(403).json({
        success: false,
        message:
          registrationStatus.reason ||
          "Registrations are currently closed by the admin.",
      });
    }
  } catch (statusError) {
    reportError(statusError, { route: "/api/register", stage: "status-check" });
    return res.status(500).json({
      success: false,
      message: "Could not verify registration availability",
      error: statusError.message,
    });
  }

  const payload = req.body;

  const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  const normalizedPhone = normalizePhone(payload.phone);
  const isPhoneValid = /^\+?[0-9]{10,15}$/.test(normalizedPhone);
  if (!isPhoneValid) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  const normalizedEmail = String(payload.email).trim().toLowerCase();
  if (!validator.isEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }

  const participationType = String(payload.participationType || "individual")
    .trim()
    .toLowerCase();
  const teamName = String(payload.teamName || "").trim();
  const submittedTeamMembers = Array.isArray(payload.teamMembers)
    ? payload.teamMembers
    : [];
  const teamMembers = submittedTeamMembers
    .map((member) => String(member || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!["individual", "team"].includes(participationType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid participation type",
    });
  }

  if (participationType === "team") {
    if (teamMembers.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Team registration requires at least 2 members and allows up to 3",
      });
    }
  }

  const timestamp = new Date().toISOString();

  const eventsAsString = Array.isArray(payload.events)
    ? payload.events.join(",")
    : String(payload.events || "");

  const eventsArray = Array.isArray(payload.events)
    ? payload.events
    : String(payload.events || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const eventDetails = normalizeEventDetails(payload.eventDetails, eventsArray);
  const technicalEventsSelected = eventsArray.filter((event) =>
    TECHNICAL_EVENTS_REQUIRING_DETAILS.has(event)
  );
  const missingTechnicalEventDetails = technicalEventsSelected.filter((event) => {
    const details = eventDetails[event];
    return !details || !details.topic || !details.abstractPdfDataUrl;
  });

  if (missingTechnicalEventDetails.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Technical event details are required for: ${missingTechnicalEventDetails.join(", ")}`,
    });
  }

  try {
    const insertResult = await createRegistration({
      name: String(payload.name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      college: String(payload.college).trim(),
      department: String(payload.department).trim(),
      year: String(payload.year).trim(),
      events: eventsArray,
      eventsText: eventsAsString,
      participationType,
      teamName: participationType === "team" ? teamName : "",
      teamMembers:
        participationType === "team"
          ? teamMembers
          : [String(payload.name).trim()],
      eventDetails,
      paymentReference: String(payload.paymentReference).trim(),
      paymentStatus: "submitted",
      paymentVerifiedBy: "",
      paymentVerifiedAt: null,
      regId: String(payload.regId).trim(),
      createdAt: String(payload.createdAt).trim(),
      validationStatus: "pending",
      validationMessage: "Verification in progress",
      invitationStatus: "queued",
      invitationSentAt: null,
      updatedAt: timestamp,
    });

    setImmediate(() => {
      runRegistrationValidationWorkflow({
        id: insertResult.lastID,
        name: String(payload.name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        college: String(payload.college).trim(),
        department: String(payload.department).trim(),
        year: String(payload.year).trim(),
        regId: String(payload.regId).trim(),
        events: eventsArray,
        participationType,
        teamName: participationType === "team" ? teamName : "",
        teamMembers:
          participationType === "team"
            ? teamMembers
            : [String(payload.name).trim()],
        paymentReference: String(payload.paymentReference).trim(),
      });
    });

    return res.status(201).json({
      success: true,
      id: insertResult.lastID,
      message:
        "Registration saved. Email and phone verification is running in background. Invitation mail will be sent after verification.",
    });
  } catch (error) {
    reportError(error, { route: "/api/register", method: "POST" });

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Registration ID already exists. Please resubmit.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not save registration",
      error: error.message,
    });
  }
});

app.get("/api/registrations", requireAdminAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const onlyDeleted = String(req.query.onlyDeleted || "").toLowerCase() === "true";

  try {
    const rows = await listRegistrations(limit, { onlyDeleted });
    const normalized = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      college: row.college,
      department: row.department,
      year: row.year,
      participationType: row.participationType,
      teamName: row.teamName,
      teamMembers: Array.isArray(row.teamMembers) ? row.teamMembers : [],
      regId: row.regId,
      paymentReference: row.paymentReference,
      paymentStatus: row.paymentStatus,
      paymentVerifiedBy: row.paymentVerifiedBy,
      paymentVerifiedAt: row.paymentVerifiedAt,
      createdAt: row.createdAt,
      validationStatus: row.validationStatus,
      validationMessage: row.validationMessage,
      invitationStatus: row.invitationStatus,
      invitationSentAt: row.invitationSentAt,
      isDeleted: row.isDeleted === true,
      deletedAt: row.deletedAt || null,
      deletedBy: row.deletedBy || "",
      updatedAt: row.updatedAt,
      eventDetails:
        row.eventDetails && typeof row.eventDetails === "object"
          ? row.eventDetails
          : {},
      events: Array.isArray(row.events)
        ? row.events
        : String(row.eventsText || "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
    }));

    return res.json({ success: true, count: normalized.length, data: normalized });
  } catch (error) {
    reportError(error, { route: "/api/registrations", method: "GET" });

    return res.status(500).json({
      success: false,
      message: "Could not fetch registrations",
      error: error.message,
    });
  }
});

app.get("/api/public/registrations/:regId", async (req, res) => {
  const regId = String(req.params.regId || "").trim();
  const token = String(req.query.token || "").trim();

  if (!regId || !token) {
    return res.status(400).json({
      success: false,
      message: "Registration ID and token are required",
    });
  }

  try {
    const row = await getRegistrationByRegId(regId);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    if (!isValidRegistrationViewToken({ regId: row.regId, email: row.email, token })) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const events = Array.isArray(row.events)
      ? row.events
      : String(row.eventsText || "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);

    return res.json({
      success: true,
      data: {
        name: row.name || "",
        email: row.email || "",
        phone: row.phone || "",
        college: row.college || "",
        department: row.department || "",
        year: row.year || "",
        regId: row.regId || "",
        participationType: row.participationType || "individual",
        teamName: row.teamName || "",
        teamMembers: Array.isArray(row.teamMembers) ? row.teamMembers : [],
        events,
        paymentReference: row.paymentReference || "",
        paymentStatus: row.paymentStatus || "submitted",
        paymentVerifiedAt: row.paymentVerifiedAt || null,
        validationStatus: row.validationStatus || "pending",
        invitationStatus: row.invitationStatus || "queued",
        createdAt: row.createdAt || null,
        eventDetails:
          row.eventDetails && typeof row.eventDetails === "object"
            ? row.eventDetails
            : {},
      },
    });
  } catch (error) {
    reportError(error, {
      route: "/api/public/registrations/:regId",
      method: "GET",
      regId,
    });

    return res.status(500).json({
      success: false,
      message: "Could not fetch registration details",
      error: error.message,
    });
  }
});

app.patch("/api/registrations/:id/payment-status", requireAdminAuth, async (req, res) => {
  const registrationId = Number(req.params.id);
  const requestedStatus = String(req.body?.paymentStatus || "")
    .trim()
    .toLowerCase();
  const verifier = String(req.body?.verifiedBy || "admin").trim() || "admin";

  if (!Number.isInteger(registrationId) || registrationId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration id",
    });
  }

  const allowedStatuses = ["pending", "submitted", "verified", "failed"];
  if (!allowedStatuses.includes(requestedStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid payment status. Allowed values: ${allowedStatuses.join(", ")}`,
    });
  }

  const updates = {
    paymentStatus: requestedStatus,
    paymentVerifiedBy:
      requestedStatus === "verified" || requestedStatus === "failed" ? verifier : "",
    paymentVerifiedAt:
      requestedStatus === "verified" || requestedStatus === "failed"
        ? new Date().toISOString()
        : null,
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await updateRegistrationById(registrationId, updates);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    return res.json({
      success: true,
      message: `Payment status updated to ${requestedStatus}`,
      id: registrationId,
      updates,
    });
  } catch (error) {
    reportError(error, {
      route: "/api/registrations/:id/payment-status",
      method: "PATCH",
      registrationId,
      requestedStatus,
    });

    return res.status(500).json({
      success: false,
      message: "Could not update payment status",
      error: error.message,
    });
  }
});

app.delete("/api/registrations/:id", requireAdminAuth, async (req, res) => {
  const registrationId = Number(req.params.id);

  if (!Number.isInteger(registrationId) || registrationId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration id",
    });
  }

  try {
    const result = await deleteRegistrationById(registrationId);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    return res.json({
      success: true,
      message: "Registration deleted successfully",
      deletedId: registrationId,
    });
  } catch (error) {
    reportError(error, {
      route: "/api/registrations/:id",
      method: "DELETE",
      registrationId,
    });

    return res.status(500).json({
      success: false,
      message: "Could not delete registration",
      error: error.message,
    });
  }
});

app.delete("/api/registrations/by-regid/:regId", requireAdminAuth, async (req, res) => {
  const registrationRegId = String(req.params.regId || "").trim();
  const deletedBy = String(req.query.deletedBy || "admin").trim() || "admin";

  if (!registrationRegId) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration ID",
    });
  }

  try {
    const result = await softDeleteRegistrationByRegId(registrationRegId, deletedBy);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    return res.json({
      success: true,
      message: "Registration moved to trash",
      deletedRegId: registrationRegId,
    });
  } catch (error) {
    reportError(error, {
      route: "/api/registrations/by-regid/:regId",
      method: "DELETE",
      registrationRegId,
    });

    return res.status(500).json({
      success: false,
      message: "Could not delete registration",
      error: error.message,
    });
  }
});

app.patch("/api/registrations/by-regid/:regId/restore", requireAdminAuth, async (req, res) => {
  const registrationRegId = String(req.params.regId || "").trim();
  const restoredBy = String(req.body?.restoredBy || "admin").trim() || "admin";

  if (!registrationRegId) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration ID",
    });
  }

  try {
    const result = await restoreRegistrationByRegId(registrationRegId, restoredBy);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: "Registration not found in trash",
      });
    }

    return res.json({
      success: true,
      message: "Registration restored successfully",
      restoredRegId: registrationRegId,
    });
  } catch (error) {
    reportError(error, {
      route: "/api/registrations/by-regid/:regId/restore",
      method: "PATCH",
      registrationRegId,
    });

    return res.status(500).json({
      success: false,
      message: "Could not restore registration",
      error: error.message,
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

app.use((error, req, res, _next) => {
  reportError(error, {
    route: req.originalUrl,
    method: req.method,
  });

  if (res.headersSent) {
    return;
  }

  if (error?.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Origin is not allowed by CORS. Add your frontend URL to CORS_ORIGINS.",
    });
  }

  if (!IS_PRODUCTION) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Unexpected server error",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unexpected server error",
  });
});

const startServer = (initialPort, retriesLeft = MAX_PORT_RETRIES) => {
  const server = app
    .listen(initialPort, () => {
      console.log(`WINGS backend running at http://localhost:${initialPort}`);
      console.log(`Admin dashboard: http://localhost:${initialPort}/admin`);
    })
    .on("error", (error) => {
      if (error.code === "EADDRINUSE" && retriesLeft > 0) {
        const nextPort = initialPort + 1;
        console.warn(
          `Port ${initialPort} is in use. Retrying on ${nextPort}...`
        );
        return startServer(nextPort, retriesLeft - 1);
      }

      reportError(error, {
        phase: "startServer",
        port: initialPort,
        retriesLeft,
      });

      console.error("Failed to start server:", error.message);
      process.exit(1);
    });

  return server;
};

const bootstrap = async () => {
  try {
    await initDatabase();
    startServer(PORT);
  } catch (error) {
    reportError(error, { phase: "bootstrap" });
    console.error("Failed to initialize database:", error.message);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  reportError(error, { phase: "unhandledRejection" });
  console.error("Unhandled rejection:", error.message);
});

process.on("uncaughtException", (error) => {
  reportError(error, { phase: "uncaughtException" });
  console.error("Uncaught exception:", error.message);
});

bootstrap();
