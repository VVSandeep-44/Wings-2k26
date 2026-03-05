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
  deleteRegistrationById,
} = require("./db");

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
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const EVENT_NAME = "WINGS 2k26";
const EVENT_DATE_TEXT = "March 13-14, 2026";
const EVENT_VENUE_TEXT = "Pydah College of Engineering";
const EVENT_REGISTER_URL =
  process.env.EVENT_REGISTER_URL || "https://wings-2k26.onrender.com/#register";
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
      if (!origin) {
        return callback(null, true);
      }

      if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "x-admin-password"],
  })
);
app.use(express.json());
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

const sendInvitationEmail = async ({
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
  if (!BREVO_API_KEY) {
    return {
      sent: false,
      reason:
        "Brevo is not configured (set BREVO_API_KEY or BREVO_SMTP_KEY in environment)",
    };
  }

  const htmlContent = buildInvitationEmailHtml({
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
    eventName: EVENT_NAME,
    eventDateText: EVENT_DATE_TEXT,
    eventVenueText: EVENT_VENUE_TEXT,
    eventRegisterUrl: EVENT_REGISTER_URL,
  });

  try {
    const response = await postJson(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { email: INVITE_FROM_EMAIL, name: EVENT_NAME },
        to: [{ email }],
        subject: `Invitation confirmed - ${EVENT_NAME}`,
        htmlContent,
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
};

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

    const invitation = await sendInvitationEmail({
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

app.post("/api/register", async (req, res) => {
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
    if (!teamName) {
      return res.status(400).json({
        success: false,
        message: "Team name is required for team registration",
      });
    }

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
      paymentReference: String(payload.paymentReference).trim(),
      paymentStatus: "submitted",
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

  try {
    const rows = await listRegistrations(limit);
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
      createdAt: row.createdAt,
      validationStatus: row.validationStatus,
      validationMessage: row.validationMessage,
      invitationStatus: row.invitationStatus,
      invitationSentAt: row.invitationSentAt,
      updatedAt: row.updatedAt,
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
