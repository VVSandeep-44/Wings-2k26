const { MongoClient } = require("mongodb");

const DEFAULT_DB_NAME = "wings2k26";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const RAW_MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";
const LOCAL_MONGODB_URI = process.env.MONGODB_URI_LOCAL || "";
const BASE_DB_NAME = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;
const LOCAL_DB_NAME =
  process.env.LOCAL_MONGODB_DB_NAME ||
  (BASE_DB_NAME.endsWith("_local") ? BASE_DB_NAME : `${BASE_DB_NAME}_local`);
const MONGODB_URI = IS_PRODUCTION ? RAW_MONGODB_URI : (LOCAL_MONGODB_URI || RAW_MONGODB_URI);
const DB_NAME = IS_PRODUCTION ? BASE_DB_NAME : LOCAL_DB_NAME;
const REGISTRATIONS_COLLECTION = "registrations";
const COUNTERS_COLLECTION = "counters";
const SETTINGS_COLLECTION = "settings";
const REGISTRATION_CONTROL_DOC_ID = "registrationControl";
const ALLOW_IN_MEMORY_FALLBACK = !IS_PRODUCTION;

let client;
let database;
let registrationsCollection;
let inMemoryMode = false;
let inMemoryRegistrations = [];
let inMemoryCounter = 0;
let inMemoryRegistrationControl = {
  isOpen: true,
  reason: "",
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

const enableInMemoryMode = (reason) => {
  if (inMemoryMode) {
    return;
  }

  inMemoryMode = true;
  console.warn(
    `${reason} Running with in-memory database for local development.`
  );
};

const getRegistrationsCollection = () => {
  if (!registrationsCollection) {
    throw new Error("Database is not initialized");
  }

  return registrationsCollection;
};

const getNextRegistrationId = async () => {
  if (!database) {
    throw new Error("Database is not initialized");
  }

  const counters = database.collection(COUNTERS_COLLECTION);
  const counterResult = await counters.findOneAndUpdate(
    { _id: "registrationId" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return Number(counterResult.value?.value || 1);
};

const initDatabase = async () => {
  if (!MONGODB_URI) {
    if (!ALLOW_IN_MEMORY_FALLBACK) {
      throw new Error("MONGODB_URI is not configured");
    }

    enableInMemoryMode("MONGODB_URI is not configured.");
    return;
  }

  if (database && registrationsCollection) {
    return;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    database = client.db(DB_NAME);
    registrationsCollection = database.collection(REGISTRATIONS_COLLECTION);

    await registrationsCollection.createIndex({ regId: 1 }, { unique: true });
    await registrationsCollection.createIndex({ createdAt: -1 });

    console.log(`MongoDB connected: ${DB_NAME}.${REGISTRATIONS_COLLECTION}`);
    if (!IS_PRODUCTION) {
      console.log(
        `Local data isolation enabled. Using ${LOCAL_MONGODB_URI ? "MONGODB_URI_LOCAL" : "MONGODB_URI"} with DB ${DB_NAME}.`
      );
    }
  } catch (error) {
    if (!ALLOW_IN_MEMORY_FALLBACK) {
      throw error;
    }

    enableInMemoryMode(
      `MongoDB connection failed (${error.message || "unknown error"}).`
    );
  }
};

const createRegistration = async (registration) => {
  if (inMemoryMode) {
    inMemoryCounter += 1;

    if (
      inMemoryRegistrations.some(
        (entry) => entry.regId === registration.regId
      )
    ) {
      const duplicateError = new Error("Duplicate registration id");
      duplicateError.code = 11000;
      throw duplicateError;
    }

    const document = {
      id: inMemoryCounter,
      isDeleted: false,
      deletedAt: null,
      deletedBy: "",
      ...registration,
    };

    inMemoryRegistrations.unshift(document);
    return { lastID: inMemoryCounter };
  }

  const collection = getRegistrationsCollection();
  const nextId = await getNextRegistrationId();

  const document = {
    id: nextId,
    isDeleted: false,
    deletedAt: null,
    deletedBy: "",
    ...registration,
  };

  await collection.insertOne(document);
  return { lastID: nextId };
};

const updateRegistrationById = async (id, updates) => {
  if (inMemoryMode) {
    const numericId = Number(id);
    const index = inMemoryRegistrations.findIndex(
      (entry) => entry.id === numericId
    );

    if (index < 0) {
      return { changes: 0 };
    }

    inMemoryRegistrations[index] = {
      ...inMemoryRegistrations[index],
      ...updates,
    };

    return { changes: 1 };
  }

  const collection = getRegistrationsCollection();
  const updateResult = await collection.updateOne(
    { id: Number(id) },
    { $set: updates }
  );

  return { changes: updateResult.modifiedCount };
};

const updateRegistrationByRegId = async (regId, updates) => {
  if (inMemoryMode) {
    const normalizedRegId = String(regId || "").trim();
    const index = inMemoryRegistrations.findIndex(
      (entry) => entry.regId === normalizedRegId
    );

    if (index < 0) {
      return { changes: 0 };
    }

    inMemoryRegistrations[index] = {
      ...inMemoryRegistrations[index],
      ...updates,
    };

    return { changes: 1 };
  }

  const collection = getRegistrationsCollection();
  const updateResult = await collection.updateOne(
    { regId: String(regId || "").trim() },
    { $set: updates }
  );

  return { changes: updateResult.modifiedCount };
};

const listRegistrations = async (limit, options = {}) => {
  const onlyDeleted = Boolean(options.onlyDeleted);

  if (inMemoryMode) {
    const filtered = inMemoryRegistrations.filter((entry) => {
      const isDeleted = entry.isDeleted === true;
      return onlyDeleted ? isDeleted : !isDeleted;
    });
    return filtered.slice(0, Number(limit));
  }

  const collection = getRegistrationsCollection();
  const query = onlyDeleted
    ? { isDeleted: true }
    : { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };

  return collection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .project({ _id: 0 })
    .toArray();
};

const getRegistrationByRegId = async (regId) => {
  const normalizedRegId = String(regId || "").trim();
  if (!normalizedRegId) {
    return null;
  }

  if (inMemoryMode) {
    return (
      inMemoryRegistrations.find((entry) => entry.regId === normalizedRegId) ||
      null
    );
  }

  const collection = getRegistrationsCollection();
  return collection.findOne({ regId: normalizedRegId }, { projection: { _id: 0 } });
};

const getRegistrationControl = async () => {
  if (inMemoryMode) {
    return { ...inMemoryRegistrationControl };
  }

  if (!database) {
    throw new Error("Database is not initialized");
  }

  const settings = database.collection(SETTINGS_COLLECTION);
  const existing = await settings.findOne({ _id: REGISTRATION_CONTROL_DOC_ID });

  if (existing) {
    return {
      isOpen: existing.isOpen !== false,
      reason: String(existing.reason || ""),
      updatedAt: existing.updatedAt || null,
      updatedBy: String(existing.updatedBy || "system"),
    };
  }

  const defaults = {
    _id: REGISTRATION_CONTROL_DOC_ID,
    isOpen: true,
    reason: "",
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };

  await settings.updateOne(
    { _id: REGISTRATION_CONTROL_DOC_ID },
    { $setOnInsert: defaults },
    { upsert: true }
  );

  return {
    isOpen: true,
    reason: "",
    updatedAt: defaults.updatedAt,
    updatedBy: "system",
  };
};

const setRegistrationControl = async ({ isOpen, reason, updatedBy }) => {
  const payload = {
    isOpen: Boolean(isOpen),
    reason: String(reason || ""),
    updatedAt: new Date().toISOString(),
    updatedBy: String(updatedBy || "admin"),
  };

  if (inMemoryMode) {
    inMemoryRegistrationControl = { ...payload };
    return { ...inMemoryRegistrationControl };
  }

  if (!database) {
    throw new Error("Database is not initialized");
  }

  const settings = database.collection(SETTINGS_COLLECTION);
  await settings.updateOne(
    { _id: REGISTRATION_CONTROL_DOC_ID },
    { $set: payload },
    { upsert: true }
  );

  return { ...payload };
};

const deleteRegistrationById = async (id) => {
  if (inMemoryMode) {
    const numericId = Number(id);
    const initialLength = inMemoryRegistrations.length;
    inMemoryRegistrations = inMemoryRegistrations.filter(
      (entry) => entry.id !== numericId
    );

    return {
      changes:
        initialLength === inMemoryRegistrations.length ? 0 : 1,
    };
  }

  const collection = getRegistrationsCollection();
  const deleteResult = await collection.deleteOne({ id: Number(id) });
  return { changes: deleteResult.deletedCount };
};

const deleteRegistrationByRegId = async (regId) => {
  const normalizedRegId = String(regId || "").trim();
  if (!normalizedRegId) {
    return { changes: 0 };
  }

  if (inMemoryMode) {
    const initialLength = inMemoryRegistrations.length;
    inMemoryRegistrations = inMemoryRegistrations.filter(
      (entry) => String(entry.regId || "").trim() !== normalizedRegId
    );

    return {
      changes:
        initialLength === inMemoryRegistrations.length ? 0 : 1,
    };
  }

  const collection = getRegistrationsCollection();
  const deleteResult = await collection.deleteOne({ regId: normalizedRegId });
  return { changes: deleteResult.deletedCount };
};

const softDeleteRegistrationByRegId = async (regId, deletedBy = "admin") => {
  const normalizedRegId = String(regId || "").trim();
  const deletedAt = new Date().toISOString();
  const safeDeletedBy = String(deletedBy || "admin").trim() || "admin";

  if (!normalizedRegId) {
    return { changes: 0 };
  }

  if (inMemoryMode) {
    const index = inMemoryRegistrations.findIndex(
      (entry) => String(entry.regId || "").trim() === normalizedRegId && entry.isDeleted !== true
    );

    if (index < 0) {
      return { changes: 0 };
    }

    inMemoryRegistrations[index] = {
      ...inMemoryRegistrations[index],
      isDeleted: true,
      deletedAt,
      deletedBy: safeDeletedBy,
      updatedAt: deletedAt,
    };

    return { changes: 1 };
  }

  const collection = getRegistrationsCollection();
  const updateResult = await collection.updateOne(
    { regId: normalizedRegId, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
    {
      $set: {
        isDeleted: true,
        deletedAt,
        deletedBy: safeDeletedBy,
        updatedAt: deletedAt,
      },
    }
  );

  return { changes: updateResult.modifiedCount };
};

const restoreRegistrationByRegId = async (regId, restoredBy = "admin") => {
  const normalizedRegId = String(regId || "").trim();
  const restoredAt = new Date().toISOString();
  const safeRestoredBy = String(restoredBy || "admin").trim() || "admin";

  if (!normalizedRegId) {
    return { changes: 0 };
  }

  if (inMemoryMode) {
    const index = inMemoryRegistrations.findIndex(
      (entry) => String(entry.regId || "").trim() === normalizedRegId && entry.isDeleted === true
    );

    if (index < 0) {
      return { changes: 0 };
    }

    inMemoryRegistrations[index] = {
      ...inMemoryRegistrations[index],
      isDeleted: false,
      deletedAt: null,
      deletedBy: "",
      restoredBy: safeRestoredBy,
      restoredAt,
      updatedAt: restoredAt,
    };

    return { changes: 1 };
  }

  const collection = getRegistrationsCollection();
  const updateResult = await collection.updateOne(
    { regId: normalizedRegId, isDeleted: true },
    {
      $set: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: "",
        restoredBy: safeRestoredBy,
        restoredAt,
        updatedAt: restoredAt,
      },
    }
  );

  return { changes: updateResult.modifiedCount };
};

module.exports = {
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
};
