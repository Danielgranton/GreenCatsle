const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
const isBoolean = (v) => typeof v === "boolean";
const isArray = (v) => Array.isArray(v);

// Accepts 24-hex string ObjectId-like values (Mongoose will validate fully on query).
const isObjectIdLike = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

const validators = {
  object: (v) => isObject(v),
  string: (v) => typeof v === "string",
  nonEmptyString: (v) => isNonEmptyString(v),
  number: (v) => isNumber(v),
  boolean: (v) => isBoolean(v),
  array: (v) => isArray(v),
  objectIdLike: (v) => isObjectIdLike(v),
};

export const validateBody = (shape, { allowUnknown = true } = {}) => {
  return (req, res, next) => {
    if (!isObject(req.body)) {
      return res.status(400).json({ success: false, message: "Invalid JSON body" });
    }

    const errors = [];
    for (const [field, rule] of Object.entries(shape)) {
      const value = req.body[field];
      const optional = !!rule.optional;
      const type = rule.type;

      if (value === undefined || value === null) {
        if (!optional) errors.push({ field, message: "is required" });
        continue;
      }

      const fn = validators[type];
      if (!fn) {
        errors.push({ field, message: `server validator misconfigured (${type})` });
        continue;
      }
      if (!fn(value)) {
        errors.push({ field, message: `must be ${type}` });
        continue;
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({ field, message: `must be one of ${rule.enum.join(", ")}` });
      }
    }

    if (!allowUnknown) {
      for (const k of Object.keys(req.body)) {
        if (!Object.prototype.hasOwnProperty.call(shape, k)) {
          errors.push({ field: k, message: "is not allowed" });
        }
      }
    }

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
};

