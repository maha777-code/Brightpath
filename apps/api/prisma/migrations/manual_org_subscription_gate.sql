-- Locks schools and tutor centers that never paid. New sign-ups already start as 'inactive';
-- this brings older organizations (created when sign-up granted the plan for free) in line.
-- Data-only and safe to re-run. Review the SELECT output before running the UPDATE.

-- 1) Preview the organizations that will be locked.
SELECT o."id", o."name", o."type", o."planType", o."subscriptionStatus", o."createdAt"
FROM "Organization" o
WHERE o."subscriptionStatus" IN ('active', 'trialing')
  AND o."stripeSubscriptionId" IS NULL
  AND o."razorpaySubscriptionId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "DodoSubscription" d
    WHERE d."organizationId" = o."id" AND d."status" IN ('active', 'past_due', 'on_hold', 'paused')
  )
ORDER BY o."createdAt";

-- 2) Lock them. Their admins see "Choose a plan" and their teachers/students see "ask your administrator".
UPDATE "Organization" o
SET "subscriptionStatus" = 'inactive', "updatedAt" = NOW()
WHERE o."subscriptionStatus" IN ('active', 'trialing')
  AND o."stripeSubscriptionId" IS NULL
  AND o."razorpaySubscriptionId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "DodoSubscription" d
    WHERE d."organizationId" = o."id" AND d."status" IN ('active', 'past_due', 'on_hold', 'paused')
  );

UPDATE "PlatformUser" u
SET "subscriptionStatus" = 'inactive', "updatedAt" = NOW()
FROM "Organization" o
WHERE o."adminUserId" = u."id"
  AND o."subscriptionStatus" = 'inactive'
  AND u."subscriptionStatus" IN ('active', 'trialing');
