const path = require("path");
const https = require("https");
const dns = require("dns").promises;
const express = require("express");
const cors = require("cors");
const validator = require("validator");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const {
  initDatabase,
  createRegistration,
  updateRegistrationById,
  listRegistrations,
  deleteRegistrationById,
} = require("./db");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "WingsAdmin@2026";
const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN || "wings_secure_admin_session_token_2026";
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

const buildAdminCookie = (value, maxAge) => {
  const secureFlag = IS_PRODUCTION ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; SameSite=Strict${secureFlag}; Max-Age=${maxAge}`;
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
    allowedHeaders: ["Content-Type", "x-admin-password"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

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

const requireAdminAuth = (req, res, next) => {
  const providedPassword =
    req.headers["x-admin-password"] || req.query.password || "";

  if (hasValidAdminSession(req) || providedPassword === ADMIN_PASSWORD) {
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

const validatePhoneInBackground = (phone) => {
  const normalized = normalizePhone(phone);

  if (!/^\+?[0-9]{10,15}$/.test(normalized)) {
    return { valid: false, reason: "Phone number format is invalid" };
  }

  const parsed = parsePhoneNumberFromString(normalized, "IN");

  if (!parsed || !parsed.isValid()) {
    return { valid: false, reason: "Phone number could not be verified" };
  }

  return { valid: true, reason: "Phone verified", e164: parsed.number };
};

const sendInvitationEmail = async ({ name, email, regId, events }) => {
  if (!BREVO_API_KEY) {
    return {
      sent: false,
      reason:
        "Brevo is not configured (set BREVO_API_KEY or BREVO_SMTP_KEY in environment)",
    };
  }

  const eventsText = Array.isArray(events) ? events.join(", ") : String(events || "");

  const htmlContent = `
    <p>Hi <strong>${validator.escape(name)}</strong>,</p>
    <p>Your registration for <strong>${EVENT_NAME}</strong> is confirmed.</p>
    <p>
      <strong>Registration ID:</strong> ${validator.escape(regId)}<br/>
      <strong>Event Date:</strong> ${EVENT_DATE_TEXT}<br/>
      <strong>Venue:</strong> ${EVENT_VENUE_TEXT}<br/>
      <strong>Selected Events:</strong> ${validator.escape(eventsText)}
    </p>
    <p>We look forward to seeing you!</p>
  `;

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
  regId,
  events,
}) => {
  try {
    const [emailResult, phoneResult] = await Promise.all([
      validateEmailInBackground(email),
      Promise.resolve(validatePhoneInBackground(phone)),
    ]);

    if (!emailResult.valid || !phoneResult.valid) {
      const reasons = [emailResult.reason, phoneResult.reason]
        .filter(Boolean)
        .join("; ");

      await updateRegistrationById(id, {
        validationStatus: "failed",
        validationMessage: reasons,
        invitationStatus: "skipped",
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    await updateRegistrationById(id, {
      validationStatus: "verified",
      validationMessage: "Email and phone verified",
      updatedAt: new Date().toISOString(),
    });

    const invitation = await sendInvitationEmail({ name, email, regId, events });

    await updateRegistrationById(id, {
      invitationStatus: invitation.sent ? "sent" : "failed",
      invitationSentAt: invitation.sent ? new Date().toISOString() : null,
      validationMessage: invitation.sent
        ? "Email and phone verified; invitation sent"
        : `Email and phone verified; invitation failed: ${invitation.reason}`,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    await updateRegistrationById(id, {
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

  if (password !== ADMIN_PASSWORD) {
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
        regId: String(payload.regId).trim(),
        events: eventsArray,
      });
    });

    return res.status(201).json({
      success: true,
      id: insertResult.lastID,
      message:
        "Registration saved. Email and phone verification is running in background. Invitation mail will be sent after verification.",
    });
  } catch (error) {
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
      regId: row.regId,
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
    return res.status(500).json({
      success: false,
      message: "Could not delete registration",
      error: error.message,
    });
  }
});

app.get("/admin", requireAdminSession, (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin-login", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(__dirname, "admin-login.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
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
    console.error("Failed to initialize database:", error.message);
    process.exit(1);
  }
};

bootstrap();
