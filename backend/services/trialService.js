const toNumber = (value) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

export const getTrialDays = () => {
  const days = toNumber(process.env.FREE_TRIAL_DAYS) ?? 30;
  return Math.max(0, Math.floor(days));
};

export const getTrialRolloutAt = () => {
  const raw = process.env.TRIAL_ROLLOUT_AT;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

export const isBusinessInFreeTrial = (business) => {
  const days = getTrialDays();
  if (!business || days <= 0) return false;

  const trialEndsAt = business.trialEndsAt ? new Date(business.trialEndsAt) : null;
  if (trialEndsAt && !Number.isNaN(trialEndsAt.getTime())) {
    return Date.now() < trialEndsAt.getTime();
  }

  // Backward-compatible fallback: if approvedAt/trialStartedAt exists but trialEndsAt is missing, derive it.
  const start =
    business.trialStartedAt ? new Date(business.trialStartedAt) :
    business.approvedAt ? new Date(business.approvedAt) :
    getTrialRolloutAt();
  if (!start || Number.isNaN(start.getTime())) return false;
  const derivedEnds = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return Date.now() < derivedEnds.getTime();
};
